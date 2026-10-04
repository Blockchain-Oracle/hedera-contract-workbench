import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  Runtime,
  exportSkill,
  skillInstallCommand,
  SKILLS_VERSION,
} from "../packages/core/dist/index.js";
const root = await mkdtemp(join(tmpdir(), "workbench-skills-"));
try {
  const exported = await exportSkill(
    new Runtime(),
    "saucerswap-testnet",
    join(root, "export"),
  );
  const command = skillInstallCommand(exported.directory, [
    "codex",
    "claude-code",
    "cursor",
  ]);
  const child = spawn(command.argv[0], command.argv.slice(1), {
    cwd: root,
    env: { ...process.env, DO_NOT_TRACK: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (v) => (log += v));
  child.stderr.on("data", (v) => (log += v));
  const timer = setTimeout(() => child.kill("SIGKILL"), 60000);
  const status = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  }).finally(() => clearTimeout(timer));
  assert.equal(status, 0, log);
  await writeFile(
    "docs/evidence/skills-install.txt",
    log.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, ""),
  );
  // The pinned official installer uses the universal .agents path for Codex
  // and Cursor; Claude Code also receives its host-specific copy.
  const destinations = [
    ".agents/skills/hedera-contract-workbench",
    ".claude/skills/hedera-contract-workbench",
  ];
  for (const destination of destinations) {
    for (const file of exported.files)
      assert.equal(
        await readFile(join(root, destination, file), "utf8"),
        await readFile(join(exported.directory, file), "utf8"),
        `${destination}/${file}`,
      );
  }
  for (const agent of ["codex", "claude-code", "cursor"]) {
    const listed = spawn(
      "npx",
      ["--yes", `skills@${SKILLS_VERSION}`, "list", "--agent", agent],
      {
        cwd: root,
        env: { ...process.env, DO_NOT_TRACK: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    listed.stdout.on("data", (v) => (output += v));
    listed.stderr.on("data", (v) => (output += v));
    const listTimer = setTimeout(() => listed.kill("SIGKILL"), 30000);
    const listStatus = await new Promise((resolve, reject) => {
      listed.once("error", reject);
      listed.once("close", resolve);
    }).finally(() => clearTimeout(listTimer));
    assert.equal(listStatus, 0, output);
    assert.ok(
      output.includes("hedera-contract-workbench"),
      `${agent}: ${output}`,
    );
  }
  const evidence = {
    observedAt: new Date().toISOString(),
    installer: `vercel-labs/skills npm ${SKILLS_VERSION}`,
    source: "Local exported skill directory",
    scope: "Isolated project; no global/home installation",
    agents: ["codex", "claude-code", "cursor"],
    checks: [
      "Official CLI exits zero",
      "All installed Markdown/reference/catalog/argument files equal exported bytes",
      "Same skill name for every contract; revision lives in catalog",
    ],
    fileCountPerAgent: exported.files.length,
  };
  await writeFile(
    "docs/evidence/skills-install.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  await writeFile(
    "docs/evidence/skills-install.txt",
    log.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, ""),
  );
  console.log(JSON.stringify(evidence));
} finally {
  await rm(root, { recursive: true, force: true });
}
