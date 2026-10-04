import assert from "node:assert/strict";
import { NextRequest } from "next/server";

// Exercise the actual chat route and installed OpenAI adapter without inference
// charges. Explicit fixture configuration prevents local credentials from use.
process.env.WORKBENCH_AI_PROVIDER = "openai";
process.env.WORKBENCH_AI_MODEL = "fixture-model";
process.env.OPENAI_API_KEY = "fixture-key-not-a-credential";
const { POST } = await import("../packages/nextjs/app/api/chat/route");
const realFetch = globalThis.fetch;
const realError = console.error;
let mode: "replay" | "failure" = "replay";
let requests = 0;
const providerErrors: unknown[] = [];
console.error = (error: unknown) => providerErrors.push(error);
const text = "Conversation recovered.";
const item = {
  id: "msg-fixture",
  type: "message",
  role: "assistant",
  status: "completed",
  content: [{ type: "output_text", text, annotations: [] }],
};
globalThis.fetch = (async (input, init) => {
  assert.equal(String(input), "https://api.openai.com/v1/responses");
  requests++;
  const payload = JSON.parse(String(init?.body));
  assert.equal(payload.store, false);
  assert.equal(payload.stream, true);
  assert.ok(!payload.input.some((part: any) => part.type === "item_reference"));
  assert.ok(
    payload.input.some(
      (part: any) =>
        part.role === "assistant" && part.content === "Partial reply",
    ),
  );
  assert.ok(
    !payload.input.some(
      (part: any) => part.call_id === "interrupted-tool-call",
    ),
    "An unfinished tool call must not become an unmatched model tool call",
  );
  assert.ok(
    payload.input.some(
      (part: any) =>
        part.type === "function_call" && part.call_id === "completed-catalog",
    ),
    "Completed tools remain in the conversation",
  );
  assert.ok(
    payload.input.some(
      (part: any) =>
        part.type === "function_call_output" &&
        part.call_id === "completed-catalog",
    ),
  );
  if (mode === "failure")
    return Response.json(
      {
        error: {
          message: "Private fixture diagnostic",
          type: "invalid_request_error",
          code: "invalid_api_key",
        },
      },
      { status: 401 },
    );
  const events = [
    {
      type: "response.output_item.added",
      output_index: 0,
      item: { ...item, status: "in_progress", content: [] },
    },
    {
      type: "response.output_text.delta",
      item_id: item.id,
      output_index: 0,
      content_index: 0,
      delta: text,
    },
    { type: "response.output_item.done", output_index: 0, item },
    {
      type: "response.completed",
      response: {
        id: "response-fixture",
        model: "fixture-model",
        created_at: 0,
        status: "completed",
        output: [item],
        usage: { input_tokens: 1, output_tokens: 1 },
      },
    },
  ];
  return new Response(
    events
      .map(
        (event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
      )
      .join(""),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}) as typeof fetch;
const history = [
  {
    id: "user-1",
    role: "user",
    parts: [{ type: "text", text: "Inspect the selected contract." }],
  },
  {
    id: "assistant-1",
    role: "assistant",
    parts: [
      { type: "step-start" },
      {
        type: "tool-catalog",
        toolCallId: "completed-catalog",
        state: "output-available",
        input: {},
        output: { schemaVersion: 1, ok: true, data: [] },
        callProviderMetadata: { openai: { itemId: "unavailable-tool-item" } },
        resultProviderMetadata: { openai: { itemId: "unavailable-tool-item" } },
      },
      { type: "step-start" },
      {
        type: "text",
        text: "Partial reply",
        state: "streaming",
        providerMetadata: { openai: { itemId: "unavailable-message-item" } },
      },
      {
        type: "tool-inspect",
        toolCallId: "interrupted-tool-call",
        state: "input-streaming",
      },
    ],
  },
  {
    id: "user-2",
    role: "user",
    parts: [{ type: "text", text: "Continue briefly." }],
  },
];
function request() {
  return new NextRequest("http://127.0.0.1:3000/api/chat", {
    method: "POST",
    headers: {
      host: "127.0.0.1:3000",
      origin: "http://127.0.0.1:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      contractId: "saucerswap-testnet",
      messages: history,
    }),
  });
}
try {
  const response = await POST(request());
  const stream = await response.text();
  assert.equal(response.status, 200);
  assert.ok(stream.includes(text));
  assert.ok(!stream.includes('"type":"error"'));
  assert.equal(requests, 1);
  mode = "failure";
  const failed = await POST(request());
  const errorStream = await failed.text();
  assert.ok(errorStream.includes('"type":"error"'));
  assert.ok(errorStream.includes("The provider request failed."));
  assert.ok(!errorStream.includes("Private fixture diagnostic"));
  assert.equal(requests, 2);
  assert.equal(providerErrors.length, 1);
  console.log(
    JSON.stringify({
      scope: "Actual chat route with controlled OpenAI HTTP; no live inference",
      checks: [
        "cancelled message replay uses content rather than stored item references",
        "unfinished tool calls are removed; completed calls and outputs remain",
        "provider failure returns a safe UI error without private diagnostic text",
      ],
    }),
  );
} finally {
  globalThis.fetch = realFetch;
  console.error = realError;
}
