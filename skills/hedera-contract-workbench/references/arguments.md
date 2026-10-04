# Typed arguments

The current output from `tools inspect` is authoritative; imported contracts can expose different schemas.

- ABI integers use decimal strings, including small integers. Never convert large values to JavaScript floating-point numbers.
- Addresses are validated EVM addresses. Resolve Hedera contract IDs through the workbench importer; do not pad every ID into an address.
- Booleans are JSON booleans; bytes are hexadecimal strings with the schema's required length; strings remain strings.
- Arrays preserve ordering and fixed lengths. Tuples preserve their inspected keys and ABI position mapping. Unnamed/duplicate fields can use deterministic keys such as `arg0`.
- Overloads have different full signatures and tool IDs. A matching function name alone is insufficient.
- Missing fields, unknown fields, out-of-range integers, and unsupported ABI types are errors, not values to guess.
- A generic integer is raw ABI data unless explicit metadata establishes its denomination. Do not assume that `amount` has 18 decimals.
- HBAR wallet/RPC value and native tinybar arguments have different representations. Use explicit runtime conversion/preparation options rather than guessing the boundary.

Illustration only, assuming an inspected schema actually defines these fields:

```json
{
  "recipient": "0x0000000000000000000000000000000000000001",
  "amount": "9007199254740993",
  "options": { "enabled": true, "limits": ["1", "2"] }
}
```

This is not a callable contract fixture. Inspect the actual tool before constructing its arguments. Record the tool's revision and re-inspect after a stale-schema error.
