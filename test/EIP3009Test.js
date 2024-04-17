const { expect } = require('chai');
const { signTransferAuthorization, signReceiveAuthorization, signCancelAuthorization,
  TRANSFER_WITH_AUTHORIZATION_TYPEHASH, RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
  CANCEL_AUTHORIZATION_TYPEHASH, MAX_UINT256 } = require('./helpers/signature');


const { ACCOUNTS } = require('./helpers/constants');
const assertRevert = require('./helpers/assertRevert');

const USDPMock = artifacts.require('USDPWithBalance.sol');
const Proxy = artifacts.require('AdminUpgradeabilityProxy.sol');

contract("EIP3009", function ([_, admin, owner, receiver]) {
  let domainSeparator;
  let nonce;

  // Transaction defaults
  let sender = ACCOUNTS[0];
  // Spender and owner is same wallet for now.
  const spender = owner;
  const recipient = ACCOUNTS[1];
  let senderBalance = 10e6;
  let transactionValue = 1e6;
  const initialBalance = 100e6;

  beforeEach(async () => {
    const usdp = await USDPMock.new({ from: owner });
    const proxy = await Proxy.new(usdp.address, { from: admin });
    const proxiedUSDP = await USDPMock.at(proxy.address);
    await proxiedUSDP.initialize({ from: owner });
    await proxiedUSDP.initializeBalance(owner, initialBalance);
    this.token = proxiedUSDP;
    domainSeparator = await this.token.DOMAIN_SEPARATOR()
    nonce = web3.utils.randomHex(32);
  });


  it("validate type hashes", async () => {
    expect(await token.TRANSFER_WITH_AUTHORIZATION_TYPEHASH()).to.equal(
      TRANSFER_WITH_AUTHORIZATION_TYPEHASH
    );

    expect(await token.RECEIVE_WITH_AUTHORIZATION_TYPEHASH()).to.equal(
      RECEIVE_WITH_AUTHORIZATION_TYPEHASH
    );
    expect(await token.CANCEL_AUTHORIZATION_TYPEHASH()).to.equal(
      CANCEL_AUTHORIZATION_TYPEHASH
    );
  });


  describe("transferWithAuthorization", () => {
    it("executes a transferWithAuthorization with a valid authorization", async () => {
      const from = sender.address;
      const to = recipient.address;
      const validAfter = 0;
      const validBefore = MAX_UINT256;

      // Sender signs the authorization
      const { v, r, s } = signTransferAuthorization(
        from,
        to,
        transactionValue,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        sender.key
      );

      // Fund sender from owner
      await this.token.transfer(sender.address, senderBalance, { from: owner });

      // check initial balance
      expect((await this.token.balanceOf(from)).toNumber()).to.equal(senderBalance);
      expect((await this.token.balanceOf(to)).toNumber()).to.equal(0);
      expect(await this.token.authorizationState(from, nonce)).to.be.false;

      // Execute the transaction
      const result = await this.token.transferWithAuthorization(
        from,
        to,
        transactionValue,
        validAfter,
        validBefore,
        nonce,
        v,
        r,
        s,
        { from: spender }
      );
      var transactionRecp = await web3.eth.getTransactionReceipt(result.logs[0].transactionHash);
      assert.isTrue(transactionRecp.status, 'transferWithAuthorization transaction failed');

      // check that balance is updated
      expect((await this.token.balanceOf(from)).toNumber()).to.equal(senderBalance - transactionValue);
      expect((await this.token.balanceOf(to)).toNumber()).to.equal(transactionValue);

      // check that AuthorizationUsed event is emitted
      const log0 = result.logs[0];
      expect(log0.event).to.equal("AuthorizationUsed");
      expect(log0.args[0]).to.equal(from);
      expect(log0.args[1]).to.equal(nonce);

      // check that Transfer event is emitted
      const log1 = result.logs[1];
      expect(log1.event).to.equal("Transfer");
      expect(log1.args[0]).to.equal(from);
      expect(log1.args[1]).to.equal(to);
      expect(log1.args[2].toNumber()).to.equal(transactionValue);

      // check that the authorization is now used
      expect(await this.token.authorizationState(from, nonce)).to.be.true;
    });

    it("executes transferWithAuthorizationBatch with a valid authorization", async () => {
      const batches = 5;
      var rs = [];
      var ss = [];
      var vs = [];
      var tos = [];
      var transactionValues = [];
      var froms = [];
      var validAfters = [];
      var validBefores = [];
      var nonces = [];

      for (var i = 0; i < batches; i++) {
        sender = ACCOUNTS[i + 2];
        froms.push(sender.address)
        tos.push(recipient.address)
        transactionValues.push(transactionValue)
        validAfters.push(0)
        validBefores.push(MAX_UINT256)
        nonce = web3.utils.randomHex(32)
        nonces.push(nonce);
        expect(await this.token.authorizationState(sender.address, nonce)).to.be.false;

        const { v, r, s } = signTransferAuthorization(
          sender.address,
          recipient.address,
          transactionValue,
          0,
          MAX_UINT256,
          nonce,
          domainSeparator,
          sender.key
        );
        vs.push(v)
        rs.push(r)
        ss.push(s)

        // Fund sender from owner
        await this.token.transfer(sender.address, transactionValue, { from: owner });
      }

      // Execute the transaction
      const result = await this.token.transferWithAuthorizationBatch(
        froms,
        tos,
        transactionValues,
        validAfters,
        validBefores,
        nonces,
        vs,
        rs,
        ss,
        { from: spender }
      );

      var transactionRecp = await web3.eth.getTransactionReceipt(result.logs[0].transactionHash);
      assert.isTrue(transactionRecp.status, 'transferWithAuthorizationBatch transaction failed');

      log_line = 0
      for (i = 0; i < batches; i++, log_line = log_line + 2) {
        // check sender balance is updated
        expect((await this.token.balanceOf(froms[i])).toNumber()).to.equal(0);

        // check that AuthorizationUsed event is emitted
        const log0 = result.logs[log_line];
        expect(log0.event).to.equal("AuthorizationUsed");
        expect(log0.args[0]).to.equal(froms[i]);
        expect(log0.args[1]).to.equal(nonces[i]);

        // check that Transfer event is emitted
        const log1 = result.logs[log_line + 1];
        expect(log1.event).to.equal("Transfer");
        expect(log1.args[0]).to.equal(froms[i]);
        expect(log1.args[1]).to.equal(tos[i]);
        expect(log1.args[2].toNumber()).to.equal(transactionValue);

        // nonce should be used.
        expect(await this.token.authorizationState(froms[i], nonces[i])).to.be.true;
      }
      // check recipient balance is updated
      expect((await this.token.balanceOf(tos[0])).toNumber()).to.equal(transactionValue * batches);
    });

    it("reverts transferWithAuthorizationBatch when there is argument length mismatch", async () => {
      const batches = 5;
      var rs = [];
      var ss = [];
      var vs = [];
      var tos = [];
      var transactionValues = [];
      var froms = [];
      var validAfters = [];
      var validBefores = [];
      var nonces = [];


      // Create arguments.
      for (var i = 0; i < batches; i++) {
        sender = ACCOUNTS[i + 2];
        froms.push(sender.address)
        tos.push(recipient.address)
        transactionValues.push(transactionValue)
        validAfters.push(0)
        validBefores.push(MAX_UINT256)
        nonce = web3.utils.randomHex(32)
        nonces.push(nonce);

        const { v, r, s } = signTransferAuthorization(
          sender.address,
          recipient.address,
          transactionValue,
          0,
          MAX_UINT256,
          nonce,
          domainSeparator,
          sender.key
        );
        vs.push(v)
        rs.push(r)
        ss.push(s)
      }

      // All test case validation is done in single test to avoid setup overhead.
      allParams = [froms, tos, transactionValues, validAfters, validBefores, nonces, vs, rs, ss]

      assert(allParams.length==9, "incomplete check for the number of arguments to transferWithAuthorizationBatch")
      for (let i = 0 ; i < allParams.length; i++) {
        const currentParam = allParams[i];
        val = currentParam.pop();
        // Execute the transaction
        await assertRevert(this.token.transferWithAuthorizationBatch(
          froms,
          tos,
          transactionValues,
          validAfters,
          validBefores,
          nonces,
          vs,
          rs,
          ss,
          { from: spender }
        ), "argument's length mismatch");
        currentParam.push(val);
      }
      

    });

    it("executes a transferWithAuthorization with invalid params", async () => {// Sender signs the authorization
      const { v, r, s } = signTransferAuthorization(
        sender.address,
        recipient.address,
        transactionValue * 2,
        0,
        MAX_UINT256,
        nonce,
        domainSeparator,
        sender.key
      );
      // Execute the transaction
      await assertRevert(this.token.transferWithAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        MAX_UINT256,
        nonce,
        v,
        r,
        s,
        { from: spender }
      ), "invalid signature");
    });

    it("executes a transferWithAuthorization when signed with invalid key", async () => {
      const { v, r, s } = signTransferAuthorization(
        sender.address,
        recipient.address,
        transactionValue * 2,
        0,
        MAX_UINT256,
        nonce,
        domainSeparator,
        recipient.key
      );
      // Execute the transaction
      await assertRevert(this.token.transferWithAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        MAX_UINT256,
        nonce,
        v,
        r,
        s,
        { from: spender }
      ), "invalid signature");
    });

    it("reverts if the authorization is not yet valid", async () => {
      validAfter = Math.floor(Date.now() / 1000) + 10
      const { v, r, s } = signTransferAuthorization(
        sender.address,
        recipient.address,
        transactionValue * 2,
        validAfter,
        MAX_UINT256,
        nonce,
        domainSeparator,
        sender.key
      );
      // Execute the transaction
      await assertRevert(this.token.transferWithAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        validAfter,
        MAX_UINT256,
        nonce,
        v,
        r,
        s,
        { from: spender }
      ), "authorization is not yet valid");
    });

    it("reverts if the authorization is expired", async () => {
      const validBefore = Math.floor(Date.now() / 1000) - 1;
      const { v, r, s } = signTransferAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        validBefore,
        nonce,
        domainSeparator,
        sender.key
      );
      // Execute the transaction
      await assertRevert(this.token.transferWithAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        validBefore,
        nonce,
        v,
        r,
        s,
        { from: spender }
      ), "authorization is expired");
    });

    it("reverts if the authorization has already been used", async () => {
      const { v, r, s } = signTransferAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        MAX_UINT256,
        nonce,
        domainSeparator,
        sender.key
      );

      // Fund sender from owner
      await this.token.transfer(sender.address, senderBalance, { from: owner });

      // Valid transfer
      this.token.transferWithAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        MAX_UINT256,
        nonce,
        v,
        r,
        s,
        { from: spender }
      );
      // Execute the transaction
      await assertRevert(this.token.transferWithAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        MAX_UINT256,
        nonce,
        v,
        r,
        s,
        { from: spender }
      ), "authorization is used");
    });

    it("reverts when nonce that has already been used by the signer", async () => {
      var { v, r, s } = signTransferAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        MAX_UINT256,
        nonce,
        domainSeparator,
        sender.key
      );

      // Fund sender from owner
      await this.token.transfer(sender.address, senderBalance, { from: owner });
      await this.token.transfer(ACCOUNTS[3].address, senderBalance, { from: owner });

      // Valid transfer
      this.token.transferWithAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        MAX_UINT256,
        nonce,
        v,
        r,
        s,
        { from: spender }
      );

      // Execute a different transaction.
      var { v, r, s } = signTransferAuthorization(
        sender.address,
        ACCOUNTS[3].address,
        transactionValue - 10,
        0,
        MAX_UINT256,
        nonce,
        domainSeparator,
        sender.key
      );

      await assertRevert(this.token.transferWithAuthorization(
        sender.address,
        ACCOUNTS[3].address,
        transactionValue - 10,
        0,
        MAX_UINT256,
        nonce,
        v,
        r,
        s,
        { from: spender }
      ), "authorization is used");
    });

    it("reverts when the sender has insufficient funds", async () => {
      const { v, r, s } = signTransferAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        MAX_UINT256,
        nonce,
        domainSeparator,
        sender.key
      );

      // Execute the transaction
      await assertRevert(this.token.transferWithAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        MAX_UINT256,
        nonce,
        v,
        r,
        s,
        { from: spender }
      ), "insufficient funds");
    });

    it("reverts when the receipient is frozen", async () => {
      const { v, r, s } = signTransferAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        MAX_UINT256,
        nonce,
        domainSeparator,
        sender.key
      );

      // use spender as asset protection role and freeze recipient
      await this.token.setAssetProtectionRole(spender, { from: owner });
      await this.token.freeze(recipient.address, { from: spender })

      // Execute the transaction
      await assertRevert(this.token.transferWithAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        MAX_UINT256,
        nonce,
        v,
        r,
        s,
        { from: spender }
      ), "address frozen");
    });

    it("reverts when the spender is frozen", async () => {
      const { v, r, s } = signTransferAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        MAX_UINT256,
        nonce,
        domainSeparator,
        sender.key
      );

      // use spender as asset protection role and freeze itself
      await this.token.setAssetProtectionRole(spender, { from: owner });
      await this.token.freeze(spender, { from: spender })

      // Execute the transaction
      await assertRevert(this.token.transferWithAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        MAX_UINT256,
        nonce,
        v,
        r,
        s,
        { from: spender }
      ), "address frozen");
    });

    it("reverts when authorization is not for transferWithAuthorization", async () => {
      const { v, r, s } = signReceiveAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        MAX_UINT256,
        nonce,
        domainSeparator,
        sender.key
      );
      // Execute the transaction
      await assertRevert(this.token.transferWithAuthorization(
        sender.address,
        recipient.address,
        transactionValue,
        0,
        MAX_UINT256,
        nonce,
        v,
        r,
        s,
        { from: spender }
      ), "invalid signature");
    });
  });

  describe("receiveWithAuthorization", () => {
    it("executes a receiveWithAuthorization with a valid authorization", async () => {
      const from = sender.address;
      const validAfter = 0;
      const validBefore = MAX_UINT256;

      // Sender signs the authorization
      const { v, r, s } = signReceiveAuthorization(
        from,
        receiver,
        transactionValue,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        sender.key
      );

      // Fund sender from owner
      await this.token.transfer(from, senderBalance, { from: owner });

      // check initial balance
      expect((await this.token.balanceOf(from)).toNumber()).to.equal(senderBalance);
      expect((await this.token.balanceOf(receiver)).toNumber()).to.equal(0);
      expect(await this.token.authorizationState(from, nonce)).to.be.false;

      // Execute the transaction
      const result = await this.token.receiveWithAuthorization(
        from,
        receiver,
        transactionValue,
        validAfter,
        validBefore,
        nonce,
        v,
        r,
        s,
        { from: receiver }
      );
      var transactionRecp = await web3.eth.getTransactionReceipt(result.logs[0].transactionHash);
      assert.isTrue(transactionRecp.status, 'receiveWithAuthorization transaction failed');

      // check that balance is updated
      expect((await this.token.balanceOf(from)).toNumber()).to.equal(senderBalance - transactionValue);
      expect((await this.token.balanceOf(receiver)).toNumber()).to.equal(transactionValue);

      // check that AuthorizationUsed event is emitted
      const log0 = result.logs[0];
      expect(log0.event).to.equal("AuthorizationUsed");
      expect(log0.args[0]).to.equal(from);
      expect(log0.args[1]).to.equal(nonce);

      // check that Transfer event is emitted
      const log1 = result.logs[1];
      expect(log1.event).to.equal("Transfer");
      expect(log1.args[0]).to.equal(from);
      expect(log1.args[1]).to.equal(receiver);
      expect(log1.args[2].toNumber()).to.equal(transactionValue);

      // check that the authorization is now used
      expect(await this.token.authorizationState(from, nonce)).to.be.true;
    });

    it("reverts if the caller is not the payee", async () => {

      const from = sender.address;
      const validAfter = 0;
      const validBefore = MAX_UINT256;

      // Sender signs the authorization
      const { v, r, s } = signReceiveAuthorization(
        from,
        receiver,
        transactionValue,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        sender.key
      );

      await assertRevert(this.token.receiveWithAuthorization(
        from,
        receiver,
        transactionValue,
        validAfter,
        validBefore,
        nonce,
        v,
        r,
        s,
        { from: spender }
      ));
    });
  });

  describe("cancelAuthorization", () => {
    it("check cancelAuthorization vanilla case", async () => {
      const from = sender.address;
      const to = recipient.address;
      const validAfter = 0;
      const validBefore = MAX_UINT256;


      // check that the authorization is ununsed
      expect(await this.token.authorizationState(from, nonce)).to.be.false;

      // create cancellation
      const cancellation = signCancelAuthorization(
        from,
        nonce,
        domainSeparator,
        sender.key
      );

      // cancel the authorization
      await token.cancelAuthorization(
        from,
        nonce,
        cancellation.v,
        cancellation.r,
        cancellation.s,
        { from: spender }
      );

      // check that the authorization is now used
      expect(await this.token.authorizationState(from, nonce)).to.be.true;

      // attempt to use the canceled authorization
      // Sender signs the authorization
      const { v, r, s } = signTransferAuthorization(
        from,
        to,
        transactionValue,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        sender.key
      );

      await assertRevert(
        token.transferWithAuthorization(
          from,
          to,
          transactionValue,
          validAfter,
          validBefore,
          nonce,
          v,
          r,
          s,
          { from: spender }
        ),
        "authorization is used"
      );

    });

    it("revert when cancellation is already used", async () => {
      // create cancellation 
      const from = sender.address;

      // check that the authorization is ununsed
      expect(await this.token.authorizationState(from, nonce)).to.be.false;

      // create cancellation
      const cancellation = signCancelAuthorization(
        from,
        nonce,
        domainSeparator,
        sender.key
      );

      // cancel the authorization
      await token.cancelAuthorization(
        from,
        nonce,
        cancellation.v,
        cancellation.r,
        cancellation.s,
        { from: spender }
      );
      expect(await this.token.authorizationState(from, nonce)).to.be.true;

      // submit a cancelled authorization again
      await assertRevert(
        this.token.cancelAuthorization(
          from,
          nonce,
          cancellation.v,
          cancellation.r,
          cancellation.s,
          { from: spender }
        ), "authorization is used");
    });


  });

});
