import * as dotenv from "dotenv";
dotenv.config();
import "@nomicfoundation/hardhat-chai-matchers";
import "@parity/hardhat-polkadot";
import "@nomicfoundation/hardhat-ethers";
import "hardhat-deploy-ethers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomicfoundation/hardhat-verify";
import "hardhat-deploy";
import { task } from "hardhat/config";

import generateTsAbis from "./scripts/generateTsAbis";

// If not set, it uses the hardhat account 0 private key.
// You can generate a random account with `yarn generate` or `yarn account:import` to import your existing PK
const deployerPrivateKey =
  process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
// If not set, it uses our block explorers default API keys.

const config = {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
      },
    ],
  },
  defaultNetwork: "passet",
  namedAccounts: {
    deployer: {
      // By default, it will take the first Hardhat account as the deployer
      default: 0,
    },
  },
  networks: {
    // View the networks that are pre-configured.
    // If the network you are looking for is not here you can add new network settings
    hardhat: {
      forking: {
        url: `https://testnet-passet-hub-eth-rpc.polkadot.io`,
        enabled: process.env.MAINNET_FORKING_ENABLED === "true",
      },
    },
    passet: {
      polkavm: true,
      url: `https://testnet-passet-hub-eth-rpc.polkadot.io`,
      accounts: [deployerPrivateKey],
    },
  },
  etherscan: {
    apiKey: {
      // Is not required by blockscout. Can be any non-empty string
      passet: "abc",
    },
    customChains: [
      {
        network: "passet",
        chainId: 420420421,
        urls: {
          apiURL: "https://blockscout-passet-hub.parity-testnet.parity.io/api",
          browserURL: "https://blockscout-passet-hub.parity-testnet.parity.io/",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
  resolc: {
    version: "1.5.2",
    compilerSource: "npm",
    settings: {
      optimizer: {
        enabled: true,
        parameters: "z",
        fallbackOz: true,
        runs: 200,
      },
    },
  },
};

// Extend the deploy task
task("deploy").setAction(async (args: any, hre: any, runSuper: (arg0: any) => any) => {
  // Run the original deploy task
  await runSuper(args);
  // Force run the generateTsAbis script
  await generateTsAbis(hre);
});

export default config;
