# Combined UI and functional integration — October 4, 2026

The referenced task “Review Hedera project context (2)” was read before relying on its work. Its clean `codex/slush-workbench-ui` branch at `f4bd481` is integrated into local `main` at `e9f7989`; `a147240` was main before the merge. The only conflict was the receipt-adapter evidence timestamp, resolved by preserving the newer main report. Both branches and the separate UI worktree remain available. No remote update or release action occurred.

## Change measurement

The merge changes **52 files, 2,876 text insertions and 583 deletions**. These counts include docs, test transcripts and design evidence, not just implementation; image/font bytes are excluded from textual line counts. The application changes are the Slush shell, semantic light/dark tokens, network accents, footer Accounts panel, network drawer, shared contract forms, results, assistant and transaction states. Licensed local Geist replaces the unavailable Aeonik font. The pre-merge main retains its generic ABI/skills pipeline, Gemini adapter, CLI end-to-end coverage and core revision/receipt safeguards. Direct dependency manifests and lockfile were not changed by the merge.

The integration follow-up adds an Agent access view to the shared navigation using existing primitives and tokens. It reads core’s current selected-contract skill API, checks ID/revision, cancels abandoned requests and remounts after selection/refresh. It exposes the portable Markdown and references, local installer commands, argument examples, input/output schemas and safe copyable CLI commands. Core supplies the full-bundle export command. Preparation keeps its wallet-address/native-value placeholders; copying an example does not sign or submit. Provider setup copy now includes Gemini. No audio feature, contract categories, model-generated executable component or additional UI library is added.

21st search returned developer/agent component references; none was copied because existing primitives cover this integration. The measured Slush direction is retained. The new component’s deterministic 21st review has zero findings; the complete Next package has zero errors, five existing warnings and 57 suggestions. Four warnings concern disabled-control primitives; the fifth flags the desktop-only fixed-width rail. These are manual inspection prompts, not proof of runtime defects.

## Combined verification

[Exact check record](../evidence/ui-integration/checks.json) and associated logs:

- Lint, typecheck, **22 core tests + 1 Solidity test** and full dependency-tree checks pass.
- All **28 existing CLI subprocess checks** pass, including import/refresh/restart, argument files/stdin, integer precision, overloads, preparation and receipt states. Receipt cancellation passes through HTTP, MCP and assistant adapters.
- Three deployed local governance/NFT/payable fixtures pass canonical schema and execution parity across CLI, MCP, HTTP and assistant tools. Actual OpenAI/Anthropic/Gemini adapters use controlled HTTP fixtures; this is not paid inference.
- Official Vercel skills installation passes for Codex, Claude Code and Cursor. Four real Hedera NFT reads pass across adapters. Old DAO deployments remain separately recorded as unavailable; local governance fixtures are not advertised as Hedera transaction evidence.
- A fresh copy of the combined source passes **ordinary npm 10.9.3 ci**, dependencies, lint/typecheck and production build. Build uses disabled RPC endpoints and empty provider keys. No credentials, local imports, plans or journals were copied.
- The fresh production server serves the local font, keyless state, current skill JSON and exact SKILL.md downloads. Real testnet/mainnet factory reads succeed. The core-generated export command runs as a subprocess and writes the complete bundle. Importing the real testnet Night Market NFT facade changes the current skill tools and returns its live `NIGHT` symbol.
- The main development preview responds at http://127.0.0.1:3000/.

An initial clean-install/evidence-save attempt ran out of disk space. Only generated dependencies/build output from temporary verification copies created for this task were removed; source and evidence were preserved. Installation and the failed live-network evidence save were retried successfully. A first temporary HTTP smoke assertion used a case-sensitive header dictionary; header names were normalized and the complete check passed. These are recorded as setup/harness failures, not product defects.

## What remains unverified

The browser tool rejected tab selection after interpreting its identifier as an unsupported URL protocol. No alternate browser surface or policy workaround was used. Fresh desktop/narrow/keyboard inspection of the new Agent access panel is pending. The UI agent’s existing rendered captures remain evidence for its branch; they do not prove the subsequent panel. Current deterministic review and HTTP behavior are separate evidence.

Funded wallet approval/rejection/context-change/receipt recovery, real configured-provider acceptance, an unfamiliar developer walkthrough, a full wallet demo and public-template release/submission remain open. No Hedera transaction or paid inference was performed. This integration is ready for the next UI conversation, not a claim that all eight release stages are accepted.
