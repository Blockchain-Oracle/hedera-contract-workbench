# Machine protocol and errors

The implementation and subprocess verification use these envelopes. Inspect `docs/CLI.md` for the complete command reference.

Success shape: `{ "schemaVersion": 1, "ok": true, "data": ... }`.

Error shape: `{ "schemaVersion": 1, "ok": false, "error": { "code": "...", "message": "...", "retryable": false } }`, with optional field path and next action.

Exit codes: 0 success, 2 input/configuration, 3 context/prerequisite, 4 transport, 5 contract revert, 130 cancellation. `doctor` can return a successful envelope with `ready: false` and exit 3; inspect readiness rather than only `ok`.

`--json` gives one final JSON response on stdout. Diagnostics/progress use stderr. MCP stdio has its own entry point and contains protocol traffic only. Parse the envelope before using result data; preserve chain/address/tool revision and units in user-facing reports.

For invalid input, inspect the reported schema/path and correct the actual field. For stale context, rediscover and inspect. For missing ABI, use a supplied interface or artifact. For a wrong network/account or insufficient funding, explain the required prerequisite. For a revert, report the decoded error when available.

A missing Hedera sender or insufficient funds returns nonretryable `PRECONDITION`; correct the account/network/funding before simulating again. If contract removal is requested, pass the inspected revision with `contracts remove ID --yes --revision REVISION --json`. `STALE_REVISION` preserves the refreshed record; rediscover it before confirming a new deletion.

Idempotent reads can follow bounded retry advice from the runtime. Transaction submission is never automatically retried. Unknown receipt state remains unknown until checked against the correct chain/hash. Avoid printing credentials, access-bearing RPC URLs, or private-key data.
