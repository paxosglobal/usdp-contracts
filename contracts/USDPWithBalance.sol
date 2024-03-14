// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { USDPImplementationV3 } from "./USDPImplementationV3.sol";


contract USDPWithBalance is USDPImplementationV3 {
    function initializeBalance(address initialAccount, uint256 initialBalance) public {
        balances[initialAccount] = initialBalance;
        totalSupply_ = initialBalance;
    }
}
