# MCP and portable project skill

Build with `npm run build:runtime`, then generate host configuration:

```sh
npm run --silent workbench -- mcp config --json
```

Copy the returned `data.mcpServers` into a compatible host's configuration. The command uses the exact Node executable and `packages/mcp/dist/index.js`, with repository cwd. Do not launch MCP with an npm banner-producing wrapper. Server stdout is reserved for protocol traffic; diagnostics use stderr.

The server registers contract tools dynamically from the canonical catalog. Discover contracts with `contracts_list`; inspect current types using `tools_inspect`; call the advertised function tool with `arguments`, its exact `revision`, and a `from` address for preparation. Payable functions accept `valueHbar`. Use `tools_simulate` with the current tool ID, revision, arguments, and caller for simulation without preparation. Read tools return versioned structured results. Writes simulate and return unsigned transaction plans for browser wallet review.

Import through `contracts_import` with network, deployed address, and optional ABI. Local registry changes update tool registrations and emit tool-list changes through the SDK. Hosts that cache catalogs should reconnect after changes or a stale-revision response. Remote MCP and hosted authentication are deferred.

The [project skill](../skills/hedera-contract-workbench/SKILL.md) is portable Markdown following the Agent Skills format. Compatible hosts can load that directory or add it to their skill search path. For Codex, copy the directory into `~/.codex/skills/`; for other hosts, use their documented skill installation. Hosts without skills can follow the same CLI/MCP procedure directly.

The skill does not hardcode contract functions. Its sequence stays constant: discover → inspect current schema → construct typed arguments → read or prepare → report real output / open wallet review. New contracts change the tool catalog rather than the skill.

Provider credentials are unnecessary for CLI and MCP. Tools do not sign. A user must approve the exact browser-wallet transaction; never ask for private-key export.
