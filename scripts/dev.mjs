import { spawn } from "node:child_process";
const children = new Set();
let stopping = false;
function run(args, wait = false) {
  const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", args, {
    stdio: "inherit",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    detached: process.platform !== "win32",
  });
  children.add(child);
  child.once("exit", (code) => {
    children.delete(child);
    if (!wait && !stopping) stop(code ?? 1);
  });
  return wait
    ? new Promise((resolve, reject) =>
        child.once("exit", (code) =>
          code === 0
            ? resolve()
            : reject(
                new Error(`Command failed (${code}): npm ${args.join(" ")}`),
              ),
        ),
      )
    : child;
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  const signal = (child, name) => {
    try {
      if (process.platform === "win32") child.kill(name);
      else if (child.pid) process.kill(-child.pid, name);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  };
  for (const child of children) signal(child, "SIGTERM");
  setTimeout(() => {
    for (const child of children) signal(child, "SIGKILL");
    process.exit(code);
  }, 2000).unref();
  process.exitCode = code;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
try {
  await run(["run", "build:runtime"], true);
  const { Runtime } = await import("../packages/core/dist/index.js");
  const health = await new Runtime().doctor();
  for (const check of health.checks)
    process.stderr.write(
      `${check.ok ? "✓" : "!"} ${check.name}: ${check.message}\n`,
    );
  process.stderr.write(`${health.assistant.message}\n`);
  for (const name of ["core", "cli", "mcp"])
    run(["run", "watch", "-w", `@sh/${name}`]);
  run(["run", "dev", "-w", "@sh/nextjs"]);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  stop(1);
}
