// It's hard to get full test coverage on SafeMath testing just the Stablecoin contract.
// This is the openzeppelin-solidity test for add and sub as of the time of writing

const assertRevert = require('./helpers/assertRevert');
const BigNumber = web3.BigNumber;
const SafeMathMock = artifacts.require('./mocks/SafeMathMock');

contract('SafeMath', () => {
  const MAX_UINT = new BigNumber('115792089237316195423570985008687907853269984665640564039457584007913129639935');

  before(async function () {
    this.safeMath = await SafeMathMock.new();
  });

  describe('add', function () {
    it('adds correctly', async function () {
      const a = new BigNumber(5678);
      const b = new BigNumber(1234);

      const result = await this.safeMath.add(a, b);
      assert.deepEqual(result, a.plus(b));
    });

    it('throws an error on addition overflow', async function () {
      const a = MAX_UINT;
      const b = new BigNumber(1);

      await assertRevert(this.safeMath.add(a, b));
    });
  });

  describe('sub', function () {
    it('subtracts correctly', async function () {
      const a = new BigNumber(5678);
      const b = new BigNumber(1234);

      const result = await this.safeMath.sub(a, b);
      assert.deepEqual(result, a.minus(b));
    });

    it('throws an error if subtraction result would be negative', async function () {
      const a = new BigNumber(1234);
      const b = new BigNumber(5678);

      await assertRevert(this.safeMath.sub(a, b));
    });
  });
});
