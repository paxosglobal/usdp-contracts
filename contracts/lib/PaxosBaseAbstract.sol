// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/**
 * @dev PaxosBaseAbstract
 * An abstract contract for Paxos tokens with additional internal functions.
 */
abstract contract PaxosBaseAbstract {
    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual;

    function _transfer(
        address _from,
        address _to,
        uint256 _value
    ) internal virtual;

    function isPaused() internal view virtual returns (bool);

    function isAddrFrozen(address _addr) internal view virtual returns (bool);

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     */
    modifier whenNotPaused() {
        require(!isPaused(), "whenNotPaused");
        _;
    }
}
