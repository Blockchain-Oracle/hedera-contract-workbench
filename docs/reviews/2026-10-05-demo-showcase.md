# Demo showcase acceptance

## Reference and implementation

Inspected the actual rendered [Masayume](https://masayume.app/demo) and [Agari](https://useagari.xyz/demo) demo pages before edits. Both use a video hero followed by feature-specific product screenshots, links and verification. Adapted their sequence to the existing Refero Contract Studio direction, keeping Workbench identity, semantic colors and components. Their videos, artwork and receipts were not copied. [Direction and implementation target](../plans/2026-10-05-demo-showcase.md).

`/demo` now introduces the product, reserves a clearly labelled pending recording area, walks through the real workspace and agent setup, preserves the live testnet demo and links to dated evidence. Two screenshots were captured from the actual production preview: a successful `factory()` read and the agent setup screen. Optional assistant and wallet workflows are explained as local features. The public preview's reads/unsigned-simulation boundary is unchanged.

`WORKBENCH_DEMO_YOUTUBE_URL` accepts a public HTTPS YouTube URL. Validation constrains host, protocol and video ID, strips tracking and constructs the watch/privacy-enhanced player links. Missing/invalid URLs preserve the pending state. The player mounts only after a deliberate click. The URL is public media configuration; no provider credential is needed. The static route requires rebuild/redeployment after changing it. Setup is in [configuration](../CONFIGURATION.md#publish-the-demo-video).

## Observed verification

- Lint, frontend TypeScript, ordered production build and final frontend build pass under Node 24. Provider keys/model are empty and both RPC URLs point to a closed port during build.
- Five supported URL shapes and thirteen missing/unsafe values pass the focused URL acceptance script. Synthetic IDs are test inputs only, never product media.
- Production boot on a temporary local port serves the showcase, both screenshot assets and linked guides. Heading hierarchy has one h1. Configuration and transaction guide anchors resolve.
- Actual browser traversal from pending poster to live demo returns `0x00000000000000000000000000000000000026E7` on testnet without a caller or wallet. HTTP and the documented stdin CLI command return the same value.
- Desktop 1280px and phone 390px CSS viewports inspected in light/dark. Phone document width is 390px. The first screenshot exposed a poster width expanding because of its aspect ratio/min-height; explicit full width fixes clipping. The busy banner backdrop was replaced with a subdued actual product screen. Final native screenshot captures use display scale 2 with explicit visible scroll coordinates, avoiding the in-app browser's scaled screenshot wrapper.
- Existing live-read loading and success states, section links and guide navigation remain usable. No YouTube iframe exists while video is pending. No errors observed in the final QA browser tab.

[Rendered evidence and check record](../evidence/demo-showcase/).

## Limits and next action

The user is preparing the video. Playback of the actual Workbench recording remains unverified until its URL exists; a pending slot does not establish video or transaction acceptance. Human-funded Hedera transaction evidence, complete wallet checks, survey and late-entry eligibility remain outstanding. The form remains an unsubmitted draft. No transaction, purchase or submission was performed in this pass. Execution packages, providers and wallet logic are unchanged; no new dependency.

Next: publish the verified showcase to the existing production preview, inspect it there, then configure and verify the user's actual YouTube recording when provided.

Published source `c0988f7` is live at the existing [production demo](https://hedera-contract-workbench.vercel.app/demo), deployment `dpl_CisRKrcMRRk4CdqCheTDTj7yKqwt`. Remote ordinary npm ci and production build pass. Six public page/asset routes return 200, screenshot bytes match source, pending-video state remains explicit and the hosted boundary retains four bundled contracts with chat disabled. A new public testnet factory read returns the recorded expected address. The browser accessibility tree confirms the new public content. Production screenshot capture times out after recovery; deployed pixel inspection remains unverified in this pass. Local desktop/phone/light/dark rendered inspection and screenshots are retained. Temporary viewport overrides are cleared and the local verification server is stopped. The form remains unsubmitted and no transaction was signed. Resume by adding and verifying the user’s actual video, then resolving the remaining submission gates.
