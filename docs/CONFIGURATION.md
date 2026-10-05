# Configuration and recovery

Bundled reads start without an environment file, wallet or model key. Configure only the features you need. Use Node 24 LTS and npm 10.9.3; `nvm use` reads the committed `.nvmrc` if nvm is installed. Ordinary `npx --yes npm@10.9.3 ci` is the verified installation path.

## Where settings live

| Location                      | Purpose                                                          | Version control |
| ----------------------------- | ---------------------------------------------------------------- | --------------- |
| `workbench.config.json`       | Bundled defaults and operational settings                        | Committed       |
| `workbench.config.local.json` | Imported contracts, removal records and local overrides          | Ignored         |
| `packages/nextjs/.env.local`  | Optional provider/RPC configuration, loaded by web, CLI and MCP  | Ignored         |
| `.workbench/`                 | Unsigned plans, transaction journals, caches and exported skills | Ignored         |

Environment overrides take precedence over local settings, which take precedence over committed defaults. Preserve malformed JSON for repair rather than resetting it. Import/refresh/remove commands lock and write the registry atomically; avoid hand-editing it while another interface is modifying it.

## Connect a wallet

Use an injected **EVM wallet**, such as MetaMask. Select the deployment network in Workbench, open the wallet control and connect the intended account. The app can request a chain switch.

| Network        | Chain ID | Default JSON-RPC                |
| -------------- | -------- | ------------------------------- |
| Hedera testnet | 296      | `https://testnet.hashio.io/api` |
| Hedera mainnet | 295      | `https://mainnet.hashio.io/api` |

Both networks use HBAR for fees.

Connecting MetaMask does not create the address's Hedera account. Ordinary reads omit the caller and work without one. For a caller-specific read, simulation or transaction, the intended account must exist on the **selected** network. Check the address/network and follow [Hedera account-creation guidance](https://docs.hedera.com/learn/core-concepts/accounts/auto-account-creation); testnet funding is available through the [Hedera Portal](https://portal.hedera.com). A mainnet account is not automatically present on testnet.

If a sender is absent, changing the RPC endpoint will not create it. Workbench reports a nonretryable prerequisite error. Supply an existing caller, create/fund the intended account, or omit the caller for an ordinary read.

Keep the local app running for wallet-review links. Review exact network, sender, recipient, function, arguments, value and prerequisites before approval. A user-rejected wallet prompt is not a submitted transaction. If a hash is returned, use that hash for recovery.

## Enable the assistant

Copy the blank example only if `.env.local` does not already exist. Preserve any existing local configuration.

```sh
cp -n packages/nextjs/.env.example packages/nextjs/.env.local
```

Set one provider, an explicit compatible model ID and its matching key in that file:

| Provider  | `WORKBENCH_AI_PROVIDER` | Credential variable |
| --------- | ----------------------- | ------------------- |
| OpenAI    | `openai`                | `OPENAI_API_KEY`    |
| Anthropic | `anthropic`             | `ANTHROPIC_API_KEY` |
| Gemini    | `gemini`                | `GEMINI_API_KEY`    |

For example, these are placeholders to replace locally:

```dotenv
WORKBENCH_AI_PROVIDER=openai
WORKBENCH_AI_MODEL=your-compatible-model-id
OPENAI_API_KEY=your-provider-key
```

Restart the app after changes. Keys remain server-side; do not use `NEXT_PUBLIC_` credential variables. Model tool support, API access and billing depend on your provider/model. Missing configuration disables chat; provider errors do not block forms, CLI or MCP. The public Vercel preview disables chat and contains no provider credentials. Live voice is outside this release.

## Publish the demo video

`/demo` combines a product walkthrough, captured screens, a live testnet read and dated verification links. Until a real video URL is configured, it clearly shows **YouTube video pending**. No video or completed wallet transaction is implied.

Set `WORKBENCH_DEMO_YOUTUBE_URL` in your ignored `packages/nextjs/.env.local` to your actual public HTTPS YouTube watch or `youtu.be` URL. Watch, short, and embed URLs are normalized to one watch link and a `youtube-nocookie.com` player. Invalid URLs leave the pending state intact. No external player loads until the visitor presses play; the page also offers a direct YouTube link.

