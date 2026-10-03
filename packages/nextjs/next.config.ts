import type { NextConfig } from "next";
import path from "node:path";
const config: NextConfig = {
  serverExternalPackages: ["@sh/core"],
  turbopack: { root: path.resolve(process.cwd(), "../..") },
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
};
export default config;
