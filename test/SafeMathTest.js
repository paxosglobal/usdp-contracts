// It's hard to get full test coverage on SafeMath testing just the Stablecoin contract.
// This is the openzeppelin-solidity test for add and sub as of the time of writing

const {BN, constants, shouldFail} = require('openzeppelin-test-helpers');
const { MAX_UINT256 } = constants;

const SafeMathMock = artifacts.require('SafeMathMock');

contract('SafeMath', function () {
  beforeEach(async function () {
    this.safeMath = await SafeMathMock.new();
  });

  describe('add', function () {
    it('adds correctly', async function () {
      const a = new BN('5678');
      const b = new BN('1234');

      (await this.safeMath.add(a, b)).should.be.bignumber.equal(a.add(b));
    });

    it('reverts on addition overflow', async function () {
      const a = MAX_UINT256;
      const b = new BN('1');

      await shouldFail.reverting(this.safeMath.add(a, b));
    });
  });

  describe('sub', function () {
    it('subtracts correctly', async function () {
      const a = new BN('5678');
      const b = new BN('1234');

      (await this.safeMath.sub(a, b)).should.be.bignumber.equal(a.sub(b));
    });

    it('reverts if subtraction result would be negative', async function () {
      const a = new BN('1234');
      const b = new BN('5678');

      await shouldFail.reverting(this.safeMath.sub(a, b));
    });
  });
});
