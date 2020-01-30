const {Contracts, getStorageLayout, compareStorageLayouts} = require('@openzeppelin/upgrades');

const ImplV1Contract = Contracts.getFromLocal('PAXImplementation');
const ImplV2Contract = Contracts.getFromLocal('PAXImplementationV2');
const Proxy = artifacts.require('AdminUpgradeabilityProxy.sol');
const ImplV1 = artifacts.require('PAXImplementation.sol');
let ImplV2 = artifacts.require('PAXImplementationV2.sol');

//// For funsies! Uncomment this line and see that it fails because the memory layout is different
//// Note that the only difference from PAXImplementationV2 is that the new memory is declared first
//// A quicker test command is `truffle test ./test/UpgradeToV2Test.js ./test/mocks/BadV2UpgradeExample.sol`
////   0 passing (6s)
////   4 failing
// ImplV2 = artifacts.require('BadV2UpgradeExample.sol');

const BN = web3.utils.BN;

const assertRevert = require('./helpers/assertRevert');

// Testing an the upgrade is focused on testing the consistency of the memory model. The goal of this test is to
// read every piece of mutable data (constants are not in storage anyway) that exists in the V1 version
// and make sure it doesn't change in the upgrade.

// Below is the data that the V1 contract kept in it's storage

/**
 // INITIALIZATION DATA
 bool private initialized = false;

 // ERC20 BASIC DATA
 mapping(address => uint256) internal balances;
 uint256 internal totalSupply_;
 string public constant name = "PAX"; // solium-disable-line uppercase
 string public constant symbol = "PAX"; // solium-disable-line uppercase
 uint8 public constant decimals = 18; // solium-disable-line uppercase

 // ERC20 DATA
 mapping (address => mapping (address => uint256)) internal allowed;

 // OWNER DATA
 address public owner;

 // PAUSABILITY DATA
 bool public paused = false;

 // ASSET PROTECTION DATA
 address public assetProtectionRole;
 mapping(address => bool) internal frozen;

 // SUPPLY CONTROL DATA
 address public supplyController;
 */

