import {
  readFile,
  writeFile,
  mkdir,
  rename,
  unlink,
  open,
  stat,
  readdir,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { assert, WorkbenchError } from "./errors.js";
import { bundledContracts } from "./bundled.js";
import { DEFAULTS, NETWORKS, networkName } from "./networks.js";
import type {
  ContractRecord,
  Network,
  TransactionPlan,
  TransactionRecord,
} from "./types.js";

export function findWorkspace(start = process.cwd()): string {
  let dir = resolve(start);
  while (!existsSync(join(dir, "workbench.config.json"))) {
    const parent = dirname(dir);
    if (parent === dir)
      throw new WorkbenchError(
        "CONFIG",
        "Run this command inside the workbench repository.",
      );
    dir = parent;
  }
  return dir;
}
async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw new WorkbenchError(
      "CONFIG",
      `Could not read ${path.split("/").pop()}. Repair its JSON before continuing.`,
    );
  }
}
async function atomicJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  try {
    await rename(temp, path);
  } finally {
    await unlink(temp).catch(() => {});
  }
}
export class Store {
  readonly dataDir: string;
  private readonly localPath: string;
  constructor(readonly root: string) {
    this.dataDir = join(root, ".workbench");
    this.localPath = join(root, "workbench.config.local.json");
    loadEnv({ path: join(root, "packages/nextjs/.env.local"), quiet: true });
  }
  async settings() {
    const committed = await readJson<Record<string, any>>(
      join(this.root, "workbench.config.json"),
      {},
    );
    const local = await readJson<Record<string, any>>(this.localPath, {});
    const bounded = (
      value: unknown,
      fallback: number,
      min: number,
      max: number,
    ) => {
      const n = Number(value ?? fallback);
      assert(
        Number.isInteger(n) && n >= min && n <= max,
        "CONFIG",
        "Invalid operational setting.",
      );
      return n;
    };
    return {
      network: networkName(
        process.env.WORKBENCH_NETWORK ??
          local.defaultNetwork ??
          committed.defaultNetwork ??
          "testnet",
      ),
      rpcConcurrency: bounded(
        process.env.WORKBENCH_RPC_CONCURRENCY ??
          local.rpcConcurrency ??
          committed.rpcConcurrency,
        DEFAULTS.rpcConcurrency,
        1,
        16,
      ),
      requestTimeoutMs: bounded(
        local.requestTimeoutMs ?? committed.requestTimeoutMs,
        DEFAULTS.requestTimeoutMs,
        1000,
        120000,
      ),
      planExpiryMs: bounded(
        local.planExpiryMs ?? committed.planExpiryMs,
        DEFAULTS.planExpiryMs,
        30000,
        3600000,
      ),
      receiptPollMs: bounded(
        local.receiptPollMs ?? committed.receiptPollMs,
        DEFAULTS.receiptPollMs,
        1000,
        60000,
      ),
      receiptPollBudgetMs: bounded(
        local.receiptPollBudgetMs ?? committed.receiptPollBudgetMs,
        DEFAULTS.receiptPollBudgetMs,
        5000,
        600000,
      ),
      webUrl:
        process.env.WORKBENCH_WEB_URL ??
        `http://127.0.0.1:${process.env.PORT ?? "3000"}`,
      rpc: {
        testnet:
          process.env.WORKBENCH_RPC_TESTNET_URL ??
          local.rpc?.testnet ??
          committed.rpc?.testnet ??
          NETWORKS.testnet.rpc,
        mainnet:
          process.env.WORKBENCH_RPC_MAINNET_URL ??
          local.rpc?.mainnet ??
          committed.rpc?.mainnet ??
          NETWORKS.mainnet.rpc,
      } as Record<Network, string>,
    };
  }
  async contracts(): Promise<ContractRecord[]> {
    const committed = await readJson<{ contracts?: ContractRecord[] }>(
      join(this.root, "workbench.config.json"),
      {},
    );
    const local = await readJson<{
      contracts?: ContractRecord[];
      removed?: string[];
    }>(this.localPath, {});
    const merged = new Map(
      [
        ...bundledContracts(),
        ...(committed.contracts ?? []),
        ...(local.contracts ?? []),
      ].map((x) => [x.id, x]),
    );
    for (const id of local.removed ?? []) merged.delete(id);
    return [...merged.values()];
  }
  private async locked<T>(fn: () => Promise<T>): Promise<T> {
    await mkdir(this.dataDir, { recursive: true });
    const path = join(this.dataDir, "registry.lock"),
      started = Date.now();
    let handle;
    while (!handle) {
      try {
        handle = await open(path, "wx", 0o600);
        await handle.writeFile(String(process.pid));
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
        const age =
          Date.now() -
          (await stat(path).catch(() => ({ mtimeMs: Date.now() }))).mtimeMs;
        if (age > 5000) {
          const pid = Number(await readFile(path, "utf8").catch(() => "0"));
          try {
            if (pid > 0) process.kill(pid, 0);
          } catch (err) {
            if ((err as NodeJS.ErrnoException).code === "ESRCH")
              await unlink(path).catch(() => {});
          }
        }
        if (Date.now() - started > 5000)
          throw new WorkbenchError(
            "REGISTRY_BUSY",
            "Another process is updating imports. Retry shortly.",
            undefined,
            true,
          );
        await new Promise((r) => setTimeout(r, 25));
      }
    }
    try {
      return await fn();
    } finally {
      await handle.close();
      await unlink(path).catch(() => {});
    }
  }
  async saveContract(record: ContractRecord, expectedRevision?: string | null) {
    return this.locked(async () => {
      const current = (await this.contracts()).find((x) => x.id === record.id);
      if (expectedRevision !== undefined)
        assert(
          expectedRevision === null
            ? !current
            : current?.revision === expectedRevision,
          "STALE_REVISION",
          "The contract changed during refresh. Reload before trying again.",
        );
      const local = await readJson<Record<string, any>>(this.localPath, {});
      await atomicJson(this.localPath, {
        ...local,
        schemaVersion: 1,
        registryRevision: (local.registryRevision ?? 0) + 1,
        contracts: [
          ...(local.contracts ?? []).filter(
            (x: ContractRecord) => x.id !== record.id,
          ),
          record,
        ],
        removed: (local.removed ?? []).filter((id: string) => id !== record.id),
      });
      return record;
    });
  }
  async removeContract(id: string, expectedRevision: string) {
    assert(
      typeof expectedRevision === "string" && expectedRevision.length > 0,
      "INPUT",
      "Removal needs the inspected contract revision. Reload before trying again.",
      "revision",
    );
    return this.locked(async () => {
      const current = (await this.contracts()).find((x) => x.id === id);
      assert(current, "NOT_FOUND", "Contract was not found.");
      assert(
        current.revision === expectedRevision,
        "STALE_REVISION",
        "The contract changed before removal. Reload and confirm the current contract.",
      );
      const local = await readJson<Record<string, any>>(this.localPath, {});
      await atomicJson(this.localPath, {
        ...local,
        schemaVersion: 1,
        registryRevision: (local.registryRevision ?? 0) + 1,
        contracts: (local.contracts ?? []).filter(
          (x: ContractRecord) => x.id !== id,
        ),
        removed: [...new Set([...(local.removed ?? []), id])],
      });
    });
  }
  async savePlan(plan: TransactionPlan) {
    assert(
      /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(plan.id),
      "INPUT",
      "Invalid plan ID.",
    );
    await atomicJson(join(this.dataDir, "plans", `${plan.id}.json`), plan);
  }
  async plan(id: string): Promise<TransactionPlan> {
    assert(
      /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id),
      "INPUT",
      "Invalid plan ID.",
    );
    const plan = await readJson<TransactionPlan | null>(
      join(this.dataDir, "plans", `${id}.json`),
      null,
    );
    assert(plan, "NOT_FOUND", "Plan was not found in this workspace.");
    return plan;
  }
  async saveTransaction(record: TransactionRecord) {
    assert(
      /^0x[0-9a-fA-F]{64}$/.test(record.hash),
      "INPUT",
      "Invalid transaction hash.",
    );
    await atomicJson(
      join(
        this.dataDir,
        "transactions",
        `${record.network}-${record.hash}.json`,
      ),
      record,
    );
  }
  async transaction(
    network: Network,
    hash: string,
  ): Promise<TransactionRecord | null> {
    assert(
      /^0x[0-9a-fA-F]{64}$/.test(hash),
      "INPUT",
      "Invalid transaction hash.",
    );
    return readJson(
      join(this.dataDir, "transactions", `${network}-${hash}.json`),
      null,
    );
  }
  async transactions(): Promise<TransactionRecord[]> {
    const dir = join(this.dataDir, "transactions");
    const files = await readdir(dir).catch((e: NodeJS.ErrnoException) => {
      if (e.code === "ENOENT") return [];
      throw e;
    });
    const records = await Promise.all(
      files
        .filter((f) => /^(testnet|mainnet)-0x[0-9a-fA-F]{64}\.json$/.test(f))
        .map((f) => readJson<TransactionRecord | null>(join(dir, f), null)),
    );
    return records
      .filter((r): r is TransactionRecord => !!r)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .slice(0, 50);
  }
}
