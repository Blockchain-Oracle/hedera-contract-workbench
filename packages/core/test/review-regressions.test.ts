import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { BaseError, RpcRequestError, type Hex } from "viem";
import { Runtime, bundledContracts, toolsFor, asError } from "../src/index.js";

const contract = bundledContracts().find((c) => c.id === "sauce-testnet")!;
const associate = toolsFor(contract).tools.find((t) => t.name === "associate")!;
const from = "0x0000000000000000000000000000000000000001";
const hash = `0x${"1".repeat(64)}` as Hex;
const simulation = { value: "22", observedAt: new Date().toISOString() };
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "workbench-regression-"));
  await writeFile(join(root, "workbench.config.json"), "{}");
  const engine = new Runtime(root);
  (engine as any).execute = async () => simulation;
  return { root, engine };
}

for (const operation of ["prepare", "validate"] as const)
  test(`${operation} rejects an interface refresh during simulation`, async () => {
    const { root, engine } = await fixture();
    try {
      const plan = await engine.prepare(associate.id, {}, { from });
      (engine as any).execute = async () => {
        await engine.store.saveContract(
          { ...contract, revision: "refreshed-during-simulation" },
          contract.revision,
        );
        return simulation;
      };
      const request =
        operation === "prepare"
          ? engine.prepare(associate.id, {}, { from })
          : engine.validatePlan(plan, from, 296);
      await assert.rejects(
        request,
        (error: any) => error.code === "STALE_REVISION",
      );
      assert.equal(
        (await engine.store.plan(plan.id)).revision,
        contract.revision,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

test("stale removal preserves the refreshed registry byte for byte", async () => {
  const { root, engine } = await fixture();
  try {
    const refreshed = { ...contract, revision: "new-revision" };
    await engine.store.saveContract(refreshed, contract.revision);
    const path = join(root, "workbench.config.local.json");
    const before = await readFile(path, "utf8");
    await assert.rejects(
      engine.store.removeContract(contract.id, contract.revision),
      (error: any) => error.code === "STALE_REVISION",
    );
    assert.equal(await readFile(path, "utf8"), before);
    await assert.rejects(
      engine.store.removeContract(contract.id, undefined as any),
      (error: any) => error.code === "INPUT",
    );
    await engine.store.removeContract(contract.id, refreshed.revision);
    assert.ok(
      !(await engine.store.contracts()).some((c) => c.id === contract.id),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("journal-backed receipt checks obey the shared concurrency limit", async () => {
  const { root, engine } = await fixture();
  try {
    const plan = await engine.prepare(associate.id, {}, { from });
    let active = 0,
      peak = 0;
    const delayed = async <T>(value: T) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 30));
      active--;
      return value;
    };
    engine.client = async () =>
      ({
        getTransactionReceipt: () => delayed({ status: "success" }),
        getTransaction: () =>
          delayed({
            from: plan.from,
            to: plan.to,
            input: plan.data,
            value: BigInt(plan.valueWeibar),
          }),
      }) as any;
    engine.fetchJson = async () => ({});
    const hashes = Array.from(
      { length: 8 },
      (_, i) => `0x${(i + 1).toString(16).padStart(64, "0")}` as Hex,
    );
    for (const h of hashes)
      await engine.store.saveTransaction({
        network: "testnet",
        hash: h,
        planId: plan.id,
        submittedAt: new Date().toISOString(),
      });
    const statuses = await Promise.all(
      hashes.map((h) => engine.status("testnet", h)),
    );
    assert.equal(peak, 4);
    assert.ok(statuses.every((s) => s.state === "confirmed"));
    engine.client = async () =>
      ({
        getTransactionReceipt: async () => ({ status: "success" }),
        getTransaction: async () => ({
          from: plan.from,
          to: plan.to,
          input: "0x",
          value: 0n,
        }),
      }) as any;
    await assert.rejects(
      engine.status("testnet", hashes[0]),
      (e: any) => e.code === "PRECONDITION",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const stage of ["rpc", "mirror"] as const)
  test(
    `receipt cancellation interrupts ${stage} HTTP and permits later requests`,
    { timeout: 8000 },
    async () => {
      const { root, engine } = await fixture();
      let arrived!: () => void;
      const requested = new Promise<void>((resolve) => {
        arrived = resolve;
      });
      let holding = true;
      const server = createServer(async (request, response) => {
        let body = "";
        for await (const chunk of request) body += String(chunk);
        if (stage === "mirror") {
          if (holding) {
            arrived();
            return;
          }
          response.setHeader("Content-Type", "application/json");
          response.end("{}");
          return;
        }
        const rpc = JSON.parse(body);
        if (rpc.method === "eth_getTransactionReceipt" && holding) {
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
      try {
        await new Promise<void>((resolve) =>
          server.listen(0, "127.0.0.1", resolve),
        );
        const url = `http://127.0.0.1:${(server.address() as any).port}`;
        if (stage === "rpc")
          await writeFile(
            join(root, "workbench.config.json"),
            JSON.stringify({ rpc: { testnet: url } }),
          );
        else {
          engine.client = async () =>
            ({
              getTransactionReceipt: async () => ({ status: "success" }),
            }) as any;
          engine.fetchJson = (_url, signal) =>
            Runtime.prototype.fetchJson.call(engine, url, signal);
        }
        const controller = new AbortController();
        const result = engine
          .status("testnet", hash, controller.signal)
          .catch((error) => error);
        await requested;
        controller.abort();
        assert.equal((await result).code, "CANCELLED");
        holding = false;
        const next = await engine.status("testnet", hash);
        assert.equal(next.state, stage === "rpc" ? "pending" : "confirmed");
      } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
        await rm(root, { recursive: true, force: true });
      }
    },
  );

test("aborting queued receipt work releases the queue without starting cancelled RPC", async () => {
  const { root, engine } = await fixture();
  try {
    await writeFile(
      join(root, "workbench.config.json"),
      JSON.stringify({ rpcConcurrency: 1 }),
    );
    let release!: () => void, arrived!: () => void;
    const holding = new Promise<void>((resolve) => {
      release = resolve;
    });
    const requested = new Promise<void>((resolve) => {
      arrived = resolve;
    });
    const called: Hex[] = [];
    engine.client = async () =>
      ({
        getTransactionReceipt: async ({ hash: h }: { hash: Hex }) => {
          called.push(h);
          arrived();
          await holding;
          return { status: "success" };
        },
      }) as any;
    engine.fetchJson = async () => ({});
    const first = engine.status("testnet", hash);
    await requested;
    const controller = new AbortController();
    const cancelledHash = `0x${"2".repeat(64)}` as Hex;
    const cancelled = engine
      .status("testnet", cancelledHash, controller.signal)
      .catch((e) => e);
    await new Promise((r) => setTimeout(r, 20));
    controller.abort();
    assert.equal((await cancelled).code, "CANCELLED");
    release();
    await first;
    await engine.status("testnet", hash);
    assert.ok(!called.includes(cancelledHash));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("nested Hedera sender/funding failures give actionable prerequisites, not endpoint retries", () => {
  for (const message of [
    "Sender account not found.",
    "insufficient funds for gas * price + value",
  ]) {
    const rpc = new RpcRequestError({
      body: { method: "eth_call", params: [] },
      error: { code: -32000, message },
      url: "https://private.example/rpc-secret",
    });
    const error = asError(
      new BaseError("Missing or invalid parameters.", { cause: rpc }),
    );
    assert.equal(error.code, "PRECONDITION");
    assert.equal(error.retryable, false);
    assert.equal(error.path, "from");
    assert.match(error.nextAction!, /network|account/);
    assert.ok(!error.message.includes("rpc-secret"));
  }
  const transport = asError(new BaseError("Connection timed out."));
  assert.equal(transport.code, "TRANSPORT");
  assert.equal(transport.retryable, true);
});
