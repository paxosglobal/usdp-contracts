pragma solidity ^0.4.24;
pragma experimental "v0.5.0";


import "./zeppelin/AddressUtils.sol";


// The upgradeability pattern used here draws heavily from from ZeppelinOS
// AdminUpgradeabilityProxy and the contracts it inherits from.
// The main difference here is the external upgrade function is only
// implemented in the Implementation contract, which inherits the Proxy Storage.
// This way the Proxy contract only does delegation
// See https://github.com/zeppelinos/zos-lib/tree/master/contracts/upgradeability

/**
 * @title UpgradeabilityStorage
 * @dev This is an abstract contract to be inherited by the
 * Proxy and also the Implementation contract so that they agree on
 * the storage of what the implementation contract address is.
 */
contract UpgradeabilityStorage {
    // This memory slot is random so that
    // the risk of collision with some other memory
    // slot in our implementation contract is exceedingly low and
    // in any case will be tested for.
    bytes32 private constant IMPLEMENTATION_SLOT = 0x7c1cded848eabd8a60d94bd67445d2326d086da486fef295645c7904d7dd00c2;


    /**
     * @dev Returns the current implementation.
     * @return Address of the current implementation
     */
    function _implementation() internal view returns (address impl) {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }
    }

    /**
     * @dev Sets the implementation address of the proxy.
     * @param newImplementation Address of the new implementation.
     */
    function _setImplementation(address newImplementation) internal {
        require(AddressUtils.isContract(newImplementation), "Cannot set a proxy implementation to a non-contract address");

        bytes32 slot = IMPLEMENTATION_SLOT;

        assembly {
            sstore(slot, newImplementation)
        }
    }
}
