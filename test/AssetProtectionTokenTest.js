const PAX = artifacts.require('PAXImplementationV2.sol');
const Proxy = artifacts.require('AdminUpgradeabilityProxy.sol');

const assertRevert = require('./helpers/assertRevert');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Tests that PAX Asset Protection capabilities function correctly.
contract('PAX', function ([_, admin, assetProtectionRole, otherAddress, freezableAddress, owner]) {

  beforeEach(async function () {
    const pax = await PAX.new({from: owner});
    const proxy = await Proxy.new(pax.address, {from: admin});
    const proxiedPAX = await PAX.at(proxy.address);
    await proxiedPAX.initialize({from: owner});
    this.token = proxiedPAX;
  });

  describe('when the asset protection role is unset', function () {
    it('reverts asset protection actions', async function () {
      await assertRevert(this.token.freeze(freezableAddress, {from: otherAddress}));
      await assertRevert(this.token.unfreeze(freezableAddress, {from: otherAddress}));
      await assertRevert(this.token.wipeFrozenAddress(freezableAddress, {from: otherAddress}));
    });
  });

  describe('as an asset protectable token', function () {

    beforeEach(async function () {
      await this.token.setAssetProtectionRole(assetProtectionRole, {from: owner});
    });

    describe('after setting the AssetProtectionRole', function () {
      it('the current asset protection role is set', async function () {
        const currentAssetProtectionRole = await this.token.assetProtectionRole();
        assert.equal(currentAssetProtectionRole, assetProtectionRole);
      });
    });

    describe('freeze', function () {
      it('reverts when sender is not asset protection', async function () {
        await assertRevert(this.token.freeze(freezableAddress, {from: otherAddress}));
      });

      it('adds the frozen address', async function () {
        await this.token.freeze(freezableAddress, {from: assetProtectionRole});

        const isFrozen = await this.token.isFrozen(freezableAddress, {from: assetProtectionRole});
        assert.equal(isFrozen, true, 'address is frozen');
      });

      it('emits an AddressFrozen event', async function () {
        const {logs} = await this.token.freeze(freezableAddress, {from: assetProtectionRole});

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'AddressFrozen');
        assert.equal(logs[0].args.addr, freezableAddress);
      });

      describe('when frozen', function () {
        const amount = 100;
        const approvalAmount = 40;

        beforeEach(async function () {
          // give the freezableAddress some tokens
          await this.token.increaseSupply(amount, {from: owner});
          await this.token.transfer(freezableAddress, amount, {from: owner});

          // approve otherAddress address to take some of those tokens from freezableAddress
          await this.token.approve(otherAddress, approvalAmount, {from: freezableAddress});

          // approve freezableAddress address to take some of those tokens from otherAddress
          await this.token.approve(freezableAddress, approvalAmount, {from: otherAddress});

          // freeze freezableAddress
          await this.token.freeze(freezableAddress, {from: assetProtectionRole});
        });

        it('reverts when transfer is from frozen address', async function () {
          await assertRevert(this.token.transfer(otherAddress, amount, {from: freezableAddress}));
        });

        it('reverts when transfer is to frozen address', async function () {
          await assertRevert(this.token.transfer(freezableAddress, amount, {from: otherAddress}));
        });

        it('reverts when transferFrom is by frozen address', async function () {
          await assertRevert(this.token.transferFrom(otherAddress, otherAddress, approvalAmount, {from: freezableAddress}));
        });

        it('reverts when transferFrom is from frozen address', async function () {
          await assertRevert(this.token.transferFrom(freezableAddress, otherAddress, approvalAmount, {from: otherAddress}));
        });

        it('reverts when transferFrom is to frozen address', async function () {
          await assertRevert(this.token.transferFrom(otherAddress, freezableAddress, approvalAmount, {from: otherAddress}));
        });

        it('reverts when approve is from the frozen address', async function () {
          await assertRevert(this.token.approve(otherAddress, approvalAmount, {from: freezableAddress}));
        });

        it('reverts when approve spender is the frozen address', async function () {
          await assertRevert(this.token.approve(freezableAddress, approvalAmount, {from: otherAddress}));
        });
      });

      it('reverts when address is already frozen', async function () {
        await this.token.freeze(freezableAddress, {from: assetProtectionRole});
        await assertRevert(this.token.freeze(freezableAddress, {from: assetProtectionRole}));
      });
    });

    describe('unfreeze', function () {
      it('reverts when address is already unfrozen', async function () {
        await assertRevert(this.token.unfreeze(freezableAddress, {from: assetProtectionRole}));
      });

      describe('when already frozen', function () {
        beforeEach(async function () {
          await this.token.freeze(freezableAddress, {from: assetProtectionRole});
        });

        it('reverts when sender is not asset protection', async function () {
          await assertRevert(this.token.unfreeze(freezableAddress, {from: otherAddress}));
        });

        it('removes a frozen address', async function () {
          await this.token.unfreeze(freezableAddress, {from: assetProtectionRole});

          const isFrozen = await this.token.isFrozen(freezableAddress, {from: assetProtectionRole});
          assert.equal(isFrozen, false, 'address is unfrozen');
        });

        it('unfrozen address can transfer again', async function () {
          const amount = 100;

          await this.token.unfreeze(freezableAddress, {from: assetProtectionRole});

          await this.token.increaseSupply(amount, {from: owner});
          await this.token.transfer(freezableAddress, amount, {from: owner});

          let balance = await this.token.balanceOf(freezableAddress);
          assert.equal(amount, balance);

          await this.token.transfer(owner, amount, {from: freezableAddress});

          balance = await this.token.balanceOf(freezableAddress);
          assert.equal(0, balance);
        });

        it('emits an AddressFrozen event', async function () {
          const {logs} = await this.token.unfreeze(freezableAddress, {from: assetProtectionRole});

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'AddressUnfrozen');
          assert.equal(logs[0].args.addr, freezableAddress);
        });
      });
    });

    describe('wipeFrozenAddress', function () {
      it('reverts when address is not frozen', async function () {
        await assertRevert(this.token.wipeFrozenAddress(freezableAddress, {from: assetProtectionRole}));
      });

      describe('when already frozen with assets and approvals', function () {
        const amount = 100;
        const approvalAmount = 40;

        beforeEach(async function () {
          // give the freezableAddress some tokens
          await this.token.increaseSupply(amount, {from: owner});
          await this.token.transfer(freezableAddress, amount, {from: owner});

          await this.token.freeze(freezableAddress, {from: assetProtectionRole});
        });

        it('reverts when sender is not asset protection', async function () {
          await assertRevert(this.token.wipeFrozenAddress(freezableAddress, {from: otherAddress}));
        });

        it('wipes a frozen address balance', async function () {
          await this.token.wipeFrozenAddress(freezableAddress, {from: assetProtectionRole});

          const isFrozen = await this.token.isFrozen(freezableAddress, {from: assetProtectionRole});
          assert.equal(isFrozen, true, 'address is still frozen');

          let balance = await this.token.balanceOf(freezableAddress);
          assert.equal(0, balance);
        });

        it('emits an FrozenAddressWiped event', async function () {
          const {logs} = await this.token.wipeFrozenAddress(freezableAddress, {from: assetProtectionRole});

          assert.equal(logs.length, 3);
          assert.equal(logs[0].event, 'FrozenAddressWiped');
          assert.equal(logs[0].args.addr, freezableAddress);
          assert.equal(logs[1].event, 'SupplyDecreased');
          assert.equal(logs[1].args.from, freezableAddress);
          assert.equal(logs[1].args.value, amount);
          assert.equal(logs[2].event, 'Transfer');
          assert.equal(logs[2].args.from, freezableAddress);
          assert.equal(logs[2].args.to, ZERO_ADDRESS);
          assert.equal(logs[2].args.value, amount);
        });
      });
    });

    describe('setAssetProtectionRole', function () {
      const amount = 100;

      it('reverts if sender is not owner or AssetProtectionRole', async function () {
        await assertRevert(this.token.setAssetProtectionRole(otherAddress, {from: otherAddress}));
      });

      it('works if sender is AssetProtectionRole', async function () {
        await this.token.setAssetProtectionRole(otherAddress, {from: assetProtectionRole});
        let currentAssetProtectionRole = await this.token.assetProtectionRole();
        assert.equal(currentAssetProtectionRole, otherAddress);
      });

      it('enables new AssetProtectionRole to freeze', async function () {
        await this.token.setAssetProtectionRole(otherAddress, {from: assetProtectionRole});
        await this.token.freeze(freezableAddress, {from: otherAddress});
        const isFrozen = await this.token.isFrozen(freezableAddress, {from: assetProtectionRole});
        assert.equal(isFrozen, true, 'address is frozen');
      });

      it('prevents old AssetProtectionRole from freezing', async function () {
        await this.token.setAssetProtectionRole(otherAddress, {from: assetProtectionRole});
        await assertRevert(this.token.freeze(freezableAddress, {from: assetProtectionRole}));
      });

      it('emits a AssetProtectionRoleSet event', async function () {
        const {logs} = await this.token.setAssetProtectionRole(otherAddress, {from: assetProtectionRole});

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'AssetProtectionRoleSet');
        assert.equal(logs[0].args.oldAssetProtectionRole, assetProtectionRole);
        assert.equal(logs[0].args.newAssetProtectionRole, otherAddress);
      });
    });
  });
});
