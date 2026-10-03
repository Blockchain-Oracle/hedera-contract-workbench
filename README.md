# Contract Workbench

A local Scaffold HBAR template for **already deployed Hedera EVM contracts**. Import a contract and its ABI once, then use the same typed catalog through browser forms, CLI, MCP, and an optional assistant. The browser wallet signs transactions on testnet and mainnet.

## Quickstart

Use Node 24 LTS and npm 10.9.3 (the pinned package manager). If your Node installation includes another npm version, use `npx --yes npm@10.9.3 install` for the installation step below. No wallet, secrets, or contract deployment are needed for the bundled testnet read.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:3000**. Select `factory()` in the SaucerSwap testnet router and click **Read function**, or open **Swap example** and get a live HBAR → SAUCE quote. Public RPC availability can affect reads; `doctor` reports endpoint failures.

The repository is prepared for the technical template identifier `Blockchain-Oracle/hedera-contract-workbench`. Publication and external scaffold verification are recorded separately in [the delivery tracker](docs/DELIVERY.md). Until published, use this checkout; no similarly named npm package is required.

## Import your contract

Use **Import contract** in the browser: select its deployment network and enter its EVM address or Hedera contract ID. Verified ABI discovery uses Sourcify. If no verified ABI is available, upload an ABI array or a Solidity artifact containing `abi`. Imports persist in `workbench.config.local.json`, outside version control. Importing does not deploy or copy a contract to another network.

```sh
npm run --silent workbench -- contracts import --network testnet --address 0.0.19264 --abi docs/examples/router.abi.json --name 'My router'
npm run --silent workbench -- contracts list --json
```

## Use the CLI

The first CLI run builds the shared runtime if needed. Human output uses restrained colors and guided import prompts in an interactive terminal. Automation never prompts with `--json`; use `--yes` for removal.

```sh
npm run --silent workbench -- doctor --json
npm run --silent workbench -- tools list --contract saucerswap-testnet --json
npm run --silent workbench -- tools inspect TOOL_ID --json
printf '{}' | npm run --silent workbench -- tools call TOOL_ID --args-file - --json
```

Discover actual tool IDs; do not copy placeholder IDs. Full signatures distinguish overloads. ABI integers are **decimal strings** across JSON, tuples are objects with the advertised keys, and arrays retain their order. Native `--value-hbar` is separate from ABI integer arguments and permits 8 decimal places.

CLI, MCP, and chat simulate and prepare unsigned plans. They do not hold signing keys or send transactions. A preparation result includes a wallet-review URL. Keep `npm run dev` running, open that URL, connect the specified account on the specified chain, and approve the exact transaction in your wallet. Plans expire after five minutes.

[CLI and machine protocol](docs/CLI.md) · [MCP and skill setup](docs/AGENTS.md) · [Architecture](docs/ARCHITECTURE.md)

## Wallet and protocol example

Use an injected **EVM** wallet configured for Hedera testnet (296) or mainnet (295). The app can request a network switch. Both networks support reads, simulation, and wallet-approved transactions; testnet is selected by default.

The guided SaucerSwap V1 workflow gets a live quote, verifies caller-scoped SAUCE association, prepares association if needed, then refreshes and prepares an HBAR → SAUCE swap. Default slippage is **0.5%**; changing it invalidates the quote and review. The exact minimum output and deadline appear in the wallet drawer. Have enough HBAR for value and network fees. [Get testnet HBAR](https://portal.hedera.com).

The router handles the native HBAR path. The guided workflow does not wrap WHBAR directly or request WHBAR allowance. [SaucerSwap advisory](https://docs.saucerswap.finance/developers/whbar/overview), [HRC-719](https://github.com/hiero-ledger/hiero-improvement-proposals/blob/main/HIP/hip-719.md).

A returned transaction hash is saved immediately in browser recovery storage and the workspace journal. Receipt status and mirror indexing are separate. Pending status or a timeout never triggers automatic resubmission.

## Optional assistant

Copy `packages/nextjs/.env.example` to `.env.local` in that directory. Configure either OpenAI or Anthropic plus an explicit model ID, then restart. Credentials remain server-side. Provider errors leave deterministic functions available. The assistant uses a fixed set of result components; model-generated code is never executed.

## Development

```sh
npm run build        # core → CLI/MCP → local Solidity compile → Next
npm run lint
npm run typecheck
npm test
npm run format
```

Solidity compilation uses the pinned local solc package and needs no compiler download. The original `Observation.sol` example demonstrates tuple arguments/results, overloads, custom errors, and caller-scoped writes. Its optional maintainer deployment is documented separately; first launch uses existing protocol deployments.

[Configuration and troubleshooting](docs/CONFIGURATION.md) · [ABI provenance and support matrix](docs/SUPPORT.md) · [Optional hosting](docs/HOSTING.md) · [Evidence and release checklist](docs/DELIVERY.md)

MIT licensed. Scaffold HBAR conventions and compatible UI primitives are retained. Third-party source attribution is listed in [NOTICE](NOTICE.md).
