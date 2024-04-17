const USDPMock = artifacts.require('USDPWithBalance.sol');
const Proxy = artifacts.require('AdminUpgradeabilityProxy.sol');

const assertRevert = require('./helpers/assertRevert');
const {ZERO_ADDRESS} = require('@openzeppelin/test-helpers').constants;

// Test that USDP operates correctly as an ERC20 token.
contract('ERC20 USDP', function ([_, admin, recipient, anotherAccount, owner]) {

  beforeEach(async function () {
    const usdp = await USDPMock.new({from: owner});
    const proxy = await Proxy.new(usdp.address, {from: admin});
    const proxiedUSDP = await USDPMock.at(proxy.address);
    await proxiedUSDP.initialize({from: owner});
    await proxiedUSDP.initializeBalance(owner, 100);
    this.token = proxiedUSDP;
  });

  describe('approve', function () {
    describe('when the spender is not the zero address', function () {
      const spender = recipient;

      describe('when the sender has enough balance', function () {
        const amount = 100;

        it('emits an approval event', async function () {
          const {logs} = await this.token.approve(spender, amount, {from: owner});

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eqn(amount));
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await this.token.approve(spender, amount, {from: owner});

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, 1, {from: owner});
          });

          it('approves the requested amount and replaces the previous one', async function () {
            await this.token.approve(spender, amount, {from: owner});

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, amount);
          });
        });
      });

      describe('when the sender does not have enough balance', function () {
        const amount = 101;

        it('emits an approval event', async function () {
          const {logs} = await this.token.approve(spender, amount, {from: owner});

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eqn(amount));
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await this.token.approve(spender, amount, {from: owner});

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, 1, {from: owner});
          });

          it('approves the requested amount and replaces the previous one', async function () {
            await this.token.approve(spender, amount, {from: owner});

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, amount);
          });
        });
      });
    });
    describe('when the spender is the zero address', function () {
      const amount = 100;
      const spender = ZERO_ADDRESS;

      it('approves the requested amount', async function () {
        await this.token.approve(spender, amount, {from: owner});

        const allowance = await this.token.allowance(owner, spender);
        assert.equal(allowance, amount);
      });

      it('emits an approval event', async function () {
        const {logs} = await this.token.approve(spender, amount, {from: owner});

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'Approval');
        assert.equal(logs[0].args.owner, owner);
        assert.equal(logs[0].args.spender, spender);
        assert(logs[0].args.value.eqn(amount));
      });
    });
  });

  describe('increase approval', function () {
    const spender = recipient;

    it('reverts when value to increase is zero', async function () {
      await assertRevert(this.token.increaseApproval(spender, 0, {from: owner}));
    });

    const amount = 100

    it('emits an approval event', async function () {
      const {logs} = await this.token.increaseApproval(spender, amount, {from: owner});

      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'Approval');
      assert.equal(logs[0].args.owner, owner);
      assert.equal(logs[0].args.spender, spender);
      assert.equal(logs[0].args.value, amount);
    });

    describe('when there was no approved amount before', function () {
      it('approves the requested amount', async function () {
        await this.token.increaseApproval(spender, amount, {from: owner});

        const allowance = await this.token.allowance(owner, spender);
        assert.equal(allowance, amount);
      });
    });

    describe('when the spender had an approved amount', function () {
      const approvedAmount = 1;
      beforeEach(async function () {
        await this.token.approve(spender, approvedAmount, {from: owner});
      });

      it('increases the spender allowance adding the requested amount', async function () {
        await this.token.increaseApproval(spender, amount, {from: owner});

        const allowance = await this.token.allowance(owner, spender);
        assert.equal(allowance, approvedAmount + amount);
      });
    });
  });

  describe('decrease approval', function () {
    const spender = recipient;
    
    it('reverts when value to decrease is zero', async function () {
      await assertRevert(this.token.decreaseApproval(spender, 0, {from: owner}));
    });
    
    const amount = 100

    describe('when the subtracted value is greater than the current allowance', function () {
      it('emits an approval event with a zero value', async function () {
        const {logs} = await this.token.decreaseApproval(spender, amount, {from: owner});

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'Approval');
        assert.equal(logs[0].args.owner, owner);
        assert.equal(logs[0].args.spender, spender);
        assert.equal(logs[0].args.value, 0);
      });
    });

    describe('when the subtracted value is less than or equal to the current allowance.', function () {
      const approvedAmount = 101;

      beforeEach(async function () {
        await this.token.approve(spender, approvedAmount, {from: owner});
      });

      it('emits an approval event', async function () {
        const {logs} = await this.token.decreaseApproval(spender, amount, {from: owner});

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'Approval');
        assert.equal(logs[0].args.owner, owner);
        assert.equal(logs[0].args.spender, spender);
        assert.equal(logs[0].args.value, approvedAmount - amount);
      });
    });
  });

  describe('transfer from', function () {
    const spender = recipient;

    describe('when the recipient is not the zero address', function () {
      const to = anotherAccount;

      describe('when the spender has enough approved balance', function () {
        beforeEach(async function () {
          await this.token.approve(spender, 100, {from: owner});
        });

        describe('when the owner has enough balance', function () {
          const amount = 100;

          it('transfers the requested amount', async function () {
            await this.token.transferFrom(owner, to, amount, {from: spender});

            const senderBalance = await this.token.balanceOf(owner);
            assert.equal(senderBalance, 0);

            const recipientBalance = await this.token.balanceOf(to);
            assert.equal(recipientBalance, amount);
          });

          it('decreases the spender allowance', async function () {
            await this.token.transferFrom(owner, to, amount, {from: spender});

            const allowance = await this.token.allowance(owner, spender);
            assert(allowance.eqn(0));
          });

          it('emits a transfer event', async function () {
            const {logs} = await this.token.transferFrom(owner, to, amount, {from: spender});

            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'Transfer');
            assert.equal(logs[0].args.from, owner);
            assert.equal(logs[0].args.to, to);
            assert(logs[0].args.value.eqn(amount));
          });
        });

        describe('when the owner does not have enough balance', function () {
          const amount = 101;

          it('reverts', async function () {
            await assertRevert(this.token.transferFrom(owner, to, amount, {from: spender}));
          });
        });
      });

      describe('when the spender does not have enough approved balance', function () {
        beforeEach(async function () {
          await this.token.approve(spender, 99, {from: owner});
        });

        describe('when the owner has enough balance', function () {
          const amount = 100;

          it('reverts', async function () {
            await assertRevert(this.token.transferFrom(owner, to, amount, {from: spender}));
          });
        });

        describe('when the owner does not have enough balance', function () {
          const amount = 101;

          it('reverts', async function () {
            await assertRevert(this.token.transferFrom(owner, to, amount, {from: spender}));
          });
        });
      });

      describe('transfer from batch', function () {
        beforeEach(async function () {
          await this.token.approve(spender, 100, {from: owner});
        });

        it('success case', async function () {
          batch = 10
          amount = 1
          let owners = Array(batch).fill(owner)
          let tos = Array(batch).fill(to)
          let amounts = Array(batch).fill(amount)
          const {logs} = await this.token.transferFromBatch(owners, tos, amounts, {from: spender});
          assert.equal(logs.length, batch);
          for (let i = 0 ; i < batch; i++) {
            assert.equal(logs[i].event, 'Transfer');
            assert.equal(logs[i].args.from, owner);
            assert.equal(logs[i].args.to, to);
            assert(logs[i].args.value.eqn(amount));
          }

          // Validate Balance.
          assert.equal(await this.token.balanceOf(owner), 90);
          assert.equal(await this.token.balanceOf(to), 10);
        });

        it('insufficient funds', async function() {
          batch = 10
          amount = 100
          let owners = Array(batch).fill(owner)
          let tos = Array(batch).fill(to)
          let amounts = Array(batch).fill(amount)
          await assertRevert(this.token.transferFromBatch(owners, tos, amounts, {from: spender}), "insufficient allowance");
        });

        it('reverts in case of bad parameters', async function() {
          batch = 10
          amount = 10
          let owners = Array(batch).fill(owner)
          let tos = Array(batch).fill(to)
          let amounts = Array(batch).fill(amount)

          // All test case validation is done in single test to avoid setup overhead.
          allParams = [owners, tos, amounts]
          assert(allParams.length==3, "incomplete check for the number of arguments to transfersFromBatch")
          for (let i = 0 ; i < allParams.length; i++) {
            const currentParam = allParams[i];
            val = currentParam.pop()
            await assertRevert(this.token.transferFromBatch(owners, tos, amounts, {from: spender}), "argument's length mismatch");
            currentParam.push(val)
          }
        });

      });

    });

    describe('when the recipient is the zero address', function () {
      const amount = 100;
      const to = ZERO_ADDRESS;

      beforeEach(async function () {
        await this.token.approve(spender, amount, {from: owner});
      });

      it('reverts', async function () {
        await assertRevert(this.token.transferFrom(owner, to, amount, {from: spender}));
      });
    });
  });
});
