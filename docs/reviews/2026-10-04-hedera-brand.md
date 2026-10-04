# Hedera visual revamp — implementation and acceptance

Approved and implemented on 2026-10-04 on local `main`. The user selected the recommended [black landing and neutral workspace](../plans/2026-10-04-hedera-brand-direction.md). This supersedes the Slush palette and geometry, while retaining generic ABI execution, agent access and wallet approval.

## Delivered behavior

- Black landing with the official violet/azure accents and separate authentic “Built on Hedera” identity. The product has its own window/terminal mark; official SVGs are unchanged, attributed and excluded from the project artwork license.
- Real contract preview with contract/function selection, ABI provenance, argument/return types, an explicit keyless zero-argument read, a current CLI inspect command and agent setup. Nothing runs automatically. Contract/function changes clear previous results and cancel abandoned requests.
- Functions requiring arguments open the exact selected tool in `/workbench`, including overload identity. Workspace tool selection is now retained in the URL and on reload, with invalid IDs falling back to the current catalog.
- Optional assistant remains usable below the opening screen. The selected contract follows both the preview and assistant, as well as the workspace links.
- Neutral white and charcoal workspace themes, fixed brand actions across networks, distinct named network indicators, compact navigation, flatter panels and existing typed inputs. Import, wallet, provider setup, agent skill/commands and activity use the shared theme.
- Locally licensed Geist/Geist Mono and existing Radix/shadcn controls remain. No new package or copied 21st component source was added. 21st search considered developer landing and preview references; the current primitives support the approved design.

## Verification

Node 24.19.0 was used. No installation or dependency change was required or claimed.

| Check                                                | Actual result                                                                                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint and all-workspace typecheck                     | Pass; Next typecheck repeated after the navigation change                                                                                                                                                     |
| Core and Solidity tests                              | 27 core tests and 1 Hardhat test pass                                                                                                                                                                         |
| Existing CLI/MCP end-to-end harness                  | All 28 actual CLI subprocess checks pass; unsigned calldata/caller and MCP simulation/notifications/receipt parity pass on an isolated local fixture                                                          |
| Full ordered build, then final Next production build | Pass; both RPC overrides pointed to closed loopback endpoints and all model keys/model ID were empty                                                                                                          |
| Actual preview CLI inspect command                   | Pass; the returned tool is `factory()` for the same bundled testnet catalog                                                                                                                                   |
| Browser reads                                        | Testnet router `factory()`, imported NFT `name()` and mainnet router `factory()` complete with actual network responses                                                                                       |
| Keyless production boot                              | Pass on temporary port 3007; live testnet read remains usable, assistant composer is disabled and provider setup is available                                                                                 |
| Navigation/validation                                | NFT `ownerOf(uint256)` opens from the preview into the exact tool; missing `tokenId` shows inline required feedback and focuses the invalid field                                                             |
| Controls and context                                 | Contract selection, function selection, search, Escape dismissal, mainnet selection, import dialog, missing browser-wallet state and agent setup inspected                                                    |
| Actual layouts                                       | Desktop 1280px and narrow 390px, light and dark workspace, mobile navigation and agent setup inspected; landing/forms/agents have no horizontal document overflow at 390px                                    |
| 21st review                                          | Zero errors; five max-width warnings checked against actual desktop/narrow layouts. Token-source CSS produces informational color findings                                                                    |
| Build artifacts                                      | Eight trace manifests contain no environment/local registry/journal references; 425 built JS files contain zero strong credential-format matches; both official SVGs match downloaded originals byte for byte |

The production builds retain two previously recorded core skill-export filesystem tracing warnings. Existing trace exclusions were checked against the actual final artifacts.

## Evidence

- [Final landing desktop](../evidence/hedera-brand/landing-production-desktop.jpg) and [mobile](../evidence/hedera-brand/landing-production-mobile.jpg).
- [Final workspace light](../evidence/hedera-brand/functions-production-desktop-light.jpg), [dark](../evidence/hedera-brand/functions-production-desktop-dark.jpg), [mobile light](../evidence/hedera-brand/functions-production-mobile-light.jpg) and [mobile dark](../evidence/hedera-brand/functions-production-mobile-dark.jpg).
- [Mobile navigation](../evidence/hedera-brand/navigation-production-mobile-dark.jpg), [agent setup](../evidence/hedera-brand/agents-production-mobile-light.jpg), [desktop agent setup](../evidence/hedera-brand/agent-access-light.jpg), [import](../evidence/hedera-brand/import-mainnet-light.jpg) and [mainnet wallet prerequisites](../evidence/hedera-brand/accounts-mainnet-light.jpg).
- [Build log](../evidence/hedera-brand/build.log), [actual CLI/MCP harness output](../evidence/hedera-brand/cli-mcp.log), [canonical local check record](../evidence/local-adapters.json), [preview command result](../evidence/hedera-brand/preview-cli.json), [artifact checks](../evidence/hedera-brand/artifact-checks.json) and [21st review](../evidence/hedera-brand/21st-review.txt).

## Limits and resumption

This slice did not sign or submit a wallet transaction, fund an account, run paid provider inference, repeat a fresh installation, publish or submit the project. Earlier provider/installation evidence remains separate. The in-app browser has no installed EVM wallet; a styled prerequisite panel does not prove connected wallet execution. Funded human-wallet acceptance, remaining provider acceptance, developer walkthrough, full demonstration and explicit public-release gates remain in [DELIVERY](../DELIVERY.md).

The temporary production server and inspection tabs are cleaned up after acceptance. The existing development server remains available at `http://127.0.0.1:3000/`. Resume from the source and recorded checks; this revamp does not mark all delivery stages complete.
