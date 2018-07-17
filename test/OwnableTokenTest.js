const Stablecoin = artifacts.require('../contracts/StablecoinImplementation.sol');
const Proxy = artifacts.require('../contracts/ERC20BasicProxy.sol');

const assertRevert = require('./helpers/assertRevert');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Test that Stablecoin operates correctly as an Ownable token.
contract('Ownable Stablecoin', function([_, owner, anotherAccount, anotherAccount2]) {
  beforeEach(async function() {
    const stablecoin = await Stablecoin.new();
    const proxy = await Proxy.new(stablecoin.address);
    const proxiedStablecoin = await Stablecoin.at(proxy.address);
    await proxiedStablecoin.initialize({from: owner});
    this.token = proxiedStablecoin;
  });

  describe('as an ownable', function () {
    it('should have an owner', async function () {
      let currentOwner = await this.token.owner();
      assert.notEqual(currentOwner, ZERO_ADDRESS);
    });

    it('changes owner after transferOwnership', async function () {
      const {logs} = await this.token.transferOwnership(anotherAccount, {from: owner});
      let currentOwner = await this.token.owner();
      assert.equal(currentOwner, anotherAccount);

      // emits an OwnershipTransferred event
      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'OwnershipTransferred');
      assert.equal(logs[0].args.oldOwner, owner);
      assert.equal(logs[0].args.newOwner, anotherAccount);
    });

    it('should prevent non-owners from transfering ownership', async function () {
      const currentOwner = await this.token.owner();
      assert.notEqual(owner, anotherAccount2);
      await assertRevert(this.token.transferOwnership(anotherAccount2, { from: anotherAccount2 }));
    });

    it('should guard ownership against stuck state', async function () {
      let originalOwner = await this.token.owner();
      await assertRevert(this.token.transferOwnership(null, { from: originalOwner }));
    });
  });
});
