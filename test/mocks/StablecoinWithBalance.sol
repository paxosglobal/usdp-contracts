pragma solidity ^0.4.24;

import "../../contracts/StablecoinImplementation.sol";


contract StablecoinWithBalance is StablecoinImplementation {

    function initializeBalance(address initialAccount, uint initialBalance) public {
        balances[initialAccount] = initialBalance;
        totalSupply_ = initialBalance;
    }

}
