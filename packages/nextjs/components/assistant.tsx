"use client";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useAccount } from "wagmi";
import {
  ArrowUp,
  Square,
  Loader2,
  ArrowUpRight,
  MessageCircle,
} from "lucide-react";
import type { ContractRecord, TransactionPlan } from "@sh/core";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProviderSetup } from "./provider-setup";
import { ErrorNotice, PlanCard, ResultCard } from "./result";
export function Assistant({
  contract,
  enabled,
  onReview,
  embedded = false,
}: {
  contract: ContractRecord;
  enabled: boolean;
  embedded?: boolean;
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
    "Explain a function’s arguments",
  ];
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  const busy = status === "submitted" || status === "streaming";
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-3xl border border-border bg-card ${embedded ? "" : "mx-auto max-w-4xl"}`}
      aria-label="Contract assistant"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <MessageCircle className="size-5 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Contract assistant</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {contract.name} · {contract.network}
            </p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            className={`size-1.5 rounded-full ${enabled ? "bg-primary" : "bg-foreground/30"}`}
          />
          {enabled ? "Ready" : "Optional"}
        </span>
      </header>
      <div
        role="log"
        aria-label="Conversation"
        className={`${embedded ? "min-h-52 max-h-80" : "min-h-80 max-h-[55vh]"} space-y-6 overflow-y-auto overscroll-contain p-5 sm:p-6`}
      >
        {!messages.length && (
          <div className="flex min-h-40 flex-col justify-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Start with your contract
            </p>
            <h3
              className={`${embedded ? "text-2xl" : "text-3xl"} font-semibold tracking-tight`}
            >
              What would you like to know?
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Explore its functions, inspect arguments, or prepare a transaction
              to review in your wallet.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {suggestions.slice(0, embedded ? 2 : 3).map((suggestion) => (
                <button
                  key={suggestion}
                  disabled={!enabled}
                  className="flex max-w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                  onClick={() => setInput(suggestion)}
                >
                  <span>{suggestion}</span>
                  <ArrowUpRight className="size-3.5 shrink-0" />
                </button>
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
          if (enabled && input.trim() && !busy) {
            void sendMessage({ text: input });
            setInput("");
          }
        }}
        className="mx-4 mb-4 rounded-[16px] border border-input bg-muted/30 p-3 sm:mx-5 sm:mb-5"
      >
        <Textarea
          aria-label="Message to the assistant"
          placeholder={
            enabled
              ? "Ask about this contract…"
              : "Configure a model to start chatting"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!enabled || busy}
          className="min-h-20 border-0 bg-transparent px-2 shadow-none "
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
          <div className="min-w-0 text-xs text-muted-foreground">
            {enabled ? (
              "Wallet approval for every transaction"
            ) : (
              <ProviderSetup />
            )}
          </div>
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
              disabled={!enabled || !input.trim()}
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
