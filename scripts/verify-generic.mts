import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { NextRequest } from "next/server";
import {
  Runtime,
  WorkbenchError,
  toolsFor,
  type ContractRecord,
} from "@sh/core";
import { assistantTools } from "../packages/nextjs/lib/assistant-tools";
import { chatModel } from "../packages/nextjs/lib/ai-provider";
import { generateText, isStepCount } from "ai";
const workspace = process.cwd(),
  root = await mkdtemp(join(tmpdir(), "workbench-generic-"));
const require = createRequire(join(workspace, "packages/hardhat/package.json"));
const { JsonRpcProvider, ContractFactory } = require("ethers"),
  solc = require("solc");
const source = await readFile(
  "packages/hardhat/test/fixtures/GenericContracts.sol",
  "utf8",
);
const compiled = JSON.parse(
  solc.compile(
    JSON.stringify({
      language: "Solidity",
      sources: { "Fixtures.sol": { content: source } },
      settings: {
        evmVersion: "paris",
        outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
      },
    }),
  ),
);
assert.ok(
  !compiled.errors?.some((e: any) => e.severity === "error"),
  JSON.stringify(compiled.errors),
);
let node: ReturnType<typeof spawn> | undefined,
  provider: any,
  transport: StdioClientTransport | undefined;
const checks: string[] = [];
const preload = join(root, "metadata.mjs"),
  cliPath = join(workspace, "packages/cli/dist/index.js");
async function run(argv: string[], input?: unknown) {
  const child = spawn(argv[0], argv.slice(1), { cwd: root, stdio: "pipe" });
  let out = "",
    err = "";
  child.stdout.on("data", (v) => (out += v));
  child.stderr.on("data", (v) => (err += v));
  child.stdin.end(input === undefined ? undefined : JSON.stringify(input));
  const timer = setTimeout(() => child.kill("SIGKILL"), 45000);
  const status = await new Promise((r, reject) => {
    child.once("error", reject);
    child.once("close", r);
  }).finally(() => clearTimeout(timer));
  assert.equal(status, 0, `${argv.join(" ")}: ${out} ${err}`);
  assert.equal(
    out.trim().split("\n").length,
    1,
    "Single machine envelope required",
  );
  const envelope = JSON.parse(out);
  assert.equal(envelope.ok, true, out);
  return envelope.data;
}
const cli = (args: string[], input?: unknown) =>
  run(
    [process.execPath, "--import", preload, cliPath, ...args, "--json"],
    input,
  );
