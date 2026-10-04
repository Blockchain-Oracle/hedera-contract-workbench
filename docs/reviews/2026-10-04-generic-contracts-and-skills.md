# Generic contract and agent acceptance

The user's DAO/NFT/DeFi examples test generality. They do not introduce contract categories, category routing or separate skills. Core still owns one ABI normalization/schema/dispatch pipeline. SaucerSwap presentation belongs to the other UI agent and is unchanged here. Audio was explicitly removed from scope in the user's final clarification.

## Delivered behavior

- `skills show --contract ID` provides readable local installer and inspection commands. `--json` returns the selected contract's current network/address/provenance/revision, full signatures, schemas, typed argument examples and safe shell/argv commands. `--markdown` prints the portable document.
- `skills export --contract ID` bundles SKILL.md, reference documents, catalog.json and argument files into a new ignored directory. The commands point at the installed workbench and bind the inspected ABI revision. Existing exports are preserved. Argument examples are explicitly placeholders, not permissions or intent. Large examples are bounded to 4096 nodes while their actual schemas remain available.
- `skills install-command --agent AGENT_IDS...` emits the official pinned Vercel skills local install command. Agent mapping is delegated to that installer, with project scope by default; arbitrary supported IDs are accepted. No GitHub publication or hosted infrastructure is needed for this local workflow.
- The same-origin skill API exposes Markdown, references and current commands for the other agent's interface. The Markdown download works through a production server. [UI integration notes](2026-10-04-skill-ui-handoff.md) identify remaining presentation work; no skill panel is claimed as rendered.
- Optional typed chat uses official AI SDK adapters for OpenAI, Anthropic and Gemini. Permanent credentials stay on the server; contract tools and fixed result/plan cards remain shared. Missing keys still leave deterministic functions usable. No audio dependency, endpoint or microphone implementation remains.

## Verification

Three original Solidity fixtures were deployed on an isolated local EVM. The actual CLI imported their compiled ABIs and persisted them across restart. Core, CLI, MCP, production HTTP handlers and assistant tools returned equivalent governance metadata tuples, NFT ownership and nested route quotes, including integers beyond JavaScript Number precision. Exported read command argv was executed successfully. Overloaded NFT preparations and proposal calldata match independent ethers encoding. Wrong-owner/custom voting errors and uint8 bounds are verified; native payable precision is retained. The base skill bytes stay unchanged across those ABIs. [Executable acceptance script](../../scripts/verify-generic.mts), [results](../evidence/generic-contracts.json).

The installed OpenAI, Anthropic and Gemini adapters consumed their provider-specific controlled HTTP fixtures, executed a real contract read, and continued with its result. Gemini continuation preserves its thought signature. These are adapter integration tests with real RPC execution, **not paid inference or configured-provider acceptance**.

On public Hedera testnet, a real NFT facade was imported and its name, symbol, supply and token owner agreed across direct RPC, core, CLI, MCP and assistant tools. Name/symbol/supply also agree with matching-network mirror metadata. [Live record](../evidence/generic-network.json). The primary DAO repository's older published addresses no longer returned their expected functions on this testnet; this limitation is recorded rather than presenting local fixtures as live DAO evidence. The fixture interfaces test real ABI shapes but are not full production DAO/ERC-721 implementations.

The official `skills@1.7.0` CLI installed a locally exported skill in an isolated project for Codex, Claude Code and Cursor. All Markdown, reference, catalog and argument files match their source bytes. Official `skills list --agent` discovers the skill for each host. The installer uses the universal `.agents/skills` location for Codex/Cursor and a Claude Code copy. No global skills or other projects were modified. [Installation evidence](../evidence/skills-install.json), [actual output](../evidence/skills-install.txt).

Focused tests pass: **22 core + 1 Solidity**. Existing **28 CLI subprocess checks** and HTTP/MCP/assistant receipt cancellation pass. Skill metadata validates. Shell escaping is tested with a real shell for spaces, quotes, dollar substitutions, backticks and semicolons. Human skill output is captured in an actual [PTY recording](../evidence/skills-terminal.cast).

Fresh-source ordinary npm 10.9.3 installation, dependency validation, lint, typecheck, tests and an offline production build pass. The fresh production server serves skills JSON and Markdown and executes a keyless live testnet `factory()` read. The [exact source-copy record](../evidence/skills-fresh.json) distinguishes the initial clean installation from the small subsequent source refresh for final command presentation. It is not a new official installer transformation or public remote download.

One source-refresh attempt incorrectly applied the build-only disabled-RPC overrides to local RPC tests; those fixtures never received requests and the test command timed out. The setup was corrected to apply those overrides only to build. Final tests, broader adapter verification, build, production skill API and Markdown checks all pass. The diagnostic attempt is retained separately as `skills-fresh-setup-failure.txt`; it is not counted as a passing check.

## Remaining acceptance

The UI agent still needs to expose the skill API and settle optional example presentation. A configured real provider session and human-controlled wallet approval/rejection/context-change/receipt workflow remain unverified. No Hedera transaction was submitted. Public publication, complete wallet demonstration and bounty submission are separate release actions. Supported ABI functions are generic; ABI import does not bypass contract permissions, funding, token association or semantic requirements.
