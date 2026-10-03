import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import {
  Runtime,
  toolsFor,
  bundledContracts,
  TOKEN_ABI,
  ROUTER_ABI,
} from "../packages/core/dist/index.js";
const root = await mkdtemp(join(tmpdir(), "workbench-adapters-"));
const workspace = process.cwd();
let transport;
try {
  await writeFile(join(root, "workbench.config.json"), "{}");
  const engine = new Runtime(root),
    contracts = bundledContracts();
  const bundledRouter = contracts.find((c) => c.id === "saucerswap-testnet");
  const bundledToken = contracts.find((c) => c.id === "sauce-testnet");
  const router = await engine.importContract({
    network: "testnet",
    address: bundledRouter.hederaId,
    abi: ROUTER_ABI,
    name: "Imported router",
  });
  const token = await engine.importContract({
    network: "testnet",
    address: bundledToken.address,
    abi: TOKEN_ABI,
    name: "Imported token",
  });
  const stderr = [];
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(workspace, "packages/mcp/dist/index.js")],
    cwd: root,
    stderr: "pipe",
  });
  transport.stderr?.on("data", (chunk) => stderr.push(String(chunk)));
  const client = new Client({
    name: "workbench-verification",
    version: "0.1.0",
  });
  await client.connect(transport);
  const catalog = await client.listTools();
  assert.ok(catalog.tools.some((t) => t.name === "contracts_list"));
  const checks = [];
  for (const [contract, signature] of [
    [router, "factory()"],
    [token, "symbol()"],
  ]) {
    const definition = toolsFor(contract).tools.find(
      (t) => t.signature === signature,
    );
    const core = await engine.call(definition.id, {});
    const mcp = await client.callTool({
      name: definition.id,
      arguments: { arguments: {}, revision: definition.revision },
    });
    const envelope =
      mcp.structuredContent ??
      JSON.parse(mcp.content.find((c) => c.type === "text").text);
    assert.equal(envelope.ok, true);
    assert.equal(envelope.data.value, core.value);
    const cli = spawnSync(
      process.execPath,
      [
        join(workspace, "packages/cli/dist/index.js"),
        "tools",
        "call",
        definition.id,
        "--args-file",
        "-",
        "--json",
      ],
      { cwd: root, input: "{}", encoding: "utf8", timeout: 45000 },
    );
    assert.equal(cli.status, 0, cli.stderr);
    assert.equal(JSON.parse(cli.stdout).data.value, core.value);
    checks.push({
      signature,
      value: core.value,
      interfaces: ["core", "CLI", "MCP"],
    });
  }
  const factoryTool = toolsFor(router).tools.find((t) => t.name === "factory");
  const invalid = await client.callTool({
    name: factoryTool.id,
    arguments: { arguments: { extra: "bad" }, revision: factoryTool.revision },
  });
  assert.ok(invalid.isError);
  await client.close();
  await mkdir("docs/evidence", { recursive: true });
  await writeFile(
    "docs/evidence/adapters.json",
    JSON.stringify(
      {
        observedAt: new Date().toISOString(),
        protocol: "MCP SDK 2.3.0 client/server stdio",
        checks,
        toolCount: catalog.tools.length,
        invalidInputRejected: true,
        diagnostics: stderr.join(""),
      },
      null,
      2,
    ) + "\n",
  );
  await mkdir("docs/examples", { recursive: true });
  await writeFile(
    "docs/examples/router.abi.json",
    JSON.stringify(ROUTER_ABI, null, 2) + "\n",
  );
  await writeFile(
    "docs/examples/token.abi.json",
    JSON.stringify(TOKEN_ABI, null, 2) + "\n",
  );
  console.log(JSON.stringify({ ok: true, checks }));
} finally {
  await transport?.close();
  await rm(root, { recursive: true, force: true });
}
