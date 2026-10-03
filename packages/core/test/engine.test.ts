import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseAbi, encodeFunctionResult, decodeFunctionResult } from "viem";
import {
  parameterTree,
  validateArguments,
  normalizeAbi,
  hashAbi,
  toolsFor,
  functionSignature,
  parseHbar,
  hbarToTinybar,
  tinybarToWeibar,
  Store,
  Runtime,
  bundledContracts,
  positionalOutputs,
  normalizeResults,
} from "../src/index.js";
const record = bundledContracts()[0];
test("decimal-string integers preserve precision and reject invalid bounds", () => {
  const params = parameterTree([
    { name: "amount", type: "uint256" },
    { name: "signed", type: "int8" },
  ]);
  const huge = ((1n << 256n) - 1n).toString();
  assert.deepEqual(
    validateArguments(params, { amount: huge, signed: "-128" }),
    [BigInt(huge), -128n],
  );
  for (const args of [
    { amount: 4, signed: "0" },
    { amount: "01", signed: "0" },
    { amount: huge + "0", signed: "0" },
    { amount: "1", signed: "128" },
    { amount: "1", signed: "-0" },
    { amount: "1", signed: "0", extra: "" },
  ])
    assert.throws(() => validateArguments(params, args));
});
test("nested tuples and arrays retain positional mappings for duplicate/unnamed fields", () => {
  const params = parameterTree([
    {
      name: "rows",
      type: "tuple[]",
      components: [
        { name: "", type: "uint64" },
        { name: "", type: "bytes2" },
      ],
    } as any,
  ]);
  assert.deepEqual(
    validateArguments(params, { rows: [{ arg0: "9", arg1: "0xabcd" }] }),
    [[[9n, "0xabcd"]]],
  );
  assert.throws(() =>
    validateArguments(params, { rows: [{ arg0: "9", arg1: "0xabc" }] }),
  );
  assert.throws(() =>
    validateArguments(parameterTree([{ name: "fixed", type: "bool[2]" }]), {
      fixed: [true],
    }),
  );
});
test("overloads have independent identity and unsupported types are visible", () => {
  const abi = normalizeAbi(
    parseAbi([
      "function describe(uint256 value) pure returns (uint256)",
      "function describe(string value) pure returns (string)",
    ]),
  );
  const tools = toolsFor({
    ...record,
    id: "fixture",
    abi,
    revision: hashAbi(abi),
  }).tools;
  assert.equal(tools.length, 2);
  assert.notEqual(tools[0].id, tools[1].id);
  assert.equal(
    functionSignature({
      type: "function",
      name: "alias",
      stateMutability: "view",
      inputs: [{ type: "uint[]" }],
      outputs: [],
    } as any),
    "alias(uint256[])",
  );
  assert.throws(() => parameterTree([{ type: "fixed128x18" } as any]));
});
test("HBAR, tinybar, and RPC weibar are distinct exact units", () => {
  assert.equal(parseHbar("1.00000001"), 1000000010000000000n);
  assert.equal(hbarToTinybar("1.00000001"), 100000001n);
  assert.equal(tinybarToWeibar(100000001n), parseHbar("1.00000001"));
  assert.throws(() => parseHbar("0.000000001"));
  assert.throws(() => parseHbar("-1"));
});
test("receipt polling settings retain defaults, accept bounded overrides, and reject unbounded polling", async () => {
  const root = await mkdtemp(join(tmpdir(), "workbench-polling-"));
  try {
    await writeFile(join(root, "workbench.config.json"), "{}");
    const store = new Store(root);
    assert.equal((await store.settings()).receiptPollMs, 3000);
    assert.equal((await store.settings()).receiptPollBudgetMs, 120000);
    await writeFile(
      join(root, "workbench.config.local.json"),
      JSON.stringify({ receiptPollMs: 5000, receiptPollBudgetMs: 30000 }),
    );
    const settings = await store.settings();
    assert.equal(settings.receiptPollMs, 5000);
    assert.equal(settings.receiptPollBudgetMs, 30000);
    for (const override of [
      { receiptPollMs: 0 },
      { receiptPollBudgetMs: 600001 },
    ]) {
      const text = JSON.stringify(override);
      await writeFile(join(root, "workbench.config.local.json"), text);
      await assert.rejects(store.settings(), /Invalid operational setting/);
      assert.equal(
        await readFile(join(root, "workbench.config.local.json"), "utf8"),
        text,
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("concurrent registry edits preserve imports; stale refresh and corrupt JSON preserve state", async () => {
  const root = await mkdtemp(join(tmpdir(), "workbench-store-"));
  try {
    await writeFile(join(root, "workbench.config.json"), '{"contracts":[]}');
    const a = new Store(root),
      b = new Store(root);
    await Promise.all([
      a.saveContract({ ...record, id: "one" }),
      b.saveContract({ ...record, id: "two" }),
    ]);
    assert.ok((await a.contracts()).some((c) => c.id === "one"));
    assert.ok((await a.contracts()).some((c) => c.id === "two"));
    const before = await readFile(
      join(root, "workbench.config.local.json"),
      "utf8",
    );
    await assert.rejects(
      a.saveContract({ ...record, id: "one" }, "stale"),
      /changed/,
    );
    assert.equal(
      await readFile(join(root, "workbench.config.local.json"), "utf8"),
      before,
    );
    await writeFile(join(root, "workbench.config.local.json"), "{broken");
    await assert.rejects(a.contracts(), /Repair its JSON/);
    assert.equal(
      await readFile(join(root, "workbench.config.local.json"), "utf8"),
      "{broken",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("preparation binds calldata, caller, network, revision, expiry, and value", async () => {
  const root = await mkdtemp(join(tmpdir(), "workbench-plan-"));
  try {
    await writeFile(join(root, "workbench.config.json"), "{}");
    const runtime = new Runtime(root);
    const tool = toolsFor(record).tools.find((t) => t.action === "prepare")!;
    const from = "0x0000000000000000000000000000000000000001";
    const args = {
      amountOutMin: "1",
      path: [from, from],
      to: from,
      deadline: "9999999999",
    };
    (runtime as any).execute = async (r: any) => ({
      value: null,
      network: r.contract.network,
      observedAt: new Date().toISOString(),
    });
    const plan = await runtime.prepare(tool.id, args, { from, valueHbar: "1" });
    await runtime.validatePlan(plan, from, 296);
    const verified = await runtime.validatePlan(
      {
        ...plan,
        simulation: { ...plan.simulation, value: "fabricated" },
        reviewUrl: "https://untrusted.invalid",
      },
      from,
      296,
    );
    assert.equal(verified.plan.simulation.value, null);
    assert.ok(verified.plan.reviewUrl.startsWith("http://127.0.0.1:"));
    await assert.rejects(
      runtime.store.savePlan({ ...plan, id: "../../outside" }),
      (error: any) => error.code === "INPUT",
    );
    await assert.rejects(
      runtime.validatePlan({ ...plan, valueWeibar: "0" }, from, 296),
      /integrity/,
    );
    await assert.rejects(
      runtime.validatePlan(
        plan,
        "0x0000000000000000000000000000000000000002",
        296,
      ),
      /account/,
    );
    await assert.rejects(runtime.validatePlan(plan, from, 295), /networks/);
    await runtime.store.removeContract(record.id);
    await assert.rejects(runtime.validatePlan(plan, from, 296), /not found/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("tuple results never lose duplicate or unnamed positions", () => {
  const fn = {
    type: "function",
    name: "sample",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "tuple",
        name: "result",
        components: [
          { name: "same", type: "uint256" },
          { name: "same", type: "uint256" },
        ],
      },
    ],
  } as any;
  const data = encodeFunctionResult({
    abi: [positionalOutputs(fn)],
    functionName: "sample",
    result: [1n, 2n],
  });
  const decoded = decodeFunctionResult({
    abi: [positionalOutputs(fn)],
    functionName: "sample",
    data,
  });
  assert.deepEqual(normalizeResults(parameterTree(fn.outputs), decoded), {
    arg0: "1",
    arg1: "2",
  });
});
test("mainnet plans require exact context without any submission", async () => {
  const root = await mkdtemp(join(tmpdir(), "workbench-mainnet-"));
  try {
    await writeFile(join(root, "workbench.config.json"), "{}");
    const runtime = new Runtime(root),
      contract = bundledContracts().find((c) => c.id === "saucerswap-mainnet")!;
    const tool = toolsFor(contract).tools.find((t) => t.action === "prepare")!;
    const from = "0x0000000000000000000000000000000000000001";
    (runtime as any).execute = async (r: any) => ({
      value: null,
      network: r.contract.network,
      observedAt: new Date().toISOString(),
    });
    const plan = await runtime.prepare(
      tool.id,
      {
        amountOutMin: "1",
        path: [from, from],
        to: from,
        deadline: "9999999999",
      },
      { from, valueHbar: "0.1" },
    );
    assert.equal(plan.network, "mainnet");
    assert.equal(plan.chainId, 295);
    await runtime.validatePlan(plan, from, 295);
    await assert.rejects(runtime.validatePlan(plan, from, 296), /networks/);
    await assert.rejects(
      runtime.validatePlan({ ...plan, data: "0x" }, from, 295),
      /integrity/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("invalid native value types and oversized values fail before RPC", () => {
  assert.throws(
    () => parseHbar(1 as any),
    (error: any) => error.code === "INPUT",
  );
  assert.throws(
    () => parseHbar("9".repeat(90)),
    (error: any) => error.code === "INPUT",
  );
});

test("plan expiry and metadata changes require renewed preparation", async () => {
  const root = await mkdtemp(join(tmpdir(), "workbench-expiry-"));
  const actualNow = Date.now;
  try {
    await writeFile(join(root, "workbench.config.json"), "{}");
    const runtime = new Runtime(root);
    const tool = toolsFor(record).tools.find((t) => t.action === "prepare")!;
    const from = "0x0000000000000000000000000000000000000001";
    (runtime as any).execute = async () => ({
      value: null,
      observedAt: new Date().toISOString(),
    });
    const plan = await runtime.prepare(
      tool.id,
      {
        amountOutMin: "1",
        path: [from, from],
        to: from,
        deadline: "9999999999",
      },
      { from, valueHbar: "0.1" },
    );
    Date.now = () => actualNow() + 300001;
    await assert.rejects(
      runtime.validatePlan(plan, from, 296),
      (error: any) => error.code === "PLAN_EXPIRED",
    );
    Date.now = actualNow;
    await runtime.store.saveContract(
      { ...record, revision: record.revision + ":changed" },
      record.revision,
    );
    await assert.rejects(
      runtime.validatePlan(plan, from, 296),
      (error: any) => error.code === "STALE_REVISION",
    );
  } finally {
    Date.now = actualNow;
    await rm(root, { recursive: true, force: true });
  }
});

test("malformed imports preserve the registry without requesting RPC", async () => {
  const root = await mkdtemp(join(tmpdir(), "workbench-import-"));
  try {
    await writeFile(join(root, "workbench.config.json"), "{}");
    const runtime = new Runtime(root);
    await runtime.store.saveContract(record);
    const path = join(root, "workbench.config.local.json"),
      before = await readFile(path, "utf8");
    runtime.fetchJson = async () => {
      throw new Error("Unexpected metadata call");
    };
    await assert.rejects(
      runtime.importContract({
        network: "testnet",
        address: record.address,
        abi: { bad: true },
      }),
      (error: any) => error.code === "ABI_INVALID",
    );
    assert.equal(await readFile(path, "utf8"), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("abandoned reads cancel the underlying RPC and leave other reads usable", async () => {
  const { createServer } = await import("node:http");
  const root = await mkdtemp(join(tmpdir(), "workbench-cancel-"));
  let received!: () => void;
  const requested = new Promise<void>((resolve) => {
    received = resolve;
  });
  const tool = toolsFor(record).tools.find((t) => t.name === "factory")!;
  const data = encodeFunctionResult({
    abi: [tool.fn],
    functionName: "factory",
    result: record.address,
  });
  let holding = true;
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += String(chunk);
    const rpc = JSON.parse(body);
    if (rpc.method === "eth_call" && holding) {
      received();
      return;
    }
    response.setHeader("Content-Type", "application/json");
    response.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id: rpc.id,
        result: rpc.method === "eth_chainId" ? "0x128" : data,
      }),
    );
  });
  try {
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as any).port;
    await writeFile(
      join(root, "workbench.config.json"),
      JSON.stringify({ rpc: { testnet: `http://127.0.0.1:${port}` } }),
    );
    const runtime = new Runtime(root),
      controller = new AbortController();
    const read = runtime.call(tool.id, {}, { signal: controller.signal }).then(
      () => null,
      (error) => error,
    );
    await requested;
    controller.abort();
    assert.equal((await read).code, "CANCELLED");
    holding = false;
    assert.equal((await runtime.call(tool.id, {})).value, record.address);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
