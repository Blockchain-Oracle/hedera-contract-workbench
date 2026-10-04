# Plan coverage review — 2026-10-04

The non-visual implementation is largely present, but **the project does not yet satisfy all eight stage exits**. This review found four concrete defects and several acceptance gates without evidence. Passing the existing suite does not cover the reproduced defects below.

Reviewed source: local `main`, `a1a58ff` (implementation `64e0b65` plus generated Next declarations). Application source was not changed during this review. Evidence and trackers were updated. Appearance, layout, visual polish and visual acceptance are excluded at the user's request. Browser signing, transaction integrity and protocol correctness remain part of functional acceptance.

Follow-up: the user subsequently authorized repairs. See [repair and end-to-end verification](2026-10-04-fixes-and-e2e.md) for current dispositions. This document and the original probe JSON preserve the review baseline; the reproduction script now asserts the repaired behavior.

## Confirmed findings

### F1 — P1: Interface changes during simulation can leave validation successful

[runtime.ts:596](../../packages/core/src/runtime.ts#L596) awaits simulation after checking the plan's ABI revision. After the await, it checks expiry and association status, but does not recheck the current contract revision before returning a successful validation.

Reproduction: prepare a valid plan, update the registry revision from inside the simulation boundary, then finish validation. Validation succeeds and returns the old revision while the registry contains `review-refreshed-interface`. This violates the requirement that an interface change invalidate the previous review. It concerns local ABI/catalog changes; no on-chain contract mutation is claimed.

Required repair: re-resolve the current contract and check its revision and identity after simulation before returning success. Add a regression case that changes the registry **during** the await. The existing stale-plan check changes it before validation and does not exercise this race.

### F2 — P2: Stale removal can delete a concurrently refreshed contract

[store.ts:229](../../packages/core/src/store.ts#L229) accepts only an ID for removal. The lock serializes disk writes, but removal has no expected-revision check. The CLI's confirmation followed by ID-only deletion can therefore remove a record that another interface refreshed after the user inspected it.

Reproduction: retain the old snapshot, save a new revision, and remove the ID. The refreshed record disappears without a conflict. `saveContract` already supports revision comparison; deletion does not.

Required repair: capture the revision being removed, pass it through the relevant adapters, and reject a stale deletion inside the registry lock. Verify that the concurrently refreshed record remains intact.

### F3 — P2: Receipt verification exceeds the RPC limit and lacks cancellation propagation

[runtime.ts:643](../../packages/core/src/runtime.ts#L643) calls `getTransaction` directly when a journal entry has a plan. This bypasses the shared limiter, although receipt lookup itself uses it. Eight simultaneous journal-backed status requests reached **eight concurrent transaction RPC calls** with concurrency configured to four.

Also, [runtime.ts:617](../../packages/core/src/runtime.ts#L617) has no abort signal parameter. The client, receipt lookup, transaction lookup and mirror request in this branch cannot receive an adapter's cancellation signal. HTTP, MCP and assistant receipt calls inherit that limitation.

Required repair: route transaction lookup through the limiter, propagate an optional signal through status and its adapters, and preserve cancellation when mirror-indexing errors are handled. Verify parallel journal-backed status calls and cancellation during RPC/mirror work.

### F4 — P2: Missing Hedera sender is reported as a retryable endpoint failure

[errors.ts:35](../../packages/core/src/errors.ts#L35) prefers viem's outer short message and classifies non-revert failures as transport errors. With the supplied testnet address, direct HRC-719 `isAssociated()` simulation returned `Sender account not found`, while the workbench returned `TRANSPORT`, `retryable: true`, and advice to check the endpoint.

At review time, the address showed zero testnet HBAR and the matching-network account lookup returned no account. A valid association call therefore fails on an account prerequisite; retrying the endpoint does not resolve it. Raw wallet-specific evidence is kept in ignored `.workbench/reviews/2026-10-04-wallet.json`. No transaction was submitted.

Required repair: inspect nested RPC causes and return an actionable account/prerequisite error for this case. Preserve sanitized diagnostics and keep genuine connectivity failures distinct. Test with a realistic nested viem error and confirm the live account setup guidance once a usable testnet account is available.

## Stage-by-stage coverage

| Stage                     | Implementation and evidence                                                                                                                                                                                                                   | Remaining exit work                                                                                                                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Foundation            | Five workspaces, pinned toolchain/lockfile, MIT, template manifest, ordered scripts. Ordinary npm 10 installation, dependency tree, build and official local-template transformation passed on October 3. Current lint/typecheck pass.        | Foundation checks have evidence for this source. Public remote installation belongs to stage 7.                                                                                                                                                                                           |
| 1 — Typed engine          | ABI types/bounds/precision, overloads, tuples/arrays, positional names, provenance, metadata resolution, atomic storage, reads/simulation/preparation and original Solidity fixture exist. Current typed fixture and live reads/reverts pass. | F1 and F2 reopen integrity/concurrency acceptance; F4 affects caller prerequisites.                                                                                                                                                                                                       |
| 2 — CLI / first launch    | All planned command groups, machine output, guided prompts, doctor, keyless defaults and persistence exist. Current CLI tests and actual imports/read parity pass. Prior PTY and restart/boot evidence exist.                                 | Account error guidance needs F4. Visual and terminal styling are outside this review's score.                                                                                                                                                                                             |
| 3 — Wallet / protocol     | Both-network handling, unsigned handoff, HRC-719, native-HBAR router quote/swap, plan binding, journals and receipt/indexing states exist. Current testnet quote/simulations and mainnet read pass.                                           | F1/F3/F4; funded human-approved testnet swap with viewable hash/receipt; rejection, disconnect/account/network-change checks and receipt recovery in an actual wallet session. Mainnet transaction context acceptance remains unverified; no automatic real-fund transaction is required. |
| 4 — MCP / skill           | Official SDK v2 stdio client verified equivalent reads on two imported ABIs, invalid-input rejection, local unsigned preparation and dynamic notifications. Portable skill documents implemented commands without ABI-specific edits.         | Shared receipt concurrency/cancellation gap F3. Acceptance cannot be expanded to unsupported hosts without testing them.                                                                                                                                                                  |
| 5 — Assistant             | Scoped tools, bounded streaming, cancellation, optional provider configuration and deterministic fallback exist. Official AI SDK mock model calls a real RPC read; continuation/scope/budget checks pass.                                     | Configured OpenAI/Anthropic session, provider failure/cancellation and chat-to-wallet functional handoff remain unverified. UI appearance/layout excluded.                                                                                                                                |
| 6 — Docs / fresh scaffold | Architecture, CLI/MCP/skill, configuration, provenance, support, troubleshooting and optional hosting docs exist. Official installer local-template transform retained five packages; ordinary clean install/build/boot/read evidence exists. | Unfamiliar developer walkthrough. Docs must carry the newly found limitations until repaired. Earlier local-template evidence is not public-template acceptance.                                                                                                                          |
| 7 — Release / bounty      | Local main, intended repository identifier, checklist and partial actual read-path recording exist.                                                                                                                                           | Public repository/template download, complete real wallet demonstration video, public release checks and explicit publication/submission actions.                                                                                                                                         |

Voice, hosted multi-user infrastructure, remote MCP, independently published CLI packages, Foundry, ED25519 wallets, arbitrary source deployment and event indexing were explicitly deferred. Their absence is not a defect against this release plan.

## Verification performed during this review

Node 24.19.0; this review's `npm run` commands used bundled npm 11.17.0. The earlier ordinary-install evidence uses the project's pinned npm 10.9.3 installer.

- `npm run lint`, `npm test`, `npm run typecheck`: passed; **13 core tests and 1 Solidity test**.
- `npm run verify:local`: passed on an isolated Hardhat fixture. Typed tuple precision, caller-specific custom revert, unsigned core/CLI/MCP parity, eight catalog notifications, stale-plan-before-validation rejection and command/error envelopes. These local transactions are not Hedera transaction evidence.
- `npm run verify:assistant`: passed using the official mock model plus a real core RPC read; no configured-provider inference is claimed.
- `npm run verify:adapters`: passed, with actual imports and matching router `factory()` / token `symbol()` reads across core, CLI and MCP; 27 tools; invalid input rejected; no stdio diagnostics contamination.
- `node scripts/verify-network.mjs`: passed: expired-router revert agrees with direct RPC, caller-scoped association simulations return SUCCESS (22), mainnet factory read succeeds and a fresh testnet quote is returned. `submitted: false`.
- Isolated diagnostic probes reproduced F1/F2/F3. [Results](2026-10-04-probes.json) and [reproduction script](reproduce-2026-10-04.mjs) are saved. Build the runtime, then run `node docs/reviews/reproduce-2026-10-04.mjs`. RPC/execution are injected locally; the script uses and deletes a temporary registry and submits nothing.
- Supplied address preflight reproduced F4 against testnet. Detailed address evidence remains ignored local state.

Fresh installation/build evidence was recorded on October 3 for the same application source and manifests; those expensive checks were not rerun for this documentation-only review. The installer used its local-template seam, and final receipt-setting source refresh is separately disclosed in [external-scaffold evidence](../evidence/external-scaffold.json). No remote CI run is claimed.

Current evidence: [checks](2026-10-04-checks.json), [adapters](../evidence/adapters.json), [local adapters](../evidence/local-adapters.json), [assistant](../evidence/assistant.json), [network](../evidence/network.json).

## Resume sequence

1. Repair F1, then F2/F3/F4, with focused regression checks and adapter verification. Review fixes against exact reproduction criteria.
2. Use a usable, funded testnet account for the human-controlled HRC-719 and HBAR → SAUCE workflow. Prepare a fresh quote/review at that time; the review's quote has expired. Never request a private key or resend an uncertain submission.
3. Finish both-network wallet context/rejection/recovery and configured-provider functional acceptance. Complete the unfamiliar developer walkthrough.
4. Prepare the complete demonstration and then carry out explicitly authorized public release/submission actions, including ordinary installation against the public template.

The outcome of this turn is an evidence-backed review, not a repair or a completed release. UI exclusions do not remove the outstanding transaction, concurrency, provider and release gates.
