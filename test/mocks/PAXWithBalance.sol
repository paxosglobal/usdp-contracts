pragma solidity ^0.4.24;

import "../../contracts/PAXImplementation.sol";


contract PAXWithBalance is PAXImplementation {

    function initializeBalance(address initialAccount, uint initialBalance) public {
        balances[initialAccount] = initialBalance;
        totalSupply_ = initialBalance;
    }

}
