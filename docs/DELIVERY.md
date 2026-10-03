# Delivery and acceptance tracker

Updated 2026-10-03. Checkout: `workbench/`, local `main`. The project is **not yet accepted as a completed first release**. Source implementation and independently verified behavior are distinguished below. Publication, submission, and funded wallet approval have not happened.

## Resume here

Read README, AGENTS, this file, and [the approved specification](PLAN.md). Inspect Git state and evidence timestamps. Use Node 24 LTS and the pinned npm 10.9.3 toolchain. Do not restart broad architecture research or assume that an implemented wallet button proves an on-chain transaction.

| Stage                              | Implemented behavior                                                                                                                                          | Verification / remaining exit evidence                                                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Foundation                     | Five npm workspaces, pinned dependency tree, MIT, manifest, ordered builds, direct ESLint, coordinated startup/shutdown                                       | Ordinary npm 10 install/ci and full dependency checks pass. Final production build and transformed-template checks recorded below.                                                                                                                        |
| 1 — Typed engine                   | Deterministic ABI catalog, tuples/arrays/overloads, decimal strings, metadata identity resolution, atomic registry revisions, reads/simulation/unsigned plans | Focused tests; real two-ABI imports and reads; direct-RPC expired-router revert; local caller-specific custom error and tuple roundtrip. Malformed/stale state preserved.                                                                                 |
| 2 — CLI / first launch             | All command groups, guided import, JSON envelopes, browser forms/import, keyless testnet defaults                                                             | Live browser read/quote; CLI/MCP agreement; actual PTY recording; restart/import and fresh boot acceptance tracked below.                                                                                                                                 |
| 3 — Wallet / protocol              | Both-chain wallet context, exact review, HRC-719 association, native-HBAR router swap, hash journals and bounded receipt recovery                             | Live quote, association simulations, mainnet read and context tests pass. **Funded testnet wallet swap, rejection/account/network-change acceptance, and receipt/indexing recovery still need a human wallet session.** No real transaction evidence yet. |
| 4 — MCP / skill                    | Dedicated stdio, canonical dynamic schemas, simulation, unsigned preparation, change notifications, portable skill                                            | Official SDK v2 client executes reads on two imported ABIs and equivalent preparation on local fixture; notification/removal tested. Documented commands verified; skill stays unchanged across ABIs.                                                     |
| 5 — Assistant / UI                 | Optional explicit-provider streaming, scoped bounded tools, fixed result/plan/error/receipt components, desktop/mobile light/dark, cancellation               | Official AI SDK mock stream executes real core read; scope/cancellation/budget tested. Rendered desktop/narrow review recorded below. **Configured OpenAI/Anthropic provider session and chat-to-wallet acceptance remain unverified.**                   |
| 6 — Documentation / fresh scaffold | README/AGENTS, CLI/MCP/skill/config/provenance/support/hosting docs, ABI examples, verification scripts                                                       | Official installer local-template transformation preserves all five workspaces. Clean transformed install/build/boot evidence tracked below. An unfamiliar human developer walkthrough remains pending.                                                   |
| 7 — Release / bounty               | Technical identifier and local main prepared; checklist and demonstration recording                                                                           | **Public template download, complete wallet demonstration video, release publication and submission remain pending explicit release actions.**                                                                                                            |

## Reproducible checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:adapters
npm run verify:local
npm run verify:assistant
node scripts/verify-network.mjs
```

`verify:local` starts an isolated Hardhat fixture on a free loopback port. Its local deployment/transaction is never Hedera evidence. `verify:assistant` uses the official SDK mock model, with a real RPC tool read; it is not a claim of paid provider inference. Network checks depend on public endpoint availability. Build itself requires no RPC, wallet, model key, or compiler download.

## Final clean-scaffold acceptance — 2026-10-03

The published `create-scaffold-hbar@0.4.1` installer transformed a clean local template source into a new project. All five packages survived. Installation used ordinary `npm@10.9.3 ci`, followed by a clean dependency tree, lint, typecheck, 13 core tests plus 1 Solidity test, production build, isolated adapter checks, production boot and a real `factory()` read. Build overrides pointed both configured RPCs at a closed loopback port and provider keys were empty.

Receipt polling configuration was added after that installation; only its seven source/config/documentation files were refreshed into the transformed project. Dependency manifests and the lockfile remained identical. Its final source then passed lint, typecheck, tests, disabled-RPC build, boot, configured polling-state check and a real read again. [The exact check record](evidence/external-scaffold.json) distinguishes that source refresh from the initial installer step. This verifies the official local-template transformation, **not a download from the unpublished public repository**.

Installation and time to useful read were measured separately on macOS arm64 with a warm npm cache. These single observations are recorded for diagnosis, not general performance claims. Intended Git files exclude user imports, environment credentials, plans and journals; a strong credential-format scan found no matches. CI configuration is prepared; no remote CI run is claimed. Supported-wallet acceptance remains pending; mainnet context/plan tests did not spend real funds.

## Evidence inventory

- [Live core/CLI/MCP reads and actual imports](evidence/adapters.json).
- [Local unsigned adapter parity, tuples, custom errors and catalog updates](evidence/local-adapters.json).
- [AI SDK streaming/tool scope/cancellation](evidence/assistant.json).
- [Live testnet revert, HRC-719 simulations, quote and mainnet read](evidence/network.json).
- [Final source checks](evidence/final-checks.json), [fresh scaffold checks](evidence/external-scaffold.json) and accompanying `external-*.txt` logs.
- [Partial actual read-path video](evidence/read-path-partial.mp4); this is not the complete wallet demonstration required for release.
- Desktop and narrow-screen JPEGs in `evidence/` are actual rendered app captures.
- `terminal.cast` / `terminal.txt` are actual CLI PTY output, not reconstructed examples.

## Release checklist

- [ ] Finish funded testnet HBAR → SAUCE flow in a human-controlled EVM wallet; retain independently viewable hash, recipient/value/calldata, association proof and confirmed receipt.
- [ ] Check wallet rejection, disconnect, account change and chain change on both networks. Validate mainnet handling without requiring a real-fund transaction.
- [ ] Inspect a configured provider stream, failure/cancellation, missing argument card and transaction review handoff.
- [ ] Have an unfamiliar developer follow quickstart/import/MCP setup from a clean scaffold.
- [ ] Record the complete real wallet demonstration; current reads/quotes recording is a partial demo only.
- [ ] Recheck bounty rules/deadline at submission time; no deadline assumption removes these gates.
- [ ] Explicit release authorization: publish `Blockchain-Oracle/hedera-contract-workbench`, `main`, then run official installer against the public remote template.
- [ ] Re-run ordinary install/dependency/lint/typecheck/test/build/boot checks against that public template; verify ignored local state/credentials are absent.
- [ ] Review README claims against evidence, publish the video and submit the bounty only as explicit release actions.

Next action: prepare the live swap for the user’s supplied EVM wallet address and complete the recorded human acceptance gates; independent clean-template and rendered checks now pass. Never request a private key or sign through CLI/MCP/chat.
