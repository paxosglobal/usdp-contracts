const dotenv = require('dotenv');
require("@nomicfoundation/hardhat-ethers");
require('@nomicfoundation/hardhat-toolbox');
require('@openzeppelin/hardhat-upgrades');
require("hardhat-contract-sizer");

dotenv.config();

const {
  PRIVATE_KEY,
  NETWORK_URL,
  GAS_REPORTING,
  CHAINSCAN_API_KEY
} = process.env;

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    ethMain: {
      url: NETWORK_URL,
      ...(PRIVATE_KEY ? { accounts: [PRIVATE_KEY] } : {}),
    },
    ethSepolia: {
      url: NETWORK_URL,
      ...(PRIVATE_KEY ? { accounts: [PRIVATE_KEY] } : {}),
    },
    polygonMain: {
      url: NETWORK_URL,
      ...(PRIVATE_KEY ? { accounts: [PRIVATE_KEY] } : {}),
    },
    polygonMumbai: {
      url: NETWORK_URL,
      ...(PRIVATE_KEY ? { accounts: [PRIVATE_KEY] } : {}),
    },
    polygonAmoy: {
      url: NETWORK_URL,
      ...(PRIVATE_KEY ? { accounts: [PRIVATE_KEY] } : {}),
    },
  },
  gasReporter: {
    enabled: (GAS_REPORTING ? GAS_REPORTING == "true" : true),
  },
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.4.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
    ]
  },
  etherscan: {
    apiKey: CHAINSCAN_API_KEY,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};