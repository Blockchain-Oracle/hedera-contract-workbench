# Delivery and acceptance tracker

Updated 2026-10-05. Checkout: `workbench/`, `main`. The project is **not yet accepted as a completed first release**. Source implementation and independently verified behavior are distinguished below. The source repository is public. Submission and funded wallet approval have not happened. The [October 4 plan coverage review](reviews/2026-10-04-plan-coverage-review.md) reproduced four defects; all four are now repaired and verified in the [follow-up acceptance record](reviews/2026-10-04-fixes-and-e2e.md). UI appearance and layout are excluded from that review at the user's request.

## Resume here

The latest user approval supersedes the Slush palette: use the [Hedera visual direction](plans/2026-10-04-hedera-brand-direction.md), black landing, real contract preview and neutral white/charcoal workspace. The user subsequently rejected that rendered implementation. The current composition uses a compact header, tabs, contract toolbar and continuous function workspace; its technical checks do not imply aesthetic acceptance. Earlier Slush integration remains historical evidence. Generic-contract skills, Gemini, connected-read repairs and core transaction protections remain included. Read the [new visual acceptance](reviews/2026-10-04-hedera-brand.md).

Read README, AGENTS, this file, and [the approved specification](PLAN.md). Inspect Git state and evidence timestamps. Use Node 24 LTS and the pinned npm 10.9.3 toolchain. Do not restart broad architecture research or assume that an implemented wallet button proves an on-chain transaction.

| Stage                              | Implemented behavior                                                                                                                                          | Verification / remaining exit evidence                                                                                                                                                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Foundation                     | Five npm workspaces, pinned dependency tree, MIT, manifest, ordered builds, direct ESLint, coordinated startup/shutdown                                       | Ordinary npm 10 install/ci and full dependency checks pass. Final production build and transformed-template checks recorded below.                                                                                                                                                                                                           |
| 1 — Typed engine                   | Deterministic ABI catalog, tuples/arrays/overloads, decimal strings, metadata identity resolution, atomic registry revisions, reads/simulation/unsigned plans | Focused tests; real two-ABI imports and reads; direct-RPC expired-router revert; local caller-specific custom error and tuple roundtrip. Malformed imports and stale saves preserved. F1/F2 repaired: validation rejects refresh during simulation; stale deletion preserves updated state.                                                  |
| 2 — CLI / first launch             | All command groups, guided import, JSON envelopes, browser forms/import, keyless testnet defaults                                                             | Live browser read/quote; CLI/MCP agreement; actual PTY recording; restart/import and fresh boot acceptance tracked below.                                                                                                                                                                                                                    |
| 3 — Wallet / protocol              | Both-chain wallet context, exact review, HRC-719 association, native-HBAR router swap, hash journals and bounded receipt recovery                             | Live quote, association simulations, mainnet read and context tests pass. **Funded testnet wallet swap, rejection/account/network-change acceptance, and receipt/indexing recovery still need a human wallet session.** No real transaction evidence yet. F1/F3/F4 repairs pass regression, receipt-adapter and live missing-account checks. |
| 4 — MCP / skill                    | Dedicated stdio, canonical dynamic schemas, simulation, unsigned preparation, change notifications, portable skill                                            | Official SDK v2 client executes reads on two imported ABIs and equivalent preparation on local fixture; notification/removal tested. Documented commands verified; skill stays unchanged across ABIs. Shared receipt-status cancellation/concurrency repaired; actual cancellation closes RPC sockets and subsequent requests succeed.       |
| 5 — Assistant / UI                 | Optional explicit-provider streaming, scoped bounded tools, fixed result/plan/error/receipt components, desktop/mobile light/dark, cancellation               | Real OpenAI `gpt-4.1-mini` reads on two contracts, missing arguments, contract errors and Stop/recovery pass; final production inference omits an implicit caller. Mock/controlled provider regressions are separate. **Anthropic/Gemini live inference and chat-to-wallet acceptance remain unverified.**                                   |
| 6 — Documentation / fresh scaffold | README/AGENTS, CLI/MCP/skill/config/provenance/support/hosting docs, ABI examples, verification scripts                                                       | Official installer local-template transformation preserves all five workspaces. Clean transformed install/build/boot evidence tracked below. An unfamiliar human developer walkthrough remains pending.                                                                                                                                      |
| 7 — Release / bounty               | Technical identifier and local main prepared; checklist and demonstration recording                                                                           | **Public template download, complete wallet demonstration video, release publication and submission remain pending explicit release actions.**                                                                                                                                                                                               |

