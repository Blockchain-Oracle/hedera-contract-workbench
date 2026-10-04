import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NextRequest } from "next/server";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { Runtime, bundledContracts } from "@sh/core";
import { assistantTools } from "../packages/nextjs/lib/assistant-tools";

const workspace = process.cwd();
const root = await mkdtemp(join(tmpdir(), "workbench-receipt-adapters-"));
const hash = `0x${"f".repeat(64)}` as `0x${string}`;
let holding = true,
  arrived: () => void = () => {},
  disconnected: () => void = () => {};
const server = createServer(async (request, response) => {
  let text = "";
  for await (const chunk of request) text += String(chunk);
  const rpc = JSON.parse(text);
  if (rpc.method === "eth_getTransactionReceipt" && holding) {
    response.once("close", () => disconnected());
    arrived();
    return;
  }
  response.setHeader("Content-Type", "application/json");
  response.end(
    JSON.stringify({
      jsonrpc: "2.0",
      id: rpc.id,
      result: rpc.method === "eth_chainId" ? "0x128" : null,
    }),
  );
});
let transport: StdioClientTransport | undefined;
const within = async <T,>(promise: Promise<T>) => {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("Adapter verification timed out")),
          8000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
};
const checks: string[] = [];
try {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  await writeFile(
    join(root, "workbench.config.json"),
    JSON.stringify({ rpc: { testnet: url } }),
  );
  const engine = new Runtime(root);
  (globalThis as any).workbenchRuntime = engine;
  const route = await import(
    "../packages/nextjs/app/api/workbench/[...path]/route"
  );
  const context = (path: string[]) => ({ params: Promise.resolve({ path }) });
  const request = (path: string, init?: RequestInit) =>
    new NextRequest(`http://127.0.0.1:3000/api/workbench/${path}`, {
      ...init,
      headers: { host: "127.0.0.1:3000", ...init?.headers },
    });
  const diagnostics: string[] = [];
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(workspace, "packages/mcp/dist/index.js")],
    cwd: root,
    stderr: "pipe",
  });
  transport.stderr?.on("data", (chunk) => diagnostics.push(String(chunk)));
  const client = new Client({
    name: "receipt-cancellation-verification",
    version: "0.1.0",
  });
  await client.connect(transport);
  const contract = bundledContracts().find((c) => c.id === "sauce-testnet")!;
  for (const adapter of ["HTTP route", "assistant", "MCP stdio"] as const) {
    holding = true;
    const requested = new Promise<void>((resolve) => {
      arrived = resolve;
    });
    const closed = new Promise<void>((resolve) => {
      disconnected = resolve;
    });
    const controller = new AbortController();
    const result =
      adapter === "HTTP route"
        ? route
            .GET(
              request(`transactions/${hash}?network=testnet`, {
                signal: controller.signal,
              }),
              context(["transactions", hash]),
            )
            .then((r) => r.json())
        : adapter === "assistant"
          ? assistantTools(engine, contract, undefined, controller.signal).tools
              .receipt.execute!({ hash }, {} as any)
          : client.callTool(
              {
                name: "transactions_status",
                arguments: { network: "testnet", hash },
              },
              { signal: controller.signal },
            );
    const settled = Promise.resolve(result).catch((error) => ({
      aborted: true,
      error,
    }));
    await within(requested);
    controller.abort();
    const envelope: any = await within(settled);
    if (adapter === "MCP stdio") assert.equal(envelope.aborted, true);
    else assert.equal(envelope.error.code, "CANCELLED");
    // Verify cancellation reached the underlying RPC socket, not only the caller.
    await within(closed);
    holding = false;
    const next = await client.callTool({
      name: "transactions_status",
      arguments: { network: "testnet", hash },
    });
    assert.equal((next.structuredContent as any).data.state, "pending");
    checks.push(
      `${adapter}: receipt abort closes RPC connection and subsequent request succeeds`,
    );
  }
  const refreshed = { ...contract, revision: "refreshed-before-delete" };
  await engine.store.saveContract(refreshed, contract.revision);
  const stale = await route.DELETE(
    request(
      `contracts/${contract.id}?revision=${encodeURIComponent(contract.revision)}`,
      { method: "DELETE" },
    ),
    context(["contracts", contract.id]),
  );
  assert.equal((await stale.json()).error.code, "STALE_REVISION");
  assert.equal(
    (await engine.contract(contract.id)).revision,
    refreshed.revision,
  );
  const missing = await route.DELETE(
    request(`contracts/${contract.id}`, { method: "DELETE" }),
    context(["contracts", contract.id]),
  );
  assert.equal((await missing.json()).error.code, "INPUT");
  const removed = await route.DELETE(
    request(`contracts/${contract.id}?revision=${refreshed.revision}`, {
      method: "DELETE",
    }),
    context(["contracts", contract.id]),
  );
  assert.equal((await removed.json()).ok, true);
  checks.push(
    "HTTP removal requires revision, rejects stale deletion, and accepts the current revision",
  );
  assert.equal(diagnostics.join(""), "");
  await client.close();
  const evidence = {
    observedAt: new Date().toISOString(),
    scope:
      "Real local RPC HTTP cancellation; production Next route handlers, assistant tools and official MCP stdio client. No Hedera submission.",
    checks,
    diagnostics: diagnostics.join(""),
  };
  await writeFile(
    "docs/evidence/receipt-adapters.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence));
} finally {
  await transport?.close();
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(root, { recursive: true, force: true });
}
