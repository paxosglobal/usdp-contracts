.PHONY:all
all: test

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

.PHONY:test-contracts
test-contracts:
	@npm test

# TODO: get tests to pass in coverage env
.PHONY:test-contracts-coverage
test-contracts-coverage:
	@npm run coverage
