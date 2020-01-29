.PHONY:all
all: fmt test-contracts compile flatten abi test-contracts-coverage

.PHONY:clean
clean:
	@rm -r out/ || true

##################
# Code
##################

.PHONY:fmt
fmt:
	@npm run solium

.PHONY:ganache
ganache:
	@npm run ganache

.PHONY:compile
compile:
	@npm run compile

.PHONY:generate-bin
generate-bin: compile
	@npm run truffle-abi
	@npm run truffle-bin

.PHONY:migrate
migrate:
	@npm run migrate

.PHONY:flatten
flatten:
	@npm run flatten-impl
	@npm run flatten-proxy

.PHONY:abi
abi:
	@npm run abi

# compile is needed as a dependency here to ensure the zos-lib based tests work
.PHONY:test-contracts
test-contracts: compile
	@npm test

# TODO: get tests to pass in coverage env
.PHONY:test-contracts-coverage
test-contracts-coverage:
	@npm run coverage
