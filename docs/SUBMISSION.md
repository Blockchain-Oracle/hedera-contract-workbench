# Submission readiness

Checked October 5, 2026. This document describes the source preview and outstanding evidence; it is not confirmation of bounty submission or eligibility.

## Project information

- Display name: **Contract Workbench**.
- Technical repository: `Blockchain-Oracle/hedera-contract-workbench`, branch `main`.
- License: MIT, with third-party assets identified in [NOTICE](../NOTICE.md).
- Product: a local Scaffold HBAR template that turns a supported deployed Hedera EVM contract ABI into one validated catalog for browser forms, CLI, MCP and a portable agent skill. Optional provider-configured chat calls the same execution core.
- First launch: a real testnet read without keys, a wallet or deployment. Transactions are prepared by CLI/MCP/chat and signed in the user's browser wallet after exact review.
- Integrations: Hedera JSON-RPC and matching-network mirror metadata, Sourcify ABI discovery, injected EVM wallets, MCP, the official Vercel skills CLI, optional OpenAI/Anthropic/Gemini configuration, and an optional SaucerSwap adapter. The browser remains generic across contract ABIs.

## Evidence available

[Latest acceptance record](reviews/2026-10-04-refero-contract-studio.md) and [machine results](evidence/refero-contract-studio/checks.json) record lint, all-workspace typecheck, 27 core tests plus one Solidity test, 28 actual CLI subprocess checks, core/CLI/MCP parity, three-host skill installation, live testnet NFT/mainnet router reads, live OpenAI inference and desktop/tablet/phone visual inspection. Builds need no RPC access or provider key. The [public generator acceptance](evidence/public-scaffold.json) verifies public commit c45f441 through create-scaffold-hbar 0.4.1, ordinary npm ci, dependency checks, lint, typecheck, tests, CLI/MCP, build and production boot. Later hosted-preview changes have their own deployment acceptance. Earlier [fresh local-source evidence](evidence/external-scaffold.json) remains historical.

## Bounty requirements and deadline

The [official brief](https://hedera.com/blog/scaffold-hbar-template-bounty/) requires a public MIT repository, a valid root `template.json`, README and AGENTS instructions, successful fresh scaffolding/install/lint/build/boot, a Hedera service integration and a verifiable testnet transaction. It also requests the developer-experience survey and Harness spec/validators if Harness was used.

| Requirement                                                   | Where to verify                                                                                                                      | Status                                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Public MIT source and five-workspace monorepo                 | [Repository](https://github.com/Blockchain-Oracle/hedera-contract-workbench), [LICENSE](../LICENSE), [architecture](ARCHITECTURE.md) | Published                                |
| Template capabilities/defaults                                | [template.json](../template.json)                                                                                                    | Generator exercised                      |
| Setup README and AI-assisted-use AGENTS                       | [README](../README.md), [root AGENTS](../AGENTS.md), [quickstart](QUICKSTART.md), [agent guide](AGENTS.md)                           | Documented                               |
| Fresh scaffold, ordinary install, lint, build and boot        | [Dated public-scaffold evidence](evidence/public-scaffold.json)                                                                      | Verified at its recorded source revision |
| Hedera execution and real ecosystem examples                  | [Support and provenance](SUPPORT.md), [deployed read/simulation checks](evidence/public-preview/checks.json)                         | Reads/simulation verified                |
| Funded testnet transaction with independent explorer evidence | Confirmed human-approved transaction and public Hashscan/mirror link                                                                 | Outstanding                              |
| Demo video, survey and declarations                           | Entrant's completed submission materials                                                                                             | Outstanding                              |

Documentation is generated from the same committed Markdown at [the public docs site](https://hedera-contract-workbench.vercel.app/docs). The [interactive demo](https://hedera-contract-workbench.vercel.app/demo) performs actual reads; it is not the required video. The entrant is preparing a new video separately.

The [official schedule](https://hedera.com/scaffold-hbar-template-bounty/) closes submissions on October 4 at 11:59 PM Eastern, which is October 5 at 04:59 in Africa/Lagos. That scheduled deadline has passed. An accessible submission form does not establish that late entries are accepted; no extension has been verified.

## Outstanding items

- Complete a human-approved Hedera testnet contract transaction and retain its confirmed receipt plus an independently accessible Hashscan or mirror-node link. Existing reads, simulations and local Hardhat transactions do not meet this requirement.
- Complete wallet rejection/account/network-change and receipt recovery acceptance in a real wallet session.
- Record the complete wallet demonstration. The earlier read-path recording is partial and cannot be presented as a completed transaction video.
- Have an unfamiliar developer follow the instructions, finish the developer-experience survey and review any form declarations personally.
- Verify whether a late submission is accepted before representing it as an eligible entry.

Personal contact details and payout account information belong in the entrant's form, not in this public repository. Never invent a transaction hash, deployed URL, survey response, team member or completion claim. The repository and read-only Vercel preview are published; the bounty form remains an unsubmitted draft. Publication does not establish transaction acceptance or submission eligibility.
