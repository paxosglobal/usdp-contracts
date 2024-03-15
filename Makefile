.PHONY:all
all: setup fmt compile flatten generate-bin test-contracts-coverage

.PHONY:clean
clean:
	@rm -r build/ || true

##################
# Code
##################

.PHONY:setup
setup:
	yarn install --ignore-optional

.PHONY:fmt
fmt:
	@npm run solhint

.PHONY:ganache
ganache:
	@npm run ganache

.PHONY:compile
compile:
	@truffle compile

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

# compile is needed as a dependency here to ensure the zos-lib based tests work
.PHONY:test-contracts
test-contracts: compile
	@npm test

# TODO: get tests to pass in coverage env
.PHONY:test-contracts-coverage
test-contracts-coverage:
	@npm run coverage
