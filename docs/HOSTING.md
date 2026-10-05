# Hosting

First release is local. The public Vercel site is an explicit read-only preview. Hosting is optional and does not add multi-user isolation, authentication, remote MCP, or managed wallets.

A single-owner deployment can run the Next production server behind HTTPS, with the root repository present so Runtime can find workbench.config.json and write local state. Use Node 24, `npm ci`, `npm run build`, then `npm run start -w @sh/nextjs -- --hostname 0.0.0.0`. Preserve `.workbench/` and workbench.config.local.json on a persistent volume. Set WORKBENCH_WEB_URL to the public HTTPS origin. Configure provider/RPC keys as server secrets, not NEXT_PUBLIC variables.

For Coolify, use a Node build pack or a reviewed Docker image, port 3000, and the production start command. Bind persistent state to the deployed root. Verify actual permissions, origin handling, wallet injection, and mainnet/testnet context before use. This version has local single-owner APIs; restrict access through an authenticated private network or reverse-proxy access control. Do not expose an unrestricted public shared service.

MCP remains local stdio. Browser wallet keys remain in the user's wallet. Production build requires no RPC calls or provider credentials. Hosting must be manually validated; these instructions are not a claim of a deployed service.

## Public Vercel preview

Create a separate Vercel project with Root Directory `packages/nextjs`, Node 24, Install Command `cd ../.. && npx --yes npm@10.9.3 ci --no-audit --no-fund` and Build Command `cd ../.. && npm run build:runtime && npm run build -w @sh/nextjs`. Include files outside the Root Directory. Deploy a clean Git checkout; never upload ignored provider keys, imports or journals.

On Vercel, the preview boundary activates automatically. `WORKBENCH_HOSTED_DEMO=1` also activates it for local acceptance. Bundled catalogs, Markdown skills, reads and unsigned simulation remain available. Contract import/removal/refresh, saved plans, transaction journals, protocol preparation and provider chat are blocked before dispatch. No shared writable /tmp registry or hosted multi-user capability is implied. The browser shows this limitation and links to the complete local template.

The origin guard accepts only localhost, an explicit WORKBENCH_WEB_URL, or the deployment and production hosts supplied by Vercel system variables. Cross-origin and cross-site requests remain rejected. Keep production system variables enabled; a custom domain requires its exact HTTPS WORKBENCH_WEB_URL. No model keys are configured for the public preview.

/docs is generated from committed documentation. /demo offers actual testnet reads; it is not a video or on-chain transaction evidence. The local CLI, stdio MCP, provider chat and browser wallet workflow continue to run in the developer workspace.