For Vercel, add this variable to the existing project's Production environment, then redeploy. The demo page is generated during build, so a production setting change requires a new build. Do not add a model key for this feature. Check the real recording is accessible and meets the submission duration requirement before using its URL in the form. The current recording is being prepared separately.

## Override network endpoints

| Environment variable        | Default / meaning                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `WORKBENCH_NETWORK`         | `testnet`; initial selection, not relocation of an imported deployment             |
| `WORKBENCH_RPC_TESTNET_URL` | Testnet Hashio JSON-RPC URL                                                        |
| `WORKBENCH_RPC_MAINNET_URL` | Mainnet Hashio JSON-RPC URL                                                        |
| `WORKBENCH_RPC_CONCURRENCY` | `4`; integer from 1 to 16                                                          |
| `WORKBENCH_WEB_URL`         | `http://127.0.0.1:3000`; exact origin used in wallet-review URLs and origin checks |
| `WORKBENCH_HOSTED_DEMO`     | Set to `1` for the read-only preview boundary; Vercel activates it automatically   |

Use matching-network endpoints; Workbench checks chain ID. Keep provider-authenticated RPC URLs in ignored server configuration. A custom hosted origin requires its exact HTTPS `WORKBENCH_WEB_URL`. [Hosting and access-control requirements](HOSTING.md).

## Operational limits

Set these keys in the local configuration while preserving its existing contract records. Times are milliseconds.

| Setting               | Default                | Allowed range    |
| --------------------- | ---------------------- | ---------------- |
| `rpcConcurrency`      | 4 requests             | 1–16             |
| `requestTimeoutMs`    | 15,000                 | 1,000–120,000    |
| `planExpiryMs`        | 300,000 (five minutes) | 30,000–3,600,000 |
| `receiptPollMs`       | 3,000                  | 1,000–60,000     |
| `receiptPollBudgetMs` | 120,000 (two minutes)  | 5,000–600,000    |

`defaultNetwork` and `rpc.testnet` / `rpc.mainnet` can also be set locally. ABI input is limited to 1 MiB, arrays to 1,024 items and nesting to 16 levels. Assistant execution is bounded to six steps/tool executions. Getters are run on demand; imported functions are not all polled.

## Recover from errors

| What you see                              | Next action                                                                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `INPUT` or inline required-field feedback | Fix the exact advertised field/type. Integers are decimal strings in JSON; check nested tuple and array paths.              |
| `ABI_REQUIRED`                            | Supply an ABI array or artifact with `abi`. Bytecode alone cannot recover complete argument types.                          |
| `NETWORK_MISMATCH`                        | Check deployment network, RPC chain ID and wallet chain.                                                                    |
| `STALE_REVISION`                          | Rediscover and inspect current schemas, rebuild arguments and prepare again.                                                |
| `PLAN_EXPIRED`                            | Prepare a fresh unsigned plan and review its exact fields again.                                                            |
| `PRECONDITION` / missing sender           | Check account existence on the selected network, balance and token association. Ordinary reads can omit a caller.           |
| `REVERT`                                  | Read the decoded error and check caller permissions, argument units and contract-specific requirements.                     |
| `TRANSPORT`                               | Retry a read or use a matching RPC override. For transactions, check the saved hash before any further action.              |
| `WALLET_REJECTED`                         | Approval was declined; no submission occurred. A new approval requires an explicit new attempt.                             |
| Pending receipt / mirror indexing         | Check the recorded hash on its network; indexing can lag confirmation. Never resend automatically.                          |
| Registry busy or corrupt                  | Let active imports finish, or repair JSON. Dead process locks are recoverable; active changes are never silently discarded. |

```sh
npm run --silent workbench -- doctor --json
npm run --silent workbench -- transactions status --hash TRANSACTION_HASH --network testnet --json
```

Replace the hash and network with the submitted transaction's actual context. A read, simulation, preparation or indexing timeout does not establish successful transaction execution.

## Optional maintainer deployment

The original `Observation.sol` example is optional; first launch uses already deployed protocol examples. A maintainer may explicitly configure `MAINTAINER_DEPLOY_KEY` in their own shell and run `npm run deploy:testnet -w @sh/hardhat`, then import the resulting address and ABI artifact. This key is not part of normal CLI, MCP or browser use, and compilation requires no deployment credential. Never commit a filled environment file or key.
