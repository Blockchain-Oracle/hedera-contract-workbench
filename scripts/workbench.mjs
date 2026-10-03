import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
if (!existsSync(new URL("../packages/cli/dist/index.js", import.meta.url))) {
  const result = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "build:runtime"],
    { stdio: ["ignore", "stderr", "stderr"] },
  );
  if (result.status) process.exit(result.status);
}
await import("../packages/cli/dist/index.js");
