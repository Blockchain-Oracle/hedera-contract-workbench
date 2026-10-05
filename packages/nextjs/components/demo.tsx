"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";
import type { ContractRecord, ToolDefinition } from "@sh/core";
import { api } from "@/lib/api";
import { ContractPreview } from "./contract-preview";
import { Button } from "./ui/button";
import { ErrorNotice, CopyButton } from "./result";

export function Demo() {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [selected, setSelected] = useState("");
  const [catalog, setCatalog] = useState<{
    contract: ContractRecord;
    tools: ToolDefinition[];
  } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const request = new AbortController();
    setError(null);
    api("state", undefined, "GET", request.signal)
      .then((data) => {
        if (request.signal.aborted) return;
        const examples = (data.contracts as ContractRecord[]).filter(
          (item) =>
            item.network === "testnet" && item.provenance.source === "bundled",
        );
        setContracts(examples);
        setSelected(examples[0]?.id ?? "");
        if (!examples.length)
          setError(new Error("No bundled testnet example is available."));
      })
      .catch((failure) => {
        if (!request.signal.aborted) setError(failure);
      });
    return () => request.abort();
  }, [attempt]);
  useEffect(() => {
    if (!selected) return;
    const request = new AbortController();
    setCatalog(null);
    setError(null);
    api<{ contract: ContractRecord; tools: ToolDefinition[] }>(
      `contracts/${encodeURIComponent(selected)}`,
      undefined,
      "GET",
      request.signal,
    )
      .then((data) => {
        if (!request.signal.aborted) setCatalog(data);
      })
      .catch((failure) => {
        if (!request.signal.aborted) setError(failure);
      });
    return () => request.abort();
  }, [selected, attempt]);
  const list = `npm run --silent workbench -- tools list --contract ${selected || "saucerswap-testnet"} --json`;
  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        <p className="mb-4 text-xs text-muted-foreground">
          Interactive demo / Hedera testnet
        </p>
        <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">
          Start with a real response.
        </h1>
        <p className="mt-5 text-sm leading-7 text-muted-foreground">
          Choose a function and run a live read. No wallet or model key is
          needed. This is the same typed dispatcher used by the CLI, MCP and
          local assistant.
        </p>
      </div>
      {error ? (
        <div className="space-y-4">
          <ErrorNotice error={error} />
          <Button
            variant="secondary"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry demo
          </Button>
        </div>
      ) : catalog ? (
        <ContractPreview
          key={`${catalog.contract.id}:${catalog.contract.revision}`}
          contract={catalog.contract}
          tools={catalog.tools}
          contracts={contracts}
          select={setSelected}
        />
      ) : (
        <div
          className="flex min-h-80 items-center justify-center gap-3 rounded-xl border border-border bg-card text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
          Loading the testnet catalog…
        </div>
      )}
      <div className="grid gap-8 border-t border-border pt-8 md:grid-cols-2">
        <section className="min-w-0">
          <p className="text-xs text-muted-foreground">
            Continue in your terminal
          </p>
          <h2 className="mt-3 text-xl font-medium tracking-tight">
            The same functions, as tools.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            From your local clone, inspect the catalog before filling arguments.
            Switch contracts and the schemas change with them.
          </p>
          <div className="mt-5 rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex justify-end">
              <CopyButton value={list} label="Copy CLI command" />
            </div>
            <pre className="overflow-x-auto text-xs leading-6">
              <code>{list}</code>
            </pre>
          </div>
          <Link
            href="/docs/agents"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium"
          >
            Connect an agent <ArrowRight className="size-4" />
          </Link>
        </section>
        <section>
          <p className="text-xs text-muted-foreground">
            Continue with your own contract
          </p>
          <h2 className="mt-3 text-xl font-medium tracking-tight">
            Bring an address and ABI.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Run the full template locally to import any supported deployed
            Hedera EVM contract, configure optional chat, simulate writes and
            review exact transactions in your wallet.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/docs/quickstart">Get the template</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link
                href={`/workbench?view=functions&contract=${encodeURIComponent(selected || "saucerswap-testnet")}`}
              >
                Open workspace
              </Link>
            </Button>
          </div>
          <p className="mt-5 text-xs leading-6 text-muted-foreground">
            Public preview supports reads and unsigned simulation. This
            interactive page is not a recorded video or evidence of a submitted
            transaction.
          </p>
        </section>
      </div>
    </div>
  );
}
