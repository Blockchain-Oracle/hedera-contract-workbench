import type { NextConfig } from "next";
import path from "node:path";
const config: NextConfig = {
  serverExternalPackages: ["@sh/core"],
  turbopack: { root: path.resolve(process.cwd(), "../..") },
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  outputFileTracingExcludes: {
    "/*": [
      "../../.env*",
      "**/.env*",
      "../../.workbench/**",
      "../../workbench.config.local.json*",
      "../../skills/**/catalog.json",
      "../../skills/**/arguments/**",
      "../../.vercel/**",
    ],
  },
  outputFileTracingIncludes: {
    "/api/workbench/*": [
      "../../workbench.config.json",
      "../../skills/hedera-contract-workbench/SKILL.md",
      "../../skills/hedera-contract-workbench/references/arguments.md",
      "../../skills/hedera-contract-workbench/references/cli-protocol.md",
    ],
    "/api/chat": ["../../workbench.config.json"],
  },
};
export default config;
