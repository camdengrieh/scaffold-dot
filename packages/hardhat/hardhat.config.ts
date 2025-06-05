import '@parity/hardhat-polkadot';
import "@nomicfoundation/hardhat-toolbox";
import '@nomicfoundation/hardhat-ignition-ethers';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import { HardhatUserConfig } from 'hardhat/types';
import { task } from 'hardhat/config';
import generateTsAbis from './scripts/generateTsAbis';
import * as dotenv from 'dotenv';
dotenv.config();

// Custom task for generating TypeScript ABIs
task("generate-abis", "Generate TypeScript ABI definitions for Scaffold-ETH 2")
  .setAction(async (taskArgs, hre) => {
    console.log("🚀 Generating TypeScript ABI definitions...");
    try {
      await generateTsAbis(hre);
      console.log("✅ TypeScript ABI generation completed successfully!");
    } catch (error) {
      console.error("❌ Error generating TypeScript ABIs:", error);
      throw error;
    }
  });

// Optional: Create a deployment pipeline task that runs both deploy and generate-abis
task("deploy-and-generate", "Deploy contracts and generate TypeScript ABIs")
  .setAction(async (taskArgs, hre) => {
    console.log("🚀 Running deployment pipeline...");
    
    // Run the original deploy command
    await hre.run("deploy", taskArgs);
    
    // Generate TypeScript ABIs after deployment
    await hre.run("generate-abis");
    
    console.log("✅ Deployment pipeline completed successfully!");
  });

const config: HardhatUserConfig = {
    solidity: '0.8.28',
    networks: {
        hardhat: {
            allowUnlimitedContractSize: false,
        },
        westend: {
            url: 'wss://westend-rpc.polkadot.io',
            polkavm: true,
            accounts: [process.env.POLKADOT_PRIVATE_KEY || ''],
        },
        passet: {
            url: 'https://testnet-passet-hub-eth-rpc.polkadot.io',
            polkavm: true,
            accounts: [process.env.POLKADOT_PRIVATE_KEY || ''],
        },
        sepolia: {
            url: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
        },
        polygon: {
            url: 'wss://polygon-bor-rpc.publicnode.com',
        },
        base: {
            url: 'https://mainnet.base.org',
        },
    },
    resolc: {
        version: '1.5.2',
        compilerSource: 'npm',
        settings: {
          optimizer: {
            enabled: true,
            parameters: 'z',
            fallbackOz: true,
            runs: 200,
          },
        },
      },

};

export default config;