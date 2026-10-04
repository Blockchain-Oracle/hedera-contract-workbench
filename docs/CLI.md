# CLI and machine protocol

Entry point: `npm run --silent workbench -- COMMAND`. Node 24 LTS recommended. Runtime packages build automatically on the first CLI invocation; build diagnostics go to stderr.

| Command                    | Inputs / purpose                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `doctor`                   | Optional `--network testnet or mainnet`; checks runtime, endpoint chain ID, registry and optional assistant     |
| `contracts import`         | `--network`, `--address`, optional `--name`, `--abi FILE` (ABI array or artifact; `-` accepts stdin)            |
| `contracts list`           | Contract identity, network, address, provenance and revision                                                    |
| `contracts inspect ID`     | ABI and generated catalog                                                                                       |
| `contracts refresh ID`     | Rediscover verified Sourcify ABI; supplied/bundled ABIs need re-import with replacement ABI                     |
| `contracts remove ID`      | Guided confirmation, or `--yes` in automation; optional `--revision REVISION` binds removal to prior inspection |
| `tools list --contract ID` | Current full signatures and generated schemas                                                                   |
| `tools inspect TOOL_ID`    | Contract context, revision, input/output schema and supported action                                            |
| `tools call TOOL_ID`       | `--args-file FILE or stdin (-)`, optional `--from`, `--revision`; read functions only                           |
| `tools simulate TOOL_ID`   | `--args-file FILE or stdin (-)`, `--from ADDRESS`, optional `--value-hbar AMOUNT`, `--revision`                 |
| `tools prepare TOOL_ID`    | Same input as simulation; writes only, returns an unsigned plan and review URL                                  |
| `transactions status`      | `--hash HASH`, `--network`; actual receipt and separate indexing status                                         |
| `mcp config`               | Absolute Node/server paths and workspace cwd for compatible hosts                                               |

`--json` is a global flag accepted after commands. It disables guided prompts and prints one versioned envelope to stdout. Use `--no-color` or `NO_COLOR=1` for human plain output.

Success: `{ "schemaVersion": 1, "ok": true, "data": ... }`.
Failure: `{ "schemaVersion": 1, "ok": false, "error": { "code", "message", "path?", "retryable", "nextAction?" } }`.

Exit codes: 0 success, 2 invalid input/configuration, 3 context or prerequisite error, 4 transport failure, 5 contract revert, 130 cancelled. `doctor` returns 3 if a required check fails. Reinspect after `STALE_REVISION`; reprepare after `PLAN_EXPIRED`. A retryable read/metadata error never grants permission to resend a transaction.

Removal snapshots the contract revision before confirmation and checks it under the registry lock. Agents that inspected a contract earlier should pass `--revision` with that inspected revision. A concurrent refresh returns `STALE_REVISION` and preserves the updated record. The HTTP DELETE adapter requires the inspected `revision` query parameter.

`PRECONDITION` for a missing Hedera sender means the intended account is absent on the selected network; check the network/address and create or fund that account before simulating again. Insufficient funds also returns a prerequisite error. These are not retryable endpoint failures.

No command accepts a signing private key. Account addresses used for simulation do not establish signing authority. Shell commands should read JSON from files or stdin rather than interpolating user values into executable shell strings.

Example tuple/array arguments:

```json
{ "sample": { "label": "weather", "value": "-12", "readings": ["1", "2"] } }
```

Unnamed or duplicate fields use positional `arg0`, `arg1`, … keys. Always use the inspected schema rather than assuming Solidity parameter labels are unique. Byte values use even-length `0x` hex; fixed bytes enforce exact length. Native HBAR has 8 fractional digits; JSON-RPC transaction value is decimal-string weibar (18 decimals). Contract integers may use token-specific units independent of HBAR value.
