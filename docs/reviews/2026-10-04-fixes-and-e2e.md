# Repairs and end-to-end verification — 2026-10-04

All four findings from the [functional review](2026-10-04-plan-coverage-review.md) have been repaired and verified. The review/evidence was committed first as `fdf7d97`; the subsequent repair includes source, focused regression tests, expanded subprocess verification, skill references and this acceptance record. UI appearance and layout remain outside the requested scope.

## Repairs

| Finding                                  | Result                                                                                                                                                                                                                                                                                        | Verification                                                                                                                                                                                                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1: revision changes during simulation   | Preparation and validation recheck the current revision, ABI hash, network, chain, address and contract kind after simulation. Validation also accepts the request cancellation signal.                                                                                                       | Both preparation and validation reject a revision updated during execution with `STALE_REVISION`. Original saved plans remain intact.                                                                                                                                          |
| F2: stale deletion                       | Store removal requires an expected revision and compares it under the registry lock. CLI captures the revision before confirmation and accepts `--revision` for previously inspected automation. HTTP removal requires the inspected revision; a rejected deletion preserves selection/state. | Byte-for-byte registry preservation; real CLI subprocess stale/current deletion; HTTP handler stale/missing/current revision checks.                                                                                                                                           |
| F3: receipt concurrency and cancellation | Transaction lookup now uses the shared limiter. Status carries cancellation through chain/receipt/transaction RPC and mirror lookup. Cancelled queued work is removed; cancellation is preserved when handling indexing failures. HTTP, MCP and assistant pass their signals.                 | Eight concurrent journal-backed requests peak at four RPC calls. Actual local HTTP cancellation interrupts RPC/mirror calls. HTTP route, assistant and MCP cancellation each close the RPC socket; subsequent requests succeed. A receipt for mismatched calldata is rejected. |
| F4: missing sender error                 | Nested viem/RPC causes identify absent Hedera senders and insufficient funds as nonretryable `PRECONDITION` with account/network/funding guidance. Decoded contract errors and genuine transport errors retain their classifications.                                                         | Real nested viem fixtures; live supplied-address CLI invocation now returns `PRECONDITION`, exit 3 and actionable guidance. Detailed wallet evidence stays ignored.                                                                                                            |

The original [review probes](2026-10-04-probes.json) are preserved. The comparison [script](reproduce-2026-10-04.mjs) now asserts the protections and produced [repaired outcomes](../evidence/review-fixes.json): stale validation rejected, refreshed record preserved, transaction RPC concurrency four.

## CLI end-to-end coverage

`npm run verify:local` launches an isolated Hardhat RPC, deploys the original Observation contract, and invokes the actual built CLI in **28 separate subprocess checks**. Every call checks its process exit code, single versioned JSON envelope and absence of terminal colors in JSON. Each process reloads the persisted workspace.

Covered commands: `doctor`; contract import/list/inspect/refresh/remove; tool list/inspect/call/simulate/prepare; transaction status; MCP config.

The checks include:

- Import by Hedera ID resolved to a distinct EVM address, artifact ABI fallback, discovery and successful refresh. Mirror/Sourcify metadata in this isolated test is a controlled HTTP fixture; execution uses actual Hardhat RPC. Public Hedera import/read verification is recorded separately.
- Both overloaded signatures, tuple/array roundtrip, integer precision above JavaScript's safe range, argument files and stdin, caller-specific decoded revert, malformed/unknown input and registry preservation.
- Equivalent unsigned calldata/caller/value across core, CLI and the official MCP stdio client; simulation and catalog-change notification after refresh.
- An actual local confirmed transaction receipt bound to the saved plan, pending receipt, mirror-indexing lag and subsequently indexed status through MCP. CLI/core/MCP never submit; this verification's fixture transaction is sent directly to isolated Hardhat.
- Wrong-network readiness, supplied-ABI refresh guidance, noninteractive deletion confirmation requirement, stale deletion exit 3 with byte-for-byte state preservation, current deletion success and missing-contract recovery.

The recorded [command/results list](../evidence/local-adapters.json) is evidence of actual processes. These tests are not a Hedera wallet approval or a public transaction demonstration.

## Final checks

All performed on Node 24.19.0:

| Check                         | Outcome                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lint and typecheck            | Passed                                                                                                                                                                               |
| Tests                         | **21 core + 1 Solidity = 22 passed**, including eight new review regressions                                                                                                         |
| CLI/core/MCP local end-to-end | All 28 subprocess checks and adapter assertions passed                                                                                                                               |
| Receipt adapter verification  | Actual RPC socket cancellation and later recovery passed through HTTP handlers, assistant and MCP                                                                                    |
| Public adapter verification   | Actual router/token imports and core/CLI/MCP reads agree; invalid MCP input rejected; protocol stdout clean                                                                          |
| Live network verification     | Testnet router revert agrees with direct RPC; HRC-719 caller simulations succeed; mainnet factory read and testnet quote succeed; no transaction submitted                           |
| Assistant verification        | Official AI SDK mock stream plus real RPC read passes scope, continuation, cancellation and six-execution budget; configured-provider inference is not claimed                       |
| Production build              | Passed with both RPC endpoints disabled and provider keys empty                                                                                                                      |
| Skill validation              | Passed; draft reference wording replaced by tested protocol/exit codes and stale-removal guidance                                                                                    |
| Development startup           | Coordinated watchers/startup pass; actual HTTP API keyless testnet `factory()` read succeeds; localhost:3000 restarted with repaired source                                          |
| Fresh ordinary installation   | npm **10.9.3 ci**, dependency tree, lint, typecheck, 22 tests, CLI/MCP end-to-end, receipt adapter checks, build, production boot and keyless live read all pass in an isolated copy |

The working checkout's `npm run` commands used bundled npm 11.17.0. Fresh installation and its entire check sequence used the pinned npm 10.9.3. Package dependencies and the lockfile are unchanged. The final source copy excluded credentials and local state. Its disabled-RPC build needed no network; its subsequent keyless read intentionally used public RPC. [Fresh source record](../evidence/fix-fresh-source.json) and `fix-fresh-*.txt` contain the check results. This is an isolated source copy, not a new official installer transformation or a public-template download; the earlier official installer transformation evidence remains separately recorded.

Other evidence: [receipt adapters](../evidence/receipt-adapters.json), [public adapters](../evidence/adapters.json), [assistant](../evidence/assistant.json), [networks](../evidence/network.json), [dev startup](../evidence/fix-dev-boot.json).

## Remaining acceptance limits

The supplied address still shows zero testnet HBAR, and caller simulation reports that the sender account does not exist on testnet. No Hedera transaction was submitted. A usable funded account and human browser-wallet approval are needed for actual HRC-719 association, HBAR → SAUCE swap, viewable receipt, wallet rejection and account/network-change/recovery acceptance. Mainnet handling does not require an automatic real-fund transaction.

A configured OpenAI or Anthropic session, unfamiliar developer walkthrough, complete wallet demonstration video, public-template installation, remote CI run and explicitly authorized publication/submission remain unverified. A successful local test does not stand in for these gates. The repository is therefore **not yet a completed public first release**.

Next: resume those acceptance gates from [DELIVERY](../DELIVERY.md). Do not repeat broad architecture research or request signing keys. UI appearance/layout does not count toward this review.