## Reproducible checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:adapters
npm run verify:local
npm run verify:assistant
npm run verify:assistant-replay
npm run verify:receipts
npm run verify:generic
npm run verify:generic-network
npm run verify:skills
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
- [Actual OpenAI inference and cancellation repair](reviews/2026-10-04-live-assistant.md), [live acceptance checks](evidence/live-assistant/checks.json).
- [Live testnet revert, HRC-719 simulations, quote and mainnet read](evidence/network.json).
- [Final source checks](evidence/final-checks.json), [fresh scaffold checks](evidence/external-scaffold.json) and accompanying `external-*.txt` logs.
- [Partial actual read-path video](evidence/read-path-partial.mp4); this is not the complete wallet demonstration required for release.
- Desktop and narrow-screen JPEGs in `evidence/` are actual rendered app captures.
- `terminal.cast` / `terminal.txt` are actual CLI PTY output, not reconstructed examples.

## Slush revamp verification — 2026-10-04

The isolated `codex/slush-workbench-ui` branch implements the approved Slush shell, palette, footer Accounts panel, network drawer and shared ABI-driven surfaces. Ordinary npm 10.9.3 clean installation, lint, typecheck, all 14 tests and final production build pass. Actual desktop, tablet and mobile layouts, testnet/mainnet reads, a live quote, import validation, missing-wallet/provider and empty states were inspected. Final production reads were captured on desktop and mobile. [Fidelity and limitations](design/2026-10-04-slush-fidelity.md) · [Machine check record](evidence/slush-ui/checks.json) · [Rendered evidence](evidence/slush-ui/production-desktop-light.jpg).

Geist is a licensed typography substitution; mobile layouts adapt the desktop reference because Slush mobile capture coverage is absent. Connected-wallet and configured-provider acceptance remain pending. Concurrent main commit `c642179` repairs F1–F4 and is integrated into this UI branch; combined lint/typecheck, all 22 tests, receipt-adapter checks, build and restarted keyless read passed. This UI branch is not a completed public release.

## Release checklist

- [x] Repair and verify October 4 review findings F1–F4.
- [ ] Finish funded testnet HBAR → SAUCE flow in a human-controlled EVM wallet; retain independently viewable hash, recipient/value/calldata, association proof and confirmed receipt.
- [ ] Check wallet rejection, disconnect, account change and chain change on both networks. Validate mainnet handling without requiring a real-fund transaction.
- [ ] Inspect a configured provider stream, failure/cancellation and transaction review handoff.
- [ ] Have an unfamiliar developer follow quickstart/import/MCP setup from a clean scaffold.
- [ ] Record the complete real wallet demonstration; current reads/quotes recording is a partial demo only.
- [ ] Recheck bounty rules/deadline at submission time; no deadline assumption removes these gates.
- [ ] Explicit release authorization: publish `Blockchain-Oracle/hedera-contract-workbench`, `main`, then run official installer against the public remote template.
- [ ] Re-run ordinary install/dependency/lint/typecheck/test/build/boot checks against that public template; verify ignored local state/credentials are absent.
- [ ] Review README claims against evidence, publish the video and submit the bounty only as explicit release actions.

## October 4 functional review

