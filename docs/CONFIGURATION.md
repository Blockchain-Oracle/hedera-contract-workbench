# Configuration and troubleshooting

Node 24 LTS and npm 10.9.3 (pinned). Use `npx --yes npm@10.9.3 install` if needed; npm scripts work with the host npm. `nvm use` reads .nvmrc if nvm is installed. `npm install` is ordinary dependency resolution; do not use `--legacy-peer-deps` to hide conflicts.

workbench.config.json stores committed defaults. workbench.config.local.json stores imports and local overrides. Both can set defaultNetwork, rpcConcurrency (1–16), requestTimeoutMs (1,000–120,000), planExpiryMs (30,000–3,600,000), receiptPollMs (1,000–60,000), receiptPollBudgetMs (5,000–600,000), and rpc.testnet/mainnet. Imports use atomic writes; do not edit while another interface imports. Preserve malformed JSON for repair rather than resetting it automatically.

Environment overrides: WORKBENCH_NETWORK, WORKBENCH_RPC_CONCURRENCY, WORKBENCH_RPC_TESTNET_URL, WORKBENCH_RPC_MAINNET_URL, WORKBENCH_WEB_URL. Runtime loads packages/nextjs/.env.local for CLI/MCP and web. Default RPC concurrency 4, timeout 15 seconds, unsigned-plan expiry 5 minutes. Receipt polling defaults to every 3 seconds with a 2-minute budget, then manual refresh; both are configurable in the workspace settings. ABI limit 1 MiB, array limit 1,024 items, nesting limit 16, assistant budget 6 steps/executions.

Chat: WORKBENCH_AI_PROVIDER=openai|anthropic, WORKBENCH_AI_MODEL=<explicit model>, corresponding OPENAI_API_KEY or ANTHROPIC_API_KEY. Missing configuration disables chat while other interfaces continue. Restart after changes.

- **ABI_REQUIRED**: upload the ABI/artifact. Bytecode alone does not reveal complete argument types.
- **NETWORK_MISMATCH**: check selected deployment network, endpoint chain ID, and connected wallet chain.
- **STALE_REVISION**: rediscover and inspect current schemas, then construct arguments and prepare again.
- **PLAN_EXPIRED**: prepare a fresh unsigned plan; review its exact fields again.
- **REVERT / PRECONDITION**: check caller address, HBAR balance, token association, argument units, minimum output and deadline.
- **TRANSPORT**: retry reads or use an appropriate RPC override. Confirm a transaction's hash before deciding any further action.
- **WALLET_REJECTED**: the wallet approval was declined; no submission occurred.
- **Pending receipt / indexing**: use Check receipt or CLI status on the recorded network. Never resend automatically.
- **Registry busy/corrupt**: allow active imports to finish or repair JSON. Dead process locks are recoverable; active edits are never silently discarded.

Optional original-example deployment: explicitly configure MAINTAINER_DEPLOY_KEY only in the maintainer shell and run `npm run deploy:testnet -w @sh/hardhat`. The key is never part of normal CLI, MCP or browser use. Compile does not require it. Use the resulting ABI artifact and address to import; no deployment is needed for the bundled protocol examples.
