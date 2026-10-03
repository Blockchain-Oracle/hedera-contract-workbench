import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { Runtime, toolsFor, hashAbi } from "../packages/core/dist/index.js";
const workspace = process.cwd();
const require = createRequire(join(workspace, "packages/hardhat/package.json"));
const { JsonRpcProvider, ContractFactory } = require("ethers");
const artifact = JSON.parse(
  await readFile(
    "packages/hardhat/artifacts/contracts/Observation.sol/Observation.json",
    "utf8",
  ),
);
const root = await mkdtemp(join(tmpdir(), "workbench-local-"));
let node, transport;
const timeout = AbortSignal.timeout(30000);
try {
  const reservation = createServer();
  await new Promise((r) => reservation.listen(0, "127.0.0.1", r));
  const port = reservation.address().port;
  await new Promise((r) => reservation.close(r));
  node = spawn(
    process.execPath,
    [
      require.resolve("hardhat/internal/cli/cli.js"),
      "node",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: join(workspace, "packages/hardhat"),
      stdio: "ignore",
      detached: process.platform !== "win32",
    },
  );
  const url = `http://127.0.0.1:${port}`;
  for (;;) {
    timeout.throwIfAborted();
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_chainId",
          params: [],
        }),
        signal: timeout,
      });
      assert.equal((await r.json()).result, "0x128");
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  const provider = new JsonRpcProvider(url),
    signer = await provider.getSigner(0),
    bob = await provider.getSigner(1);
  const observation = await new ContractFactory(
    artifact.abi,
    artifact.bytecode,
    signer,
  ).deploy();
  await observation.waitForDeployment();
  const address = await observation.getAddress(),
    from = await signer.getAddress(),
    other = await bob.getAddress();
  await writeFile(
    join(root, "workbench.config.json"),
    JSON.stringify({ rpc: { testnet: url }, contracts: [] }),
  );
  const engine = new Runtime(root);
  const record = {
    id: "local-observation",
    name: "Observation verification fixture",
    network: "testnet",
    chainId: 296,
    address,
    kind: "contract",
    abi: artifact.abi,
    abiHash: hashAbi(artifact.abi),
    revision: hashAbi(artifact.abi),
    provenance: { source: "supplied" },
    importedAt: new Date().toISOString(),
  };
  await engine.store.saveContract(record);
  const tool = (signature) =>
    toolsFor(record).tools.find((t) => t.signature === signature);
  const tuple = tool("record((string,int64,uint64[]))");
  assert.ok(tuple);
  const args = {
    sample: {
      label: "weather",
      value: "-12",
      readings: ["1", "9007199254740993"],
    },
  };
  const corePlan = await engine.prepare(tuple.id, args, {
    from,
    revision: tuple.revision,
  });
  function cli(command, input) {
    const p = spawnSync(
      process.execPath,
      [join(workspace, "packages/cli/dist/index.js"), ...command, "--json"],
      {
        cwd: root,
        input: input === undefined ? undefined : JSON.stringify(input),
        encoding: "utf8",
        timeout: 45000,
      },
    );
    assert.ok(!p.error, String(p.error));
    return { status: p.status, ...JSON.parse(p.stdout) };
  }
  assert.equal(cli(["contracts", "list"]).ok, true);
  assert.equal(cli(["contracts", "inspect", record.id]).ok, true);
  assert.equal(cli(["tools", "list", "--contract", record.id]).ok, true);
  assert.equal(cli(["tools", "inspect", tuple.id]).ok, true);
  assert.equal(cli(["mcp", "config"]).ok, true);
  const cliPlan = cli(
    ["tools", "prepare", tuple.id, "--from", from, "--args-file", "-"],
    args,
  );
  assert.equal(cliPlan.ok, true);
  assert.equal(cliPlan.data.data, corePlan.data);
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(workspace, "packages/mcp/dist/index.js")],
    cwd: root,
    stderr: "pipe",
  });
  const client = new Client({
    name: "local-contract-verification",
    version: "0.1.0",
  });
  let changes = 0;
  client.setNotificationHandler("notifications/tools/list_changed", () => {
    changes++;
  });
  await client.connect(transport);
  const mcpPlan = await client.callTool({
    name: tuple.id,
    arguments: { arguments: args, revision: tuple.revision, from },
  });
  assert.equal(mcpPlan.structuredContent.ok, true);
  assert.equal(mcpPlan.structuredContent.data.data, corePlan.data);
  assert.equal(mcpPlan.structuredContent.data.valueWeibar, "0");
  const sim = await client.callTool({
    name: "tools_simulate",
    arguments: {
      toolId: tuple.id,
      arguments: args,
      revision: tuple.revision,
      from,
    },
  });
  assert.equal(sim.structuredContent.ok, true);
  const cliSim = cli(
    ["tools", "simulate", tuple.id, "--from", from, "--args-file", "-"],
    args,
  );
  assert.equal(cliSim.ok, true);
  // This transaction stays on an isolated local Hardhat fixture, never a Hedera network.
  await (await observation.record(args.sample)).wait();
  const latest = tool("latest()");
  const actual = await engine.call(latest.id, {}, { from });
  assert.deepEqual(actual.value, args.sample);
  const direct = await observation
    .connect(bob)
    .latest.staticCall()
    .then(
      () => null,
      (e) => e,
    );
  assert.ok(direct);
  await assert.rejects(
    engine.call(latest.id, {}, { from: other }),
    (e) =>
      e.code === "REVERT" &&
      e.message.includes("NoSample") &&
      e.message.toLowerCase().includes(other.toLowerCase()),
  );
  const read = cli(
    ["tools", "call", latest.id, "--from", from, "--args-file", "-"],
    {},
  );
  assert.deepEqual(read.data.value, actual.value);
  const mcpRead = await client.callTool({
    name: latest.id,
    arguments: { arguments: {}, revision: latest.revision, from },
  });
  assert.deepEqual(mcpRead.structuredContent.data.value, actual.value);
  const changed = {
    ...record,
    revision: record.revision + ":updated",
    name: "Updated fixture",
    abi: record.abi.filter(
      (f) => f.type !== "function" || f.name === "describe",
    ),
  };
  await engine.store.saveContract(changed, record.revision);
  const deadline = Date.now() + 10000;
  while (!changes && Date.now() < deadline)
    await new Promise((r) => setTimeout(r, 100));
  assert.ok(changes > 0, "MCP catalog notification not delivered");
  const refreshed = await client.listTools();
  assert.ok(!refreshed.tools.some((t) => t.name === tuple.id));
  await assert.rejects(engine.validatePlan(corePlan, from, 296), (e) =>
    ["STALE_REVISION", "NOT_FOUND"].includes(e.code),
  );
  assert.equal(
    cli(["contracts", "refresh", record.id]).error.code,
    "ABI_REQUIRED",
  );
  assert.equal(
    cli(["transactions", "status", "--network", "testnet", "--hash", "bad"])
      .error.code,
    "INPUT",
  );
  assert.equal(cli(["contracts", "remove", record.id, "--yes"]).ok, true);
  await client.close();
  await provider.destroy();
  await mkdir("docs/evidence", { recursive: true });
  const evidence = {
    observedAt: new Date().toISOString(),
    scope:
      "Isolated Hardhat RPC fixture with chain ID 296. No Hedera transaction or real funds.",
    checks: [
      "core/CLI/MCP equivalent unsigned calldata and caller",
      "typed nested tuple roundtrip with integer above Number precision",
      "caller-specific custom revert agrees with direct RPC",
      "MCP simulation",
      "live catalog notification and removal",
      "stale plan rejected",
      "documented CLI command groups and error envelopes",
    ],
    catalogNotifications: changes,
  };
  await writeFile(
    "docs/evidence/local-adapters.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence));
} finally {
  await transport?.close();
  if (node?.pid) {
    try {
      if (process.platform === "win32") node.kill("SIGTERM");
      else process.kill(-node.pid, "SIGTERM");
    } catch {}
  }
  await rm(root, { recursive: true, force: true });
}
