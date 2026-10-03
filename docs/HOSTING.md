# Optional Coolify hosting

First release is local. Hosting is optional and does not add multi-user isolation, authentication, remote MCP, or managed wallets.

A single-owner deployment can run the Next production server behind HTTPS, with the root repository present so Runtime can find workbench.config.json and write local state. Use Node 24, `npm ci`, `npm run build`, then `npm run start -w @sh/nextjs -- --hostname 0.0.0.0`. Preserve `.workbench/` and workbench.config.local.json on a persistent volume. Set WORKBENCH_WEB_URL to the public HTTPS origin. Configure provider/RPC keys as server secrets, not NEXT_PUBLIC variables.

For Coolify, use a Node build pack or a reviewed Docker image, port 3000, and the production start command. Bind persistent state to the deployed root. Verify actual permissions, origin handling, wallet injection, and mainnet/testnet context before use. This version has local single-owner APIs; restrict access through an authenticated private network or reverse-proxy access control. Do not expose an unrestricted public shared service.

MCP remains local stdio. Browser wallet keys remain in the user's wallet. Production build requires no RPC calls or provider credentials. Hosting must be manually validated; these instructions are not a claim of a deployed service.
