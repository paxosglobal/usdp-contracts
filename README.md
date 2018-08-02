# stablecoin
Paxos-issued USD-collateralized ERC20 stablecoin public smart contract repository.

## Contract Specification

TODO: Make this a full spec

### Quick Summary

Stablecoin is an ERC20Basic token that is Centrally Minted and Burned by Paxos,
representing the trusted party backing the token with USD.

It has a simple ownership model of one owner using OpenZeppelin's
[Ownable](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/5daaf60d11ee2075260d0f3adfb22b1c536db983/contracts/ownership/Ownable.sol),
and a simple model for pausing transfers using OpenZeppelin's
[Pausable](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/5daaf60d11ee2075260d0f3adfb22b1c536db983/contracts/lifecycle/Pausable.sol).
The model for the single SupplyController is similar to the owner model.

Finally, there is a delegation
layer that delegates to an implementation layer but all the data storage is actually
in the proxy layer since the implementation layer code is run in the proxy layer context.
The proxy used here is AdminUpgradeabilityProxy from zeppelinos/zos-lib

## Delegation Process

Deploy the new contract and then set the
new implementation by calling `upgradeTo` or `upgradeToAndCall` on the proxy. Be careful to test
that the new contracts memory model is consistent with the one already on the proxy.

## Contract Tests

To run smart contract tests first start 

`ganache-cli`

in another terminal

Then run 

`make test-contracts`

You can also run `make test-contracts-coverage` to see a coverage report.