Current lint, typecheck, 13 core + 1 Solidity tests, local adapters, assistant mock stream, live two-ABI adapters and network verification all pass. Passing tests do not cover the newly reproduced edge cases. [The full review](reviews/2026-10-04-plan-coverage-review.md) records exact locations, reproductions, repairs and the coverage matrix; [diagnostic results](reviews/2026-10-04-probes.json) are repeatable without Hedera submissions.

- F1 / P1: ABI revision can change during simulation without invalidating the validation result.
- F2 / P2: ID-only removal can delete a contract refreshed after inspection.
- F3 / P2: receipt transaction verification bypasses the RPC limiter; status lacks cancellation propagation.
- F4 / P2: missing Hedera sender is incorrectly surfaced as a retryable transport failure.

The supplied address showed zero testnet HBAR and no matching account at review time. Raw address-specific preflight evidence remains in ignored local state. No transaction was submitted. UI appearance/layout is excluded from this review; transaction safety and protocol acceptance still apply.

## Repairs and final verification

[Follow-up acceptance record](reviews/2026-10-04-fixes-and-e2e.md): F1–F4 repaired and verified. **21 core + 1 Solidity tests pass.** Expanded local verification runs all planned CLI command groups in **28 actual subprocess checks**, including successful import/discovery/refresh, argument files/stdin, overloads, exact precision, unsigned preparation, confirmed/pending receipt states, indexing lag and stale/current deletion. Core/CLI/MCP outputs agree. Receipt cancellation propagates through HTTP handlers, MCP and assistant and closes the underlying RPC socket.

Public Hedera adapter/network checks and mock assistant streaming pass. The supplied-address CLI now gives a nonretryable account prerequisite with exit 3. Production build passes with RPCs disabled and keys empty. An [isolated final source copy](evidence/fix-fresh-source.json) passes ordinary **npm 10.9.3 ci**, clean dependency tree, lint, typecheck, all 22 tests, CLI/MCP and receipt-adapter verification, build, production boot and a keyless live read. It contains no copied credentials/local state. This is a fresh source copy; the earlier official installer local-template transformation and still-pending public-template download are separate evidence. The working checkout's npm run commands used Node 24's bundled npm 11.17.0; the fresh sequence used pinned npm 10.9.3 throughout.

Next action: resume funded human wallet acceptance, configured-provider checks, an unfamiliar developer walkthrough and explicit release actions. The supplied testnet address still has no usable funded account. No Hedera transaction was submitted. Never request a private key or sign through CLI/MCP/chat.

## October 4 generic contracts and agent access

The user's examples are acceptance scenarios, not contract categories. **One ABI pipeline and one portable skill remain authoritative.** Swap/UI presentation stays with the other agent. The user explicitly removed audio from scope. Optional typed chat now supports Gemini alongside OpenAI/Anthropic through official AI SDK adapters; all three adapters run real core reads against controlled provider HTTP fixtures, including Gemini thought-signature continuation. Real provider inference remains unverified.

Delivered `skills show` (human/JSON/Markdown), `skills export` and `skills install-command`; read-only same-origin skills JSON/reference/Markdown download routes; current revision-bound schemas and copyable argv/shell commands. Exports preserve prior bundles and keep local snapshots/arguments ignored. Vercel's official CLI actually installs the exported bundle for Codex, Claude Code and Cursor in an isolated project. Other supported agent IDs are delegated to the installer. The [UI handoff](reviews/2026-10-04-skill-ui-handoff.md) is concrete; a rendered skill panel is still the UI agent's work.

[Generic acceptance](reviews/2026-10-04-generic-contracts-and-skills.md) verifies three deployed local contract fixtures across core, CLI, MCP, HTTP handlers and assistant; tuple/array results, nested proposal inputs, NFT overloads, independent calldata encoding, caller-specific errors, bounds, payable precision, restart persistence and unchanged skill instructions. **Four real Hedera NFT facade reads** agree across direct RPC, CLI, MCP and assistant and matching mirror metadata where applicable. Old public DAO addresses failed their expected live functions; local governance evidence is labelled local. No category classifier is added.

