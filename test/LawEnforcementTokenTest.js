const PAX = artifacts.require('../contracts/PAXImplementation.sol');
const Proxy = artifacts.require('../contracts/zeppelin/AdminUpgradeabilityProxy.sol');

const assertRevert = require('./helpers/assertRevert');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Tests that PAX Law Enforcement capabilities function correctly.
contract('PAX', function([_, admin, lawEnforcementRole, otherAddress, freezableAddress, owner]) {

  beforeEach(async function() {
    const pax = await PAX.new({from: owner});
    const proxy = await Proxy.new(pax.address, {from: admin});
    const proxiedPAX = await PAX.at(proxy.address);
    await proxiedPAX.initialize({from: owner});
    this.token = proxiedPAX;
  });

  describe('when the law enforcement role is unset', function () {
    it('reverts law encorcment actions', async function () {
      await assertRevert(this.token.freeze(freezableAddress, {from: otherAddress}));
      await assertRevert(this.token.unfreeze(freezableAddress, {from: otherAddress}));
      await assertRevert(this.token.wipeFrozenAddress(freezableAddress, {from: otherAddress}));
    });
  });

  describe('as a law-enforceable token', function() {

    beforeEach(async function () {
      await this.token.setLawEnforcementRole(lawEnforcementRole, {from: owner});
    });

    describe('after setting the LawEnforcementRole', function() {
      it('the current law enforcement role is set', async function() {
        const currentLawEnforcementRole = await this.token.lawEnforcementRole();
        assert.equal(currentLawEnforcementRole, lawEnforcementRole);
      });
    });

    describe('freeze', function() {
      it('reverts when sender is not law enforcement', async function() {
        await assertRevert(this.token.freeze(freezableAddress, {from: otherAddress}));
      });

      it('adds the frozen address', async function() {
        await this.token.freeze(freezableAddress, {from: lawEnforcementRole});

        const isFrozen = await this.token.isFrozen(freezableAddress, {from: lawEnforcementRole});
        assert.equal(isFrozen, true, 'address is frozen');
      });

      it('emits an AddressFrozen event', async function() {
        const {logs} = await this.token.freeze(freezableAddress, {from: lawEnforcementRole});

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'AddressFrozen');
        assert.equal(logs[0].args.addr, freezableAddress);
      });

      describe('when frozen', function() {
        const amount = 100;
        const approvalAmount = 40;

        beforeEach(async function () {
          // give the freezableAddress some tokens
          await this.token.increaseSupply(amount, {from: owner});
          await this.token.transfer(freezableAddress, amount, {from: owner});

          // approve otherAddress address to take some of those tokens from freezableAddress
          await this.token.approve(otherAddress, approvalAmount, {from: freezableAddress});

          // approve freezableAddress address to take some of those tokens from otherAddress
          await this.token.approve(otherAddress, approvalAmount, {from: freezableAddress});

          // freeze freezableAddress
          await this.token.freeze(freezableAddress, {from: lawEnforcementRole});
        });

        it('reverts when transfer is from frozen address', async function() {
          await assertRevert(this.token.transfer(otherAddress, amount, {from: freezableAddress}));
        });

        it('reverts when transfer is to frozen address', async function() {
          await assertRevert(this.token.transfer(freezableAddress, amount, {from: otherAddress}));
        });

        it('reverts when transferFrom is by frozen address', async function() {
          await assertRevert(this.token.transferFrom(otherAddress, otherAddress, approvalAmount, {from: freezableAddress}));
        });

        it('reverts when transferFrom is from frozen address', async function() {
          await assertRevert(this.token.transferFrom(freezableAddress, otherAddress, approvalAmount, {from: otherAddress}));
        });

        it('reverts when transferFrom is to frozen address', async function() {
          await assertRevert(this.token.transferFrom(otherAddress, freezableAddress, approvalAmount, {from: otherAddress}));
        });

        it('reverts when approve is from the frozen address', async function() {
          await assertRevert(this.token.approve(otherAddress, approvalAmount, {from: freezableAddress}));
        });

        it('reverts when approve spender is the frozen address', async function() {
          await assertRevert(this.token.approve(freezableAddress, approvalAmount, {from: otherAddress}));
        });
      });

      it('reverts when address is already frozen', async function() {
        await this.token.freeze(freezableAddress, {from: lawEnforcementRole});
        await assertRevert(this.token.freeze(freezableAddress, {from: lawEnforcementRole}));
      });
    });

    describe('unfreeze', function() {
      it('reverts when address is already unfrozen', async function() {
        await assertRevert(this.token.unfreeze(freezableAddress, {from: lawEnforcementRole}));
      });

      describe('when already frozen', function() {
        beforeEach(async function() {
          await this.token.freeze(freezableAddress, {from: lawEnforcementRole});
        });

        it('reverts when sender is not law enforcement', async function() {
          await assertRevert(this.token.unfreeze(freezableAddress, {from: otherAddress}));
        });

        it('removes a frozen address', async function() {
          await this.token.unfreeze(freezableAddress, {from: lawEnforcementRole});

          const isFrozen = await this.token.isFrozen(freezableAddress, {from: lawEnforcementRole});
          assert.equal(isFrozen, false, 'address is unfrozen');
        });

        it('unfrozen address can transfer again', async function() {
          const amount = 100;

          await this.token.unfreeze(freezableAddress, {from: lawEnforcementRole});

          await this.token.increaseSupply(amount, {from: owner});
          await this.token.transfer(freezableAddress, amount, {from: owner});

          let balance = await this.token.balanceOf(freezableAddress);
          assert.equal(amount, balance);

          await this.token.transfer(owner, amount, {from: freezableAddress});

          balance = await this.token.balanceOf(freezableAddress);
          assert.equal(0, balance);
        });

        it('emits an AddressFrozen event', async function() {
          const {logs} = await this.token.unfreeze(freezableAddress, {from: lawEnforcementRole});

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'AddressUnfrozen');
          assert.equal(logs[0].args.addr, freezableAddress);
        });
      });
    });

    describe('wipeFrozenAddress', function() {
      it('reverts when address is not frozen', async function() {
        await assertRevert(this.token.wipeFrozenAddress(freezableAddress, {from: lawEnforcementRole}));
      });

      describe('when already frozen with assets and approvals', function() {
        const amount = 100;
        const approvalAmount = 40;

        beforeEach(async function() {
          // give the freezableAddress some tokens
          await this.token.increaseSupply(amount, {from: owner});
          await this.token.transfer(freezableAddress, amount, {from: owner});

          await this.token.freeze(freezableAddress, {from: lawEnforcementRole});
        });

        it('reverts when sender is not law enforcement', async function() {
          await assertRevert(this.token.wipeFrozenAddress(freezableAddress, {from: otherAddress}));
        });

        it('wipes a frozen address balance', async function() {
          await this.token.wipeFrozenAddress(freezableAddress, {from: lawEnforcementRole});

          const isFrozen = await this.token.isFrozen(freezableAddress, {from: lawEnforcementRole});
          assert.equal(isFrozen, true, 'address is still frozen');

          let balance = await this.token.balanceOf(freezableAddress);
          assert.equal(0, balance);
        });

        it('emits an FrozenAddressWiped event', async function() {
          const {logs} = await this.token.wipeFrozenAddress(freezableAddress, {from: lawEnforcementRole});

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

    describe('setLawEnforcementRole', function() {
      const amount = 100;

      it('reverts if sender is not owner or LawEnforcementRole', async function() {
        await assertRevert(this.token.setLawEnforcementRole(otherAddress, {from: otherAddress}));
      });

      it('works if sender is LawEnforcementRole', async function() {
        await this.token.setLawEnforcementRole(otherAddress, {from: lawEnforcementRole});
        let currentLawEnforcementRole = await this.token.lawEnforcementRole();
        assert.equal(currentLawEnforcementRole, otherAddress);
      });

      it('enables new LawEnforcementRole to freeze', async function() {
        await this.token.setLawEnforcementRole(otherAddress, {from: lawEnforcementRole});
        await this.token.freeze(freezableAddress, {from: otherAddress});
        const isFrozen = await this.token.isFrozen(freezableAddress, {from: lawEnforcementRole});
        assert.equal(isFrozen, true, 'address is frozen');
      });

      it('prevents old LawEnforcementRole from freezing', async function() {
        await this.token.setLawEnforcementRole(otherAddress, {from: lawEnforcementRole});
        await assertRevert(this.token.freeze(freezableAddress, {from: lawEnforcementRole}));
      });

      it('emits a LawEnforcementRoleSet event', async function() {
        const {logs} = await this.token.setLawEnforcementRole(otherAddress, {from: lawEnforcementRole});

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'LawEnforcementRoleSet');
        assert.equal(logs[0].args.oldLawEnforcementRole, lawEnforcementRole);
        assert.equal(logs[0].args.newLawEnforcementRole, otherAddress);
      });
    });
  });
});
