pragma solidity ^0.4.24;

import "../../contracts/PAXImplementationV2.sol";


contract PAXWithBalance is PAXImplementationV2 {

    function initializeBalance(address initialAccount, uint initialBalance) public {
        balances[initialAccount] = initialBalance;
        totalSupply_ = initialBalance;
    }

}
