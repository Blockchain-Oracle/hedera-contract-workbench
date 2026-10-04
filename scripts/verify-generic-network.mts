import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, rm, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPublicClient, http, parseAbi } from "viem";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { Runtime, toolsFor, knownTokenAddress, agentContext } from "@sh/core";
import { assistantTools } from "../packages/nextjs/lib/assistant-tools";
const root = await mkdtemp(join(tmpdir(), "workbench-nft-live-")),
  workspace = process.cwd();
let transport: StdioClientTransport | undefined;
const abi = parseAbi([
  "function name() view returns(string)",
  "function symbol() view returns(string)",
  "function totalSupply() view returns(uint256)",
  "function ownerOf(uint256 tokenId) view returns(address)",
  "function safeTransferFrom(address from,address to,uint256 tokenId)",
  "function safeTransferFrom(address from,address to,uint256 tokenId,bytes data)",
]);
try {
  await writeFile(join(root, "workbench.config.json"), "{}");
  await cp(
    "skills/hedera-contract-workbench",
    join(root, "skills/hedera-contract-workbench"),
    { recursive: true },
  );
  const engine = new Runtime(root),
    direct = createPublicClient({
      transport: http("https://testnet.hashio.io/api", {
        timeout: 15000,
        retryCount: 0,
      }),
    });
  const tokenId = "0.0.10853272",
    metadataUrl = `https://testnet.mirrornode.hedera.com/api/v1/tokens/${tokenId}`;
  const metadataResponse = await fetch(metadataUrl, {
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(metadataResponse.status, 200);
  const metadata = await metadataResponse.json();
  assert.equal(metadata.type, "NON_FUNGIBLE_UNIQUE");
  assert.equal(metadata.deleted, false);
  const nfts = await fetch(`${metadataUrl}/nfts?limit=1`, {
    signal: AbortSignal.timeout(15000),
  }).then((r) => r.json());
  assert.ok(nfts.nfts?.length);
  const address = knownTokenAddress(tokenId);
  const contract = await engine.importContract({
    network: "testnet",
    address,
    abi,
    name: "Live NFT acceptance example",
  });
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(workspace, "packages/mcp/dist/index.js")],
    cwd: root,
    stderr: "pipe",
  });
  const client = new Client({
    name: "live-nft-verification",
    version: "0.1.0",
  });
  await client.connect(transport);
  const checks = [];
  for (const name of ["name", "symbol", "totalSupply", "ownerOf"]) {
    const tool = toolsFor(contract).tools.find((t) => t.name === name)!;
    const args =
      name === "ownerOf" ? { tokenId: String(nfts.nfts[0].serial_number) } : {};
    const value = await direct.readContract({
      address,
      abi,
      functionName: name,
      args: name === "ownerOf" ? [BigInt(args.tokenId!)] : [],
    } as any);
    const expected = typeof value === "bigint" ? value.toString() : value;
    const core = await engine.call(tool.id, args);
    assert.equal(core.value, expected);
    if (name === "name") assert.equal(core.value, metadata.name);
    if (name === "symbol") assert.equal(core.value, metadata.symbol);
    if (name === "totalSupply") assert.equal(core.value, metadata.total_supply);
    const cli = spawnSync(
      process.execPath,
      [
        join(workspace, "packages/cli/dist/index.js"),
        "tools",
        "call",
        tool.id,
        "--args-file",
        "-",
        "--json",
      ],
      {
        cwd: root,
        input: JSON.stringify(args),
        encoding: "utf8",
        timeout: 45000,
      },
    );
    assert.equal(cli.status, 0, cli.stdout + cli.stderr);
    assert.equal(JSON.parse(cli.stdout).data.value, expected);
    const mcp = await client.callTool({
      name: tool.id,
      arguments: { arguments: args, revision: tool.revision },
    });
    assert.equal((mcp.structuredContent as any).data.value, expected);
    const execution = assistantTools(
      engine,
      contract,
      undefined,
      new AbortController().signal,
    );
    const assistant = (await execution.tools[tool.id].execute!(
      { arguments: args },
      {} as any,
    )) as any;
    assert.equal(assistant.data.value, expected);
    checks.push({
      signature: tool.signature,
      arguments: args,
      value: expected,
      interfaces: ["direct RPC", "core", "CLI", "MCP", "assistant tools"],
    });
  }
  const context = await agentContext(engine, contract.id);
  assert.equal(
    context.tools.filter((t) => t.signature.startsWith("safeTransferFrom"))
      .length,
    2,
  );
  const daoSource =
    "https://github.com/hashgraph/hedera-accelerator-defi-dex/tree/d813159078be7d84b4c408b153a585348f0f82c2";
  const staleDaoChecks = [];
  for (const [label, address, signature] of [
    [
      "FTDAO factory",
      "0x0000000000000000000000000000000000581ec6",
      "function getDAOs() view returns(address[])",
    ],
    [
      "MultisigDAO",
      "0x0000000000000000000000000000000000572acc",
      "function getDaoInfo() view returns((string name,address admin,string logoUrl,string infoUrl,string description,string[] webLinks))",
    ],
    [
      "Governor",
      "0x00000000000000000000000000000000003961bc",
      "function name() view returns(string)",
    ],
  ]) {
    try {
      const code = await direct.getCode({ address: address as `0x${string}` });
      if (!code || code === "0x")
        staleDaoChecks.push({
          label,
          address,
          verified: false,
          reason: "No current EVM code",
        });
      else {
        const currentAbi = parseAbi([signature]);
        const value = await direct.readContract({
          address: address as `0x${string}`,
          abi: currentAbi,
          functionName: currentAbi[0].name,
        } as any);
        staleDaoChecks.push({ label, address, verified: true, value });
      }
    } catch (e: any) {
      staleDaoChecks.push({
        label,
        address,
        verified: false,
        reason: e.shortMessage ?? "RPC failure",
      });
    }
  }
  const evidence = {
    observedAt: new Date().toISOString(),
    scope:
      "Live public Hedera testnet NFT facade import and read parity. No wallet/provider inference or Hedera submissions.",
    tokenId,
    address,
    metadataUrl,
    abiProvenance:
      "Authored ERC-721 read/overload interface subset; actual HTS facade methods validated on RPC. Full ERC-721/HTS implementation compliance is not claimed.",
    checks,
    daoSource,
    staleDaoChecks,
  };
  await writeFile(
    "docs/examples/erc721-read.abi.json",
    JSON.stringify(abi, null, 2) + "\n",
  );
  await writeFile(
    "docs/evidence/generic-network.json",
    JSON.stringify(
      evidence,
      (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      ok: true,
      tokenId,
      readCount: checks.length,
      staleDaoChecks,
    }),
  );
} finally {
  await transport?.close();
  await rm(root, { recursive: true, force: true });
}
