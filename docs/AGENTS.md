# MCP and portable project skill

Use the same contract tools from an agent without a model-provider key. The skill guides discovery and typed CLI use; MCP exposes the canonical catalog directly to compatible clients. Both prepare unsigned writes for browser wallet review.

## Connect an MCP client

Build with `npm run build:runtime`, then generate host configuration:

```sh
npm run --silent workbench -- mcp config --json
```

Copy the returned `data.mcpServers` into a compatible host's configuration. The command uses the exact Node executable and `packages/mcp/dist/index.js`, with repository cwd. Do not launch MCP with an npm banner-producing wrapper. Server stdout is reserved for protocol traffic; diagnostics use stderr.

The server registers contract tools dynamically from the canonical catalog. Discover contracts with `contracts_list`; inspect current types using `tools_inspect`; call the advertised function tool with `arguments`, its exact `revision`, and a `from` address for preparation. Payable functions accept `valueHbar`. Use `tools_simulate` with the current tool ID, revision, arguments, and caller for simulation without preparation. Read tools return versioned structured results. Writes simulate and return unsigned transaction plans for browser wallet review.

Import through `contracts_import` with network, deployed address, and optional ABI. Local registry changes update tool registrations and emit tool-list changes through the SDK. Hosts that cache catalogs should reconnect after changes or a stale-revision response. Remote MCP and hosted authentication are deferred.

## Install the portable skill

The [project skill](../skills/hedera-contract-workbench/SKILL.md) is portable Markdown following the Agent Skills format. The official [Vercel skills CLI](https://github.com/vercel-labs/skills/blob/main/README.md) supports local paths, Git repositories and compatible agent IDs. Run from the project where your agent will use the skill:

```sh
npx --yes skills@1.7.0 add Blockchain-Oracle/hedera-contract-workbench --skill hedera-contract-workbench --agent codex claude-code cursor --copy --yes
```

From a local workbench checkout:

```sh
npx --yes skills@1.7.0 add ./skills/hedera-contract-workbench --agent codex claude-code cursor --copy --yes
```

Use an absolute source path if installing a local skill into another project. Installation defaults to the current project. The official installer owns each agent's path mapping; `--global` explicitly changes scope to the user directory. Any supported agent ID can be supplied; the workbench's exercised examples are Codex, Claude Code and Cursor. Installing the Markdown skill does not install or start the workbench runtime. Keep a local clone available, run commands from it, or export a skill bundle that records its workspace location.

## Inspect or export the selected contract

Inspect the selected contract, read the Markdown, or export a complete skill bundle:

```sh
npm run --silent workbench -- skills show --contract CONTRACT_ID
npm run --silent workbench -- skills show --contract CONTRACT_ID --markdown
npm run --silent workbench -- skills show --contract CONTRACT_ID --json
npm run --silent workbench -- skills export --contract CONTRACT_ID --json
npm run --silent workbench -- skills install-command --agent codex claude-code --json
```

Replace `CONTRACT_ID` with an actual alias from `contracts list`. `show` returns network/address/provenance/revision, current schemas, argument shape examples, safe command argv and copyable POSIX shell commands. `export` writes SKILL.md, reference files, catalog.json and per-function argument files into a new ignored `.workbench/skills/` directory. Use its returned install command to give an agent in another project the workbench location and selected-contract snapshot. Export never overwrites a previous bundle; `--out` must name a new directory. Snapshots can become stale; execution commands bind the revision and the agent still inspects current tools.

Fill intended arguments and replace `WALLET_ADDRESS` before executing write examples. Native value defaults to zero. Shape examples are not deployment advice, permission, or automatically chosen arguments. Large shapes retain their schemas but omit generated examples beyond a 4096-node bound. Run exported commands from the skill directory so relative argument paths resolve. `--json` uses the normal single-envelope protocol; `--markdown` prints the document and cannot be combined with `--json`.

## Use Agent access in the browser

Open `/workbench?view=agents` for the browser **Agent access** view. Choose your agent, read/download SKILL.md and copy the installation command. Inspect a current full signature, schema and editable argument JSON before copying its execution command. Selecting another contract or refreshing its ABI reloads the catalog. Displayed read/prepare commands come from core and bind the revision; the browser does not execute copied shell commands.

`GET /api/workbench/skills?contract=CONTRACT_ID` returns Markdown, references and current commands/schemas in the normal envelope; `GET /api/workbench/skills/markdown?contract=CONTRACT_ID` downloads portable Markdown. These read-only routes use the same origin checks as the other workbench APIs. The public preview's commands target a local clone; it does not provide hosted CLI execution. [Integration notes](reviews/2026-10-04-skill-ui-handoff.md) record the shared API contract.

## Execute without guessing

The skill does not hardcode contract functions. Its sequence stays constant: discover → inspect current schema → construct typed arguments → read or prepare → report real output / open wallet review. New contracts change the tool catalog rather than the skill.

`tools inspect`, MCP `tools_inspect`, assistant inspection and exported agent context include `inputSources`: compatible read getters from the selected contract's actual ABI, full signatures, required parameters and current revision. Inspect a source getter, supply verified inputs, read it and use only actual returned values whose meaning matches the target. Counts are not enumerations. Type compatibility does not prove an ID exists or establish units, intended recipients or routes. No getter is run automatically; ask the user for missing intent when it cannot be discovered. Do not pass a connected wallet as `from` for ordinary reads. An explicit caller remains available for intentional caller-scoped state.

Provider credentials are unnecessary for CLI and MCP. Tools do not sign. A user must approve the exact browser-wallet transaction; never ask for private-key export.

CLI and MCP preparations return `/workbench?plan=…` review URLs. Open the returned URL while the local app is running; confirm the intended account and network before wallet approval. Report the real receipt when available. The root [AGENTS.md](../AGENTS.md) combines this workflow with repository contribution rules; a separate CLAUDE.md file is unnecessary.
