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
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <span className="flex items-center gap-2 text-xs font-medium">
          <Blocks className="size-4 wb-brand-accent" /> Your contract workspace
        </span>
        <span className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-medium uppercase tracking-wider">
          {contract.network}
        </span>
      </div>
      <div className="border-b border-border px-5 py-5">
        <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          Selected contract
        </p>
        <Picker
          label="Preview contract"
          value={contract.id}
          options={contracts.map((c) => ({
            value: c.id,
            label: c.name,
            description: `Hedera ${c.network}`,
          }))}
          onChange={select}
          className="bg-background/50"
        />
        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <code className="min-w-0 truncate">
            {contract.hederaId || contract.address}
          </code>
          <span className="shrink-0">
            {tools.length} functions · {contract.provenance.source} ABI
          </span>
        </div>
      </div>
      <Tabs defaultValue="browser" className="gap-0">
        <TabsList
          variant="line"
          className="mx-4 my-2"
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
        <TabsContent value="browser" className="min-h-64 space-y-4 p-5">
          {tool ? (
            <>
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
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <div className="border-l border-border pl-3">
                  <p className="mb-1 text-muted-foreground">Arguments</p>
                  <p className="break-all font-mono">
                    {tool.parameters.map((p) => p.type).join(", ") ||
                      "None required"}
                  </p>
                </div>
                <div className="border-l border-border pl-3">
                  <p className="mb-1 text-muted-foreground">Returns</p>
                  <p className="break-all font-mono">
                    {tool.outputs.map((p) => p.type).join(", ") ||
                      "No return value"}
                  </p>
                </div>
              </div>
              <ErrorNotice error={error} />
              {canRead ? (
                <Button
                  size="sm"
                  className="w-full"
                  disabled={pending}
                  onClick={() => void read()}
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  {pending ? "Reading contract…" : "Run a live read"}
                </Button>
              ) : (
                <Button size="sm" className="w-full" asChild>
                  <Link href={open}>
                    Enter arguments in Workbench <ArrowUpRight />
                  </Link>
                </Button>
              )}
              {result ? (
                <ResultCard result={result} />
              ) : (
                <p className="text-center text-[11px] leading-5 text-muted-foreground">
                  {canRead
                    ? "Read directly from the selected network. No wallet or AI key needed."
                    : "Typed inputs and wallet review are available in the full workspace."}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              This ABI has no supported functions. Inspect it in Workbench.
            </p>
          )}
        </TabsContent>
        <TabsContent value="cli" className="min-h-64 space-y-4 p-5">
          <div className="flex items-center justify-between text-xs">
            <span>Inspect this function’s current schema</span>
            <CopyButton
              value={inspect}
              label="Copy preview CLI command"
              iconOnly
            />
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-border bg-background/50 p-4 font-mono text-xs leading-6">
            <code>{inspect}</code>
          </pre>
          <p className="text-xs leading-6 text-muted-foreground">
            The CLI uses the same revision and argument types. Read, simulate,
            or prepare an unsigned transaction from your terminal.
          </p>
          <Link
            className="inline-flex items-center gap-2 text-xs font-medium"
            href={`/workbench?view=agents${context}`}
          >
            Get current commands <ArrowUpRight className="size-3.5" />
          </Link>
        </TabsContent>
        <TabsContent value="agent" className="min-h-64 space-y-5 p-5">
          <p className="text-base font-medium">Your contract, in your agent.</p>
          <p className="text-sm leading-6 text-muted-foreground">
            A portable skill discovers the current ABI tools and their argument
            schemas. Import another contract; the skill stays the same.
          </p>
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {["Discover", "Inspect", "Read or prepare"].map((step) => (
              <span
                key={step}
                className="rounded-md border border-border px-2.5 py-1.5"
              >
                {step}
              </span>
            ))}
          </div>
          <Button size="sm" asChild>
            <Link href={`/workbench?view=agents${context}`}>
              Connect your agent <ArrowUpRight />
            </Link>
          </Button>
        </TabsContent>
      </Tabs>
      <Link
        href={open}
        className="flex items-center justify-between border-t border-border px-5 py-3.5 text-xs font-medium hover:bg-muted"
      >
        Explore all {tools.length} functions <ArrowUpRight className="size-4" />
      </Link>
    </section>
  );
}
