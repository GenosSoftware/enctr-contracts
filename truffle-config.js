const path = require("path");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const fs = require("fs");

var testNetMnemonic = "";
if (fs.existsSync(".secret.testnet")) {
  testNetMnemonic = fs.readFileSync(".secret.testnet").toString().trim();
}

module.exports = {
  contracts_build_directory: path.join(__dirname, "app/src/contracts"),
  networks: {
    develop: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    },
    testnet: {
      provider: () => new HDWalletProvider(testNetMnemonic, `https://data-seed-prebsc-1-s1.binance.org:8545`),
      network_id: 97,
      confirmations: 10,
      timeoutBlocks: 200,
      skipDryRun: true
    },
  },
  compilers: {
    solc: {
      version: "^0.8.0",
      settings: {
       optimizer: {
         enabled: true,
         runs: 200
        }
      },
    }
  }
};
