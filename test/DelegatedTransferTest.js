const ethSigUtil = require('eth-sig-util');
const {ZERO_ADDRESS} = require('@openzeppelin/test-helpers').constants;

const USDPMock = artifacts.require('USDPWithBalance.sol');
const Proxy = artifacts.require('AdminUpgradeabilityProxy.sol');

const assertRevert = require('./helpers/assertRevert');

// private key for token from address
const privateKey = new Buffer("43f2ee33c522046e80b67e96ceb84a05b60b9434b0ee2e3ae4b1311b9f5dcc46", 'hex');
// EIP-55 of ethereumjsUtil.bufferToHex(ethereumjsUtil.privateToAddress(privateKey));
const fromAddress = '0xBd2e9CaF03B81e96eE27AD354c579E1310415F39';

// Test that USDP operates correctly as a token with BetaDelegatedTransfer.
contract('BetaDelegatedTransfer USDP', function ([_, admin, owner, executor, recipient, whitelister, bystander]) {

  const amount = 10;
  const feeAmount = 1;

  beforeEach(async function () {
    const usdp = await USDPMock.new({from: owner});
    const proxy = await Proxy.new(usdp.address, {from: admin});
    const proxiedUSDP = await USDPMock.at(proxy.address);
    await proxiedUSDP.initialize({from: owner});
    await proxiedUSDP.initializeDomainSeparator({from: owner});
    await proxiedUSDP.initializeBalance(owner, 100);
    this.token = proxiedUSDP;
  });

  describe('as a token with delegated transfer', function () {
    beforeEach(async function () {
      this.betaDelegatedTransferContext = {
        types: {
          EIP712Domain: [
            {name: 'name', type: 'string'},
            {name: 'verifyingContract', type: 'address'},
          ],
          BetaDelegatedTransfer: [
            {name: 'to', type: 'address'},
            {name: 'value', type: 'uint256'},
            {name: 'fee', type: 'uint256'},
            {name: 'seq', type: 'uint256'},
            {name: 'deadline', type: 'uint256'},
          ],
        },
        primaryType: 'BetaDelegatedTransfer',
        domain: {
          name: 'Pax Dollar',
          verifyingContract: this.token.address,
        },
      };

      // send the tokens to the custom wallet
      let {receipt} = await this.token.transfer(fromAddress, 2 * (amount + feeAmount), {from: owner});
      this.blockNumber = receipt.blockNumber;

      // check starting balance
      let senderBalance = await this.token.balanceOf(fromAddress);
      assert.equal(senderBalance, 2 * (amount + feeAmount));
      let executorBalance = await this.token.balanceOf(executor);
      assert.equal(executorBalance.toNumber(), 0);
      let recipientBalance = await this.token.balanceOf(recipient);
      assert.equal(recipientBalance.toNumber(), 0);

      // check the seq
      let nextSeq = await this.token.nextSeqOf(fromAddress);
      assert.equal(nextSeq.toNumber(), 0);

      // set the whitelister
      await this.token.setBetaDelegateWhitelister(whitelister, {from: owner});

      // whitelist the executor address
      await this.token.whitelistBetaDelegate(executor, {from: whitelister});
    });

    it('can do a delegated transfer', async function () {

      // delegated transfer message
      let message = {
        to: recipient,
        value: amount,
        fee: feeAmount,
        seq: 0,
        deadline: this.blockNumber + 100,
      };

      // create delegated transfer
      const typedData = {
        ...this.betaDelegatedTransferContext,
        message,
      };

      // sign the delegated transfer with the token holder address
      const sig = ethSigUtil.signTypedData(privateKey, {data: typedData});

      // commit delegated transfer
      let {to, value, fee, seq, deadline} = message;
      const {logs} = await this.token.betaDelegatedTransfer(sig, to, value, fee, seq, deadline, {from: executor});

      // check balances
      senderBalance = await this.token.balanceOf(fromAddress);
      assert.equal(senderBalance, amount + feeAmount);
      executorBalance = await this.token.balanceOf(executor);
      assert.equal(executorBalance, feeAmount);
      recipientBalance = await this.token.balanceOf(recipient);
      assert.equal(recipientBalance, amount);

      // check seq updated
      nextSeq = await this.token.nextSeqOf(fromAddress);
      assert.equal(nextSeq, 1);

      // emits the right events
      assert.equal(logs.length, 3);

      assert.equal(logs[0].event, 'Transfer');
      assert.equal(logs[0].args.from, fromAddress);
      assert.equal(logs[0].args.to, executor);
      assert.equal(logs[0].args.value, fee);

      assert.equal(logs[1].event, 'Transfer');
      assert.equal(logs[1].args.from, fromAddress);
      assert.equal(logs[1].args.to, to);
      assert.equal(logs[1].args.value, value);

      assert.equal(logs[2].event, 'BetaDelegatedTransfer');
      assert.equal(logs[2].args.from, fromAddress);
      assert.equal(logs[2].args.to, to);
      assert.equal(logs[2].args.value, value);
      assert.equal(logs[2].args.fee, fee);
      assert.equal(logs[2].args.seq, seq);

      // try replays
      await assertRevert(
        this.token.betaDelegatedTransfer(sig, to, value, fee, 0, deadline, {from: executor})
      );
      await assertRevert(
        this.token.betaDelegatedTransfer(sig, to, value, fee, 1, deadline, {from: executor})
      );
    });

    describe('with multiple delegated transfers', function () {
      beforeEach(async function () {
        // delegated transfer message
        let message = {
          to: recipient,
          value: amount,
          fee: feeAmount,
          seq: 0,
          deadline: this.blockNumber + 100,
        };
        this.message = message;

        // create delegated transfer
        const typedData = {
          ...this.betaDelegatedTransferContext,
          message,
        };

        // sign the delegated transfer with the token holder address
        this.sig = ethSigUtil.signTypedData(privateKey, {data: typedData});
        // sign the second delegated transfer with the token holder address
        typedData.message.seq = 1;
        this.sig2 = ethSigUtil.signTypedData(privateKey, {data: typedData});
      });

      it('can do two delegated transfers', async function () {
        // commit two delegated transfers
        let {to, value, fee, deadline} = this.message;
        await this.token.betaDelegatedTransfer(this.sig, to, value, fee, 0, deadline, {from: executor});
        // commit second delegated transfer
        await this.token.betaDelegatedTransfer(this.sig2, to, value, fee, 1, deadline, {from: executor});

        // check balances
        senderBalance = await this.token.balanceOf(fromAddress);
        assert.equal(senderBalance, 0);
        executorBalance = await this.token.balanceOf(executor);
        assert.equal(executorBalance, 2 * feeAmount);
        recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, 2 * amount);

        // check seq updated
        nextSeq = await this.token.nextSeqOf(fromAddress);
        assert.equal(nextSeq, 2);

        // try replays
        await assertRevert(
          this.token.betaDelegatedTransfer(this.sig, to, value, fee, 0, deadline, {from: executor})
        );
        await assertRevert(
          this.token.betaDelegatedTransfer(this.sig, to, value, fee, 1, deadline, {from: executor})
        );
        await assertRevert(
          this.token.betaDelegatedTransfer(this.sig, to, value, fee, 2, deadline, {from: executor})
        );
      });

      it('can do two delegated transfers in a batch', async function () {
        // batch prep requires arguments in separate arrays
        let {to, value, fee, deadline} = this.message;

        const s1 = parseSignature(this.sig.substring(2));
        const s2 = parseSignature(this.sig2.substring(2));

        const rs = [s1.r, s2.r];
        const ss = [s1.s, s2.s];
        const vs = [s1.v, s2.v];
        const tos = [to, to];
        const values = [value, value];
        const fees = [fee, fee];
        const seqs = [0, 1];
        const deadlines = [deadline, deadline];

        // commit delegated transfers in batch
        await this.token.betaDelegatedTransferBatch(rs, ss, vs, tos, values, fees, seqs, deadlines, {from: executor});

        // check balances
        senderBalance = await this.token.balanceOf(fromAddress);
        assert.equal(senderBalance, 0);
        executorBalance = await this.token.balanceOf(executor);
        assert.equal(executorBalance, 2 * feeAmount);
        recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, 2 * amount);

        // check seq updated
        nextSeq = await this.token.nextSeqOf(fromAddress);
        assert.equal(nextSeq, 2);
      });

      it('reverts batches to act atomically', async function () {
        // batch prep requires arguments in separate arrays
        let {to, value, fee, deadline} = this.message;

        const s1 = parseSignature(this.sig.substring(2));
        const s2 = parseSignature(this.sig2.substring(2));

        const rs = [s1.r, s2.r];
        const ss = [s1.s, s2.s];
        const vs = [s1.v, s2.v];
        const tos = [to, to];
        const values = [value, value];
        const fees = [fee, fee];
        // batch has wrong seq for the second one
        const seqs = [0, 5];
        const deadlines = [deadline, deadline];

        // commit delegated transfers in batch
        await assertRevert(
          this.token.betaDelegatedTransferBatch(rs, ss, vs, tos, values, fees, seqs, deadlines, {from: executor})
        );

        // check balances
        senderBalance = await this.token.balanceOf(fromAddress);
        assert.equal(senderBalance, 2 * (amount + feeAmount));
        executorBalance = await this.token.balanceOf(executor);
        assert.equal(executorBalance, 0);
        recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, 0);

        // check seq not updated
        nextSeq = await this.token.nextSeqOf(fromAddress);
        assert.equal(nextSeq, 0);
      });
    });

    it('fails for bad signatures', async function () {

      // delegated transfer message
      let message = {
        to: recipient,
        value: amount,
        fee: feeAmount,
        seq: 0,
        deadline: this.blockNumber + 100,
      };

      const typedData = {
        ...this.betaDelegatedTransferContext,
        message,
      };
      const sig = ethSigUtil.signTypedData(privateKey, {data: typedData});
      let {to, value, fee, seq, deadline} = message;
      // sig too long
      let badSig = sig + [0x71];
      assert.equal(sig.length + 3, badSig.length);
      await assertRevert(
        this.token.betaDelegatedTransfer(badSig, to, value, fee, seq, deadline, {from: executor})
      );
    });

    it('fails for bad seq', async function () {

      // delegated transfer message
      let message = {
        to: recipient,
        value: amount,
        fee: feeAmount,
        seq: 0,
        deadline: this.blockNumber + 100,
      };

      const typedData = {
        ...this.betaDelegatedTransferContext,
        message,
      };
      let {to, value, fee, seq, deadline} = message;

      let badSeq = seq + 1;
      typedData.message.seq = badSeq;
      let sig = ethSigUtil.signTypedData(privateKey, {data: typedData});
      await assertRevert(
        this.token.betaDelegatedTransfer(sig, to, value, fee, badSeq, deadline, {from: executor})
      );
    });

    it('fails for insufficient balance', async function () {

      // delegated transfer message
      let message = {
        to: recipient,
        value: amount,
        fee: feeAmount,
        seq: 0,
        deadline: this.blockNumber + 100,
      };

      message.value = 3 * amount;

      const typedData = {
        ...this.betaDelegatedTransferContext,
        message,
      };
      const sig = ethSigUtil.signTypedData(privateKey, {data: typedData});
      let {to, value, fee, seq, deadline} = message;
      await assertRevert(
        this.token.betaDelegatedTransfer(sig, to, value, fee, seq, deadline, {from: executor})
      );
    });

    it('fails for expired blockNumber', async function () {

      // delegated transfer message
      let message = {
        to: recipient,
        value: amount,
        fee: feeAmount,
        seq: 0,
        deadline: this.blockNumber - 1,
      };

      const typedData = {
        ...this.betaDelegatedTransferContext,
        message,
      };
      const sig = ethSigUtil.signTypedData(privateKey, {data: typedData});
      let {to, value, fee, seq, deadline} = message;
      await assertRevert(
        this.token.betaDelegatedTransfer(sig, to, value, fee, seq, deadline, {from: executor})
      );
    });

    // The problem with this case is an arbitrary signature can "look right" because any random address can have 0 tokens
    it('does not allow zero value with zero fee', async function () {

      // delegated transfer message
      let message = {
        to: recipient,
        value: 0,
        fee: 0,
        seq: 0,
        deadline: this.blockNumber + 100,
      };

      const typedData = {
        ...this.betaDelegatedTransferContext,
        message,
      };
      const sig = ethSigUtil.signTypedData(privateKey, {data: typedData});
      let {to, value, fee, seq, deadline} = message;
      await assertRevert(
        this.token.betaDelegatedTransfer(sig, to, value, fee, seq, deadline, {from: executor})
      );
    });

    it('fails for a non-whitelisted address', async function () {
      // delegated transfer message
      let message = {
        to: recipient,
        value: 1,
        fee: 0,
        seq: 0,
        deadline: this.blockNumber + 100,
      };

      const typedData = {
        ...this.betaDelegatedTransferContext,
        message,
      };
      const sig = ethSigUtil.signTypedData(privateKey, {data: typedData});
      let {to, value, fee, seq, deadline} = message;
      await assertRevert(
        this.token.betaDelegatedTransfer(sig, to, value, fee, seq, deadline, {from: owner})
      );
    });

    it('Handles zero fee without a fee transfer event', async function () {

      // delegated transfer message
      let message = {
        to: recipient,
        value: amount,
        fee: feeAmount,
        seq: 0,
        deadline: this.blockNumber + 100,
      };

      message.fee = 0;

      const typedData = {
        ...this.betaDelegatedTransferContext,
        message,
      };
      const sig = ethSigUtil.signTypedData(privateKey, {data: typedData});
      let {to, value, fee, seq, deadline} = message;
      assert.equal(fee, 0);
      const {logs} = await this.token.betaDelegatedTransfer(sig, to, value, fee, seq, deadline, {from: executor});

      // check balances
      senderBalance = await this.token.balanceOf(fromAddress);
      assert.equal(senderBalance, amount + 2 * feeAmount);
      executorBalance = await this.token.balanceOf(executor);
      assert.equal(executorBalance.toNumber(), 0);
      recipientBalance = await this.token.balanceOf(recipient);
      assert.equal(recipientBalance, amount);

      // emits the right events
      assert.equal(logs.length, 2);

      assert.equal(logs[0].event, 'Transfer');
      assert.equal(logs[0].args.from, fromAddress);
      assert.equal(logs[0].args.to, to);
      assert.equal(logs[0].args.value, value);

      assert.equal(logs[1].event, 'BetaDelegatedTransfer');
      assert.equal(logs[1].args.from, fromAddress);
      assert.equal(logs[1].args.to, to);
      assert.equal(logs[1].args.value, value);
      assert.equal(logs[1].args.fee, fee);
      assert.equal(logs[1].args.seq, seq);
    });
  });

  describe('as a token with a delegate whitelister', function () {
    beforeEach(async function () {
      await this.token.setBetaDelegateWhitelister(whitelister, {from: owner});
      const currentWhitelister = await this.token.betaDelegateWhitelister();
      assert.equal(currentWhitelister, whitelister);
    });

    it('can whitelist an delegate/executor', async function () {
      // make sure no one is whitelisted
      assert.isFalse(await this.token.isWhitelistedBetaDelegate(whitelister));
      assert.isFalse(await this.token.isWhitelistedBetaDelegate(bystander));
      assert.isFalse(await this.token.isWhitelistedBetaDelegate(owner));
      assert.isFalse(await this.token.isWhitelistedBetaDelegate(executor));

      // whitelist an executor
      await this.token.whitelistBetaDelegate(executor, {from: whitelister});
      assert.isTrue(await this.token.isWhitelistedBetaDelegate(executor));
    });

    it('can unwhitelist', async function () {
      await this.token.whitelistBetaDelegate(executor, {from: whitelister});
      assert.isTrue(await this.token.isWhitelistedBetaDelegate(executor));
      await this.token.unwhitelistBetaDelegate(executor, {from: whitelister});
      assert.isFalse(await this.token.isWhitelistedBetaDelegate(executor));
    });

    it('whitelister can set new whitelister', async function () {
      await this.token.setBetaDelegateWhitelister(bystander, {from: whitelister});
      const currentWhitelister = await this.token.betaDelegateWhitelister();
      assert.equal(currentWhitelister, bystander);
    });

    it('non-whitelister who is not owner cannot set new whitelister or whitelist/unwhitelist', async function () {
      await assertRevert(
        this.token.setBetaDelegateWhitelister(bystander, {from: bystander})
      );
      await assertRevert(
        this.token.whitelistBetaDelegate(executor, {from: bystander})
      );
      await this.token.whitelistBetaDelegate(executor, {from: whitelister});
      await assertRevert(
        this.token.unwhitelistBetaDelegate(executor, {from: bystander})
      );
    });

    it('cannot set whitelister to address zero', async function () {
      await assertRevert(
        this.token.setBetaDelegateWhitelister(ZERO_ADDRESS, {from: owner})
      );
    });
  });
});

function parseSignature(signature) {
  var r = signature.substring(0, 64);
  var s = signature.substring(64, 128);
  var v = signature.substring(128, 130);

  return {
    r: "0x" + r,
    s: "0x" + s,
    v: parseInt(v, 16)
  }
}
