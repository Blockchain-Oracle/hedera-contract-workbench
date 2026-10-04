# Slush fidelity revamp — October 4, 2026

## Authority and task

The user approved Slush's shell, colors, network identity, wallet/account interaction and attention to small states as the Workbench UI baseline. This supersedes the earlier neutral workbench palette and the earlier exclusion of UI review. The task is implementation in an isolated worktree, not a new chat, public deployment or transaction submission.

- Target: Hedera Contract Workbench, reusable local scaffold for already deployed EVM contracts.
- Branch: `codex/slush-workbench-ui`, worktree `workbench-slush-ui`, baseline `a1a58ff`.
- Reference repository inspected at `ede3ed3862d0cefcadc2fa0d0cd0016f435130b2`: `/Users/abu/dev/hackathon/roy-chain`.
- Reference evidence: `docs/build/research/inspo/slush/{TOKENS.md,PATTERNS.md,README.md,index.jsonl,raw,shots}`. The actual library has 27 desktop screenshots, 14 crops and 13 raw files. It is incomplete: no mobile/tablet/motion captures and incomplete dark census.
- Authority order: current user's instruction → measured Slush tokens and actual screenshots → observed interaction notes → honest responsive/Workbench adaptations. Baku's later Cohere colors and cartoon cast do not override the requested Slush palette.
- Referenced chats were read: “Read Slush Codex prompt”, “Create branded meme videos”, “Review Privy research prompt”. The meme task was stopped; the Privy task is Baku-specific. Neither authorizes copying unrelated features or credentials into this scaffold.
- Allowed adaptations: Hedera identity and contracts, real EVM browser-wallet connectors, contract functions/forms, assistant, transaction plans, receipts. No Sui or Slush functionality is implied by the design.
- Provenance: screenshots are reference-only and not shipped as application assets. Slush logo/illustrations and unlicensed Aeonik files are not copied. Local Geist fonts are an explicit typography substitution, with [official OFL](https://github.com/vercel/geist-font/blob/main/OFL.txt) bundled alongside unchanged font files. Exact Aeonik fidelity remains unavailable without the font and license.

## Design decisions

The desktop shell follows measured 32px outer gutters, a 248px blue rail, 48px navigation pills with 12px spacing, a footer account launcher, and a main workspace with generous surface padding. Light colors are `#CCE5FF` canvas, `#8FC5FF` rail, `#FAFCFF` primary surface, `#E8F3FF` secondary surface and `#060D14` text. Saved dark screenshots establish `#082D57` canvas, `#125EB0` rail, `#060D14` primary surface and `#051B33` selected navigation. The green testnet pill is `#47E299`.

Slush's captured network switch retains its blue canvas and rail. Workbench preserves these and changes network indicators/action accents between green testnet and blue mainnet, satisfying the requested color distinction without claiming an unobserved Slush canvas switch. Both network names remain explicit. Network choice does not silently approve or submit a transaction.

Accounts opens from the rail footer into a centered panel, matching Slush's captured account menu. Workbench's actual injected EVM connectors back wallet selection and signing. There is no new Privy account service, fake Apple account, or Rainbow UI dependency. Network selection opens a right drawer. Long import and review flows also use drawers. Light/dark preference, focus, Escape dismissal and reduced motion remain supported.

The central workspace retains contract selection and dynamic Functions, Swap and Assistant experiences. The assistant is additive, styled with the same tokens, compact result cards and a usable composer. Forms remain generated from canonical ABI definitions. Changing a contract changes real labels, fields and tools without regenerating app source. The scaffold carries these shared components and theme files, so every new scaffold and imported supported ABI inherits the design.

## Parity ledger

| Surface                             | Reference evidence                                           | Classification / implementation                                                                                         | States and acceptance                                                                                     |
| ----------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Canvas, rail and navigation         | Light/dark 001, raw shell census                             | Exact measured colors/geometry; labels adapted to contracts/tools                                                       | Desktop + responsive adapted rail; active, hover, focus                                                   |
| Account launcher and Accounts panel | Light/dark 002 and crop 030                                  | Adapted: same placement/panel; real EVM connector/account                                                               | Disconnected, missing wallet, connecting, rejection, connected, copy, disconnect                          |
| Network choice                      | Dark 003; light/dark 004                                     | Adapted: right drawer, radio-like choices, explicit green testnet/blue mainnet identity; only supported Hedera networks | Switch, unchanged selection, wallet mismatch; previous transaction review invalidated                     |
| Light/dark theme                    | Light/dark 005                                               | Adapted global theme preference using existing provider                                                                 | Theme switch, persistence, portal colors, contrast                                                        |
| Function catalog and typed fields   | Slush rows/tabs + Workbench ABI catalog                      | Additive domain surface in reference language                                                                           | Overloads, nested tuples/arrays, empty search, validation, loading, read result, simulation               |
| Import and contract details         | Detail drawers 010/013/015; list rows 009                    | Adapted drawers/rows; actual import/provenance                                                                          | Network/address/ABI, validation, pending, error, success, reimport                                        |
| Swap and prerequisites              | Blocked flows 011/020; wide CTA                              | Adapted to native HBAR router/HRC-719; existing canonical execution                                                     | Quote, slippage/deadline, association state, missing account/funds, prepared review                       |
| Assistant                           | No captured Slush analogue                                   | Additive, shared palette/type/surfaces                                                                                  | Missing provider, empty thread, stream, stop, error, real structured tool results                         |
| Wallet review and receipts          | Captured right-drawer pattern; Workbench execution contract  | Adapted: exact bound plan and real wallet approval                                                                      | Explicit network/account/value/calldata, rejection, hash persistence, pending/confirmed/reverted/indexing |
| Loading and empty content           | Mainnet 001 partial skeletons and empty balance; testnet 004 | Adapted honest skeleton/empty state                                                                                     | Layout stable during actual work; no placeholder results or fabricated balances                           |
| Mobile and motion                   | Missing Slush capture coverage                               | Adapted responsive drawers/panels, restrained transitions                                                               | Narrow screen, keyboard, scrolling, reduced motion; not claimed exact Slush mobile parity                 |

## Implementation and verification record

Three agents completed disjoint shell/wallet, tokens/primitives and content/state modules. The root agent integrated them, documented font provenance and performed final verification. Existing core review findings F1–F4 remain separate from this UI work; none are implicitly marked repaired. The original checkout and its uncommitted review artifacts remain preserved.

Ordinary pinned npm 10.9.3 installation completed in this worktree, without `--legacy-peer-deps` or dependency changes. Existing Radix/shadcn primitives are reused. 21st search returned Connect Wallet Modal (8588) and Auth Modal (20038); no candidate code/dependency was copied because existing primitives fit the measured panel and avoid an unresolved external license.

Existing Slush captures were reused; no new Slush capture was taken. New Workbench captures are actual rendered acceptance evidence in [the evidence folder](../evidence/slush-ui/).

- Node 24.19.0 / npm 10.9.3 ordinary clean install passed. Direct dependency manifests and lockfile are unchanged.
- Lint, typecheck, 13 core tests and 1 Solidity test passed. Final production build passed without wallet/provider credentials. [Build log](../evidence/slush-ui/build.txt).
- `21st review packages/nextjs --json` passed with zero errors, five warnings and 57 suggestions. Four disabled-pointer warnings are standard primitives; the fixed desktop rail is hidden below `md`. Central theme constants account for color suggestions. [Exact report](../evidence/slush-ui/21st-review.json).
- Actual desktop 1440×900, tablet 768×1024 and mobile 390×844 layouts were inspected in light/dark. Checked views had no horizontal overflow. Final production desktop and mobile reads were captured after form refinement.
- Testnet router `factory()` returned `0x00000000000000000000000000000000000026E7`; mainnet returned `0x0000000000000000000000000000000000103780`. A second ABI's `symbol()` returned `SAUCE`. The mainnet quote succeeded without submitting a transaction.
- Accounts showed honest missing-extension guidance. Network radio drawer, light/dark preference, empty Activity, missing-provider Assistant and malformed-import validation were inspected. The invalid address produced actionable `INPUT` guidance and preserved the catalog. Mobile always exposes its network badge in the header.
- Focus-visible outlines and reduced-motion rules are explicit. This is not a complete assistive-technology or motion-emulation audit.

Connected-wallet signing/rejection/account-change acceptance, real receipt recovery and a configured provider session remain pending. No wallet extension was installed in the review browser. No transaction was submitted. Earlier core findings F1–F4 remain open. Existing tests are regression checks, not substitutes for these acceptance gates.