Current **22 core + 1 Solidity tests**, all **28 existing CLI end-to-end subprocess checks**, receipt adapter cancellation, skill validation, lint/typecheck and fresh-source ordinary npm 10.9.3 ci/dependency/build/boot checks pass. New skill commands and exported command argv are exercised end to end; official agent installation and actual PTY output are recorded. [Fresh source evidence](evidence/skills-fresh.json) separates initial clean installation from final source refresh. A fresh production server serves skill JSON/Markdown and performs a keyless live read; build succeeds with RPC disabled and all provider keys empty.

Next: let the UI agent consume the tested skill API and update the example presentation; finish configured-provider acceptance, funded human-wallet workflow, developer walkthrough and explicit release gates. UI appearance/layout does not count toward the user's current review. Audio is removed, not a pending release requirement. CLI/MCP/chat only prepare; no Hedera transaction or publication occurred.

## October 4 combined UI and agent integration

Slush UI head `f4bd481` is merged into local `main` at `e9f7989`, preserving the newer dynamic skill/CLI, Gemini provider adapter and core safety repairs. The merge changes 52 files (2,876 text insertions / 583 deletions, including evidence/docs); all original UI assets and fidelity records remain. The isolated UI worktree is retained.

The shared browser navigation now exposes **Agent access**: portable SKILL.md and references, copy/download actions, local Vercel installation commands, current full signatures/schemas, editable argument examples and revision-bound CLI reads/preparation. Selecting another contract or refreshing its ABI replaces that context. Loading is lazy and abandoned fetches are cancelled. Export commands are generated by core, and Gemini is included in the assistant setup screen. Audio remains excluded; no contract category routing or new UI dependency is introduced.

Combined lint, typecheck, **22 core + 1 Solidity tests**, all **28 CLI subprocess checks**, receipt cancellation, three generic contract fixtures, official Vercel skill installation and four live Hedera NFT reads pass. A fresh source copy passes ordinary pinned npm 10.9.3 ci, dependency checks, lint/typecheck and production build with both RPC endpoints disabled and provider keys empty. Its production HTTP checks pass real testnet/mainnet reads, Markdown downloads, generated export execution and a real NFT import/read. The initial install/evidence save hit ENOSPC; generated temporary verification dependencies were cleared and retries passed. A case-sensitive header assertion in the temporary smoke harness was corrected. [Combined record](reviews/2026-10-04-ui-integration.md) · [Machine evidence](evidence/ui-integration/checks.json).

Fresh visual acceptance of the new Agent access panel is **pending**: browser tab selection was rejected for an unsupported protocol interpretation; no browser-policy workaround was attempted. Earlier desktop/tablet/mobile captures prove the UI branch, not this new panel. Deterministic review has zero errors, five existing warnings and 57 suggestions; the new panel alone has no findings. Manual desktop/narrow/keyboard review, funded human-wallet execution, configured-provider acceptance, developer walkthrough and explicit public release/submission gates remain. The main development preview responds at http://127.0.0.1:3000/. Nothing was pushed, published or submitted.

## October 4 interface refinement and actual browser acceptance

The latest user instruction is implemented on local `main`: remove global Swap, Read/Write list pills and transaction-file upload; refine function search, typed inputs, buttons, custom dropdowns, assistant, wallet rows and branded agent access. The connected product home is `/`; the generic workspace is `/workbench`. Selected contracts follow home/workspace links. CLI/MCP/chat review links target the workspace, and older root review links redirect. Optional protocol adapters remain available without adding a workflow to unrelated contracts. Audio stays excluded.

**Manual acceptance now supersedes the pending agent-panel visual review above.** Actual desktop/narrow and light/dark layouts, keyboard picker/search behavior, real current overload commands, provider-specific configuration copying, missing-wallet/provider, both-network context and isolated empty catalog/import states were inspected. A real NFT was imported through the custom dialog and its owner lookup completed through the new controls and final production build. No document overflow appeared at tested 390, 1280 and 1440px widths; final production console errors were zero. [Detailed acceptance](reviews/2026-10-04-interface-refinement.md) · [Machine record](evidence/interface-refinement/checks.json) · [Production capture](evidence/interface-refinement/functions-production-light.jpg).

