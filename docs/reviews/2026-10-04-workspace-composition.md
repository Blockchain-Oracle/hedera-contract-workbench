# Workspace composition revision

The user rejected the preceding design. This revision changes the workspace hierarchy within the existing Hedera brand direction. It is implemented and technically inspected; user acceptance of its appearance is not claimed.

## What changed

The floating application rail and repeated Contracts heading are removed. A compact product header holds the selected network, theme and one wallet control. Functions, Assistant, Agent access and Activity use underline navigation. Contract selection is a visibly labeled toolbar rather than a large rounded card. The function navigator and execution area now share one continuous surface.

Function titles use full ABI signatures. Wide screens place arguments and response beside each other. Before execution the response shows actual ABI return types; completed calls use the shared structured renderer. Redundant explanatory copy and the decorative active-function arrow are removed. The wallet header variant retains account/network semantics; old hardcoded wallet colors now use semantic tokens. All changes are presentation only: no core, provider, CLI, MCP or registry behavior changes.

## Evidence

- Lint and all-workspace typecheck pass.
- 27 core tests and one Solidity test pass.
- Production Next build passes with both RPC endpoints closed and all provider credentials/model empty. The two existing skill-export filesystem tracing warnings remain.
- Final production boot and an actual NFT `name()` read return **Night Market** without a wallet/provider key.
- The original `ownerOf(uint256)` deep link selects the exact tool. Required `tokenId` validation focuses that field before execution.
- Overloaded `safeTransferFrom` choices retain their distinct typed arguments, full-signature URL and wallet-review action.
- Function filtering and Escape reset work. Agent commands and the disabled optional assistant render in the revised shell.
- Actual 1280×720 desktop light/dark and 390×844 narrow layouts were inspected. The owner lookup action ends at y=645px on desktop, inside the first viewport. Functions, agent setup and assistant document widths equal 390px on mobile.
- Final deterministic 21st review: zero errors, four width warnings. They concern max-width containers and the bounded mobile drawer; actual narrow layouts have no horizontal document overflow.

[Check record](../evidence/workspace-revision/checks.json) · [Desktop light](../evidence/workspace-revision/functions-desktop-light.png) · [Desktop dark](../evidence/workspace-revision/functions-desktop-dark.png) · [Real response](../evidence/workspace-revision/live-read-desktop.png) · [Mobile form](../evidence/workspace-revision/functions-mobile-dark.png) · [Required validation](../evidence/workspace-revision/required-argument-mobile.png).

During editing, the live development preview exposed a missing icon reference left by a removal; it was repaired before final checks and production acceptance. No unresolved runtime regression is attributed to that transient state.

The previous design's screenshot inspection does not imply current aesthetic acceptance. Funded wallet acceptance, remaining providers, unfamiliar developer walkthrough and explicit public release/submission remain separate. No fresh install, paid provider inference, transaction signing, push or publication is claimed in this slice.
