var HDWalletProvider = require("@truffle/hdwallet-provider");
const mnemonic = "<your-mnemonic>";
const walletChildNum = 0;
const networkAddressMainnet = "https://mainnet.infura.io/v3/<your-api-key>";
const networkAddressTestnet = "https://goerli.infura.io/v3/<your-api-key>";
const Web3 = require("web3");

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  plugins: ["solidity-coverage"],
  networks: {
    development: {
      provider: function() {
        // ganache-cli started at http://127.0.0.1:8545/ by default
        return new Web3.providers.HttpProvider("http://127.0.0.1:8545")
      },
      network_id: '*', // Match any network id
      gas: 6700000,
      gasPrice: 0x01,
      disableConfirmationListener: true
    },
    coverage: {
      provider: function() {
        return new Web3.providers.HttpProvider("http://127.0.0.1:8555")
      },
      port: 8555,
      gas: 10000000000000,
      gasPrice: 0x01,
      disableConfirmationListener: true
    },
    mainnet: {
      network_id: 1,
      provider: function() {
        return new HDWalletProvider(mnemonic, networkAddressMainnet, walletChildNum)
      }
    },
    sepolia: {
      provider: function() {
        return new HDWalletProvider(mnemonic, networkAddressTestnet, walletChildNum)
      },
      network_id: 5,
      gas: 4000000
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  compilers: {
    solc: {
      version: "v0.8.17+commit.8df45f5f" // Freeze solidity version
    }
  }
};
