# Machine protocol and errors

Planning specification: these envelopes must be verified against the implementation before the skill ships.

Success shape: `{ "schemaVersion": 1, "ok": true, "data": ... }`.

Error shape: `{ "schemaVersion": 1, "ok": false, "error": { "code": "...", "message": "...", "retryable": false } }`, with optional field path and next action. Numeric exit-code assignments will be documented by the runtime; do not invent them from this draft.

`--json` gives one final JSON response on stdout. Diagnostics/progress use stderr. MCP stdio has its own entry point and contains protocol traffic only. Parse the envelope before using result data; preserve chain/address/tool revision and units in user-facing reports.

For invalid input, inspect the reported schema/path and correct the actual field. For stale context, rediscover and inspect. For missing ABI, use a supplied interface or artifact. For a wrong network/account or insufficient funding, explain the required prerequisite. For a revert, report the decoded error when available.

Idempotent reads can follow bounded retry advice from the runtime. Transaction submission is never automatically retried. Unknown receipt state remains unknown until checked against the correct chain/hash. Avoid printing credentials, access-bearing RPC URLs, or private-key data.
