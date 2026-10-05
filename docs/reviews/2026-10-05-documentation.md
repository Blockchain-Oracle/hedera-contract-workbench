# Documentation and agent-use review — October 5, 2026

The requested documentation cleanup follows the product-first structure of the author's Masayume and Agari documentation: original branded artwork, a clear explanation, a first useful action and links to deeper guides. It preserves Contract Workbench's current Contract Studio identity and all execution integrations.

## References inspected

- [Masayume repository](https://github.com/Blockchain-Oracle/masayume): read the actual current README through GitHub. Inspected the published [banner](https://docs.masayume.app/repo-assets/hero-light.svg). Borrowed the clear headline, navigation by user intent and compact architecture explanation; no artwork, brand colors or source were copied.
- [Agari repository](https://github.com/Blockchain-Oracle/agari): read the actual current README and inspected its banner in the browser. Borrowed its sequence of product explanation, useful first action, source map and dated evidence; no app screenshots or branding were copied.
- [Official Scaffold HBAR brief](https://hedera.com/blog/scaffold-hbar-template-bounty/): checked requirements for setup README, AI-assisted-use AGENTS, manifest, fresh-scaffold acceptance and independent testnet transaction evidence. The readiness guide maps each requirement to a real file or an outstanding gate.

## Changes

README now leads with original Workbench artwork, a product explanation, local/public availability, task-oriented guide links and repeatable setup. The first read has a real bundled tool ID and copyable CLI commands. Import, typed values/getter discovery, skill/MCP setup, wallet review, provider configuration, repository structure and acceptance limits are covered without abandoned design history.

Root AGENTS.md now explains AI-assisted use: discover deployments, inspect current schemas, construct typed arguments, bind revisions, read without an implicit caller, prepare unsigned writes, hand off wallet review and report actual receipts. Contributor invariants remain. The redundant Next.js CLAUDE.md was removed. The installed Next generator's `hasCurrentAgentRules` returns true and `writeAgentFiles` leaves AGENTS unchanged while skipping CLAUDE; no framework patch or opt-out was needed. Claude Code product compatibility and its skill installation remain supported.

Quickstart is a numbered first-read/import journey. Configuration explains network/account prerequisites, secret locations, three optional providers, override precedence, defaults/bounds and error recovery. Support distinguishes the local implementation from the public preview and from live acceptance. Architecture uses an original compact SVG because the site's Markdown renderer does not execute Mermaid; the shared-core tree remains simple and has no crossing connectors.

The docs site serves the new artwork locally, marks the current navigation page, supports real heading anchors and includes a GitHub footer on narrow screens. Wide tables are keyboard-focusable, preserve code strings and show a mobile swipe hint. No dependencies or contract-execution packages changed.

## Observed verification

- Lint and all-workspace typecheck pass. Full ordered build passes with both RPC endpoints closed and all model credentials/model empty. The final Next build after the table refinement also passes.
- Eleven canonical Markdown files: 80 relative links/anchors resolve; both SVGs parse successfully. Nine local documentation pages and two artwork routes return 200.
- Six documented CLI commands run as real subprocesses. The bundled testnet factory read returns `0x00000000000000000000000000000000000026E7`. The documented supplied-ABI router import also passes in a separate temporary registry, preserving the user's imports.
- The documented GitHub `skills@1.7.0` command installs for Codex, Claude Code and Cursor in an isolated project. Installed SKILL.md copies match canonical source byte for byte.
- Actual 1280px desktop and 390px phone layouts were inspected, including dark wallet guidance, architecture, code cards and navigation. Document width equals viewport width; wide tables scroll inside their own region. Import and wallet deep links reach their actual headings. Copy success feedback is observed.
- One earlier mixed artwork/docs tab reported an animation TypeError. Repeating overview → import → wallet navigation in a fresh documentation tab produced no console errors; the earlier error is not attributed to a source defect without evidence.

Screenshots are in [the evidence directory](../evidence/documentation/). Command/link/route results are in [checks.json](../evidence/documentation/checks.json). Deployment and public verification are recorded after they occur.

## Published acceptance

Source `164929c10e3f84973f8532562b79512898456cae` is pushed to public main and deployed as `dpl_9CSxo16516HdoHPSYh8VNC1Z42i6`. Vercel's ordinary pinned npm ci and runtime/Next build pass. A clean Git export excludes provider credentials, local registry and journals. The existing production alias is [hedera-contract-workbench.vercel.app](https://hedera-contract-workbench.vercel.app).

Twelve public pages, both new artwork routes and the hosted state API pass. Served SVG bytes match committed source. The actual public testnet factory call returns the expected address, with hosted mode enabled and assistant disabled. The published README banner also renders on GitHub. Production desktop and narrow layouts, loaded images, section anchors and active navigation were inspected; the fresh production QA tab reports zero console errors.

The browser viewport helper did not reliably target the second QA tab, so the production phone check used the documented tab-scoped DevTools capability at 390×844 CSS pixels and display scale 2. Document width remained 390. Its saved screenshot captures the top 700 CSS pixels at native scale (780×1400 PNG); the full desktop view and earlier local phone views provide additional context. Both viewport overrides were cleared afterward. These are browser inspections, not physical-device acceptance.

## Limits and next action

The browser tool's virtual clipboard returned an empty value after the page reported copy success; operating-system paste remains unverified. This documentation pass does not repeat the fresh-generator/dependency suite or claim funded-wallet, live Anthropic/Gemini, physical-device or unfamiliar-developer acceptance. Earlier dated evidence remains separate.

The entrant is preparing a current video. Funded human-approved Hedera transaction evidence, full wallet acceptance, the survey and late-entry eligibility remain outstanding. The Google Form draft is untouched and unsubmitted. Documentation completion does not establish completion of all eight delivery stages.