// Test that PAX operates correctly as a token with DelegatedTransfer.
contract('UpgradeToV2 PAX', function (
  [_, admin, owner, supplyController, assetProtection, recipient, purchaser, holder, bystander, frozen]
) {

  const supply = new BN(1000);
  const amount = new BN(100);
  const subAmount = new BN(10);

  beforeEach(async function () {
    // set all types of data - roles, balances, approvals, freezes
    this.setData = async function (useLawEnforcment) {
      // set roles
      await this.token.setSupplyController(supplyController, {from: owner});
      if (useLawEnforcment) {
        await this.token.setLawEnforcementRole(assetProtection, {from: owner});
      } else {
        await this.newToken.setAssetProtectionRole(assetProtection, {from: owner});
      }

      // emulate some purchases and transfers
      await this.token.increaseSupply(supply, {from: supplyController});
      await this.token.transfer(purchaser, amount, {from: supplyController});
      await this.token.transfer(holder, amount, {from: supplyController});
      await this.token.transfer(recipient, 2 * subAmount, {from: purchaser});

      // emulate a redemption
      await this.token.transfer(supplyController, subAmount, {from: purchaser});
      await this.token.decreaseSupply(subAmount, {from: supplyController});

      // make an approval
      await this.token.approve(bystander, subAmount, {from: holder});

      // freeze someone
      await this.token.freeze(frozen, {from: assetProtection});
    };

    this.upgrade = async function () {
      this.paxV2 = await ImplV2.new({from: owner});
      const funcSig = web3.eth.abi.encodeFunctionSignature('initializeDomainSeparator()'); // 0x2ff79161
      await this.proxy.upgradeToAndCall(this.paxV2.address, funcSig, {from: admin});
    };

    this.checkData = async function () {
      assert.strictEqual(this.owner, await this.token.owner());
      assert.strictEqual(this.currentSC, await this.token.supplyController());
      assert.strictEqual(this.currentAP, await this.newToken.assetProtectionRole());
      assert.deepStrictEqual(this.sCBalance, await this.token.balanceOf(supplyController));
      assert.deepStrictEqual(this.purchaserBalance, await this.token.balanceOf(purchaser));
      assert.deepStrictEqual(this.holderBalance, await this.token.balanceOf(holder));
      assert.deepStrictEqual(this.bystanderApproval, await this.token.allowance(holder, bystander));
      assert.deepStrictEqual(this.frozenApproval, await this.token.allowance(holder, frozen)); // 0
      assert.strictEqual(this.bystanderFrozen, await this.token.isFrozen(bystander));
      assert.strictEqual(this.frozenFrozen, await this.token.isFrozen(frozen));
      assert.deepStrictEqual(this.totalSupply, await this.token.totalSupply());
      assert.strictEqual(this.paused, await this.token.paused());
      await assertRevert(this.token.initialize());
    };

    // deploy the contracts
    const paxV1 = await ImplV1.new({from: owner});
    const proxy = await Proxy.new(paxV1.address, {from: admin});
    const proxiedPAX = await ImplV1.at(proxy.address);
    await proxiedPAX.initialize({from: owner});
    this.token = proxiedPAX;
    this.newToken = await ImplV2.at(proxy.address);
    this.proxy = proxy;

    // set the data
    await this.setData(true);

    // read the data - note: the data here is always read before the upgrade

    this.currentSC = await this.token.supplyController();
    assert.strictEqual(this.currentSC, supplyController);
    this.currentAP = await this.token.lawEnforcementRole();
    assert.strictEqual(this.currentAP, assetProtection);

    // other things that shouldn't change
    this.owner = await this.token.owner();
    this.sCBalance = await this.token.balanceOf(supplyController);
    this.purchaserBalance = await this.token.balanceOf(purchaser);
    this.holderBalance = await this.token.balanceOf(holder);
    this.bystanderApproval = await this.token.allowance(holder, bystander);
    this.frozenApproval = await this.token.allowance(holder, frozen); // 0
    this.bystanderFrozen = await this.token.isFrozen(bystander);
    this.frozenFrozen = await this.token.isFrozen(frozen);
    this.totalSupply = await this.token.totalSupply();
    this.paused = await this.token.paused();
  });

  it('can survive and integration test when not paused', async function () {
    await this.upgrade();
    // check that the data on the contract is the same as what was read before the upgrade
    await this.checkData();

    // can still pause
    await this.token.pause({from: owner});
    this.paused = await this.token.paused();
    assert.isTrue(this.paused);
  });

  it('can survive and integration test when paused', async function () {
    // pause
    await this.token.pause({from: owner});
    this.paused = await this.token.paused();
    assert.isTrue(this.paused);

    await this.upgrade();
    // check that the data on the contract is the same as what was read before the upgrade
    await this.checkData();

    // unpause
    await this.token.unpause({from: owner});
    this.paused = await this.token.paused();
    assert.isFalse(this.paused);
  });

  it('gives the same result as if we upgraded first', async function () {
    // deploy new contracts
    const paxV1 = await ImplV1.new({from: owner});
    const proxy = await Proxy.new(paxV1.address, {from: admin});
    const proxiedPAX = await ImplV1.at(proxy.address);
    await proxiedPAX.initialize({from: owner});

    // make sure these are new contracts
    assert.notStrictEqual(this.token.address, proxiedPAX.address);
    assert.notStrictEqual(this.proxy.address, proxy.address);
    this.token = proxiedPAX;
    this.newToken = await ImplV2.at(proxiedPAX.address);
    this.proxy = proxy;

    await this.upgrade();

    // set the data on the new contracts after the upgrade this time
    await this.setData(false);
    // check that the data on the contract is the same as what was read before the upgrade
    await this.checkData();
  });

  function assertChanges(result, expectedChanges) {
    assert.deepStrictEqual(result, expectedChanges);

    // check that you are only appending
    result.forEach((change, index) => {
      if (!change.original || change.original.label != "lawEnforcementRole") {
        assert.strictEqual(change.action, 'append', "should only append variables to the previous contract's layout!");
      }
    })
  }

  // see https://github.com/ethereum/solidity/pull/4017#issuecomment-430715555 and https://github.com/zeppelinos/zos/pull/117
  // NOTE - comparison of the abstract syntax tree does not guarantee the compiled memory layout is identical
  // However, solidity does intend to keep it consistent - see https://github.com/ethereum/solidity/issues/4049
  //   also see the documentation on the storage layout pattern: https://github.com/ethereum/solidity/blob/599760b6ab6129797767e6bccfd2a6e842014d80/docs/miscellaneous.rst#layout-of-state-variables-in-storage
  it('has the same storage layout according to the AST-based tool from zeppelin os', function () {
    const layoutV1 = getStorageLayout(ImplV1Contract, ImplV1);
    const layoutV2 = getStorageLayout(ImplV2Contract);
    const comparison = compareStorageLayouts(layoutV1, layoutV2);

    // The only changes should be expected additions - note action = 'append'!
    assertChanges(comparison,
      [
        {
          "action": "rename",
          "original": {
            "astId": 1662,
            "contract": "PAXImplementation",
            "index": 6,
            "label": "lawEnforcementRole",
            "path": "contracts/archive/PAXImplementationV1.sol",
            "src": "2107:33:2",
            "type": "t_address",
          },
          "updated": {
            "astId": 71,
            "contract": "PAXImplementationV2",
            "index": 6,
            "label": "assetProtectionRole",
            "path": "contracts/PAXImplementationV2.sol",
            "src": "1474:34:1",
            "type": "t_address",
          }
        },
        {
          "action": "append",
          "updated": {
            "astId": 79,
            "contract": "PAXImplementationV2",
            "index": 9,
            "label": "proposedOwner",
            "path": "contracts/PAXImplementationV2.sol",
            "src": "1651:28:1",
            "type": "t_address"
          }
        },
        {
          "action": "append",
          "updated": {
            "astId": 81,
            "contract": "PAXImplementationV2",
            "index": 10,
            "label": "betaDelegateWhitelister",
            "path": "contracts/PAXImplementationV2.sol",
            "src": "1717:38:1",
            "type": "t_address"
          }
        },
        {
          "action": "append",
          "updated": {
            "astId": 85,
            "contract": "PAXImplementationV2",
            "index": 11,
            "label": "betaDelegateWhitelist",
            "path": "contracts/PAXImplementationV2.sol",
            "src": "1761:55:1",
            "type": "t_mapping<t_bool>"
          }
        },
        {
          "action": "append",
          "updated": {
            "astId": 89,
            "contract": "PAXImplementationV2",
            "index": 12,
            "label": "nextSeqs",
            "path": "contracts/PAXImplementationV2.sol",
            "src": "1822:45:1",
            "type": "t_mapping<t_uint256>"
          }
        },
        {
          "action": "append",
          "updated": {
            "astId": 104,
            "contract": "PAXImplementationV2",
            "index": 13,
            "label": "EIP712_DOMAIN_HASH",
            "path": "contracts/PAXImplementationV2.sol",
            "src": "2454:33:1",
            "type": "t_bytes32"
          }
        }
      ]
    );
  });
});