Ordinary pinned npm install/dependency checks, lint, all-workspace typecheck, **22 core + 1 Solidity tests**, all **28 CLI subprocess checks**, and three generic deployed local EVM fixture adapter checks pass. Full/final production builds pass with RPCs closed and all provider keys/model unset. Production boot/route/legacy-review redirect/skill download, live testnet NFT and mainnet reads pass. This slice does not claim another fresh `npm ci`; previous fresh-source evidence remains separate. Two existing skill-export filesystem tracing warnings remain; current trace manifests contain zero environment/ignored state references. Final 21st component review has zero errors and two width warnings verified against actual layouts.

Next: funded human-wallet and real-provider acceptance, an unfamiliar developer walkthrough, final demonstration and explicit public-release/submission gates. Interface work alone does not complete all eight stages. Temporary production/empty-registry verification servers are stopped and the disposable fixture removed; the main development preview and isolated UI worktree remain. No signing, push, publication or submission occurred.

## October 4 connected reads and argument experience

Reproduced the exact sender TRANSPORT error in actual Zen with already connected MetaMask. Ordinary forms/assistant reads now omit the connected caller; an explicit caller override remains. Known errors survive development module identity changes and preserve actionable nonretryable PRECONDITION guidance. In the same Zen session a live `factory()` read completed, and missing amount/path plus malformed array-address feedback was inspected. The Mac later locked; further native wallet actions are unverified and were left untouched.

Browser and execution share one validation codec: generic inline required/nested-field errors, precise integer bounds, explicit ABI-valid empty inputs, invalid semantics, first-error focus and stable caller disclosure. Contract switching is visibly labeled/bordered and focus uses a single treatment. **Find a value** reads only a chosen actual ABI getter, displays validated results with provenance and applies explicitly. CLI/MCP/assistant/skill inspection exposes the same source metadata; counts never become guessed IDs. Manual acceptance also uncovered and repaired the bundled `WETH()` signature: the live router token getter is `whbar()`, now verified on both networks.

Final lint/typecheck, **27 core + 1 Solidity tests**, all **28 CLI subprocess checks**, three deployed generic local fixture adapter tests and assistant streaming/caller verification pass. Production builds pass with both RPCs closed and all provider keys/model empty. Final production/browser acceptance and exact limitations are in [the review](reviews/2026-10-04-argument-experience.md) and [check record](evidence/argument-experience/checks.json). No fresh install is claimed in this dependency-unchanged slice. Existing filesystem tracing warnings remain. Actual live getter/result application and quote succeed; narrower layouts, both modes, input focus and explicit-caller recovery are inspected. Provider inference and full funded-wallet workflow remain separate gates. Nothing was signed, pushed, published or submitted.

## October 4 live OpenAI inference

The user's supplied key enabled real `gpt-4.1-mini` inference in the local assistant. Imported NFT name/symbol cards, missing-ID clarification, a real NFT serial-number revert, selected-contract switching and router getter cards match actual core behavior. Live testing uncovered cancelled Responses item references breaking follow-ups and omitted empty argument wrappers causing unnecessary validation errors. OpenAI now replays content with `store: false`, conversation conversion discards unfinished tool calls, and only ABI functions with no inputs permit an omitted wrapper. The broken conversation recovered; another Stop and subsequent live read also pass.

Lint, Next.js typecheck, runtime builds, focused assistant and actual-route controlled provider regressions pass. The final closed-RPC/keyless build and a real production OpenAI factory read pass, including connected-address context without an implicit read caller. The credential remains ignored and server-side; scanning 888 build files found zero key matches and eight trace manifests exclude environment/local state. Existing two tracing warnings remain. [Detailed evidence and limits](reviews/2026-10-04-live-assistant.md).

