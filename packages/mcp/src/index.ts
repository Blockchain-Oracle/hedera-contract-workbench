#!/usr/bin/env node
import { watch } from "node:fs";
import {
  McpServer,
  fromJsonSchema,
  type ServerContext,
} from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import {
  Runtime,
  toolsFor,
  networkName,
  errorEnvelope,
  type ToolDefinition,
} from "@sh/core";

const runtime = new Runtime();
serveStdio(async () => {
  const server = new McpServer(
    { name: "hedera-contract-workbench", version: "0.1.0" },
    { capabilities: { tools: { listChanged: true } } },
  );
  const registered = new Map<string, { revision: string; handle: any }>();
  const result = (data: unknown) => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ schemaVersion: 1, ok: true, data }),
      },
    ],
    structuredContent: { schemaVersion: 1, ok: true, data },
  });
  const wrap =
    (fn: (args: any, signal?: AbortSignal) => Promise<unknown>) =>
    async (args: any, context: ServerContext) => {
      try {
        return result(await fn(args, context.mcpReq.signal));
      } catch (error) {
        const envelope = errorEnvelope(error);
        return {
          isError: true,
          content: [{ type: "text" as const, text: JSON.stringify(envelope) }],
          structuredContent: envelope,
        };
      }
    };
  server.registerTool(
    "contracts_list",
    {
      description:
        "Discover imported contracts and their network, address, and revision.",
      inputSchema: fromJsonSchema({
        type: "object",
        properties: {},
        additionalProperties: false,
      }),
    },
    wrap(async () =>
      (await runtime.store.contracts()).map(
        ({ abi: _abi, ...record }) => record,
      ),
    ),
  );
  server.registerTool(
    "contracts_import",
    {
      description:
        "Import an already deployed Hedera EVM contract. Supply ABI JSON if verification is unavailable.",
      inputSchema: fromJsonSchema({
        type: "object",
        properties: {
          network: { type: "string", enum: ["testnet", "mainnet"] },
          address: { type: "string" },
          name: { type: "string" },
          abi: {},
        },
        required: ["network", "address"],
        additionalProperties: false,
      }),
    },
    wrap(async (args) => {
      const record = await runtime.importContract({
        ...args,
        network: networkName(args.network),
      });
      await sync();
      return { record, catalog: toolsFor(record) };
    }),
  );
  server.registerTool(
    "tools_inspect",
    {
      description:
        "Inspect current argument/output schemas and context before calling a contract tool.",
      inputSchema: fromJsonSchema({
        type: "object",
        properties: { toolId: { type: "string" } },
        required: ["toolId"],
        additionalProperties: false,
      }),
    },
    wrap((args) => runtime.inspectTool(args.toolId)),
  );
  server.registerTool(
    "tools_simulate",
    {
      description:
        "Simulate a current contract tool for an explicit caller without preparing or submitting a transaction.",
      inputSchema: fromJsonSchema({
        type: "object",
        properties: {
          toolId: { type: "string" },
          arguments: { type: "object" },
          revision: { type: "string" },
          from: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" },
          valueHbar: { type: "string" },
        },
        required: ["toolId", "arguments", "revision", "from"],
        additionalProperties: false,
      }),
    },
    wrap((args, signal) =>
      runtime.simulate(args.toolId, args.arguments, { ...args, signal }),
    ),
  );
  server.registerTool(
    "transactions_status",
    {
      description:
        "Read the actual receipt for a transaction hash on its network. Never resubmit an uncertain transaction.",
      inputSchema: fromJsonSchema({
        type: "object",
        properties: {
          network: { type: "string", enum: ["testnet", "mainnet"] },
          hash: { type: "string", pattern: "^0x[0-9a-fA-F]{64}$" },
        },
        required: ["network", "hash"],
        additionalProperties: false,
      }),
    },
    wrap((args, signal) =>
      runtime.status(networkName(args.network), args.hash, signal),
    ),
  );
  let synchronizing: Promise<void> | null = null;
  async function sync() {
    if (synchronizing) return synchronizing;
    synchronizing = (async () => {
      const contracts = await runtime.store.contracts(),
        wanted = new Set<string>();
      for (const contract of contracts)
        for (const tool of toolsFor(contract).tools) {
          wanted.add(tool.id);
          const revision = `${tool.revision}:${contract.name}`;
          if (registered.get(tool.id)?.revision === revision) continue;
          registered.get(tool.id)?.handle.remove();
          const properties: Record<string, any> = {
            arguments: tool.inputSchema,
            revision: { type: "string", const: tool.revision },
            from: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" },
          };
          if (tool.mutability === "payable")
            properties.valueHbar = {
              type: "string",
              pattern: "^(0|[1-9][0-9]*)(\\.[0-9]{1,8})?$",
            };
          const inputSchema = fromJsonSchema({
            type: "object",
            properties,
            required: [
              "arguments",
              "revision",
              ...(tool.action === "prepare" ? ["from"] : []),
            ],
            additionalProperties: false,
          });
          const handle = server.registerTool(
            tool.id,
            {
              title: `${contract.name}: ${tool.signature}`,
              description: `${contract.network}, ${contract.address}. ${tool.action === "read" ? "Read actual contract output." : "Prepare and simulate an unsigned transaction; the user signs in their browser wallet."}`,
              inputSchema,
              annotations: {
                readOnlyHint: tool.action === "read",
                destructiveHint: false,
                openWorldHint: true,
              },
            },
            wrap((args: any, signal) => invoke(tool, { ...args, signal })),
          );
          registered.set(tool.id, { revision, handle });
        }
      for (const [id, registeredTool] of registered)
        if (!wanted.has(id)) {
          registeredTool.handle.remove();
          registered.delete(id);
        }
    })();
    try {
      await synchronizing;
    } finally {
      synchronizing = null;
    }
  }
  async function invoke(tool: ToolDefinition, args: any) {
    return tool.action === "read"
      ? runtime.call(tool.id, args.arguments, args)
      : runtime.prepare(tool.id, args.arguments, args);
  }
  await sync();
  const watcher = watch(runtime.store.root, (_event, file) => {
    if (String(file).startsWith("workbench.config"))
      void sync().catch((error) =>
        process.stderr.write(`${errorEnvelope(error).error.message}\n`),
      );
  });
  process.stdin.once("end", () => watcher.close());
  process.once("SIGTERM", () => {
    watcher.close();
    process.exit(0);
  });
  return server;
});
