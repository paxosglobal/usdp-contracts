// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;


// This is used for truffle migrations / testing.

contract Migrations {
    uint256 public last_completed_migration; // solhint-disable-line var-name-mixedcase

    function setCompleted(uint256 completed) public {
        last_completed_migration = completed;
    }

    function upgrade(address newAddress) public {
        Migrations upgraded = Migrations(newAddress);
        upgraded.setCompleted(last_completed_migration);
    }
}