Next: Anthropic/Gemini live inference as applicable, chat-to-wallet and human-controlled funded wallet/context/rejection acceptance, unfamiliar developer walkthrough, final demonstration and explicit release gates. OpenAI read acceptance does not complete all stages. No signature, funding, push, publication or submission occurred.

## October 4 Hedera visual direction

The user approved the recommended black landing, official violet/azure accents and neutral white/charcoal workspace, superseding Slush colors and shell geometry. Authentic Hedera SVGs identify the network separately from the product mark. The real contract preview exposes browser reads, current CLI commands and agent setup, with optional chat retained below the first screen. Parameterized functions open the exact tool in Workbench. Generic typed forms, inline validation, existing skill/MCP flows and wallet review remain.

Lint, typecheck, **27 core + 1 Solidity tests**, all **28 CLI subprocess checks** and local MCP parity pass. The full ordered build and final production frontend build pass with RPC endpoints closed and all provider credentials/model empty. Actual testnet router, imported NFT and mainnet router reads complete. Keyless production boot, disabled assistant/setup, import/wallet prerequisites, both themes, desktop/narrow layouts and agent commands were inspected. No horizontal document overflow at 390px on landing/forms/agents. Official assets are unmodified; final trace/artifact checks contain no ignored state or strong credential-format matches. Existing two filesystem tracing warnings remain; 21st's five max-width warnings were checked against actual layouts. [Acceptance and screenshots](reviews/2026-10-04-hedera-brand.md).

Next: resume the funded human-wallet and remaining provider acceptance, developer walkthrough, complete demonstration and explicit public release/submission gates. No signing, publication or submission occurred in this slice. No fresh installation is claimed; dependencies are unchanged.

## October 4 workspace composition revision after rejection

The user rejected the preceding rendered design. The current workspace replaces the floating rail, duplicated heading and stacked contract card with a compact header, underline navigation, contract toolbar and continuous function workspace. Wide screens place typed arguments beside actual response/schema states. Full signatures, inline validation, optional caller context, exact wallet review and current agent commands remain. User acceptance of the new appearance is not claimed.

Lint, all-workspace typecheck, **27 core + 1 Solidity tests** and the final Next production build pass. The build uses closed RPCs and empty provider credentials/model; two existing tracing warnings remain. Actual production NFT read, required-field focus, overload schemas, filtering, optional assistant and agent navigation pass. Desktop light/dark and narrow layouts were inspected; no horizontal document overflow appears at 390px. [Revision and evidence](reviews/2026-10-04-workspace-composition.md). No dependencies or execution packages changed. Remaining release gates are unchanged.

## October 4 Refero Contract Studio revision

Refero research inspected actual Linear and HTTPie screens, every screen in the Exa/Cohere flows and the SST style preview before source edits. Contract Studio was chosen over a sequential Guided Console. Linear's graphite/soft-white/gray surface roles now guide the palette, with bounded Hedera action accents and authentic marks. The landing presents a working catalog; the workspace places arguments/results together; assistant prompts and agent setup follow the selected contract. Shared controls, dialogs and phone navigation are coherent. No global Swap interface, contract categories, copied assets or dependencies were added; execution packages remain unchanged.

Lint, typecheck, **27 core + 1 Solidity tests**, ordered/final keyless closed-RPC builds, all **28 CLI subprocess checks**, local MCP parity and the official skills installer for Codex/Claude Code/Cursor pass. Actual testnet NFT and mainnet router reads, inline required-field focus, overload filtering, keyboard agent tabs, Markdown download, import errors, keyless setup and live OpenAI read/Stop/follow-up were checked. Rendered desktop, tablet and phone layouts were inspected in both themes; visual defects found during inspection were fixed. Production traces exclude local state, and production output has no strong credential-format matches. Two existing tracing warnings remain.

