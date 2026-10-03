# Approved first-release specification

The user's final implementation instruction on 2026-10-03 is authoritative. Working display name **Contract Workbench**; technical repository identifier `Blockchain-Oracle/hedera-contract-workbench`.

One local Scaffold HBAR template connects already deployed Hedera EVM contracts through browser forms, CLI, MCP, and a portable agent skill. First launch exposes a real testnet example with no wallet, secret, provider key or deployment. Import uses network/address and automatic verified ABI discovery, with supplied ABI/artifact fallback. Both testnet and mainnet support reads, caller simulation, unsigned preparation and exact browser-wallet-approved transactions. The optional assistant requires explicit OpenAI or Anthropic configuration; deterministic interfaces remain useful without it.

Five npm workspaces: core (no React/terminal/model/MCP dependencies), CLI, MCP, Next.js, Hardhat. Shared catalog and dispatcher own validation. Use viem/abitype, wagmi 2, Hardhat 2/local solc, MCP SDK v2, AI SDK 7, Commander/Clack/picocolors, Next 16.3/React 19.3/TypeScript 5.9.3/Zod 4/Query 5/Tailwind 4. Pin direct dependencies and prove ordinary installation without legacy peer resolution. Node 24 LTS is the target.

Deterministic ABI → normalized parameter tree → validated definitions → form descriptions. Preserve full overload signatures, tuple/array shape, integer bounds/decimal strings, positional keys for unnamed/duplicate labels, ABI provenance/hash/revision and unsupported-function reasons. Reject unknown arguments. BigInt stays internal. Native tinybar and RPC weibar are distinct. Resolve arbitrary contract IDs with matching-network metadata. Imports, caches, plans, journals and credentials stay ignored; atomic registry edits detect stale revisions.

CLI commands: doctor; contracts import/list/inspect/refresh/remove; tools list/inspect/call/simulate/prepare; transactions status; mcp config. Human mode is guided, concise and readable; JSON mode does not prompt, uses argument files/stdin and stable error codes, and keeps diagnostics on stderr. MCP has dedicated protocol-only stdout, dynamic canonical schemas, structured results, list-change notifications and reconnect guidance. Skill sequence remains discover → inspect current schema → construct typed arguments → read/prepare → report/open wallet review, regardless of imported ABI.

CLI/MCP/chat never sign. A five-minute unsigned plan binds chain/network, account, recipient, function, args, calldata, native value, ABI revision and expiry. Review recomputes all fields and freshly simulates with the connected account. Any change to input/account/network/interface invalidates review. Show mainnet explicitly and have the user approve the exact request through the wallet. Save returned hashes immediately, distinguish rejection/submission/confirmation/revert/indexing, and never automatically resend uncertainty.

Browser: contract navigator, Functions/Assistant workspace, review drawer, responsive navigation drawer; reusable typed inputs/tuple-array editors, structured output, validation/provenance/copy/explorer/prerequisites/receipt states. Reuse compatible Scaffold HBAR and shadcn primitives; 21st references require clear licensing and demonstrated dependency need. Neutral restrained accent, accessible light/dark, visible keyboard focus, reduced motion. Assistant tools are scoped/bounded; fixed UI components render real results; model-generated code is never executable UI.

Central protocol workflow: SaucerSwap V1 HBAR → SAUCE using the router's native-HBAR path, fresh quote, explicit minimum output/deadline and default 0.5% slippage. Changed slippage requires a new quote/review. Use caller-scoped HRC-719 for explicit SAUCE association and verify it before swapping. No direct WHBAR wrapping or allowances in this workflow. Original Observation Solidity example demonstrates tuples, overloads, caller writes and custom errors; existing protocol integration remains central.

Eight required stages and exits:

1. **Stage 0:** implementation repository/runtime/workspaces/license/manifest/builds; ordinary installation, dependency checks, lint/typecheck/offline build and installer-preserved packages.
2. **Stage 1:** typed engine/discovery/identity/registry/codecs/execution; complex fixtures, live RPC agreement and preservation of malformed/stale configuration.
3. **Stage 2:** complete CLI, useful default boot/import/forms; fresh read/import/restart and inspected actual terminal recording.
4. **Stage 3:** both-network wallet and meaningful testnet protocol transaction, exact context changes, independent receipt evidence; mainnet validation need not spend real funds.
5. **Stage 4:** canonical MCP/portable skill; real compatible client parity and two ABIs without skill changes.
6. **Stage 5:** provider chat/fixed cards and desktop/mobile refinement; interface parity, failure fallback, rendered acceptance.
7. **Stage 6:** all docs/provenance/support/hosting troubleshooting and fresh external scaffold install/lint/typecheck/build/boot; unfamiliar developer walkthrough and secret exclusion.
8. **Stage 7:** verified public main/template, complete real demonstration video, transaction evidence and submission checklist. Publication/submission remain explicit release actions.

Operational defaults: 4 concurrent RPC requests, 15-second timeout, 5-minute plan expiry, bounded receipt polling, cached ABI trees, deduplicated reads, cancellation and lazy heavy wallet/chat features. Do not poll every function. Measure installation separately from first useful read; performance claims need measurement.

Defer voice, hosted multi-user infrastructure, remote MCP, independent npm CLI publication, Foundry, native ED25519, arbitrary user source deployment and event indexing. Optional single-owner Coolify instructions do not imply a hosted first release.

Resume from [actual files and verification](DELIVERY.md). Completion requires all eight exits; implementation alone is not evidence of a funded wallet transaction, provider session, public release or bounty submission.
