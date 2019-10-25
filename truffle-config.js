/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * truffleframework.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like truffle-hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

const HDWalletProvider = require("truffle-hdwallet-provider");
// const infuraKey = "fj4jll3k.....";
//
const fs = require("fs");
const privateKeyOrMnemonic = fs.existsSync(".privateKey")
  ? fs
      .readFileSync(".privateKey")
      .toString()
      .split(",")
  : undefined;

module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */

  networks: {
    // Useful for testing. The `development` name is special - truffle uses it by default
    // if it's defined here and no other network is specified at the command line.
    // You should run a client (like ganache-cli, geth or parity) in a separate terminal
    // tab if you use this network and you must also set the `host`, `port` and `network_id`
    // options below to some value.
    //
    development: {
      // used for local dev
      gas: 6721974,
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" // Match any network id
    },

    // Another network with more advanced options...
    // advanced: {
    // port: 8777,             // Custom port
    // network_id: 1342,       // Custom network
    // gas: 8500000,           // Gas sent with each transaction (default: ~6700000)
    // gasPrice: 20000000000,  // 20 gwei (in wei) (default: 100 gwei)
    // from: <address>,        // Account to send txs from (default: accounts[0])
    // websockets: true        // Enable EventEmitter interface for web3 (default: false)
    // },
    // Useful for deploying to a public network.
    // NB: It's important to wrap the provider as a function.
    mainnet: {
      provider: () =>
        new HDWalletProvider(
          privateKeyOrMnemonic,
          `https://mainnet.infura.io/v3/c13019f552f542188c0b0cdfaeb76cc4`,
          0,
          2
        ),
      network_id: "1",
      confirmations: 1,
      gas: 6400000,
      gasPrice: 1000100000, // 1.0001GWEI
      skipDryRun: true
    },
    rinkeby: {
      provider: () =>
        new HDWalletProvider(
          privateKeyOrMnemonic,
          `https://rinkeby.infura.io/v3/c13019f552f542188c0b0cdfaeb76cc4`,
          0,
          2
        ),
      network_id: "4", // Network Id for Rinkeby
      confirmations: 1,
      gas: 6400000,
      gasPrice: 5000000000, // 5GWEI
      skipDryRun: true
    },
    ropsten: {
      provider: () =>
        new HDWalletProvider(
          privateKeyOrMnemonic,
          `https://ropsten.infura.io/v3/c13019f552f542188c0b0cdfaeb76cc4`,
          0,
          2
        ),
      network_id: "3", // Network Id for Ropsten
      confirmations: 1,
      gas: 6400000,
      gasPrice: 5000000000, // 5GWEI
      skipDryRun: true
    }

    // Useful for private networks
    // private: {
    // provider: () => new HDWalletProvider(mnemonic, `https://network.io`),
    // network_id: 2111,   // This network is yours, in the cloud.
    // production: true    // Treats this network as if it was a public net. (default: false)
    // }
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000,
    enableTimeouts: false
    //reporter: "eth-gas-reporter" (breaking deploy script and very slow)
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.5.10", // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {
        // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200
        }
        //  evmVersion: "byzantium"
      }
    }
  }
};
