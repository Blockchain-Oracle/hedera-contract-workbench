import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, cp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseAbi } from "viem";
import {
  Runtime,
  bundledContracts,
  hashAbi,
  toolsFor,
  agentContext,
  exportSkill,
  shellCommand,
  skillInstallCommand,
  validateArguments,
} from "../src/index.js";

test("one agent context handles nested proposals and NFT overloads without categories", async () => {
  const root = await mkdtemp(join(tmpdir(), "workbench-agent-"));
  try {
    await writeFile(join(root, "workbench.config.json"), '{"contracts":[]}');
    await cp(
      fileURLToPath(
        new URL("../../../skills/hedera-contract-workbench", import.meta.url),
      ),
      join(root, "skills/hedera-contract-workbench"),
      { recursive: true },
    );
    const engine = new Runtime(root),
      base = bundledContracts()[0];
    const abis = [
      parseAbi([
        "function propose((address[] targets,uint256[] values,bytes[] calldatas,string description) proposal) returns(uint256)",
        "function state(uint256 proposalId) view returns(uint8)",
      ]),
      parseAbi([
        "function ownerOf(uint256 tokenId) view returns(address)",
        "function safeTransferFrom(address from,address to,uint256 tokenId)",
        "function safeTransferFrom(address from,address to,uint256 tokenId,bytes data)",
      ]),
    ];
    for (let i = 0; i < abis.length; i++) {
      const record = {
        ...base,
        id: `fixture-${i}`,
        address: `0x${String(i + 1).padStart(40, "0")}` as `0x${string}`,
        abi: abis[i],
        abiHash: hashAbi(abis[i]),
        revision: `fixture-${i}`,
      };
      await engine.store.saveContract(record);
      const context = await agentContext(engine, record.id);
      assert.equal(context.tools.length, abis[i].length);
      for (const tool of context.tools) {
        validateArguments(
          toolsFor(record).tools.find((t) => t.id === tool.id)!.parameters,
          tool.template,
        );
        assert.ok(tool.commands.execute.argv.includes(record.revision));
      }
      const destination = join(root, `export-${i}`);
      await exportSkill(engine, record.id, destination);
      assert.ok(
        (await readFile(join(destination, "SKILL.md"), "utf8")).includes(
          "rather than guessing",
        ),
      );
      assert.equal(
        JSON.parse(await readFile(join(destination, "catalog.json"), "utf8"))
          .contract.id,
        record.id,
      );
      await assert.rejects(
        exportSkill(engine, record.id, destination),
        (e: any) => e.code === "PRECONDITION",
      );
      assert.equal(
        JSON.parse(await readFile(join(destination, "catalog.json"), "utf8"))
          .contract.id,
        record.id,
      );
    }
    assert.equal(
      new Set((await agentContext(engine, "fixture-1")).tools.map((t) => t.id))
        .size,
      3,
    );
    assert.throws(() => skillInstallCommand(root, ["codex; rm"]));
    const largeAbi = parseAbi([
      "function large(uint256[1024][1024][1024] values) view returns(uint256)",
    ]);
    await engine.store.saveContract({
      ...base,
      id: "large-shape",
      abi: largeAbi,
      revision: "large-shape",
    });
    const large = await agentContext(engine, "large-shape");
    assert.equal(large.tools.length, 1);
    assert.equal(large.tools[0].templateAvailable, false);
    assert.match(large.tools[0].templateError!, /4096-node/);
    assert.equal(
      shellCommand(["a'b", "$(do-not-run)"]),
      "'a'\\''b' '$(do-not-run)'",
    );
    if (process.platform !== "win32") {
      const values = [
        "a'b",
        "a path with spaces",
        "$(printf unsafe)",
        "`printf unsafe`",
        "semi;colon",
      ];
      const command = shellCommand([
        process.execPath,
        "-e",
        "process.stdout.write(JSON.stringify(process.argv.slice(1)))",
        "--",
        ...values,
      ]);
      const shell = spawnSync("/bin/sh", ["-c", command], { encoding: "utf8" });
      assert.equal(shell.status, 0, shell.stderr);
      assert.deepEqual(JSON.parse(shell.stdout), values);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
