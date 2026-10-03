import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { streamText, isStepCount } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { Runtime, bundledContracts, toolsFor } from "@sh/core";
import { assistantTools } from "../packages/nextjs/lib/assistant-tools";
const engine = new Runtime();
const contract = bundledContracts().find((c) => c.id === "saucerswap-testnet")!;
const factory = toolsFor(contract).tools.find(
  (t) => t.signature === "factory()",
)!;
const execution = assistantTools(
  engine,
  contract,
  undefined,
  new AbortController().signal,
);
const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};
let step = 0;
const model = new MockLanguageModelV4({
  doStream: async () => {
    const first = step++ === 0;
    const parts: any[] = first
      ? [
          {
            type: "tool-call",
            toolCallId: "read-1",
            toolName: factory.id,
            input: JSON.stringify({ arguments: {} }),
          },
        ]
      : [
          { type: "text-start", id: "text-1" },
          { type: "text-delta", id: "text-1", delta: "Read completed." },
          { type: "text-end", id: "text-1" },
        ];
    return {
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "stream-start", warnings: [] });
          for (const part of parts) controller.enqueue(part);
          controller.enqueue({
            type: "finish",
            finishReason: {
              unified: first ? "tool-calls" : "stop",
              raw: undefined,
            },
            usage,
          });
          controller.close();
        },
      }),
    };
  },
});
const result = streamText({
  model,
  instructions: "Use only the selected contract tools.",
  messages: [{ role: "user", content: "Read the factory." }],
  tools: execution.tools,
  activeTools: execution.activeTools(),
  prepareStep: () => ({ activeTools: execution.activeTools() }),
  stopWhen: isStepCount(6),
});
const chunks = [];
for await (const chunk of result.fullStream) chunks.push(chunk);
const output = chunks.find((c: any) => c.type === "tool-result") as any;
assert.equal(output.output.ok, true);
const direct = await engine.call(factory.id, {});
assert.equal(output.output.data.value, direct.value);
assert.ok(
  chunks.some(
    (c: any) => c.type === "text-delta" && c.text === "Read completed.",
  ),
);
const invalid: any = await execution.tools.inspect.execute!(
  { toolId: "outside-selected-contract" },
  {} as any,
);
assert.equal(invalid.error.code, "NOT_FOUND");
const cancelled = new AbortController();
cancelled.abort();
const aborted = assistantTools(engine, contract, undefined, cancelled.signal);
const cancellation: any = await aborted.tools.catalog.execute!({}, {} as any);
assert.equal(cancellation.error.code, "CANCELLED");
const bounded = assistantTools(
  engine,
  contract,
  undefined,
  new AbortController().signal,
);
for (let i = 0; i < 6; i++) await bounded.tools.catalog.execute!({}, {} as any);
const budget: any = await bounded.tools.catalog.execute!({}, {} as any);
assert.equal(budget.error.code, "PRECONDITION");
const evidence = {
  observedAt: new Date().toISOString(),
  scope:
    "Official AI SDK 7 mock model stream with a live core RPC tool. No paid/provider inference claimed.",
  value: direct.value,
  checks: [
    "streamed tool call agrees with forms/CLI/MCP core",
    "stream continuation",
    "selected contract scope",
    "cancellation",
    "six-execution budget",
  ],
};
await writeFile(
  "docs/evidence/assistant.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(JSON.stringify(evidence));
