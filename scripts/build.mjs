import { spawnSync } from "node:child_process";
for (const args of [
  ["run", "build:runtime"],
  ["run", "compile", "-w", "@sh/hardhat"],
  ["run", "build", "-w", "@sh/nextjs"],
]) {
  const result = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    args,
    { stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
