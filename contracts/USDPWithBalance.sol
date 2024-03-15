// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { USDPImplementationV4 } from "./USDPImplementationV4.sol";


contract USDPWithBalance is USDPImplementationV4 {
    function initializeBalance(address initialAccount, uint256 initialBalance) public {
        balances[initialAccount] = initialBalance;
        totalSupply_ = initialBalance;
    }
}
