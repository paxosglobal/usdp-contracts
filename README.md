# Paxos Standard (PAX)
Paxos-issued USD-collateralized ERC20 stablecoin public smart contract repository.

https://www.paxos.com/standard

The whitepaper can be found [here](https://standard.paxos.com/whitepaper.pdf).

## ABI, Address, and Verification

The contract abi is in `PAX.abi`. It is the abi of the implementation contract.
Interaction with PAX Standard is done at the address of the proxy at `0x8e870d67f660d95d5be530380d0ec0bd388289e1`. See
https://etherscan.io/token/0x8e870d67f660d95d5be530380d0ec0bd388289e1 for live on-chain details, and the section on bytecode verification below.
See also our independent security audits by [Nomic Labs](https://medium.com/nomic-labs-blog/paxos-standard-pax-audit-report-ca743c9575dc)
and [ChainSecurity](https://medium.com/chainsecurity/paxos-standard-audit-completed-2e9a0064e8bb).

## Contract Specification

Paxos Standard (PAX) is an ERC20 token that is Centrally Minted and Burned by Paxos,
representing the trusted party backing the token with USD.

### ERC20 Token

The public interface of PAX Standard is the ERC20 interface
specified by [EIP-20](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md).

- `name()`
- `symbol()`
- `decimals()`
- `totalSupply()`
- `balanceOf(address who)`
- `transfer(address to, uint256 value)`
- `approve(address spender, uint256 value)`
- `allowance(address owner, address spender)`
- `transferFrom(address from, address to, uint256 value)`

And the usual events.

- `event Transfer(address indexed from, address indexed to, uint256 value)`
- `event Approval(address indexed owner, address indexed spender, uint256 value)`

Typical interaction with the contract will use `transfer` to move the token as payment.
Additionally, a pattern involving `approve` and `transferFrom` can be used to allow another 
address to move tokens from your address to a third party without the need for the middleperson 
to custody the tokens, such as in the 0x protocol.

### Controlling the token supply

The total supply of PAX is backed by fiat held in reserve at Paxos.
There is a single `supplyController` address that can mint and burn the token
based on the actual movement of cash in and out of the reserve based on
requests for the purchase and redemption of PAX.

The supply control interface includes methods to get the current address
of the supply controller, and events to monitor the change in supply of PAX.

- `supplyController()`

Supply Control Events

- `SupplyIncreased(address indexed to, uint256 value)`
- `SupplyDecreased(address indexed from, uint256 value)`
- `SupplyControllerSet(address indexed oldSupplyController, address indexed newSupplyController)`

### Pausing the contract

In the event of a critical security threat, Paxos has the ability to pause transfers
and approvals of the PAX token. The ability to pause is controlled by a single `owner` role,
 following OpenZeppelin's
[Ownable](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/5daaf60d11ee2075260d0f3adfb22b1c536db983/contracts/ownership/Ownable.sol). 
The simple model for pausing transfers following OpenZeppelin's
[Pausable](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/5daaf60d11ee2075260d0f3adfb22b1c536db983/contracts/lifecycle/Pausable.sol).

### Law Enforcement Role

As required by our regulators, we have introduced a role for law enforcement to freeze or seize the assets of a criminal party when required to do so by law, including by court order or other legal process.

The `lawEnforcementRole` can freeze and unfreeze the PAX balance of any address on chain.
It can also wipe the balance of an address after it is frozen
to allow the appropriate authorities to seize the backing assets. 

Freezing is something that Paxos will not do on its own accord,
and as such we expect to happen extremly rarely. The list of frozen addresses is avaialable
in `isFrozen(address who)`.

### Upgradeability Proxy

To facilitate upgradeability on the immutable blockchian we follow a standard
two-contract delegation pattern: a proxy contract represents the token,
while all calls not involving upgrading the contract are delegated to an 
implementation contract. 

The delegation uses `delegatecall`, which runs the code of the implementation contract
_in the context of the proxy storage_. This way the implementation pointer can
be changed to a different implementation contract while still keeping the same
data and PAX contract address, which are really for the proxy contract.

The proxy used here is AdminUpgradeabilityProxy from ZeppelinOS.

## Upgrade Process

The implementation contract is only used for the logic of the non-admin methods.
A new implementation contract can be set by calling `upgradeTo()` or `upgradeToAndCall()` on the proxy,
where the latter is used for upgrades requiring a new initialization or data migration so that
it can all be done in one transaction. You must first deploy a copy of the new implementation
contract, which is automatically paused by its constructor to help avoid accidental calls directly
to the proxy contract.

## Bytecode verification

The proxy contract and impelemtnation contracts are verified on etherscan at the following links:
https://etherscan.io/token/0x8e870d67f660d95d5be530380d0ec0bd388289e1
https://etherscan.io/token/0x6ffcb0f00c3ad2575e443152d8861aec1bda9ce6

Because the implementation address in the proxy is a private variable, 
verifying that this is the proxy being used requires reading contract
storage directly. This can be done using a mainnet node, such as infura,
by pasting the network address in `truffle.js` and running 

`truffle exec ./getImplementationAddress.js --network mainnet`

## Contract Tests

To run smart contract tests first start 

`ganache-cli`

in another terminal

Then run 

`make test-contracts`

You can also run `make test-contracts-coverage` to see a coverage report.
