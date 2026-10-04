#!/usr/bin/env node
import { Command } from "commander";
import * as prompts from "@clack/prompts";
import pc from "picocolors";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  Runtime,
  toolsFor,
  networkName,
  errorEnvelope,
  exitCode,
  WorkbenchError,
  DEFAULTS,
  type Json,
  type Network,
} from "@sh/core";

const program = new Command()
  .name("workbench")
  .description("Connect a Hedera contract. Explore its real tools.")
  .version("0.1.0")
  .option("--json", "Emit one JSON envelope for automation")
  .option("--no-color", "Disable terminal colors");
program.exitOverride();
const machine = process.argv.includes("--json");
const interactive = !!process.stdin.isTTY && !!process.stdout.isTTY && !machine;
let runtime: Runtime;
function app() {
  runtime ??= new Runtime();
  return runtime;
}
function finish(data: unknown) {
  if (machine) {
    process.stdout.write(
      JSON.stringify({ schemaVersion: 1, ok: true, data }) + "\n",
    );
    return;
  }
  if (Array.isArray(data)) {
    for (const row of data as any[]) {
      console.log(
        `${pc.bold(row.signature ?? row.name ?? row.id)}  ${pc.dim(row.action ?? row.network ?? "")}`,
      );
      console.log(
        `  ${pc.cyan(row.id ?? "")}${row.address ? ` · ${row.address}` : ""}`,
      );
    }
    return;
  }
  const value = data as any;
  if (value?.checks) {
    console.log(pc.bold("\nContract Workbench"));
    for (const check of value.checks)
      console.log(
        `${check.ok ? pc.green("✓") : pc.yellow("!")} ${check.name}: ${check.message}`,
      );
    console.log(pc.dim(value.assistant.message));
    return;
  }
  if (value?.reviewUrl) {
    console.log(pc.green(`\nPrepared ${value.signature}`));
    console.log(`${value.network} · ${value.from} → ${value.to}`);
    console.log(`Expires ${value.expiresAt}\n${pc.cyan(value.reviewUrl)}`);
    console.log(
      pc.dim(
        "Open the workbench and review this exact transaction with your wallet. Nothing has been submitted.",
      ),
    );
    return;
  }
  if (value?.observedAt && value?.signature) {
    console.log(pc.green(`\n✓ ${value.signature}`));
    console.log(pc.dim(`${value.network} · ${value.address}`));
    if (value.caller) console.log(`Caller: ${value.caller}`);
    console.log(JSON.stringify(value.value, null, 2));
    if (value.gasEstimate)
      console.log(`Gas estimate: ${value.gasEstimate} gas`);
    if (value.gasEstimateError)
      console.log(
        pc.yellow(`Gas estimate unavailable: ${value.gasEstimateError}`),
      );
    console.log(pc.dim(`Observed ${value.observedAt}`));
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}
async function busy<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const spin = interactive ? prompts.spinner({ output: process.stderr }) : null;
  spin?.start(label);
  try {
    const result = await fn();
    spin?.stop("Ready");
    return result;
  } catch (e) {
    spin?.stop("Could not complete");
    throw e;
  }
}
function selected(value?: string): Promise<Network> {
  return value
    ? Promise.resolve(networkName(value))
    : app()
        .store.settings()
        .then((s) => s.network);
}
async function argumentsFile(file: string): Promise<Record<string, Json>> {
  const text =
    file === "-"
      ? await new Promise<string>((resolve, reject) => {
          let text = "";
          process.stdin.setEncoding("utf8");
          process.stdin.on("data", (chunk) => {
            text += chunk;
            if (Buffer.byteLength(text) > DEFAULTS.maxAbiBytes) {
              process.stdin.pause();
              reject(new WorkbenchError("INPUT", "Input exceeds 1 MiB."));
            }
          });
          process.stdin.on("end", () => resolve(text));
          process.stdin.on("error", reject);
        })
      : await readFile(file, "utf8");
  if (Buffer.byteLength(text) > DEFAULTS.maxAbiBytes)
    throw new WorkbenchError("INPUT", "Input exceeds 1 MiB.");
  try {
    return JSON.parse(text);
  } catch {
    throw new WorkbenchError("INPUT", "Argument file must contain valid JSON.");
  }
}
function promptValue<T>(value: T | symbol): T {
  if (prompts.isCancel(value))
    throw new WorkbenchError("CANCELLED", "Cancelled.");
  return value as T;
}
program
  .command("doctor")
  .option("--network <network>")
  .action(async (opts) => {
    const data = await busy("Checking workspace and endpoint", () =>
      app().doctor(opts.network ? networkName(opts.network) : undefined),
    );
    finish(data);
    if (!data.ready) process.exitCode = 3;
  });
const contracts = program
  .command("contracts")
  .description("Manage imported contracts");
contracts
  .command("list")
  .action(async () =>
    finish(
      (await app().store.contracts()).map(({ abi: _abi, ...record }) => record),
    ),
  );
