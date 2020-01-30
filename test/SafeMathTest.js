// It's hard to get full test coverage on SafeMath testing just the Stablecoin contract.
// This is the openzeppelin-solidity test for add and sub as of the time of writing

const {BN, constants, expectRevert} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { MAX_UINT256 } = constants;

const SafeMathMock = artifacts.require('SafeMathMock');

contract('SafeMath', function () {
  beforeEach(async function () {
    this.safeMath = await SafeMathMock.new();
  });

  async function testCommutative (fn, lhs, rhs, expected) {
    expect(await fn(lhs, rhs)).to.be.bignumber.equal(expected);
    expect(await fn(rhs, lhs)).to.be.bignumber.equal(expected);
  }

  async function testFailsCommutative (fn, lhs, rhs, reason) {
    await expectRevert(fn(lhs, rhs), reason);
    await expectRevert(fn(rhs, lhs), reason);
  }


  describe('add', function () {
    it('adds correctly', async function () {
      const a = new BN('5678');
      const b = new BN('1234');

      await testCommutative(this.safeMath.add, a, b, a.add(b));
    });

    it('reverts on addition overflow', async function () {
      const a = MAX_UINT256;
      const b = new BN('1');

      await testFailsCommutative(this.safeMath.add, a, b, 'revert');
    });
  });

  describe('sub', function () {
    it('subtracts correctly', async function () {
      const a = new BN('5678');
      const b = new BN('1234');

      expect(await this.safeMath.sub(a, b)).to.be.bignumber.equal(a.sub(b));
    });

    it('reverts if subtraction result would be negative', async function () {
      const a = new BN('1234');
      const b = new BN('5678');

      await expectRevert(this.safeMath.sub(a, b), 'revert');
    });
  });
});
