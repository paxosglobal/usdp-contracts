const { expect } = require('chai');
const { signPermit, PERMIT_TYPEHASH, MAX_UINT256 } = require('./helpers/signature');
const { ACCOUNTS } = require('./helpers/constants');

const USDPMock = artifacts.require('USDPWithBalance.sol');
const Proxy = artifacts.require('AdminUpgradeabilityProxy.sol');

const assertRevert = require('./helpers/assertRevert');

contract("EIP2612", function ([_, admin, owner]) {
  let domainSeparator;

  // Transaction defaults
  const sender = ACCOUNTS[0];
  const spender = owner;
  const recipient = ACCOUNTS[1];
  let deadline = MAX_UINT256;
  let senderBalance = 10e6;
  let transactionValue = 1e6;
  let permitAllowance = 10e6;
  let nonce = 0;

  const initialBalance = 100e6;

  beforeEach(async () => {
    const usdp = await USDPMock.new({ from: owner });
    const proxy = await Proxy.new(usdp.address, { from: admin });
    const proxiedUSDP = await USDPMock.at(proxy.address);
    await proxiedUSDP.initialize({ from: owner });
    await proxiedUSDP.initializeBalance(owner, initialBalance);
    this.token = proxiedUSDP;
    domainSeparator = await this.token.DOMAIN_SEPARATOR()
  });

  it("has the expected type hash for permit", async () => {
    expect(await this.token.PERMIT_TYPEHASH()).to.equal(
      PERMIT_TYPEHASH
    );
  });

  it("executes a transferFrom with a valid authorization", async () => {
    // Fund sender
    await this.token.transfer(sender.address, senderBalance, { from: owner });

    const { v, r, s } = signPermit(
      sender.address,
      spender,
      permitAllowance,
      nonce,
      MAX_UINT256,
      domainSeparator,
      sender.key
    );
    // Spender executes the permit transaction
    var result = await this.token.permit(sender.address, spender, permitAllowance, deadline, v, r, s, { from: spender })
    transactionRecp = await web3.eth.getTransactionReceipt(result.logs[0].transactionHash);
    assert.isTrue(transactionRecp.status, 'Pemit transaction failed');
    expect((await this.token.nonces(sender.address)).toNumber()).to.equal(1);
    expect((await this.token.balanceOf(recipient.address)).toNumber()).to.equal(0);

    result = await this.token.transferFrom(sender.address, recipient.address, transactionValue, { from: spender })
    transactionRecp = await web3.eth.getTransactionReceipt(result.logs[0].transactionHash);
    assert.isTrue(transactionRecp.status, 'TransferFrom transaction failed');

    expect((await this.token.balanceOf(sender.address)).toNumber()).to.equal(
      senderBalance - transactionValue);
    expect((await this.token.balanceOf(recipient.address)).toNumber()).to.equal(
      transactionValue);
  });

  it("executes a BATCH transferFrom with a valid authorization", async () => {
    const batches = 5;
    var senders = [];
    var recipients = [];
    var amounts = [];

    for (var i = 0; i < batches; i++) {
      var sender = ACCOUNTS[i + 2]
      // Fund sender
      await this.token.transfer(sender.address, transactionValue, { from: owner });

      senders.push(sender.address)
      recipients.push(recipient.address)
      amounts.push(transactionValue)

      const { v, r, s } = signPermit(
        sender.address,
        spender,
        transactionValue * (batches + 1),
        nonce,
        MAX_UINT256,
        domainSeparator,
        sender.key
      );

      // Spender executes the permit transaction
      var result = await this.token.permit(sender.address, spender, transactionValue * (batches + 1), deadline, v, r, s, { from: spender })
      transactionRecp = await web3.eth.getTransactionReceipt(result.logs[0].transactionHash);
      assert.isTrue(transactionRecp.status, 'Permit transaction failed');
    }
    result = await this.token.transferFromBatch(senders, recipients, amounts, { from: spender })
    transactionRecp = await web3.eth.getTransactionReceipt(result.logs[0].transactionHash);
    assert.isTrue(transactionRecp.status, 'TransferFromBatch transaction failed');

    expect((await this.token.balanceOf(recipient.address)).toNumber()).to.equal(
      transactionValue * (batches));
  });

  it("revert when deadline is expired", async () => {
    var deadline = Math.floor(Date.now() / 1000) - 10;

    const { v, r, s } = signPermit(
      sender.address,
      spender,
      permitAllowance,
      nonce,
      MAX_UINT256,
      domainSeparator,
      sender.key
    );

    await assertRevert(this.token.permit(sender.address, spender, permitAllowance, deadline, v, r, s, { from: spender }), "permit is expired")
  });

  it("revert when signature is invalid", async () => {
    // incorrect user signs the permit
    const { v, r, s } = signPermit(
      sender.address,
      spender,
      permitAllowance,
      nonce,
      Math.floor(Date.now() / 1000) + 1000,
      domainSeparator,
      ACCOUNTS[3].key
    );

    await assertRevert(this.token.permit(sender.address, spender, permitAllowance + 10e6, deadline, v, r, s, { from: spender }), "invalid signature")
  });

  it("revert when spender address is frozen", async () => {
    // Set assetProtectionRole to freeze an address.
    await this.token.setAssetProtectionRole(spender, { from: owner });
    // Spender freezes itself for the test.
    await this.token.freeze(spender, { from: spender })

    const { v, r, s } = signPermit(
      sender.address,
      spender,
      permitAllowance,
      nonce,
      MAX_UINT256,
      domainSeparator,
      sender.key
    );

    await assertRevert(this.token.permit(sender.address, spender, permitAllowance, deadline, v, r, s, { from: spender }), "address frozen")
  });

  it("revert when owner address is frozen", async () => {
    await this.token.setAssetProtectionRole(spender, { from: owner });
    // Spender freezes owner for the test.
    await this.token.freeze(sender.address, { from: spender })

    const { v, r, s } = signPermit(
      sender.address,
      spender,
      permitAllowance,
      nonce,
      MAX_UINT256,
      domainSeparator,
      sender.key
    );
    await assertRevert(this.token.permit(sender.address, spender, permitAllowance, deadline, v, r, s, { from: spender }), "address frozen")
  });

  it("multiple permit with incremental nonce should be success", async () => {
    var { v, r, s } = signPermit(
      sender.address,
      spender,
      permitAllowance,
      nonce,
      deadline,
      domainSeparator,
      sender.key
    );

    result = await this.token.permit(sender.address, spender, permitAllowance, deadline, v, r, s, { from: spender });
    transactionRecp = await web3.eth.getTransactionReceipt(result.logs[0].transactionHash);
    assert.isTrue(transactionRecp.status, 'TransferFromBatch transaction failed');

    var { v, r, s } = signPermit(
      sender.address,
      spender,
      permitAllowance,
      nonce + 1,
      deadline,
      domainSeparator,
      sender.key
    );

    result = await this.token.permit(sender.address, spender, permitAllowance, deadline, v, r, s, { from: spender });
    transactionRecp = await web3.eth.getTransactionReceipt(result.logs[0].transactionHash);
    assert.isTrue(transactionRecp.status, 'TransferFromBatch transaction failed');

  });

  it("revert when multiple permit with non-incremental nonce", async () => {
    const { v, r, s } = signPermit(
      sender.address,
      spender,
      permitAllowance,
      nonce,
      deadline,
      domainSeparator,
      sender.key
    );
    result = await this.token.permit(sender.address, spender, permitAllowance, deadline, v, r, s, { from: spender });
    transactionRecp = await web3.eth.getTransactionReceipt(result.logs[0].transactionHash);
    assert.isTrue(transactionRecp.status, 'TransferFromBatch transaction failed');

    await assertRevert(this.token.permit(sender.address, spender, permitAllowance, deadline, v, r, s, { from: spender }), "invalid signature");
  });

  it("revert when contract is paused", async () => {
    await this.token.pause({ from: owner });

    const { v, r, s } = signPermit(
      sender.address,
      spender,
      permitAllowance,
      nonce,
      deadline,
      domainSeparator,
      sender.key
    );

    await assertRevert(this.token.permit(sender.address, spender, permitAllowance, deadline, v, r, s, { from: spender }), "whenNotPaused")
    // Unpause
    await this.token.unpause({ from: owner });
    result = await this.token.permit(sender.address, spender, permitAllowance, deadline, v, r, s, { from: spender });
    transactionRecp = await web3.eth.getTransactionReceipt(result.logs[0].transactionHash);
    assert.isTrue(transactionRecp.status, 'TransferFromBatch transaction failed');

    // Pause again to check transferFrom
    await this.token.pause({ from: owner });
    await assertRevert(this.token.transferFrom(sender.address, recipient.address, transactionValue, { from: spender }), "whenNotPaused")

  });

  describe("ECrecover test cases", () => {
    it("ECrecover, invalid v", async () => {
      const { v, r, s } = signPermit(
        sender.address,
        spender,
        permitAllowance,
        nonce,
        deadline,
        domainSeparator,
        sender.key
      );

      await assertRevert(this.token.permit(sender.address, spender, permitAllowance, deadline, 35, r, s, { from: spender }), "invalid signature 'v' value");
    });

    it("ECrecover, invalid s", async () => {
      const { v, r, s } = signPermit(
        sender.address,
        spender,
        permitAllowance,
        nonce,
        deadline,
        domainSeparator,
        sender.key
      );

      await assertRevert(this.token.permit(sender.address, spender, permitAllowance, deadline, v, r, "0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A1", { from: spender }), "invalid signature 's' value");
    });
  });

});
