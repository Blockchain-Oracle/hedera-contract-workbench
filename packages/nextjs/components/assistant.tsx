"use client";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useAccount } from "wagmi";
import {
  ArrowUp,
  Square,
  Sparkles,
  Loader2,
  ArrowUpRight,
  LockKeyhole,
} from "lucide-react";
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
  const suggestions = [
    "What can I do with this contract?",
    ...contract.abi
      .filter(
        (item) =>
          item.type === "function" &&
          (item.stateMutability === "view" ||
            item.stateMutability === "pure") &&
          !item.inputs.length,
      )
      .slice(0, 1)
      .map(
        (item) =>
          `Read ${"name" in item ? item.name : "this function"} from this contract`,
      ),
    "Explain the arguments for a write function",
  ];
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  if (!enabled)
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-3">
          <h2 className="text-[30px] font-semibold leading-[1.14] tracking-[-0.75px]">
            A little help with your contract
          </h2>
          <p className="text-sm text-muted-foreground">
            Ask questions, read functions, and prepare a wallet review.
          </p>
        </div>
        <section className="space-y-6 rounded-[32px] border border-border/70 bg-card p-6 sm:p-8">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Sparkles className="size-6" />
          </span>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">
              Add your model to get started
            </h3>
            <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
              Chat needs a provider and an explicit model. You can already use
              every supported function, the CLI, and MCP.
            </p>
          </div>
          <div className="space-y-3 rounded-2xl bg-muted p-5">
            <p className="text-sm font-medium">
              1. Configure your local provider
            </p>
            <p className="text-xs text-muted-foreground">
              packages/nextjs/.env.local
            </p>
            <pre className="overflow-x-auto text-xs leading-6">{`WORKBENCH_AI_PROVIDER=openai
WORKBENCH_AI_MODEL=your-model-id
OPENAI_API_KEY=your-provider-key
# Or anthropic + ANTHROPIC_API_KEY
# Or gemini + GEMINI_API_KEY`}</pre>
          </div>
          <p className="text-sm">
            <span className="font-medium">2. Restart the app</span>
            <span className="ml-2 text-muted-foreground">
              Your assistant will appear here.
            </span>
          </p>
          <div className="flex items-start gap-2 border-t border-border/70 pt-4 text-xs leading-relaxed text-muted-foreground">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" />
            Credentials stay on your local server. Every transaction still needs
            your wallet approval.
          </div>
        </section>
      </div>
    );
  const busy = status === "submitted" || status === "streaming";
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="text-[30px] font-semibold leading-[1.14] tracking-[-0.75px]">
          Let’s work through it
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {contract.name} · {contract.network}. Uses the same typed tools as the
          forms and CLI.
        </p>
      </div>
      <div
        role="log"
        aria-label="Conversation"
        className="min-h-64 max-h-[55vh] space-y-6 overflow-y-auto rounded-[32px] border border-border/70 bg-card p-5 sm:p-7"
      >
        {!messages.length && (
          <div className="flex min-h-60 flex-col justify-center gap-5 py-5">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h3 className="text-xl font-semibold">
                What would you like to explore?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Connected to {contract.name}. Start with a question or a live
                read.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  className="h-auto max-w-full justify-between gap-3 whitespace-normal py-2.5 text-left text-sm"
                  onClick={() => setInput(suggestion)}
                >
                  {suggestion}
                  <ArrowUpRight className="size-4 shrink-0" />
                </Button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`space-y-3 rounded-2xl p-4 ${message.role === "user" ? "ml-6 bg-muted sm:ml-16" : "mr-2 sm:mr-8"}`}
          >
            <p className="text-xs font-medium text-muted-foreground">
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
                        className="space-y-3 rounded-2xl bg-muted p-4 text-sm"
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
                      className="rounded-2xl bg-muted p-4 text-xs"
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
                  <p
                    key={index}
                    role="status"
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                    Inspecting or executing a typed tool…
                  </p>
                );
              }
              return null;
            })}
          </div>
        ))}
        {status === "submitted" && (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            Waiting for your model…
          </p>
        )}
        <div ref={bottom} />
      </div>
      <ErrorNotice error={error} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() && !busy) {
            void sendMessage({ text: input });
            setInput("");
          }
        }}
        className="rounded-[24px] border border-border/70 bg-card p-3"
      >
        <Textarea
          aria-label="Message to the assistant"
          placeholder="Ask a question or request a typed operation…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          className="min-h-20 border-0 bg-transparent px-2 shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing &&
              !busy &&
              input.trim()
            ) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="flex items-center justify-between gap-3 px-2 pb-1">
          <p className="text-xs text-muted-foreground">
            Writes always need your wallet approval.
          </p>
          {busy ? (
            <Button type="button" variant="outline" onClick={() => stop()}>
              <Square className="size-3" />
              Stop
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              disabled={!input.trim()}
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