[Research, screenshots and acceptance limits](reviews/2026-10-04-refero-contract-studio.md). User aesthetic acceptance, operating-system clipboard paste, real wallet signing, remaining live providers, physical-device/accessibility acceptance, fresh installation and release gates remain separate. No signing, purchase, deployment, push or submission occurred. Resume from this record and actual files; do not mark all stages complete based on the UI pass.

## October 5 publication and submission preparation

The user requested repository publication/documentation and help completing the official bounty form as a solo entrant. The README now identifies this as a source preview, includes the current Contract Studio screenshot and public-template command, and links to [submission readiness](SUBMISSION.md). The reachable `main` history was scanned before publication: 546 file versions, zero strong credential-pattern matches and zero committed local environment/config files. Private entrant information is kept out of this public repository.

The official schedule was checked again: October 4, 11:59 PM Eastern / October 5, 04:59 Africa/Lagos has passed. Form availability is not proof of late-entry eligibility. Public-template verification is the next release check after publishing. Verifiable Hedera testnet transaction evidence, real wallet acceptance, the complete wallet video and developer survey remain outstanding. Publication is not submission or completion of every stage.

## October 5 public source and fresh generator acceptance

Public `main` at `c45f441` was downloaded through official create-scaffold-hbar 0.4.1. All five workspaces and commands survived transformation. The generator requires Git name/email and rewrites packageManager metadata to npm 10.0.0; verification used process-only Git identity and pinned npm 10.9.3 ordinary ci without legacy peer flags. Dependency tree, lint, typecheck, 27 core plus one Solidity test, 28 actual CLI subprocess checks with MCP equivalence, no-key production build and production boot pass. See [machine evidence](evidence/public-scaffold.json). Install timing is one warm-cache observation, not a performance claim.

The user has now authorized a public Vercel preview with /docs and /demo. Its read-only hosted boundary is documented in [the deployment design](plans/2026-10-05-public-preview.md); local full functionality remains intact. Deployment, rendered verification and live endpoint results are recorded separately once actually observed. The Google Form draft contains verified solo entrant and public source details. It is unsubmitted; a current video under five minutes and independently verifiable Hedera testnet transaction remain missing. The passed October 4 deadline and unconfirmed late eligibility still apply.

## October 5 Vercel production preview acceptance