contracts.command("inspect <id>").action(async (id) => {
  const contract = await app().contract(id);
  finish({ ...contract, catalog: toolsFor(contract) });
});
contracts
  .command("import")
  .option("--network <network>")
  .option("--address <address>")
  .option("--name <name>")
  .option("--abi <file>")
  .action(async (opts) => {
    let network = opts.network,
      address = opts.address;
    if (interactive) {
      prompts.intro(pc.cyan("Connect a deployed contract"));
      network ??= promptValue(
        await prompts.select({
          message: "Where is the contract deployed?",
          options: [
            { value: "testnet", label: "Hedera testnet", hint: "test funds" },
            { value: "mainnet", label: "Hedera mainnet", hint: "real network" },
          ],
        }),
      );
      address ??= promptValue(
        await prompts.text({
          message: "Contract EVM address or 0.0.x ID",
          validate: (value) => (value ? undefined : "Enter an address."),
        }),
      );
    }
    if (!address)
      throw new WorkbenchError(
        "INPUT",
        "Use --address; noninteractive commands never prompt.",
      );
    const abi = opts.abi ? await argumentsFile(opts.abi) : undefined;
    const result = await busy("Resolving contract and interface", () =>
      app().importContract({
        address,
        network: network ? networkName(network) : "testnet",
        name: opts.name,
        abi,
      }),
    );
    finish({ ...result, catalog: toolsFor(result) });
    if (interactive)
      prompts.outro(
        `Next: npm run --silent workbench -- tools list --contract ${result.id}`,
      );
  });
contracts
  .command("refresh <id>")
  .action(async (id) =>
    finish(
      await busy("Refreshing verified interface", () =>
        app().refreshContract(id),
      ),
    ),
  );
contracts
  .command("remove <id>")
  .option("--yes", "Remove without a prompt")
  .option("--revision <revision>", "Require the revision previously inspected")
  .action(async (id, opts) => {
    const contract = await app().contract(id);
    if (!opts.yes) {
      if (!interactive)
        throw new WorkbenchError(
          "INPUT",
          "Use --yes to remove a contract noninteractively.",
        );
      if (
        !promptValue(
          await prompts.confirm({
            message: "Remove this contract from the local catalog?",
          }),
        )
      )
        throw new WorkbenchError("CANCELLED", "Cancelled.");
    }
    await app().store.removeContract(
      contract.id,
      opts.revision ?? contract.revision,
    );
    finish({ removed: contract.id });
  });
const tools = program
  .command("tools")
  .description("Discover schemas and execute validated actions");
tools
  .command("list")
  .requiredOption("--contract <id>")
  .action(async (opts) =>
    finish(toolsFor(await app().contract(opts.contract)).tools),
  );
tools
  .command("inspect <id>")
  .action(async (id) => finish(await app().inspectTool(id)));
tools
  .command("call <id>")
  .requiredOption("--args-file <file>", "JSON file, or - for stdin")
  .option("--from <address>")
  .option("--revision <revision>")
  .action(async (id, opts) => {
    const args = await argumentsFile(opts.argsFile);
    finish(
      await busy("Reading contract", () =>
        app().call(id, args, { from: opts.from, revision: opts.revision }),
      ),
    );
  });
for (const action of ["simulate", "prepare"] as const) {
  tools
    .command(`${action} <id>`)
    .requiredOption("--args-file <file>")
    .requiredOption("--from <address>")
    .option(
      "--value-hbar <amount>",
      "Native HBAR value, with at most 8 decimal places",
      "0",
    )
    .option("--revision <revision>")
    .action(async (id, opts) => {
      const args = await argumentsFile(opts.argsFile);
      finish(
        await busy<unknown>(
          action === "prepare"
            ? "Preparing an unsigned transaction"
            : "Simulating with the intended caller",
          () =>
            app()[action](id, args, {
              from: opts.from,
              valueHbar: opts.valueHbar,
              revision: opts.revision,
            }),
        ),
      );
    });
}
program
  .command("transactions")
  .command("status")
  .requiredOption("--hash <hash>")
  .option("--network <network>")
  .action(async (opts) =>
    finish(await app().status(await selected(opts.network), opts.hash)),
  );
program
  .command("mcp")
  .command("config")
  .action(() =>
    finish({
      mcpServers: {
        "hedera-workbench": {
          command: process.execPath,
          args: [join(app().store.root, "packages/mcp/dist/index.js")],
          cwd: app().store.root,
        },
      },
    }),
  );
try {
  await program.parseAsync();
} catch (error) {
  const code = (error as any).code;
  if (
    ["commander.helpDisplayed", "commander.version", "commander.help"].includes(
      code,
    )
  )
    process.exitCode = 0;
  else {
    const e = String(code).startsWith("commander.")
      ? new WorkbenchError("INPUT", (error as Error).message)
      : error;
    if (machine) console.log(JSON.stringify(errorEnvelope(e)));
    else
      console.error(
        pc.red(errorEnvelope(e).error.message),
        errorEnvelope(e).error.nextAction ?? "",
      );
    process.exitCode = code === "CANCELLED" ? 130 : exitCode(e);
  }
}