try {
  const reservation = createServer();
  await new Promise<void>((r) => reservation.listen(0, "127.0.0.1", r));
  const port = (reservation.address() as any).port;
  await new Promise<void>((r) => reservation.close(() => r()));
  const url = `http://127.0.0.1:${port}`;
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
  const timeout = AbortSignal.timeout(30000);
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
      if ((await r.json()).result === "0x128") break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  provider = new JsonRpcProvider(url);
  const signer = await provider.getSigner(0),
    from = await signer.getAddress(),
    other = await (await provider.getSigner(1)).getAddress();
  await writeFile(
    join(root, "workbench.config.json"),
    JSON.stringify({ rpc: { testnet: url }, contracts: [] }),
  );
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      scripts: { workbench: `node ${JSON.stringify(cliPath)}` },
    }),
  );
  await cp(
    "skills/hedera-contract-workbench",
    join(root, "skills/hedera-contract-workbench"),
    { recursive: true },
  );
  const skillBefore = await readFile(
    join(root, "skills/hedera-contract-workbench/SKILL.md"),
    "utf8",
  );
  await writeFile(
    preload,
    `const original = fetch; globalThis.fetch = (input, init) => { const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url); return url.hostname.endsWith('mirrornode.hedera.com') || url.hostname === 'sourcify.dev' ? Promise.resolve(new Response('{}', { status: 404 })) : original(input, init); };`,
  );
  const engine = new Runtime(root);
  engine.fetchJson = async () => {
    throw new WorkbenchError("NOT_FOUND", "No fixture metadata");
  };
  const records: ContractRecord[] = [],
    deployments: any[] = [];
  for (const name of [
    "GovernanceFixture",
    "CollectibleFixture",
    "RouteFixture",
  ]) {
    const artifact = compiled.contracts["Fixtures.sol"][name];
    const contract = await new ContractFactory(
      artifact.abi,
      artifact.evm.bytecode.object,
      signer,
    ).deploy();
    await contract.waitForDeployment();
    deployments.push(contract);
    const artifactPath = join(root, `${name}.json`);
    await writeFile(artifactPath, JSON.stringify(artifact.abi));
    const imported = await cli([
      "contracts",
      "import",
      "--address",
      await contract.getAddress(),
      "--network",
      "testnet",
      "--abi",
      artifactPath,
      "--name",
      name,
    ]);
    records.push(await engine.contract(imported.id));
  }
  const installer = await cli([
    "skills",
    "install-command",
    "--agent",
    "codex",
    "claude-code",
  ]);
  assert.ok(installer.argv.includes("skills@1.7.0"));
  assert.ok(installer.argv.includes("claude-code"));
  const markdown = spawnSync(
    process.execPath,
    [cliPath, "skills", "show", "--contract", records[0].id, "--markdown"],
    { cwd: root, encoding: "utf8", timeout: 15000 },
  );
  assert.equal(markdown.status, 0);
  assert.equal(markdown.stdout, skillBefore);
  const conflict = spawnSync(
    process.execPath,
    [
      cliPath,
      "skills",
      "show",
      "--contract",
      records[0].id,
      "--markdown",
      "--json",
    ],
    { cwd: root, encoding: "utf8", timeout: 15000 },
  );
  assert.equal(conflict.status, 2);
  assert.equal(JSON.parse(conflict.stdout).error.code, "INPUT");
  checks.push(
    "CLI skill show/export/install-command, raw Markdown and conflicting machine/document flags exercised as real subprocesses",
  );
  const resumed = await new Runtime(root).store.contracts();
  assert.ok(
    records.every((record) =>
      resumed.some((c) => c.id === record.id && c.revision === record.revision),
    ),
  );
  transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", preload, join(workspace, "packages/mcp/dist/index.js")],
    cwd: root,
    stderr: "pipe",
  });
  const client = new Client({
    name: "generic-contract-verification",
    version: "0.1.0",
  });
  await client.connect(transport);
  const advertised = (await client.listTools()).tools;
  (globalThis as any).workbenchRuntime = engine;
  const { GET, POST } = await import(
    "../packages/nextjs/app/api/workbench/[...path]/route"
  );
  const fixtures = [
    {
      index: 0,
      signature: "getDaoInfo()",
      args: {},
      expected: {
        name: "Workbench fixture",
        admin: from,
        logoUrl: "",
        infoUrl: "",
        description: "Original acceptance fixture",
        webLinks: ["https://example.com"],
      },
    },
    {
      index: 1,
      signature: "ownerOf(uint256)",
      args: { id: "9007199254740993" },
      expected: from,
    },
    {
      index: 2,
      signature: "quote((address,uint128,bytes32)[])",
      args: {
        legs: [
          {
            asset: from,
            amount: "9007199254740993",
            route: `0x${"ab".repeat(32)}`,
          },
        ],
      },
      expected: [{ output: "18014398509481986", ready: true }],
    },
  ];
  for (const fixture of fixtures) {
    const record = records[fixture.index],
      tool = toolsFor(record).tools.find(
        (t) => t.signature === fixture.signature,
      )!;
    assert.ok(advertised.some((t) => t.name === tool.id));
    const core = await engine.call(tool.id, fixture.args, { from });
    assert.deepEqual(core.value, fixture.expected);
    const httpRead = await POST(
      new NextRequest(`http://127.0.0.1/api/workbench/tools/${tool.id}/call`, {
        method: "POST",
        headers: { host: "127.0.0.1", "Content-Type": "application/json" },
        body: JSON.stringify({
          arguments: fixture.args,
          revision: record.revision,
          from,
        }),
      }),
      { params: Promise.resolve({ path: ["tools", tool.id, "call"] }) },
    );
    assert.deepEqual((await httpRead.json()).data.value, core.value);
    assert.deepEqual(
      (
        await cli(
          ["tools", "call", tool.id, "--from", from, "--args-file", "-"],
          fixture.args,
        )
      ).value,
      core.value,
    );
    const mcp = await client.callTool({
      name: tool.id,
      arguments: { arguments: fixture.args, revision: record.revision, from },
    });
    assert.deepEqual((mcp.structuredContent as any).data.value, core.value);
    const execution = assistantTools(
      engine,
      record,
      from,
      new AbortController().signal,
    );
    const assistant = (await execution.tools[tool.id].execute!(
      { arguments: fixture.args },
      {} as any,
    )) as any;
    assert.deepEqual(assistant.data.value, core.value);
    const outside = (await execution.tools.inspect.execute!(
      { toolId: toolsFor(records[(fixture.index + 1) % 3]).tools[0].id },
      {} as any,
    )) as any;
    assert.equal(outside.error.code, "NOT_FOUND");
    const context = await cli(["skills", "show", "--contract", record.id]);
    assert.equal(context.contract.revision, record.revision);
    assert.equal(context.tools.length, toolsFor(record).tools.length);
    const response = await GET(
      new NextRequest(
        `http://127.0.0.1/api/workbench/skills?contract=${record.id}`,
        { headers: { host: "127.0.0.1" } },
      ),
      { params: Promise.resolve({ path: ["skills"] }) },
    );
    const http = (await response.json()).data;
    assert.deepEqual(http.tools, context.tools);
    assert.equal(http.markdown, skillBefore);
    const exported = await cli(["skills", "export", "--contract", record.id]);
    assert.ok(exported.files.includes("catalog.json"));
    const exportedContext = JSON.parse(
      await readFile(join(exported.directory, "catalog.json"), "utf8"),
    );
    const command = exportedContext.tools.find((t: any) => t.id === tool.id)
      .commands.execute.argv;
    const argsFile = join(
      exported.directory,
      exportedContext.tools.find((t: any) => t.id === tool.id).argumentsFile,
    );
    await writeFile(argsFile, JSON.stringify(fixture.args));
    command[command.indexOf("--args-file") + 1] = argsFile;
    assert.deepEqual((await run(command)).value, core.value);
    checks.push(
      `${record.name}: actual RPC read agrees across core, CLI, MCP, assistant and exported command; HTTP skills match canonical catalog`,
    );
  }
  const nft = records[1],
    transferTools = toolsFor(nft).tools.filter(
      (t) => t.name === "safeTransferFrom",
    );
  assert.equal(transferTools.length, 2);
  // Real installed provider adapters parse their own wire format and execute a
  // core read on the deployed EVM fixture. HTTP inference is a controlled fixture.
  for (const providerName of ["openai", "anthropic", "gemini"]) {
    let requests = 0;
    const selected = records[0],
      definition = toolsFor(selected).tools.find(
        (t) => t.name === "getDaoInfo",
      )!;
    const model = chatModel(
      {
        provider: providerName,
        model: providerName === "gemini" ? "gemini-3.8-flash" : "fixture-model",
        key: "fixture-key-not-a-credential",
      },
      {
        fetch: (async (_input, init) => {
          const first = requests++ === 0;
          if (providerName === "gemini" && !first) {
            const request = JSON.parse(String(init?.body));
            assert.ok(
              request.contents.some((content: any) =>
                content.parts.some(
                  (part: any) =>
                    part.thoughtSignature === "Zml4dHVyZS1zaWduYXR1cmU=",
                ),
              ),
              "Gemini continuation must preserve the function call's thought signature",
            );
          }
          const payload =
            providerName === "openai"
              ? {
                  id: "response-fixture",
                  created_at: 0,
                  model: "fixture-model",
                  status: "completed",
                  output: first
                    ? [
                        {
                          type: "function_call",
                          id: "function-fixture",
                          call_id: "call-fixture",
                          name: definition.id,
                          arguments: '{"arguments":{}}',
                        },
                      ]
                    : [
                        {
                          type: "message",
                          id: "message-fixture",
                          role: "assistant",
                          status: "completed",
                          content: [
                            {
                              type: "output_text",
                              text: "Read complete.",
                              annotations: [],
                            },
                          ],
                        },
                      ],
                  usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
                }
              : providerName === "anthropic"
                ? {
                    id: "message-fixture",
                    type: "message",
                    role: "assistant",
                    model: "fixture-model",
                    content: first
                      ? [
                          {
                            type: "tool_use",
                            id: "call-fixture",
                            name: definition.id,
                            input: { arguments: {} },
                          },
                        ]
                      : [{ type: "text", text: "Read complete." }],
                    stop_reason: first ? "tool_use" : "end_turn",
                    usage: { input_tokens: 1, output_tokens: 1 },
                  }
                : {
                    candidates: [
                      {
                        content: {
                          role: "model",
                          parts: first
                            ? [
                                {
                                  functionCall: {
                                    name: definition.id,
                                    args: { arguments: {} },
                                  },
                                  thoughtSignature: "Zml4dHVyZS1zaWduYXR1cmU=",
                                },
                              ]
                            : [{ text: "Read complete." }],
                        },
                        finishReason: "STOP",
                      },
                    ],
                    usageMetadata: {
                      promptTokenCount: 1,
                      candidatesTokenCount: 1,
                      totalTokenCount: 2,
                    },
                  };
          return Response.json(payload);
        }) as typeof fetch,
      },
    );
    const execution = assistantTools(
      engine,
      selected,
      from,
      new AbortController().signal,
    );
    const response = await generateText({
      model,
      maxOutputTokens: 256,
      messages: [
        { role: "user", content: "Read the selected contract's DAO info." },
      ],
      tools: execution.tools,
      stopWhen: isStepCount(2),
    });
    assert.equal(requests, 2);
    assert.equal(response.text, "Read complete.");
    assert.deepEqual(
      (response.steps[0].toolResults[0].output as any).data.value,
      fixtures[0].expected,
    );
    checks.push(
      `${providerName}: actual SDK adapter parses tool request and result, runs real core RPC read, and continues; provider HTTP is mocked`,
    );
  }
  for (const tool of transferTools) {
    const args = {
      from,
      to: other,
      id: "9007199254740993",
      ...(tool.parameters.some((p) => p.type === "bytes")
        ? { arg3: "0x1234" }
        : {}),
    };
    // The unnamed bytes parameter makes every key positional, as recorded by the catalog.
    const positional = tool.parameters.map((p, i) => [
      p.key,
      [from, other, "9007199254740993", "0x1234"][i],
    ]);
    const input =
      tool.parameters[0].key === "arg0" ? Object.fromEntries(positional) : args;
    const core = await engine.prepare(tool.id, input, { from });
    assert.equal(
      core.data,
      deployments[1].interface.encodeFunctionData(tool.signature, [
        from,
        other,
        "9007199254740993",
        ...(tool.parameters.length === 4 ? ["0x1234"] : []),
      ]),
    );
    const prepared = await cli(
      ["tools", "prepare", tool.id, "--from", from, "--args-file", "-"],
      input,
    );
    assert.equal(prepared.data, core.data);
    const mcp = await client.callTool({
      name: tool.id,
      arguments: { arguments: input, revision: nft.revision, from },
    });
    assert.equal((mcp.structuredContent as any).data.data, core.data);
    await assert.rejects(
      engine.prepare(tool.id, input, { from: other }),
      (e: any) => e.code === "REVERT" && e.message.includes("IncorrectOwner"),
    );
  }
  const governance = records[0];
  const propose = toolsFor(governance).tools.find((t) => t.name === "propose")!;
  const proposalArgs = {
    proposal: {
      targets: [from, other],
      values: ["9007199254740993", "0"],
      calldatas: ["0x1234", "0x"],
      description: "Fixture proposal",
    },
  };
  const proposed = await engine.prepare(propose.id, proposalArgs, { from });
  assert.equal(proposed.valueWeibar, "0");
  assert.equal(
    proposed.data,
    deployments[0].interface.encodeFunctionData("propose", [
      proposalArgs.proposal,
    ]),
  );
  assert.equal(
    (
      await cli(
        ["tools", "prepare", propose.id, "--from", from, "--args-file", "-"],
        proposalArgs,
      )
    ).data,
    proposed.data,
  );
  const proposedMcp = await client.callTool({
    name: propose.id,
    arguments: { arguments: proposalArgs, revision: governance.revision, from },
  });
  assert.equal((proposedMcp.structuredContent as any).data.data, proposed.data);
  const proposedAssistant = (await assistantTools(
    engine,
    governance,
    from,
    new AbortController().signal,
  ).tools[propose.id].execute!({ arguments: proposalArgs }, {} as any)) as any;
  assert.equal(proposedAssistant.data.data, proposed.data);
  const vote = toolsFor(governance).tools.find((t) => t.name === "castVote")!;
  await assert.rejects(
    engine.simulate(vote.id, { arg0: "1", arg1: "3" }, { from }),
    (e: any) => e.code === "REVERT" && e.message.includes("InvalidVote"),
  );
  await assert.rejects(
    engine.simulate(vote.id, { arg0: "1", arg1: "256" }, { from }),
    (e: any) => e.code === "INPUT",
  );
  const route = records[2],
    deposit = toolsFor(route).tools.find((t) => t.name === "deposit")!;
  const native = await engine.prepare(
    deposit.id,
    { receiver: from },
    { from, valueHbar: "1.00000001" },
  );
  assert.equal(native.valueWeibar, "1000000010000000000");
  await assert.rejects(
    engine.call(toolsFor(nft).tools.find((t) => t.name === "ownerOf")!.id, {
      id: 9007199254740993,
    } as any),
    (e: any) => e.code === "INPUT",
  );
  assert.equal(
    await readFile(
      join(root, "skills/hedera-contract-workbench/SKILL.md"),
      "utf8",
    ),
    skillBefore,
  );
  checks.push(
    "Overloaded NFT preparations agree across adapters; wrong owner reverts",
    "Nested proposal preparation; uint8 bound and custom error; native payable precision",
    "Same portable skill bytes across every ABI; imports persist after restart; cross-contract assistant calls rejected",
  );
  const evidence = {
    observedAt: new Date().toISOString(),
    scope:
      "Three original Solidity fixtures deployed on isolated local EVM. No Hedera submissions; no contract-category routing or extra per-contract skills.",
    checks,
  };
  await writeFile(
    "docs/evidence/generic-contracts.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence));
} finally {
  await transport?.close();
  provider?.destroy();
  if (node?.pid) {
    if (process.platform !== "win32") {
      try {
        process.kill(-node.pid, "SIGTERM");
      } catch {}
    } else node.kill("SIGTERM");
  }
  await rm(root, { recursive: true, force: true });
}
