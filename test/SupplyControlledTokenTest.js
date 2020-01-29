const PAX = artifacts.require('PAXImplementationV2.sol');
const Proxy = artifacts.require('AdminUpgradeabilityProxy.sol');

const assertRevert = require('./helpers/assertRevert');
const {ZERO_ADDRESS, MAX_UINT256} = require('openzeppelin-test-helpers').constants;

// Tests that PAX token supply control mechanisms operate correctly.
contract('PAX', function ([_, admin, newSupplyController, otherAddress, owner]) {

  beforeEach(async function () {
    const pax = await PAX.new({from: owner});
    const proxy = await Proxy.new(pax.address, {from: admin});
    const proxiedPAX = await PAX.at(proxy.address);
    await proxiedPAX.initialize({from: owner});
    this.token = proxiedPAX;
  });

  describe('as a supply-controlled token', function () {

    describe('after token creation', function () {
      it('sender should be token owner', async function () {
        const tokenOwner = await this.token.owner({from: owner});
        assert.equal(tokenOwner, owner);
      });

      it('sender should be supply controller', async function () {
        const supplyController = await this.token.supplyController();
        assert.equal(supplyController, owner);
      });

      it('total supply should be zero', async function () {
        const totalSupply = await this.token.totalSupply({from: owner});
        assert.equal(totalSupply, 0);
      });

      it('balances should be zero', async function () {
        const ownerBalance = await this.token.balanceOf(owner, {from: owner});
        assert.equal(ownerBalance, 0);
        const otherBalance = await this.token.balanceOf(otherAddress, {from: owner});
        assert.equal(otherBalance, 0);
      });
    });

    describe('increaseSupply', function () {
      const amount = 100;

      it('reverts when sender is not supply controller', async function () {
        await assertRevert(this.token.increaseSupply(amount, {from: otherAddress}));
      });

      it('adds the requested amount', async function () {
        await this.token.increaseSupply(amount, {from: owner});

        const balance = await this.token.balanceOf(owner);
        assert.equal(balance, amount, 'supply controller balance matches');

        const totalSupply = await this.token.totalSupply();
        assert.equal(totalSupply, amount, 'total supply matches')
      });

      it('emits a SupplyIncreased and a Transfer event', async function () {
        const {logs} = await this.token.increaseSupply(amount, {from: owner});

        assert.equal(logs.length, 2);
        assert.equal(logs[0].event, 'SupplyIncreased');
        assert.equal(logs[0].args.to, owner);
        assert.equal(logs[0].args.value, amount);

        assert.equal(logs[1].event, 'Transfer');
        assert.equal(logs[1].args.from, ZERO_ADDRESS);
        assert.equal(logs[1].args.to, owner);
        assert.equal(logs[1].args.value, amount);
      });

      it('cannot increaseSupply resulting in positive overflow of the totalSupply', async function () {
        // issue a big amount - more than half of what is possible
        bigAmount = MAX_UINT256;
        await this.token.increaseSupply(bigAmount, {from: owner});
        let balance = await this.token.balanceOf(owner);
        assert.equal(bigAmount.toString(), balance.toString());
        // send it to another address
        await this.token.transfer(otherAddress, bigAmount, {from: owner});
        balance = await this.token.balanceOf(owner);
        assert.equal(0, balance.toNumber());
        // try to issue more than is possible for a uint256 totalSupply
        await assertRevert(this.token.increaseSupply(bigAmount, {from: owner}));
        balance = await this.token.balanceOf(owner);
        assert.equal(0, balance.toNumber());
      });
    });

    describe('decreaseSupply', function () {
      const initialAmount = 500;
      const decreaseAmount = 100;
      const finalAmount = initialAmount - decreaseAmount;

      describe('when the supply controller has insufficient tokens', function () {
        it('reverts', async function () {
          await assertRevert(this.token.decreaseSupply(decreaseAmount, {from: owner}));
        });
      });

      describe('when the supply controller has sufficient tokens', function () {
        // Issue some tokens to start.
        beforeEach(async function () {
          await this.token.increaseSupply(initialAmount, {from: owner})
        });

        it('reverts when sender is not supply controller', async function () {
          await assertRevert(this.token.decreaseSupply(decreaseAmount, {from: otherAddress}));
        });

        it('removes the requested amount', async function () {
          await this.token.decreaseSupply(decreaseAmount, {from: owner});

          const balance = await this.token.balanceOf(owner);
          assert.equal(balance, finalAmount, 'supply controller balance matches');

          const totalSupply = await this.token.totalSupply();
          assert.equal(totalSupply, finalAmount, 'total supply matches')
        });

        it('emits a SupplyDecreased and a Transfer event', async function () {
          const {logs} = await this.token.decreaseSupply(decreaseAmount, {from: owner});

          assert.equal(logs.length, 2);
          assert.equal(logs[0].event, 'SupplyDecreased');
          assert.equal(logs[0].args.from, owner);
          assert.equal(logs[0].args.value, decreaseAmount);

          assert.equal(logs[1].event, 'Transfer');
          assert.equal(logs[1].args.from, owner);
          assert.equal(logs[1].args.to, ZERO_ADDRESS);
          assert.equal(logs[1].args.value, decreaseAmount);
        });
      });
    });

    describe('setSupplyController', function () {
      const amount = 100;
      let logs = null;

      beforeEach(async function () {
        const res = await this.token.setSupplyController(newSupplyController, {from: owner})
        logs = res.logs
      });

      it('reverts if sender is not owner or supplyController', async function () {
        await assertRevert(this.token.setSupplyController(otherAddress, {from: otherAddress}));
      });

      it('works if sender is supply controller', async function () {
        await this.token.setSupplyController(otherAddress, {from: newSupplyController});
        var currentSupplyController = await this.token.supplyController();
        assert.equal(currentSupplyController, otherAddress);
      });

      it('reverts if newSupplyController is address zero', async function () {
        await assertRevert(this.token.setSupplyController(ZERO_ADDRESS, {from: owner}));
      });

      it('enables new supply controller to increase and decrease supply', async function () {
        const currentSupplyController = await this.token.supplyController();
        assert.equal(currentSupplyController, newSupplyController);

        let balance = await this.token.balanceOf(newSupplyController);
        assert.equal(balance, 0, 'supply controller balance starts at 0');
        let totalSupply = await this.token.totalSupply();
        assert.equal(totalSupply, 0, 'total supply starts at 0');

        await this.token.increaseSupply(amount, {from: newSupplyController})
        balance = await this.token.balanceOf(newSupplyController);
        assert.equal(balance, amount, 'supply controller balance matches');
        totalSupply = await this.token.totalSupply();
        assert.equal(totalSupply, amount, 'total supply matches')

        await this.token.decreaseSupply(amount, {from: newSupplyController})
        balance = await this.token.balanceOf(newSupplyController);
        assert.equal(balance, 0, 'supply controller balance matches');
        totalSupply = await this.token.totalSupply();
        assert.equal(totalSupply, 0, 'total supply matches')
      });

      it('prevents old supply controller from increasing and decreasing supply', async function () {
        await assertRevert(this.token.increaseSupply(amount, {from: owner}));
        await assertRevert(this.token.decreaseSupply(0, {from: owner}));
      });

      it('emits a SupplyControllerSet event', async function () {
        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'SupplyControllerSet');
        assert.equal(logs[0].args.oldSupplyController, owner);
        assert.equal(logs[0].args.newSupplyController, newSupplyController);
      });
    });
  });
});
