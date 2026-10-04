// Diagnostic probes for the reviewed baseline. RPC is replaced locally;
// this script neither connects to Hedera nor submits transactions.
// Run after npm run build:runtime: node docs/reviews/reproduce-2026-10-04.mjs
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Runtime } from "../../packages/core/dist/runtime.js";
import { toolsFor } from "../../packages/core/dist/abi.js";
import assert from "node:assert/strict";

const root = await mkdtemp(join(tmpdir(), "workbench-review-"));
try {
  const runtime = new Runtime(root);
  const contract = await runtime.contract("sauce-testnet");
  const tool = toolsFor(contract).tools.find((t) => t.name === "associate");
  const from = "0x0000000000000000000000000000000000000001";
  const simulation = {
    schemaVersion: 1,
    contractId: contract.id,
    network: contract.network,
    chainId: contract.chainId,
    address: contract.address,
    toolId: tool.id,
    revision: contract.revision,
    signature: tool.signature,
    caller: from,
    value: "22",
    observedAt: new Date().toISOString(),
  };
  runtime.execute = async () => simulation;
  const plan = await runtime.prepare(tool.id, {}, { from });
  const refreshed = { ...contract, revision: "review-refreshed-interface" };
  runtime.execute = async () => {
    await runtime.store.saveContract(refreshed, contract.revision);
    return simulation;
  };
  let validated, validationError;
  try {
    validated = await runtime.validatePlan(plan, from, 296);
  } catch (error) {
    validationError = error.code;
  }
  const revisionRace = {
    validationSucceeded: !!validated,
    rejectedWith: validationError,
    returnedRevision: validated?.plan.revision,
    currentRevision: (await runtime.contract(contract.id)).revision,
  };
  let removalError;
  try {
    await runtime.store.removeContract(contract.id, contract.revision);
  } catch (error) {
    removalError = error.code;
  }
  const staleRemoval = {
    refreshedContractRemoved: !(await runtime.store.contracts()).some(
      (c) => c.id === contract.id,
    ),
    rejectedWith: removalError,
  };

  let active = 0;
  let peak = 0;
  runtime.client = async () => ({
    getTransactionReceipt: async () => ({ status: "success" }),
    getTransaction: async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 200));
      active--;
      return {
        from: plan.from,
        to: plan.to,
        input: plan.data,
        value: BigInt(plan.valueWeibar),
      };
    },
  });
  runtime.fetchJson = async () => ({});
  const hashes = Array.from(
    { length: 8 },
    (_, i) => `0x${(i + 1).toString(16).padStart(64, "0")}`,
  );
  for (const hash of hashes)
    await runtime.store.saveTransaction({
      hash,
      network: "testnet",
      planId: plan.id,
      submittedAt: new Date().toISOString(),
    });
  await Promise.all(hashes.map((hash) => runtime.status("testnet", hash)));
  assert.equal(validationError, "STALE_REVISION");
  assert.equal(removalError, "STALE_REVISION");
  assert.equal(staleRemoval.refreshedContractRemoved, false);
  assert.equal(peak, 4);
  console.log(
    JSON.stringify(
      {
        observedAt: new Date().toISOString(),
        kind: "isolated deterministic review probes; no Hedera submission",
        revisionRace,
        staleRemoval,
        receiptConcurrency: {
          configured: (await runtime.store.settings()).rpcConcurrency,
          observedGetTransactionPeak: peak,
        },
      },
      null,
      2,
    ),
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
