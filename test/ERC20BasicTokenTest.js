const PAXMock = artifacts.require('PAXWithBalance.sol');
const Proxy = artifacts.require('AdminUpgradeabilityProxy.sol');

const assertRevert = require('./helpers/assertRevert');
const {ZERO_ADDRESS} = require('@openzeppelin/test-helpers').constants;

// Test that PAX operates correctly as an ERC20Basic token.
contract('ERC20Basic PAX', function ([_, admin, recipient, anotherAccount, owner]) {

  beforeEach(async function () {
    const pax = await PAXMock.new({from: owner});
    const proxy = await Proxy.new(pax.address, {from: admin});
    const proxiedPAX = await PAXMock.at(proxy.address);
    await proxiedPAX.initialize({from: owner});
    await proxiedPAX.initializeBalance(owner, 100);
    this.token = proxiedPAX;
  });

  describe('basic data', function () {
    it('has getters for the name, symbol, and decimals', async function () {
      const name = await this.token.name();
      assert.equal(name, "Paxos Standard");
      const symbol = await this.token.symbol();
      assert.equal(symbol, "PAX");
      const decimals = await this.token.decimals();
      assert.equal(decimals, 18);
    });
  });

  describe('total supply', function () {
    it('returns the total amount of tokens', async function () {
      const totalSupply = await this.token.totalSupply();

      assert.equal(totalSupply, 100);
    });
  });

  describe('balanceOf', function () {
    describe('when the requested account has no tokens', function () {
      it('returns zero', async function () {
        const balance = await this.token.balanceOf(anotherAccount);

        assert.equal(balance, 0);
      });
    });

    describe('when the requested account has some tokens', function () {
      it('returns the total amount of tokens', async function () {
        const balance = await this.token.balanceOf(owner);

        assert.equal(balance, 100);
      });
    });
  });

  describe('transfer', function () {
    describe('when the recipient is not the zero address', function () {
      const to = recipient;

      describe('when the sender does not have enough balance', function () {
        const amount = 101;

        it('reverts', async function () {
          await assertRevert(this.token.transfer(to, amount, {from: owner}));
        });
      });

      describe('when the sender has enough balance', function () {
        const amount = 100;

        it('transfers the requested amount', async function () {
          await this.token.transfer(to, amount, {from: owner});

          const senderBalance = await this.token.balanceOf(owner);
          assert.equal(senderBalance, 0);

          const recipientBalance = await this.token.balanceOf(to);
          assert.equal(recipientBalance, amount);
        });

        it('emits a transfer event', async function () {
          const {logs} = await this.token.transfer(to, amount, {from: owner});

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Transfer');
          assert.equal(logs[0].args.from, owner);
          assert.equal(logs[0].args.to, to);
          assert(logs[0].args.value.eqn(amount));
        });
      });
    });

    describe('when the recipient is the zero address', function () {
      const to = ZERO_ADDRESS;

      it('reverts', async function () {
        await assertRevert(this.token.transfer(to, 100, {from: owner}));
      });
    });
  });
});
