// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;


import { PaxosTokenV2 } from "../paxos-token-contracts/contracts/PaxosTokenV2.sol";

/**
 * @title USDP Smart contract
 * @dev This contract is a {PaxosTokenV2-PaxosTokenV2} ERC20 token.
 * @custom:security-contact smart-contract-security@paxos.com
 */
contract USDP is PaxosTokenV2 {
    /*
     * @dev Returns the name of the token.
     */
    function name() public view virtual override returns (string memory) {
        return "Pax Dollar";
    }

    /*
     * @dev Returns the symbol of the token.
     */
    function symbol() public view virtual override returns (string memory) {
        return "USDP";
    }

    /*
     * @dev Returns the decimal count of the token.
     */
    function decimals() public view virtual override returns (uint8) {
        return 18;
    }
}
