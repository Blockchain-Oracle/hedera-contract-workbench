import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import {
  encodeFunctionData,
  decodeErrorResult,
  decodeFunctionResult,
} from "viem";
import {
  Runtime,
  toolsFor,
  bundledContracts,
  NETWORKS,
  knownTokenAddress,
} from "../packages/core/dist/index.js";
const engine = new Runtime(),
  router = bundledContracts().find((c) => c.id === "saucerswap-testnet");
const tool = toolsFor(router).tools.find((t) => t.action === "prepare");
const from = "0x00000000000000000000000000000000000026E7";
const args = {
  amountOutMin: "1",
  path: [
    knownTokenAddress(NETWORKS.testnet.whbarId),
    knownTokenAddress(NETWORKS.testnet.sauceId),
  ],
  to: from,
  deadline: "1",
};
const data = encodeFunctionData({
  abi: [tool.fn],
  functionName: tool.name,
  args: [1n, args.path, from, 1n],
});
const response = await fetch(NETWORKS.testnet.rpc, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [
      { from, to: router.address, data, value: "0x2540be400" },
      "latest",
    ],
  }),
  signal: AbortSignal.timeout(15000),
});
const rpc = await response.json();
assert.ok(rpc.error?.data);
const decoded = decodeErrorResult({ abi: router.abi, data: rpc.error.data });
const core = await engine
  .simulate(tool.id, args, { from, valueHbar: "0.00000001" })
  .then(
    () => null,
    (e) => e,
  );
assert.equal(core.code, "REVERT");
assert.ok(core.message.includes(decoded.args[0]));
const association = [];
const token = bundledContracts().find((c) => c.id === "sauce-testnet");
const associate = toolsFor(token).tools.find((t) => t.name === "associate");
for (const caller of [from, router.address]) {
  const simulation = await engine.simulate(associate.id, {}, { from: caller });
  const r = await fetch(NETWORKS.testnet.rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [
        {
          from: caller,
          to: token.address,
          data: encodeFunctionData({
            abi: [associate.fn],
            functionName: "associate",
          }),
        },
        "latest",
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });
  const raw = await r.json();
  assert.equal(
    decodeFunctionResult({
      abi: [associate.fn],
      functionName: "associate",
      data: raw.result,
    }).toString(),
    simulation.value,
  );
  association.push({ caller, value: simulation.value });
}
const main = bundledContracts().find((c) => c.id === "saucerswap-mainnet");
const factory = toolsFor(main).tools.find((t) => t.name === "factory");
const mainRead = await engine.call(factory.id, {});
assert.equal(mainRead.chainId, 295);
const quote = await engine.quote("testnet", "1", 50);
const evidence = {
  observedAt: new Date().toISOString(),
  network: "testnet",
  caller: from,
  revert: core.message,
  directRpcError: rpc.error.code,
  associationSimulations: association,
  mainnetRead: mainRead,
  quote,
  submitted: false,
};
await writeFile(
  "docs/evidence/network.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    ok: true,
    revert: core.message,
    association,
    mainnetFactory: mainRead.value,
  }),
);
