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
  Braces,
  FileCheck,
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
    `What can I do with ${contract.name}?`,
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
    "Which getters can help me find valid arguments?",
  ];
  useEffect(() => {
    if (messages.length) bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  const busy = status === "submitted" || status === "streaming";
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-xl border border-border bg-card ${embedded ? "" : "mx-auto max-w-4xl"}`}
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
        className={`${embedded ? "min-h-52 max-h-80" : "min-h-72 max-h-[52vh]"} space-y-6 overflow-y-auto overscroll-contain p-5 sm:p-6`}
      >
        {!messages.length && (
          <div className="flex min-h-48 flex-col justify-center">
            <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
              <Braces className="size-4" /> Scoped to {contract.name}
            </div>
            <h3
              className={`${embedded ? "text-xl" : "text-2xl"} font-semibold tracking-tight`}
            >
              {enabled
                ? "Start with a question about this contract."
                : "Add your model when you’re ready."}
            </h3>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
              {enabled
                ? "Explore the ABI, read live state, or prepare a transaction. Tool results appear here with their network and execution context."
                : "Functions, terminal commands and MCP already work. Chat uses an optional provider configured on your local server."}
            </p>
            <div className="mt-6 divide-y divide-border border-y border-border">
              {suggestions.slice(0, embedded ? 2 : 3).map((suggestion) => (
                <button
                  key={suggestion}
                  disabled={!enabled}
                  className="flex min-h-11 w-full items-center justify-between gap-4 py-3 text-left text-sm hover:text-primary disabled:opacity-50"
                  onClick={() => setInput(suggestion)}
                >
                  <span>{suggestion}</span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <FileCheck className="size-3.5 shrink-0" /> Your wallet approves
              every transaction.
            </p>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`space-y-3 rounded-lg p-4 ${message.role === "user" ? "ml-6 bg-muted sm:ml-16" : "mr-2 sm:mr-8"}`}
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
                        className="space-y-3 rounded-lg bg-muted p-4 text-sm"
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
                      className="rounded-lg bg-muted p-4 text-xs"
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
        className="mx-4 mb-4 rounded-lg border border-input bg-background p-3 sm:mx-5 sm:mb-5"
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
          className="min-h-16 rounded-md border-0 bg-transparent px-2 text-sm shadow-none"
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
