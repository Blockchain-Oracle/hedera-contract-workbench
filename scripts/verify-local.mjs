import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
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
let node, transport, metadataServer, provider;
const cliChecks = [];
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
  provider = new JsonRpcProvider(url);
  const signer = await provider.getSigner(0),
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
    JSON.stringify({ rpc: { testnet: url, mainnet: url }, contracts: [] }),
  );
  let verificationAbi = artifact.abi,
    mirrorIndexed = false;
  metadataServer = createHttpServer((request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.url.startsWith("/mirror/api/v1/contracts/results/")) {
      response.statusCode = mirrorIndexed ? 200 : 404;
      response.end(JSON.stringify(mirrorIndexed ? { indexed: true } : {}));
    } else if (request.url.startsWith("/mirror/api/v1/contracts/"))
      response.end(
        JSON.stringify({ contract_id: "0.0.12345", evm_address: address }),
      );
    else if (request.url.startsWith("/sourcify/server/v2/contract/"))
      response.end(JSON.stringify({ abi: verificationAbi }));
    else {
      response.statusCode = 404;
      response.end("{}");
    }
  });
  await new Promise((r) => metadataServer.listen(0, "127.0.0.1", r));
  const metadataUrl = `http://127.0.0.1:${metadataServer.address().port}`;
  const preload = join(root, "verification-metadata.mjs");
  // Only the verification subprocesses redirect public metadata to a controlled
  // fixture. EVM reads/simulation/receipts use the actual isolated Hardhat RPC.
  await writeFile(
    preload,
    `
    const original = globalThis.fetch;
    globalThis.fetch = (input, init) => {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
      const prefix = url.hostname.endsWith('mirrornode.hedera.com') ? '/mirror' : url.hostname === 'sourcify.dev' ? '/sourcify' : '';
      return original(prefix ? ${JSON.stringify(metadataUrl)} + prefix + url.pathname + url.search : input, init);
    };
  `,
  );
  const engine = new Runtime(root);
  engine.fetchJson = (input, signal) => {
    const target = new URL(input);
    const prefix = target.hostname.endsWith("mirrornode.hedera.com")
      ? "/mirror"
      : "/sourcify";
    return Runtime.prototype.fetchJson.call(
      engine,
      metadataUrl + prefix + target.pathname + target.search,
      signal,
    );
  };
  let record = {
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
  async function cli(command, input, expectedStatus = 0) {
    const child = spawn(
      process.execPath,
      [
        "--import",
        preload,
        join(workspace, "packages/cli/dist/index.js"),
        ...command,
        "--json",
      ],
      { cwd: root, stdio: "pipe" },
    );
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.stdin.end(
      input === undefined
        ? undefined
        : typeof input === "string"
          ? input
          : JSON.stringify(input),
    );
    const timer = setTimeout(() => child.kill("SIGKILL"), 45000);
    const status = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    }).finally(() => clearTimeout(timer));
    assert.equal(
      status,
      expectedStatus,
      `${command.join(" ")}: ${stdout} ${stderr}`,
    );
    const lines = stdout.trim().split("\n");
    assert.equal(lines.length, 1, "CLI stdout must contain one envelope");
    assert.ok(!/\u001b\[/.test(stdout), "CLI JSON contains terminal colors");
    const envelope = JSON.parse(lines[0]);
    assert.equal(envelope.schemaVersion, 1);
    cliChecks.push({
      command: command.join(" "),
      exitCode: status,
      ok: envelope.ok,
      ...(envelope.error ? { errorCode: envelope.error.code } : {}),
    });
    return { status, ...envelope };
  }
  assert.equal(
    (await cli(["doctor", "--network", "testnet"])).data.ready,
    true,
  );
  assert.equal(
    (await cli(["doctor", "--network", "mainnet"], undefined, 3)).data.ready,
    false,
  );
  const artifactPath = join(root, "observation.json");
  await writeFile(artifactPath, JSON.stringify(artifact));
  const imported = await cli([
    "contracts",
    "import",
    "--network",
    "testnet",
    "--address",
    "0.0.12345",
    "--abi",
    artifactPath,
  ]);
  assert.equal(imported.data.address, address);
  assert.equal(imported.data.provenance.source, "supplied");
  const discovered = await cli([
    "contracts",
    "import",
    "--network",
    "testnet",
    "--address",
    address,
  ]);
  assert.equal(discovered.data.provenance.source, "sourcify");
  record = await engine.contract(record.id);
  const beforeInvalid = await readFile(
    join(root, "workbench.config.local.json"),
    "utf8",
  );
  assert.equal(
    (
      await cli(
        ["contracts", "import", "--address", address, "--abi", "-"],
        "{broken",
        2,
      )
    ).error.code,
    "INPUT",
  );
  assert.equal(
    (
      await cli(
        ["contracts", "import", "--address", address, "--abi", "-"],
        { bad: true },
        2,
      )
    ).error.code,
    "ABI_INVALID",
  );
  assert.equal(
    await readFile(join(root, "workbench.config.local.json"), "utf8"),
    beforeInvalid,
  );
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
  assert.equal((await cli(["contracts", "list"])).ok, true);
  assert.equal((await cli(["contracts", "inspect", record.id])).ok, true);
  assert.equal(
    (await cli(["tools", "list", "--contract", record.id])).ok,
    true,
  );
  assert.equal((await cli(["tools", "inspect", tuple.id])).ok, true);
  assert.equal((await cli(["mcp", "config"])).ok, true);
  const cliPlan = await cli(
    ["tools", "prepare", tuple.id, "--from", from, "--args-file", "-"],
    args,
  );
  assert.equal(cliPlan.ok, true);
  assert.equal(cliPlan.data.data, corePlan.data);
  transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", preload, join(workspace, "packages/mcp/dist/index.js")],
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
  const cliSim = await cli(
    ["tools", "simulate", tuple.id, "--from", from, "--args-file", "-"],
    args,
  );
  assert.equal(cliSim.ok, true);
  // This transaction stays on an isolated local Hardhat fixture, never a Hedera network.
  const submitted = await observation.record(args.sample);
  await submitted.wait();
  await engine.store.saveTransaction({
    hash: submitted.hash,
    network: "testnet",
    planId: corePlan.id,
    submittedAt: new Date().toISOString(),
  });
  const status = await cli([
    "transactions",
    "status",
    "--network",
    "testnet",
    "--hash",
    submitted.hash,
  ]);
  assert.equal(status.data.state, "confirmed");
  assert.equal(status.data.indexing, "pending");
  mirrorIndexed = true;
  const mcpReceipt = await client.callTool({
    name: "transactions_status",
    arguments: { network: "testnet", hash: submitted.hash },
  });
  assert.equal(mcpReceipt.structuredContent.data.state, "confirmed");
  assert.equal(mcpReceipt.structuredContent.data.indexing, "indexed");
  const pending = await cli([
    "transactions",
    "status",
    "--network",
    "testnet",
    "--hash",
    `0x${"f".repeat(64)}`,
  ]);
  assert.equal(pending.data.state, "pending");
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
  const read = await cli(
    ["tools", "call", latest.id, "--from", from, "--args-file", "-"],
    {},
  );
  assert.deepEqual(read.data.value, actual.value);
  const argsPath = join(root, "arguments.json");
  await writeFile(argsPath, "{}");
  assert.deepEqual(
    (
      await cli([
        "tools",
        "call",
        latest.id,
        "--from",
        from,
        "--args-file",
        argsPath,
      ])
    ).data.value,
    args.sample,
  );
  assert.equal(
    (
      await cli(
        ["tools", "call", latest.id, "--from", other, "--args-file", "-"],
        {},
        5,
      )
    ).error.code,
    "REVERT",
  );
  assert.equal(
    (
      await cli(
        ["tools", "call", latest.id, "--from", from, "--args-file", "-"],
        { extra: true },
        2,
      )
    ).error.code,
    "INPUT",
  );
  for (const [signature, value] of [
    ["describe(uint256)", "9007199254740993"],
    ["describe(string)", "hello"],
  ]) {
    const definition = tool(signature);
    assert.equal(
      (
        await cli(["tools", "call", definition.id, "--args-file", "-"], {
          value,
        })
      ).data.value,
      value,
    );
  }
  const mcpRead = await client.callTool({
    name: latest.id,
    arguments: { arguments: {}, revision: latest.revision, from },
  });
  assert.deepEqual(mcpRead.structuredContent.data.value, actual.value);
  verificationAbi = record.abi.filter(
    (f) => f.type !== "function" || f.name === "describe",
  );
  const refreshedRecord = (await cli(["contracts", "refresh", record.id])).data;
  assert.notEqual(refreshedRecord.revision, record.revision);
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
    (await cli(["contracts", "refresh", "sauce-testnet"], undefined, 2)).error
      .code,
    "ABI_REQUIRED",
  );
  assert.equal(
    (
      await cli(
        ["transactions", "status", "--network", "testnet", "--hash", "bad"],
        undefined,
        2,
      )
    ).error.code,
    "INPUT",
  );
  assert.equal(
    (await cli(["contracts", "remove", record.id], undefined, 2)).error.code,
    "INPUT",
  );
  const beforeStaleRemoval = await readFile(
    join(root, "workbench.config.local.json"),
    "utf8",
  );
  assert.equal(
    (
      await cli(
        [
          "contracts",
          "remove",
          record.id,
          "--yes",
          "--revision",
          record.revision,
        ],
        undefined,
        3,
      )
    ).error.code,
    "STALE_REVISION",
  );
  assert.equal(
    await readFile(join(root, "workbench.config.local.json"), "utf8"),
    beforeStaleRemoval,
  );
  assert.equal(
    (
      await cli([
        "contracts",
        "remove",
        record.id,
        "--yes",
        "--revision",
        refreshedRecord.revision,
      ])
    ).ok,
    true,
  );
  assert.equal(
    (await cli(["contracts", "inspect", record.id], undefined, 2)).error.code,
    "NOT_FOUND",
  );
  await client.close();
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
      "CLI deployed-contract import by resolved ID and artifact, verified discovery and successful refresh",
      "CLI overloads, argument files/stdin, precision, process restart persistence",
      "actual local confirmed journal receipt, pending receipt and mirror indexing lag across CLI/MCP",
      "CLI stale removal preserves registry and exact current removal succeeds",
    ],
    catalogNotifications: changes,
    metadataScope:
      "Controlled mirror/Sourcify metadata fixture; real isolated EVM RPC execution. Public adapter verification is separate.",
    cliChecks,
  };
  await writeFile(
    "docs/evidence/local-adapters.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence));
} finally {
  await transport?.close();
  await provider?.destroy();
  metadataServer?.closeAllConnections();
  if (metadataServer) await new Promise((r) => metadataServer.close(r));
  if (node?.pid) {
    try {
      if (process.platform === "win32") node.kill("SIGTERM");
      else process.kill(-node.pid, "SIGTERM");
    } catch {}
  }
  await rm(root, { recursive: true, force: true });
}
