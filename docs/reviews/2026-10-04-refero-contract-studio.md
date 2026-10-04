# Refero redesign: Contract Studio

## Research and direction lock

Research performed before source edits using live Refero styles, screen images and complete flows. These are references, not assets copied into this product.

- [Linear workspace](https://refero.design/pages/1a493a2c-7d09-4143-b0dd-745781ea7991), its dark issue list and marketing preview: primary reference for neutral surfaces, compact navigation, clear content hierarchy and a product-dominant landing. Keep Geist and Hedera branding; do not import Linear's lime, proprietary fonts or marks. Actual light/dark screen images inspected.
- [HTTPie request editor](https://refero.design/pages/ed846c80-e5bc-4830-95ed-c43957ddf86b): function navigation, inputs and output remain adjacent. Its assistant overlay was inspected; we retain our scoped assistant and exact wallet handoff.
- [Exa Search and Assist](https://refero.design/flows/12016): all six screen images inspected, from request setup through JSON output, suggested questions, pending response and an actionable answer. Borrow contextual prompts and visible next actions, not a competing execution engine.
- [Cohere API Request Composer](https://refero.design/flows/3860): both composition and generated-code images inspected. Borrow language/host selection beside generated commands and progressive disclosure of technical references.
- [SST](https://sst.dev): actual Refero style preview inspected. Code is explanatory product evidence. Borrow legible copyable setup commands; its white marketing identity does not replace our black Hedera landing.

Supabase's complete style was also reviewed, but it is not our primary reference. Relevant product screens were not found in this Refero search; no Supabase screen study is claimed.

## Two directions

1. **Contract Studio (chosen):** compact continuous workspace, adjacent arguments/results, contract-specific assistant and a selected agent setup path. The landing shows an actual working catalog. This supports repeated use across arbitrary ABIs without imposing categories.
2. **Guided Console:** one call per screen, with import, argument entry, execution and wallet review as sequential steps. Clear for first use, but slower when comparing many functions; retain guidance within Studio instead.

The user authorized choosing and implementing the stronger direction. This is an implementation choice, not a claim of user aesthetic acceptance.

## Concrete rules

- Graphite dark surfaces and neutral light surfaces, thin dividers, 8px controls, 12px overlays. Existing official Hedera black/violet/azure roles retained. Color indicates action, selection or status, never decorative headline words.
- Landing title 40–56px; application headings 20–24px; body 14px; metadata/code 12px. Use a 4px spacing scale with 16–24px panel padding. Monospace only for signatures, addresses, schemas and commands.
- Real interactive catalog is the landing's product media; no fake transactions or dashboard metrics.
- Contract and function switching remain obvious. Mobile uses one navigation pattern and stacked inputs/results. Controls retain labels, keyboard focus and reduced-motion behavior.
- Keep typed validation, explicit optional read caller, provider failure states, exact wallet review and receipt recovery. No global Swap interface or contract classification.
- Existing Radix/shadcn primitives are sufficient. 21st search found installer tabs and snippet patterns; no additional dependency or unreviewed component is needed.

## Decision ledger

| Problem                                         | Decision                                                                    | Reference      |
| ----------------------------------------------- | --------------------------------------------------------------------------- | -------------- |
| Generic split hero with decorated headline      | Concise all-white introduction above a wide live studio preview             | Linear         |
| Too much toolbar chrome before a function       | Compact contract context and deliberate input/output panes                  | Linear, HTTPie |
| Agent setup overwhelms with simultaneous panels | Setup/CLI/reference tabs; one selected host and one copy action per command | Cohere         |
| Assistant's generic empty state                 | Contract-specific questions, scoped capabilities and stable composer        | Exa            |
| Inconsistent radii and blue-tinted surfaces     | Shared neutral tokens and compact reusable controls                         | Linear         |

## Implemented journey

The landing introduces the product above a wide, working catalog; its browser, CLI and agent paths use the actual selected contract. The workspace has compact navigation, a clearly bordered contract picker, signature-qualified functions and adjacent arguments/results on wide screens. Phone and tablet layouts stack the same controls. Agent setup now separates host connection, current CLI arguments/commands and portable Markdown references. The assistant uses selected-contract prompts, real result cards and a stable composer. Shared fields, pickers, dialogs, imports, wallet prerequisites and transaction review use the same tokens.

Core, CLI, MCP, providers and wallet execution logic remain in their existing packages. No dependencies, copied reference assets or global Swap interface were added. Reads still omit an implicit wallet caller; unsigned preparation and exact wallet review remain distinct from submission.

Visual inspection found and fixed an assistant panel shrinking to 585px on a 1440px viewport (now a 1024px container), an agent tab row overflowing at 390px, crowded phone navigation, an import drawer extending outside the phone viewport, and excessive space below tablet function selection. The corrected drawer spans x=8 to x=382 at 390px; the tablet function navigator is 121px tall.

## Verified behavior

- Actual rendered production pages inspected at 1440×900, 768×1024 and 390×844, including light/dark themes. Final checked layouts have no horizontal document overflow. Screenshots are in [the evidence directory](../evidence/refero-contract-studio/).
- Landing and workspace perform real testnet reads. The imported NFT's `name()` returns `Night Market`; contract/function switching changes the catalog. A mainnet router `factory()` read returns `0x0000000000000000000000000000000000103780`, with mainnet shown explicitly. No transaction was signed or submitted.
- Empty `ownerOf(uint256)` input shows `tokenId is required`, marks the field invalid and focuses `arg-tokenId`. Function filtering distinguishes the two `safeTransferFrom` overloads; Escape clears the filter. Optional caller and actual-getter discovery remain available.
- Agent CLI selection follows the selected browser function. Arrow-key navigation switches agent tabs. Choosing Claude Code changes the official installer argument to `--agent claude-code`; copy success feedback appears. The browser's downloaded `SKILL.md` is byte-identical to the canonical file.
- Keyless production shows a disabled composer and usable provider setup. Selecting Gemini produces the correct configuration placeholders. Missing browser-wallet prerequisites and empty activity are readable; malformed import reports an actionable input error without changing the catalog.
- Configured local OpenAI chat performs a real NFT read and renders the result card. Stop restores the composer; a subsequent `symbol()` call returns `NIGHT`. No key was read or included in the screenshots.
- A fresh final production tab records no console errors across its read, navigation, agent and provider checks. Intermediate development edits and expected malformed-input failures are not represented as a zero-error historical session.

## Checks and contrast

Lint, all-workspace typecheck, 27 core tests and one Solidity test pass. The ordered build and final frontend build pass under Node 24 with provider credentials/model empty and RPC endpoints closed. All 28 actual CLI subprocess checks and local core/CLI/MCP execution, preparation and receipt parity pass. Vercel's pinned `skills@1.7.0` installs and lists the exported skill for Codex, Claude Code and Cursor in an isolated temporary project; all installed files match exported bytes. See [local adapter evidence](../evidence/local-adapters.json), [installer evidence](../evidence/skills-install.json) and [this pass's check record](../evidence/refero-contract-studio/checks.json).

Measured normal-text contrast: soft white on near-black 18.73:1; muted dark text on graphite 7.17:1; muted light text on white 5.98:1; white on azure 7.28:1; white on violet 4.54:1. Reduced-motion handling and keyboard focus remain. 21st review's focus findings were repaired; width heuristics were checked against actual layouts. No 21st component code or dependencies were imported.

Eight production trace manifests exclude environment files/local state; 270 production output files contain no strong credential-format matches. This scan excludes ignored development caches, which can retain environment/source material and are not release artifacts. Two existing dynamic-filesystem tracing warnings remain in the skill-export code.

## Limits and continuation

Copy feedback is verified; the browser test tool's virtual clipboard did not expose text copied through the page's Clipboard API, so operating-system paste is unverified. Real wallet signing, funded transaction/context/rejection acceptance, live Anthropic/Gemini inference, physical-phone interaction, screen-reader testing, a fresh dependency installation and unfamiliar-developer walkthrough were not performed in this UI pass. A missing wallet was inspected in the in-app browser; the user's Zen/MetaMask session was left untouched.

The configured assistant test uses the existing ignored local provider configuration. Publication, deployment, demonstration and bounty submission remain separate explicit release actions. The user's acceptance of the new appearance is not assumed. No purchase or paid dependency was added. The existing development server is retained; temporary production servers and viewport overrides are cleaned up after review.
