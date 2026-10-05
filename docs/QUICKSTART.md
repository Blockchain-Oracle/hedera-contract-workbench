# Run your own workbench

The public preview offers real bundled contract reads and unsigned simulation. Your local template includes contract import, persistent catalogs, CLI, MCP, a portable agent skill, optional AI chat and browser wallet transactions on testnet and mainnet.

## Install and launch

Use Node 24 LTS and npm 10.9.3. No wallet, private key or model key is needed to start.

```sh
git clone https://github.com/Blockchain-Oracle/hedera-contract-workbench.git
cd hedera-contract-workbench
npx --yes npm@10.9.3 ci
npm run dev
```

Open `http://127.0.0.1:3000`. Choose the testnet example, select `factory()`, and run the function. The result comes from Hedera JSON-RPC.

## Use the official Scaffold HBAR generator

Configure your own Git name and email first. The generator checks Git identity even when installation is skipped.

```sh
npx --yes create-scaffold-hbar@0.4.1 my-workbench --template Blockchain-Oracle/hedera-contract-workbench --frontend nextjs-app --solidity-framework hardhat --network testnet --package-manager npm --yes --skip-hedera-skills
cd my-workbench
npm run dev
```

The generator currently rewrites package-manager metadata to npm 10.0.0. Our compatibility verification uses ordinary npm 10.9.3 installation; it does not rely on `--legacy-peer-deps`. The five workspaces and workbench commands survive generation.

## Bring another deployed contract

Select **Import contract**, choose the matching network and enter an EVM address or Hedera contract ID. The importer tries verified ABI discovery. Supply an ABI or artifact JSON when discovery is unavailable. Function forms, tools and skills come from the same ABI; the template does not classify contracts into token, NFT or DAO categories.

All ABI integers use decimal strings in JSON, including token IDs. Inspect the current schema before constructing arguments. Getter suggestions help discover existing values but do not invent IDs or recipients.

## Use the terminal or your agent

```sh
npm run --silent workbench -- contracts list --json
npm run --silent workbench -- tools list --contract saucerswap-testnet --json
npm run --silent workbench -- skills show --contract saucerswap-testnet --json
npm run --silent workbench -- mcp config --json
```

Open **Agent access** in the local app for current commands, argument templates, Markdown and host setup. The portable skill works across imported ABIs by inspecting the current catalog. See [CLI commands](CLI.md) and [agent setup](AGENTS.md).

## Wallets and optional chat

Ordinary reads omit the connected wallet as caller. Caller-specific reads and simulation require an existing account on the selected network. For transactions, inspect the exact unsigned plan and approve it in your browser wallet; CLI, MCP and chat never sign.

Chat uses your server-side OpenAI, Anthropic or Gemini configuration with an explicit model ID. Keys belong in ignored local configuration. See [configuration](CONFIGURATION.md). Missing keys leave deterministic functions available.

## Current release status

This is a source preview with installation and execution evidence, not a claim of completed bounty acceptance. Funded Hedera testnet wallet acceptance and a current video demo remain outstanding. See [submission readiness](SUBMISSION.md) and [verification tracker](DELIVERY.md).
