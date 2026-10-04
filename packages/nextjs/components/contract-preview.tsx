"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Blocks,
  Braces,
  Loader2,
  Play,
  Terminal,
} from "lucide-react";
import type { ContractRecord, ExecutionResult, ToolDefinition } from "@sh/core";
import { api } from "@/lib/api";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Picker } from "./picker";
import { CopyButton, ErrorNotice, ResultCard } from "./result";

/** A live catalog preview, not a separate execution engine. No automatic RPC. */
export function ContractPreview({
  contract,
  tools,
  contracts,
  select,
}: {
  contract: ContractRecord;
  tools: ToolDefinition[];
  contracts: ContractRecord[];
  select: (id: string) => void;
}) {
  const [toolId, setToolId] = useState(
    tools.find((t) => t.action === "read" && t.parameters.length === 0)?.id ??
      tools[0]?.id ??
      "",
  );
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const tool = tools.find((t) => t.id === toolId);
  const context = `&contract=${encodeURIComponent(contract.id)}`;
  const open = `/workbench?view=functions${context}${tool ? `&tool=${encodeURIComponent(tool.id)}` : ""}`;
  const inspect = tool
    ? `npm run --silent workbench -- tools inspect ${tool.id} --json`
    : `npm run --silent workbench -- tools list --contract ${contract.id} --json`;
  const canRead = tool?.action === "read" && tool.parameters.length === 0;

  async function read() {
    if (!tool || !canRead) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const response = await api<ExecutionResult>(
        `tools/${encodeURIComponent(tool.id)}/call`,
        { arguments: {}, revision: tool.revision },
        "POST",
        controller.signal,
      );
      if (!controller.signal.aborted) setResult(response);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure);
    } finally {
      if (request.current === controller) setPending(false);
    }
  }

  return (
    <section
      className="wb-preview min-w-0 overflow-hidden"
      aria-label="Live contract preview"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <span className="flex items-center gap-2 text-xs font-medium">
          <Blocks className="size-4" /> Live workspace
        </span>
        <span className="text-xs text-muted-foreground">
          Hedera {contract.network} · {tools.length} functions
        </span>
      </div>
      <div className="grid md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-border bg-background/40 p-4 md:border-b-0 md:border-r">
          <p className="mb-2 text-xs text-muted-foreground">Contract</p>
          <Picker
            label="Preview contract"
            value={contract.id}
            options={contracts.map((c) => ({
              value: c.id,
              label: c.name,
              description: `Hedera ${c.network}`,
            }))}
            onChange={select}
          />
          <code className="mt-3 block truncate text-[11px] text-muted-foreground">
            {contract.hederaId || contract.address}
          </code>
          <div className="mt-6 hidden md:block">
            <p className="mb-2 px-2 text-xs text-muted-foreground">Functions</p>
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {tools.map((candidate) => (
                <button
                  key={candidate.id}
                  aria-current={toolId === candidate.id ? "true" : undefined}
                  onClick={() => {
                    request.current?.abort();
                    setPending(false);
                    setResult(null);
                    setError(null);
                    setToolId(candidate.id);
                  }}
                  className="wb-function-item block w-full rounded-md px-2 py-2 text-left text-xs hover:bg-muted"
                >
                  <span className="block truncate font-medium">
                    {candidate.signature.split("(")[0]}
                  </span>
                  <span className="mt-1 block truncate font-mono text-[10px] text-muted-foreground">
                    {candidate.signature.slice(
                      candidate.signature.indexOf("("),
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
        <Tabs defaultValue="browser" className="min-w-0 gap-0">
          <TabsList
            variant="line"
            className="mx-4 mt-2"
            aria-label="Contract interfaces"
          >
            <TabsTrigger value="browser" className="text-xs">
              <Blocks /> Browser
            </TabsTrigger>
            <TabsTrigger value="cli" className="text-xs">
              <Terminal /> CLI
            </TabsTrigger>
            <TabsTrigger value="agent" className="text-xs">
              <Braces /> Agent
            </TabsTrigger>
          </TabsList>
          <TabsContent value="browser" className="min-h-64 p-4 sm:p-6">
            {tool ? (
              <>
                <div className="md:hidden">
                  <Picker
                    label="Preview function"
                    value={toolId}
                    onChange={(id) => {
                      request.current?.abort();
                      setPending(false);
                      setResult(null);
                      setError(null);
                      setToolId(id);
                    }}
                    options={tools.map((t) => ({
                      value: t.id,
                      label: t.signature,
                    }))}
                    className="font-mono text-xs"
                  />
                </div>
                <h2 className="mb-5 hidden break-all font-mono text-lg md:block">
                  {tool.signature}
                </h2>
                <div className="mt-4 grid items-start gap-6 lg:grid-cols-2 md:mt-0">
                  <div className="space-y-5">
                    <div>
                      <p className="mb-2 text-xs font-medium">Arguments</p>
                      <p className="break-all font-mono text-xs text-muted-foreground">
                        {tool.parameters.map((p) => p.type).join(", ") ||
                          "No arguments needed"}
                      </p>
                    </div>
                    {canRead ? (
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() => void read()}
                      >
                        {pending ? (
                          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                        ) : (
                          <Play className="size-4" />
                        )}
                        {pending ? "Reading…" : "Run a live read"}
                      </Button>
                    ) : (
                      <Button size="sm" asChild>
                        <Link href={open}>
                          Enter arguments <ArrowUpRight />
                        </Link>
                      </Button>
                    )}
                    <p className="max-w-xs text-xs leading-5 text-muted-foreground">
                      {canRead
                        ? "A real network call. No wallet or model key needed."
                        : "Typed inputs and wallet review are available in the full workspace."}
                    </p>
                  </div>
                  <div className="min-w-0 space-y-3">
                    <p className="text-xs font-medium">Response</p>
                    <ErrorNotice error={error} />
                    {result ? (
                      <ResultCard result={result} />
                    ) : (
                      <div className="rounded-lg border border-border bg-background/40 p-4">
                        <p
                          role={pending ? "status" : undefined}
                          className="mb-5 text-xs text-muted-foreground"
                        >
                          {pending
                            ? "Waiting for the contract…"
                            : "Run the function to see its result."}
                        </p>
                        <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-3 text-xs">
                          <span className="text-muted-foreground">
                            Return type
                          </span>
                          <code className="break-all">
                            {tool.outputs.map((p) => p.type).join(", ") ||
                              "No return value"}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                This ABI has no supported functions. Inspect it in Workbench.
              </p>
            )}
          </TabsContent>
          <TabsContent value="cli" className="min-h-64 space-y-4 p-4 sm:p-6">
            <div className="flex items-center justify-between text-xs">
              <span>Inspect this function’s current schema</span>
              <CopyButton
                value={inspect}
                label="Copy preview CLI command"
                iconOnly
              />
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-background/40 p-4 font-mono text-xs leading-6">
              <code>{inspect}</code>
            </pre>
            <p className="max-w-lg text-xs leading-6 text-muted-foreground">
              Read, simulate, or prepare a transaction from your terminal.
              Commands use the same catalog and argument types.
            </p>
            <Link
              className="inline-flex items-center gap-2 text-xs font-medium"
              href={`/workbench?view=agents${context}`}
            >
              Get current commands <ArrowUpRight className="size-3.5" />
            </Link>
          </TabsContent>
          <TabsContent value="agent" className="min-h-64 space-y-5 p-4 sm:p-6">
            <p className="text-lg font-medium">
              Use this contract with your agent.
            </p>
            <p className="max-w-lg text-sm leading-6 text-muted-foreground">
              Install the portable skill or connect MCP. Your agent discovers
              the current functions, inspects their schemas, then reads or
              prepares a wallet review.
            </p>
            <Button size="sm" asChild>
              <Link href={`/workbench?view=agents${context}`}>
                Connect your agent <ArrowUpRight />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Import a different ABI; the same skill keeps working.
            </p>
          </TabsContent>
        </Tabs>
      </div>
      <Link
        href={open}
        className="flex items-center justify-between border-t border-border px-4 py-3 text-xs font-medium hover:bg-muted sm:px-5"
      >
        Open full workspace <ArrowUpRight className="size-4" />
      </Link>
    </section>
  );
}