The user explicitly authorized deployment. Public [production](https://hedera-contract-workbench.vercel.app), [docs](https://hedera-contract-workbench.vercel.app/docs) and [interactive demo](https://hedera-contract-workbench.vercel.app/demo) are live from source `37756d5`, deployment `dpl_71S9R9AwuRijN3x6BBZXKorMr3Fc`. Vercel uses Node 24, ordinary pinned npm 10.9.3 ci and ordered workspace builds. Only a clean Git export was uploaded; no provider credentials, local imports or journals. The remote production build passed without tracing warnings.

[Deployment checks](evidence/public-preview/checks.json): all thirteen public page routes return 200 without authentication. Actual testnet/mainnet factory reads return matching canonical addresses; unsigned simulation with an existing router address returns the same values and gas estimate 23133 on both networks. This is a read simulation, not a wallet transaction or funded-account acceptance. Strict arguments and cross-origin rejection pass. Import, deletion, preparation, saved-plan validation, journaling and protocol preparation are blocked before persistence. Provider chat is disabled. Canonical skill Markdown is served with portable GitHub installation and local CLI commands.

The hosted boundary tests and local receipt/cancellation/removal regressions pass, along with lint, all-workspace typecheck, dependency checks and no-key/no-RPC production build. Actual deployed demo and docs were inspected at desktop and 390x844 phone widths, including dark documentation, readable structured response, navigation and code controls. Phone document width matches viewport; no console errors observed in this final QA tab. [Rendered evidence](evidence/public-preview/). This extends the existing Contract Studio reference lock.

The form is still a draft. Entrant details and public repository were entered earlier; the required video URL remains blank. /demo is interactive and must not be misrepresented as the required video. A funded Hedera testnet transaction, remaining wallet acceptance, developer survey and confirmation of late eligibility remain outstanding. After the user brought Zen into view, the screenshot showed the saved draft and mandatory video error. Native computer use then returned noWindowsAvailable on screenshot/field interaction even after reconnecting. Deployed links were not entered; the draft is intact and awaits a working window connection or manual paste. No final submission or wallet transaction was performed.

## October 5 documentation and agent-use cleanup

Read the author's current Masayume and Agari READMEs and inspected their actual banner images. README now uses original Workbench artwork, task-oriented guides, repeatable installation, a real CLI read, a compact shared-core diagram and current feature/acceptance limits. Quickstart, architecture, agent setup, configuration, support and submission instructions are consistent with the local template and hosted boundary. Root AGENTS.md includes the required AI-assisted-use workflow as well as contribution rules. The redundant Next.js CLAUDE.md is removed; the real framework generator preserves AGENTS without recreating it. Product Claude Code/skill compatibility remains.

Lint, all-workspace typecheck, the full keyless/closed-RPC build and final Next build pass. Eleven canonical docs contain 80 valid relative links; both original SVG assets parse; nine docs pages and two asset routes boot successfully. Actual documented CLI discovery/inspection/read/skill/MCP commands pass, including the live testnet factory result. The supplied-ABI import passes in an isolated registry. The GitHub Vercel skill command installs for three named agents and its copies match source. Actual desktop/phone and light/dark documentation were inspected; deep links work, active navigation is marked, wide tables are scrollable and phone document width stays at 390px. [Review and limits](reviews/2026-10-05-documentation.md) · [Evidence](evidence/documentation/checks.json).

This slice changes documentation and its rendering, not execution logic. Native clipboard paste, fresh-scaffold repetition and full funded-wallet acceptance are not claimed. The user owns the new video. The submission draft is untouched; independent Hedera transaction evidence, remaining wallet checks, survey and late-entry eligibility remain pending. Next: publish the verified documentation and inspect the resulting production pages; then resume remaining release gates from their actual evidence.

Documentation source `164929c` is now pushed and deployed as `dpl_9CSxo16516HdoHPSYh8VNC1Z42i6` at the existing Vercel production alias. Remote ordinary npm ci and production build pass. Twelve public pages, both source-matching artwork routes and hosted state pass; the actual public testnet factory read returns the expected address. GitHub renders the new banner. Production desktop/narrow layouts, loaded images and deep links are inspected with zero console errors in the fresh QA tab. The phone check uses 390px CSS width at display scale 2; its native screenshot and capture bounds are documented in the review. Viewport overrides are cleared. The temporary local production server is stopped after verification. No funded transaction or final bounty submission occurred. Resume with the remaining wallet/video/survey/eligibility gates above.

## October 5 demo showcase

The user requested the Masayume/Agari demo-page pattern with their YouTube video pending. Actual reference pages and their screenshots/flows were inspected. `/demo` now has a product introduction, explicit pending-video slot, real dated workspace/agent screenshots, section navigation, unchanged interactive testnet read and evidence rows with the funded transaction marked pending. It extends the existing Contract Studio direction. The actual recording can be configured with `WORKBENCH_DEMO_YOUTUBE_URL`, with safe YouTube-only validation and deliberate player loading.

Lint, frontend typecheck, the ordered no-key/closed-RPC build and final frontend build pass. URL validation, source route/asset/anchor checks, actual browser read and equivalent HTTP/CLI testnet read pass. Desktop/phone and light/dark inspected; the poster's phone clipping was fixed and document width remains 390px. [Review and limits](reviews/2026-10-05-demo-showcase.md) · [Evidence](evidence/demo-showcase/checks.json). Core, CLI, MCP, providers and wallet logic are unchanged. No new dependencies or fake video/transaction evidence.

Next: publish this verified source to the existing Vercel preview and verify production; later add and check the entrant's actual recording. The bounty form remains an unsubmitted draft. Missing video, funded transaction, remaining wallet checks, survey and late-entry eligibility are still outstanding.
