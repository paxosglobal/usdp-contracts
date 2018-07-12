pragma solidity ^0.4.24;

// The events for Stablecoin are declared both in the implementation and the proxy
interface StablecoinEventInterface {
    // ERC20 BASIC EVENTS
    event Transfer(address indexed from, address indexed to, uint256 value);

    // OWNABLE EVENTS
    event OwnershipTransferred(
        address indexed oldOwner,
        address indexed newOwner
    );

    // PAUSABLE EVENTS
    event Pause();
    event Unpause();

    // SUPPLY CONTROL EVENTS
    event SupplyIncreased(address indexed to, uint256 value);
    event SupplyDecreased(address indexed from, uint256 value);
    event SupplyControllerSet(
        address indexed oldSupplyController,
        address indexed newSupplyController
    );

    // UPGRADEABILITY EVENTS
    event Upgraded(address implementation);
}
