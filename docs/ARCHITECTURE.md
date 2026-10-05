# One contract, shared tools

The ABI becomes one validated catalog. Every interface uses the same core rather than independently encoding arguments or inventing function behavior. Generation is deterministic: it does not call a model or regenerate application source.

![A deployed contract and ABI feed a shared typed core serving browser forms and chat, CLI commands and MCP tools](../packages/nextjs/public/brand/architecture.svg)

## Repository map

| Workspace | Responsibility                                                                                | Main source                                               |
| --------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `core`    | Discovery, normalized parameter trees, codecs, registry, reads, simulation and unsigned plans | [packages/core/src](../packages/core/src)                 |
| `cli`     | Guided commands, JSON envelopes, readiness and handoff                                        | [packages/cli/src/index.ts](../packages/cli/src/index.ts) |
| `mcp`     | Dynamic registration, schema adaptation and dedicated stdio                                   | [packages/mcp/src/index.ts](../packages/mcp/src/index.ts) |
| `nextjs`  | Forms, fixed assistant cards, wallet review, docs and demo                                    | [packages/nextjs](../packages/nextjs)                     |
| `hardhat` | Original example, verification fixtures and optional deployment                               | [packages/hardhat](../packages/hardhat)                   |

Core uses viem, abitype, Zod and Node adapters. It has no React, terminal, model-provider or MCP dependency. Adapters share validation and dispatch, so an imported ABI changes browser forms, CLI schemas, MCP tools and agent context together.

## Import and execute a read

1. Resolve a supplied contract ID through the matching network's mirror contract metadata, or validate its EVM address. Confirm the deployment's network.
2. Discover a verified ABI through Sourcify, or accept the supplied ABI/artifact with explicit provenance.
3. Normalize parameter trees and generate full-signature tool identities, input/output schemas and form descriptions. Unsupported types receive a reason.
4. Validate arguments with core, encode through viem, call the selected RPC and decode a structured result with network/address/revision context.

The catalog binds network, resolved address, provenance, ABI hash/revision, signature, supported action, positional tree and schemas. JSON integers are decimal strings; core uses BigInt internally. Tuples decode positionally before stable field names are restored, preserving unnamed or duplicate parameter labels.

Ordinary reads omit a caller. Caller-specific reads and simulation use an explicitly supplied existing account. Getter suggestions describe compatible functions from the actual ABI; they do not run automatically or infer valid IDs from a count.

## Prepare, review and recover a write

An unsigned plan expires after five minutes by default and binds chain, sender, recipient, full signature, arguments, calldata, native value, ABI revision and expiry. The browser asks core to recompute and simulate those exact fields, then requests approval in the user's wallet. Account, chain or input changes invalidate the review. A plan digest checks consistency; it is not an authorization signature.

CLI, MCP and assistant can prepare a plan, but only the browser wallet signs and submits. The returned hash is saved immediately in browser recovery storage and local server journals. Receipt recovery checks matching sender/recipient/calldata/value when a journal binds a plan. RPC confirmation and mirror indexing are separate states. Uncertain transactions are never automatically resent.

## Local state and execution bounds

Committed defaults live in `packages/core/src/bundled.ts` and `workbench.config.json`. Imports/removal records merge from ignored `workbench.config.local.json`. Exclusive locks serialize edits; atomic temporary-file rename protects the registry; refresh checks its expected prior revision. Plans, journals and caches live in ignored `.workbench/`.

Type-tree caches are bounded. Identical ordinary concurrent reads deduplicate; a semaphore bounds RPC work and each request has a timeout. Browser, assistant and MCP cancellation reaches core execution. Independently cancellable callers use separate requests so abandoning one does not abort another caller. Receipt polling stops at a configured budget.

## Optional assistant and portable agents

The assistant sees only the selected contract's tools and uses bounded execution. Its tool schemas come from core. Fixed components render actual results, plans and errors; metadata cannot inject executable UI. Provider keys stay on the server. OpenAI, Anthropic and Gemini adapters share this contract, with live acceptance tracked per provider.

The portable skill tells agents to discover and inspect current schemas before typed execution. Exported catalogs are snapshots, not a second source of truth. MCP dynamically updates registrations after imports/refreshes and emits tool-list changes; clients that cache schemas may need to reconnect. [Agent guide](AGENTS.md).

## Local runtime and public preview

The full template is a local single-owner application. Vercel's public preview exposes committed bundled catalogs, reads, unsigned simulation and skill instructions. It rejects registry changes, saved plans/journals, protocol preparation and chat before dispatch. It does not use a shared writable temporary registry. [Hosting boundary](HOSTING.md).

Build order is shared libraries → CLI/MCP adapters → pinned local Solidity compilation → Next.js. Builds require no provider key, wallet, deployment or RPC access. `npm run dev` performs readiness checks, starts library watchers and Next.js, and terminates child processes on shutdown.
