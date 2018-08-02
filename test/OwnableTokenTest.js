const Stablecoin = artifacts.require('../contracts/StablecoinImplementation.sol');
const Proxy = artifacts.require('../contracts/zeppelin/AdminUpgradeabilityProxy.sol');

const assertRevert = require('./helpers/assertRevert');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Test that Stablecoin operates correctly as an Ownable token.
contract('Ownable Stablecoin', function([_, admin, anotherAccount, anotherAccount2, owner]) {
  beforeEach(async function() {
    const stablecoin = await Stablecoin.new({from: owner});
    const proxy = await Proxy.new(stablecoin.address, {from: admin});
    const proxiedStablecoin = await Stablecoin.at(proxy.address);
    await proxiedStablecoin.initialize({from: owner});
    this.token = proxiedStablecoin;
    this.stablecoin = stablecoin;
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

  describe('as an initializable token', function () {
    it('you should not be able to initialize a second time', async function () {
      await assertRevert(this.token.initialize({from: owner}));
    });

    it('constructor initializes the implementation contract and pauses it to avoid misleading state there', async function() {
      const isPaused = await this.stablecoin.paused();
      assert.equal(isPaused, true);
      const currentOwner = this.stablecoin.owner();
      assert.notEqual(currentOwner, ZERO_ADDRESS);
      await assertRevert(this.stablecoin.initialize());
    });
  });
});
