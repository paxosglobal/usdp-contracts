const Stablecoin = artifacts.require('../contracts/StablecoinImplementation.sol');
const Proxy = artifacts.require('../contracts/ERC20BasicProxy.sol');

const StablecoinMock = artifacts.require('./mocks/StablecoinWithBalance.sol');

const assertRevert = require('./helpers/assertRevert');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Test that Stablecoin operates correctly as an Ownable token.
contract('Proxied Stablecoin', function([_, owner, anotherAccount]) {
  beforeEach(async function() {
    let stablecoin = await Stablecoin.new();
    const proxy = await Proxy.new(stablecoin.address);
    const proxiedStablecoin = await Stablecoin.at(proxy.address);
    this.token = proxiedStablecoin;
    await this.token.initialize({from: owner});
    this.stablecoin = stablecoin;
  });

  describe('as a proxied contract', function () {
    it('Can get the current implementation', async function () {
      const impl = await this.token.implementation();
      assert.equal(impl, this.stablecoin.address)
    });

    it('Can set a proxy implementation to a contract address', async function () {
      const stablecoinMock = await StablecoinMock.new();
      const {logs} = await this.token.upgradeTo(stablecoinMock.address ,{from: owner});
      const impl = await this.token.implementation();
      assert.equal(impl, stablecoinMock.address);

      // emits an Upgraded event
      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'Upgraded');
      assert.equal(logs[0].args.implementation, impl);
    });

    it('Cannot set a proxy implementation to a non-contract address', async function () {
      await assertRevert(this.token.upgradeTo(anotherAccount, {from: owner}));
    });

    it('Non-owner cannot set a proxy implementation', async function () {
      const stablecoinMock = await StablecoinMock.new();
      await assertRevert(this.token.upgradeTo(stablecoinMock.address ,{from: anotherAccount}));
    });

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
