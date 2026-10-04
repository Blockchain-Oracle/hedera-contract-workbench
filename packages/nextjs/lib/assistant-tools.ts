import { tool, jsonSchema, type ToolSet } from "ai";
import {
  toolsFor,
  inputSources,
  assert,
  errorEnvelope,
  type Runtime,
  type ContractRecord,
} from "@sh/core";
export function assistantTools(
  engine: Runtime,
  contract: ContractRecord,
  from: string | undefined,
  signal: AbortSignal,
) {
  const catalog = toolsFor(contract);
  const definitions = new Map(catalog.tools.map((t) => [t.id, t]));
  const active = new Set(catalog.tools.slice(0, 28).map((t) => t.id));
  const tools: ToolSet = {};
  let executions = 0;
  const bounded =
    (fn: (args: any) => Promise<unknown>) => async (args: any) => {
      try {
        assert(!signal.aborted, "CANCELLED", "Request cancelled.");
        assert(
          ++executions <= 6,
          "PRECONDITION",
          "Tool budget reached. Continue in a new message.",
        );
        return { schemaVersion: 1, ok: true, data: await fn(args) };
      } catch (error) {
        return errorEnvelope(error);
      }
    };
  tools.catalog = tool({
    description:
      "Discover available function signatures in this selected contract. Inspect a function before calling it.",
    inputSchema: jsonSchema({
      type: "object",
      properties: {},
      additionalProperties: false,
    }),
    execute: bounded(async () =>
      catalog.tools.map((t) => ({
        id: t.id,
        signature: t.signature,
        action: t.action,
      })),
    ),
  });
  tools.inspect = tool({
    description:
      "Inspect an argument schema and activate that function for subsequent calls.",
    inputSchema: jsonSchema({
      type: "object",
      properties: { toolId: { type: "string" } },
      required: ["toolId"],
      additionalProperties: false,
    }),
    execute: bounded(async (args) => {
      const definition = definitions.get(args.toolId);
      assert(
        definition,
        "NOT_FOUND",
        "Function is outside the selected contract.",
      );
      if (active.size >= 28) active.delete(active.values().next().value!);
      active.add(definition.id);
      return {
        ...definition,
        inputSources: inputSources(definition, catalog.tools),
      };
    }),
  });
  tools.simulate = tool({
    description:
      "Simulate a selected-contract function for the connected caller without preparing a transaction.",
    inputSchema: jsonSchema({
      type: "object",
      properties: {
        toolId: { type: "string" },
        arguments: { type: "object" },
        valueHbar: { type: "string" },
      },
      required: ["toolId", "arguments"],
      additionalProperties: false,
    }),
    execute: bounded(async (args) => {
      const definition = definitions.get(args.toolId);
      assert(
        definition,
        "NOT_FOUND",
        "Function is outside the selected contract.",
      );
      return engine.simulate(definition.id, args.arguments, {
        from: from!,
        revision: definition.revision,
        signal,
        valueHbar: args.valueHbar ?? "0",
      });
    }),
  });
  tools.receipt = tool({
    description:
      "Check an actual transaction receipt on the selected contract's network. Never resend uncertain transactions.",
    inputSchema: jsonSchema({
      type: "object",
      properties: { hash: { type: "string", pattern: "^0x[0-9a-fA-F]{64}$" } },
      required: ["hash"],
      additionalProperties: false,
    }),
    execute: bounded((args) =>
      engine.status(contract.network, args.hash, signal),
    ),
  });
  for (const definition of catalog.tools) {
    tools[definition.id] = tool({
      description: `${definition.signature} on ${contract.network}. ${definition.action === "read" ? "Read actual on-chain output." : "Simulate and prepare an unsigned wallet review. Never submit."}`,
      inputSchema: jsonSchema({
        type: "object",
        properties: {
          arguments: definition.inputSchema,
          ...(definition.action === "read"
            ? {
                from: {
                  type: "string",
                  pattern: "^0x[0-9a-fA-F]{40}$",
                  description:
                    "Optional explicit caller for an intentionally caller-scoped read. Omit for ordinary reads, even with a connected wallet.",
                },
              }
            : {}),
          ...(definition.mutability === "payable"
            ? {
                valueHbar: {
                  type: "string",
                  description: "Native HBAR amount, max 8 decimal places.",
                },
              }
            : {}),
        },
        required: ["arguments"],
        additionalProperties: false,
      }),
      execute: bounded((args) =>
        definition.action === "read"
          ? engine.call(definition.id, args.arguments, {
              from: args.from,
              revision: definition.revision,
              signal,
            })
          : engine.prepare(definition.id, args.arguments, {
              from: from!,
              revision: definition.revision,
              signal,
              valueHbar: args.valueHbar ?? "0",
            }),
      ),
    });
  }
  return {
    tools,
    activeTools: () => ["catalog", "inspect", "simulate", "receipt", ...active],
  };
}
