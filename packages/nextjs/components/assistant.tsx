"use client";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useAccount } from "wagmi";
import { Send, Square, Sparkles } from "lucide-react";
import type { ContractRecord, TransactionPlan } from "@sh/core";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNotice, PlanCard, ResultCard } from "./result";
export function Assistant({
  contract,
  enabled,
  onReview,
}: {
  contract: ContractRecord;
  enabled: boolean;
  onReview: (p: TransactionPlan) => void;
}) {
  const { address } = useAccount();
  const [input, setInput] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const caller = useRef(address);
  caller.current = address;
  const { messages, sendMessage, stop, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ contractId: contract.id, from: caller.current }),
    }),
  });
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  if (!enabled)
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-xl border bg-card p-6">
        <Sparkles className="size-6 text-primary" />
        <h2 className="text-lg font-semibold">
          Add an assistant when you’re ready
        </h2>
        <p className="text-sm text-muted-foreground">
          The workbench already works through its forms, CLI, and MCP. Chat
          needs an optional provider and an explicit model.
        </p>
        <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">{`# packages/nextjs/.env.local\nWORKBENCH_AI_PROVIDER=openai\nWORKBENCH_AI_MODEL=your-model-id\nOPENAI_API_KEY=your-provider-key\n# Or anthropic + ANTHROPIC_API_KEY`}</pre>
        <p className="text-xs text-muted-foreground">
          Credentials stay on the server. Restart the local app after
          configuring them.
        </p>
      </div>
    );
  const busy = status === "submitted" || status === "streaming";
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h2 className="font-semibold">Ask about this contract</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {contract.name} · {contract.network}. Uses the same typed tools as the
          forms and CLI.
        </p>
      </div>
      <div
        role="log"
        aria-label="Conversation"
        className="max-h-[55vh] space-y-4 overflow-y-auto rounded-xl border bg-card p-5"
      >
        {!messages.length && (
          <p className="text-sm text-muted-foreground">
            Try “Read the router’s factory address” or ask which arguments a
            function needs.
          </p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {message.role === "user" ? "You" : "Assistant"}
            </p>
            {message.parts.map((part, index) => {
              if (part.type === "text")
                return (
                  <p
                    key={index}
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                  >
                    {part.text}
                  </p>
                );
              const toolPart = part as any;
              if (
                part.type.startsWith("tool-") ||
                part.type === "dynamic-tool"
              ) {
                if (toolPart.state === "output-available") {
                  const output = toolPart.output;
                  if (output?.ok === false)
                    return <ErrorNotice key={index} error={output.error} />;
                  if (output?.data?.digest && output.data.data)
                    return (
                      <PlanCard
                        key={index}
                        plan={output.data}
                        onReview={onReview}
                      />
                    );
                  if (output?.data?.hash && output.data.state)
                    return (
                      <div
                        key={index}
                        className="space-y-2 rounded-lg border p-4 text-sm"
                      >
                        <p className="font-medium capitalize">
                          {output.data.state} · {output.data.network}
                        </p>
                        <a
                          className="break-all font-mono text-xs text-primary underline"
                          href={output.data.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {output.data.hash}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          Mirror indexing: {output.data.indexing}. An uncertain
                          receipt never triggers resubmission.
                        </p>
                      </div>
                    );
                  if (output?.data?.observedAt)
                    return <ResultCard key={index} result={output.data} />;
                  return (
                    <details
                      key={index}
                      className="rounded-lg border p-3 text-xs"
                    >
                      <summary>Tool result</summary>
                      <pre className="mt-2 overflow-x-auto">
                        {JSON.stringify(output, null, 2)}
                      </pre>
                    </details>
                  );
                }
                if (toolPart.state === "output-error")
                  return (
                    <ErrorNotice
                      key={index}
                      error={new Error(toolPart.errorText)}
                    />
                  );
                return (
                  <p key={index} className="text-xs text-muted-foreground">
                    Inspecting or executing typed tool…
                  </p>
                );
              }
              return null;
            })}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <ErrorNotice error={error} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            void sendMessage({ text: input });
            setInput("");
          }
        }}
        className="space-y-3"
      >
        <Textarea
          aria-label="Message to the assistant"
          placeholder="Ask a question or request a typed operation…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          className="min-h-24"
        />
        <div className="flex justify-between">
          <p className="text-xs text-muted-foreground">
            Writes always need your wallet approval.
          </p>
          {busy ? (
            <Button type="button" variant="outline" onClick={() => stop()}>
              <Square className="size-3" />
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()}>
              <Send className="size-4" />
              Send
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
