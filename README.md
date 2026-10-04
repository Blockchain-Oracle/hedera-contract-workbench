# Contract Workbench

A local Scaffold HBAR template for **already deployed Hedera EVM contracts**. Import a contract and its ABI once, then use the same typed catalog through browser forms, CLI, MCP, and an optional assistant. The browser wallet signs transactions on testnet and mainnet.

## Quickstart

Use Node 24 LTS and npm 10.9.3 (the pinned package manager). If your Node installation includes another npm version, use `npx --yes npm@10.9.3 install` for the installation step below. No wallet, secrets, or contract deployment are needed for the bundled testnet read.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:3000** for the product home, then choose **Open workspace**. In `/workbench`, select `factory()` in the bundled testnet router and click **Run function**. Public RPC availability can affect reads; `doctor` reports endpoint failures.

The repository is prepared for the technical template identifier `Blockchain-Oracle/hedera-contract-workbench`. Publication and external scaffold verification are recorded separately in [the delivery tracker](docs/DELIVERY.md). Until published, use this checkout; no similarly named npm package is required.

The reusable browser interface follows the measured Slush blue shell and light/dark surfaces, with green testnet and blue mainnet accents. Accounts opens from the sidebar footer; actual installed EVM wallets provide connection and signing. Imported supported ABIs inherit the same forms, result cards and review drawers. [Design authority, rendered evidence and known limits](docs/design/2026-10-04-slush-fidelity.md).

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

## Wallet transactions and protocol adapters

Use an injected **EVM** wallet configured for Hedera testnet (296) or mainnet (295). The app can request a network switch. Both networks support reads, simulation, and wallet-approved transactions; testnet is selected by default.

The workspace stays generic: there is no permanent Swap tab. A selected router exposes its swap functions from its ABI; another contract exposes its own functions. Read/Write list pills and transaction-file upload are removed. CLI, MCP and assistant preparations still open an exact wallet review at `/workbench?plan=…`; older root review links redirect there.

SaucerSwap remains a bundled ABI example and an optional core/CLI protocol adapter, including quote, explicit slippage/deadline and caller-scoped HRC-719 association checks. These adapters do not add a swap interface to unrelated contracts. The router handles the native HBAR path. [SaucerSwap advisory](https://docs.saucerswap.finance/developers/whbar/overview), [HRC-719](https://github.com/hiero-ledger/hiero-improvement-proposals/blob/main/HIP/hip-719.md).

A returned transaction hash is saved immediately in browser recovery storage and the workspace journal. Receipt status and mirror indexing are separate. Pending status or a timeout never triggers automatic resubmission.

## Optional assistant

The home and workspace share a real contract-scoped composer. Without configuration it is disabled and offers provider-specific setup instructions. Copy `packages/nextjs/.env.example` to `.env.local` in that directory. Configure OpenAI, Anthropic or Gemini plus an explicit compatible model ID, then restart. Credentials remain server-side. Provider errors leave deterministic functions available. The assistant uses a fixed set of result components; model-generated code is never executed. Audio is excluded at the user's request.

## Give your agent the current contract tools

The same portable skill works after importing a different ABI. It discovers current schemas rather than hardcoding token functions. Install with the official Vercel skills CLI:

```sh
npx --yes skills@1.7.0 add ./skills/hedera-contract-workbench --agent codex claude-code cursor --copy --yes
npm run --silent workbench -- skills show --contract CONTRACT_ID --json
npm run --silent workbench -- skills export --contract CONTRACT_ID --json
```

In the browser, open **Agent access** for the selected contract to read/download SKILL.md, copy a local installation command, inspect schemas and edit argument examples. Selecting another contract reloads its current tools. Use an actual contract alias from `contracts list`. `show` provides Markdown, typed argument examples and copyable commands. `export` bundles the portable skill with its current catalog and workspace location for another agent/project. Inspect again before execution and fill intended arguments. [Local installation and agent setup](docs/AGENTS.md).

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
