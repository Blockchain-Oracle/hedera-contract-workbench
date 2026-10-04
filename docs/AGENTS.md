# MCP and portable project skill

Build with `npm run build:runtime`, then generate host configuration:

```sh
npm run --silent workbench -- mcp config --json
```

Copy the returned `data.mcpServers` into a compatible host's configuration. The command uses the exact Node executable and `packages/mcp/dist/index.js`, with repository cwd. Do not launch MCP with an npm banner-producing wrapper. Server stdout is reserved for protocol traffic; diagnostics use stderr.

The server registers contract tools dynamically from the canonical catalog. Discover contracts with `contracts_list`; inspect current types using `tools_inspect`; call the advertised function tool with `arguments`, its exact `revision`, and a `from` address for preparation. Payable functions accept `valueHbar`. Use `tools_simulate` with the current tool ID, revision, arguments, and caller for simulation without preparation. Read tools return versioned structured results. Writes simulate and return unsigned transaction plans for browser wallet review.

Import through `contracts_import` with network, deployed address, and optional ABI. Local registry changes update tool registrations and emit tool-list changes through the SDK. Hosts that cache catalogs should reconnect after changes or a stale-revision response. Remote MCP and hosted authentication are deferred.

The [project skill](../skills/hedera-contract-workbench/SKILL.md) is portable Markdown following the Agent Skills format. Install it locally with the official [Vercel skills CLI](https://github.com/vercel-labs/skills/blob/main/README.md), which supports local paths, Git repositories and compatible agent IDs. Run from the project where your agent will use the skill:

```sh
npx --yes skills@1.7.0 add ./skills/hedera-contract-workbench --agent codex claude-code cursor --copy --yes
```

Use an absolute source path if installing into another project. Installation defaults to the current project. The official installer owns each agent's path mapping; `--global` explicitly changes scope to the user directory. Any supported agent ID can be supplied; the workbench's displayed examples are Codex, Claude Code and Cursor. This checkout is usable before publication. A GitHub installation source will be documented after the intended repository actually exists.

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

The browser **Agent access** view exposes the portable Markdown, agent installation examples, current full signatures, schemas and editable argument JSON. It loads only when opened, cancels abandoned requests, checks the selected revision and reloads when the contract changes or its ABI is refreshed. Displayed read/prepare commands come from core and bind that revision; the browser does not execute copied shell commands. The UI integration is read-only: `GET /api/workbench/skills?contract=CONTRACT_ID` returns Markdown, references and current commands/schemas in the normal envelope; `GET /api/workbench/skills/markdown?contract=CONTRACT_ID` downloads the portable Markdown. These require the same local origin checks as the rest of the workbench. [Integration notes](reviews/2026-10-04-skill-ui-handoff.md) record the shared API contract.

The skill does not hardcode contract functions. Its sequence stays constant: discover → inspect current schema → construct typed arguments → read or prepare → report real output / open wallet review. New contracts change the tool catalog rather than the skill.

Provider credentials are unnecessary for CLI and MCP. Tools do not sign. A user must approve the exact browser-wallet transaction; never ask for private-key export.
