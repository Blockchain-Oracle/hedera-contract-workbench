import assert from "node:assert/strict";
import { mkdtemp, writeFile, cp, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NextRequest } from "next/server";
import { Runtime, toolsFor } from "@sh/core";
import {
  checkOrigin,
  checkDemoOperation,
  isHostedDemo,
} from "../packages/nextjs/lib/hosting";

const env = {
  VERCEL: "1",
  VERCEL_URL: "preview.example.vercel.app",
  VERCEL_PROJECT_PRODUCTION_URL: "workbench.example.vercel.app",
};
assert(isHostedDemo(env));
assert(isHostedDemo({ WORKBENCH_HOSTED_DEMO: "1" }));
assert(!isHostedDemo({}));
for (const host of [env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL])
  checkOrigin("https:", host, `https://${host}`, "same-origin", env);
for (const [host, origin, site] of [
  ["attacker.vercel.app", "https://attacker.vercel.app", "same-origin"],
  ["workbench.example.vercel.app.attacker.test", null, null],
  [env.VERCEL_PROJECT_PRODUCTION_URL, "https://attacker.test", "same-origin"],
  [
    env.VERCEL_PROJECT_PRODUCTION_URL,
    `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`,
    "cross-site",
  ],
  [
    env.VERCEL_PROJECT_PRODUCTION_URL,
    `http://${env.VERCEL_PROJECT_PRODUCTION_URL}`,
    "same-origin",
  ],
] as const)
  assert.throws(() => checkOrigin("https:", host, origin, site, env));
checkOrigin(
  "http:",
  "127.0.0.1:3000",
  "http://127.0.0.1:3000",
  "same-origin",
  {},
);
checkDemoOperation("POST", ["tools", "id", "prepare"], false);

const root = await mkdtemp(join(tmpdir(), "workbench-hosting-"));
const priorMode = process.env.WORKBENCH_HOSTED_DEMO;
let reads = 0,
  simulations = 0,
  mutations = 0;
try {
  await writeFile(join(root, "workbench.config.json"), "{}");
  await cp("skills", join(root, "skills"), { recursive: true });
  const engine = new Runtime(root);
  engine.call = async () => {
    reads++;
    return { result: "actual-dispatcher" } as any;
  };
  engine.simulate = async () => {
    simulations++;
    return { simulation: true } as any;
  };
  engine.prepare =
    engine.importContract =
    engine.refreshContract =
      (async () => {
        mutations++;
        throw new Error("A hosted mutation reached core");
      }) as any;
  (globalThis as any).workbenchRuntime = engine;
  process.env.WORKBENCH_HOSTED_DEMO = "1";
  const route = await import(
    "../packages/nextjs/app/api/workbench/[...path]/route"
  );
  const request = (pathname: string, method = "GET") =>
    new NextRequest(`http://127.0.0.1:3000/api/workbench/${pathname}`, {
      method,
      headers: { host: "127.0.0.1:3000", "content-type": "application/json" },
      ...(method === "POST" ? { body: JSON.stringify({ arguments: {} }) } : {}),
    });
  const context = (pathname: string) => ({
    params: Promise.resolve({ path: pathname.split("/") }),
  });
  const before = await readdir(root);
  for (const [method, pathname] of [
    ["POST", "contracts"],
    ["POST", "contracts/id/refresh"],
    ["DELETE", "contracts/id"],
    ["POST", "tools/id/prepare"],
    ["POST", "plans/validate"],
    ["GET", "plans/id"],
    ["POST", "transactions"],
    ["GET", "transactions/hash"],
    ["POST", "swap/prepare"],
    ["POST", "swap/associate"],
    ["POST", "tools/id/call/extra"],
  ]) {
    const response = await (
      method === "GET"
        ? route.GET
        : method === "DELETE"
          ? route.DELETE
          : route.POST
    )(request(pathname, method), context(pathname));
    assert.equal(response.status, 400, `${method} ${pathname}`);
    assert.equal((await response.json()).error.code, "PRECONDITION");
  }
  const state = await (
    await route.GET(request("state"), context("state"))
  ).json();
  assert(state.ok && state.data.hostedDemo && !state.data.assistant);
  assert.equal(state.data.contracts.length, 4);
  assert.deepEqual(state.data.transactions, []);
  const contract = state.data.contracts[0];
  const catalog = await (
    await route.GET(
      request(`contracts/${contract.id}`),
      context(`contracts/${contract.id}`),
    )
  ).json();
  const tool = toolsFor(await engine.contract(contract.id)).tools[0];
  assert.equal(catalog.data.tools[0].id, tool.id);
  for (const action of ["call", "simulate"]) {
    const response = await route.POST(
      request(`tools/${tool.id}/${action}`, "POST"),
      context(`tools/${tool.id}/${action}`),
    );
    assert((await response.json()).ok);
  }
  assert.equal(reads, 1);
  assert.equal(simulations, 1);
  assert.equal(mutations, 0);
  const skill = await (
    await route.GET(
      request(`skills?contract=${contract.id}`),
      context("skills"),
    )
  ).json();
  assert(skill.ok);
  assert.equal(skill.data.workspace, ".");
  assert(!JSON.stringify(skill.data).includes(root));
  assert(!skill.data.commands.doctor.argv.includes("--prefix"));
  assert(
    skill.data.skill.install.every((command: any) =>
      command.argv.includes("Blockchain-Oracle/hedera-contract-workbench"),
    ),
  );
  const markdown = await route.GET(
    request(`skills/markdown?contract=${contract.id}`),
    context("skills/markdown"),
  );
  assert.equal(await markdown.text(), skill.data.markdown);
  const chat = await import("../packages/nextjs/app/api/chat/route");
  const rejected = await chat.POST(request("chat", "POST"));
  assert.equal((await rejected.json()).error.code, "PRECONDITION");
  assert.deepEqual(await readdir(root), before);
  console.log(
    "Hosting acceptance passed: exact origins, catalog/read/simulation dispatch, skill portability, chat and eleven persistence operations rejected without filesystem mutations; local operations remain enabled.",
  );
} finally {
  if (priorMode === undefined) delete process.env.WORKBENCH_HOSTED_DEMO;
  else process.env.WORKBENCH_HOSTED_DEMO = priorMode;
  await rm(root, { recursive: true, force: true });
}
