// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { EIP2612 } from "./lib/EIP2612.sol";
import { EIP3009 } from "./lib/EIP3009.sol";
import { EIP712 } from "./lib/EIP712.sol";
import { USDPImplementationV3 } from "./USDPImplementationV3.sol";

/**
 * @title USDPImplementationV4
 * @dev this contract is a Pausable ERC20 token with Burn and Mint
 * controlled by a central SupplyController. By implementing USDPImplementationV4
 * this contract also includes external methods for setting
 * a new implementation contract for the Proxy.
 * NOTE: The storage defined here will actually be held in the Proxy
 * contract and all calls to this contract should be made through
 * the proxy, including admin actions done as owner or supplyController.
 * Any call to transfer against this contract should fail
 * with insufficient funds since no tokens will be issued there.
 */
contract USDPImplementationV4 is USDPImplementationV3, EIP2612, EIP3009 {
    constructor() {
        initializeEIP712DomainSeparator();
    }

    /**
     * @dev To be called when upgrading the contract using upgradeAndCall and during initialization of contract.
     */
    function initializeEIP712DomainSeparator() public {
        DOMAIN_SEPARATOR = EIP712.makeDomainSeparator("USDP", "1");
    }
}
