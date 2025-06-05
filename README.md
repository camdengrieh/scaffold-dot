# 🏗 Scaffold-DOT / Uniswap V2

A complete Uniswap V2 deployment toolkit built on Scaffold-ETH 2, featuring Solidity 8 compatibility and core logic from [uniswapv2-solc0.8](https://github.com/islishude/uniswapv2-solc0.8).

<h4 align="center">
  <a href="https://docs.scaffoldeth.io">Documentation</a> |
  <a href="https://scaffoldeth.io">Website</a>
</h4>

🧪 An open-source toolkit for deploying and interacting with Uniswap V2 contracts on the Polkadot ecosystem and other EVM-compatible networks. Perfect for building DEX applications, understanding AMM mechanics, or experimenting with DeFi protocols.

⚙️ Built using NextJS, RainbowKit, Foundry/Hardhat, Wagmi, Viem, and Typescript.

## ✨ Features

- ✅ **Complete Uniswap V2 Suite**: Factory, Router, and Pair contracts ready for deployment
- 🪝 **[Custom hooks](https://docs.scaffoldeth.io/hooks/)**: React hooks for seamless smart contract interactions with TypeScript autocompletion
- 🧱 **[Components](https://docs.scaffoldeth.io/components/)**: Pre-built web3 components for quick DEX frontend development
- 🔥 **Burner Wallet & Local Faucet**: Test your DEX with a burner wallet and local faucet
- 🔐 **Multi-Network Support**: Deploy on Polkadot ecosystem and major EVM networks
- 🚀 **Auto-Generated ABIs**: Automatic TypeScript generation for seamless frontend integration

## 🦄 Uniswap V2 Contracts

This project includes a complete Uniswap V2 implementation:

- **UniswapV2Factory**: Creates and manages trading pairs
- **UniswapV2Router**: Handles swaps, liquidity addition/removal
- **UniswapV2Pair**: Individual trading pair logic
- **Mock WETH**: Automatically deployed on unsupported networks

## Requirements

Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

## Quickstart

To get started with Scaffold-DOT Uniswap V2, follow the steps below:

1. Clone this repository:

```bash
git clone https://github.com/your-repo/scaffold-dot-uniswap-v2.git
cd scaffold-dot-uniswap-v2
yarn install
```

2. Run a local network in the first terminal:

```bash
yarn chain
```

This command starts a local Hardhat network for testing and development.

3. On a second terminal, deploy the Uniswap V2 contracts:

```bash
# Deploy all contracts (including Uniswap V2)
yarn deploy

# Or deploy only Uniswap V2 contracts
yarn deploy --tags UniswapV2
```

This deploys:
- Mock WETH (if needed)
- UniswapV2Factory
- UniswapV2Router

4. On a third terminal, start your NextJS app:

```bash
yarn start
```

Visit your app on: `http://localhost:3000`. You can interact with your deployed contracts using the `Debug Contracts` page.

## 🚀 Deployment Options

### Deploy Everything
```bash
yarn deploy
```

### Deploy Only Uniswap V2
```bash
yarn deploy --tags UniswapV2
```

### Deploy Individual Components
```bash
yarn deploy --tags Factory    # Factory only
yarn deploy --tags Router     # Router only
```

## 🌐 Network Support

The deployment script automatically handles:

- **WETH Detection**: Uses existing WETH on supported networks
- **Mock WETH**: Deploys mock WETH on unsupported networks
- **Multi-Chain**: Supports Ethereum, Polygon, Base, and Polkadot ecosystem

## 🛠 What's Next

After deployment, you can:

- **Create Trading Pairs**: Use the Factory to create new token pairs
- **Add Liquidity**: Provide liquidity through the Router
- **Execute Swaps**: Perform token swaps via the Router
- **Build Frontend**: Use Scaffold-ETH components for DEX UI
- **Monitor Activity**: Track transactions and pair creation

## 📚 Key Files

- `packages/hardhat/contracts/`: Uniswap V2 smart contracts
- `packages/hardhat/deploy/00_deploy_uniswap_v2.ts`: Main deployment script
- `packages/nextjs/contracts/`: Auto-generated contract ABIs
- `packages/nextjs/components/scaffold-eth/`: Reusable web3 components

## Documentation

Visit our [docs](https://docs.scaffoldeth.io) to learn all the technical details and guides of Scaffold-ETH.

To know more about its features, check out our [website](https://scaffoldeth.io).

## Contributing to Scaffold-DOT

We welcome contributions to Scaffold-DOT!

Please see [CONTRIBUTING.MD](https://github.com/scaffold-eth/scaffold-eth-2/blob/main/CONTRIBUTING.md) for more information and guidelines for contributing to Scaffold-DOT.
