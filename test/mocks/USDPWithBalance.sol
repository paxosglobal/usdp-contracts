pragma solidity ^0.8.17;

import "../../contracts/USDPImplementationV3.sol";


contract USDPWithBalance is USDPImplementationV3 {

    function initializeBalance(address initialAccount, uint initialBalance) public {
        balances[initialAccount] = initialBalance;
        totalSupply_ = initialBalance;
    }

}
