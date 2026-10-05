"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Braces,
  Sun,
  Moon,
  Terminal,
  Check,
  Loader2,
} from "lucide-react";
import type { ContractRecord, ToolDefinition } from "@sh/core";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { WorkbenchMark, AgentMark, HederaIdentity } from "./identity";
import { ContractPreview } from "./contract-preview";
import { Picker } from "./picker";
import { CopyButton, ErrorNotice } from "./result";
const Assistant = dynamic(
  () => import("./assistant").then((m) => m.Assistant),
  {
    loading: () => (
      <p role="status" className="p-8 text-sm text-muted-foreground">
        Opening assistant…
      </p>
    ),
  },
);

export function Landing({
  initialContract,
  hostedDemo = false,
}: {
  initialContract?: string;
  hostedDemo?: boolean;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [contract, setContract] = useState<ContractRecord | null>(null);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [selected, setSelected] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setLoaded(false);
    api("state", undefined, "GET", controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setLoaded(true);
        setContracts(data.contracts);
        setEnabled(data.assistant);
        const preferred =
          new URL(window.location.href).searchParams.get("contract") ||
          initialContract;
        setSelected(
          preferred &&
            (data.contracts as ContractRecord[]).some((c) => c.id === preferred)
            ? preferred
            : ((data.contracts as ContractRecord[]).find(
                (c) => c.network === data.defaultNetwork,
              )?.id ??
                data.contracts[0]?.id ??
                ""),
        );
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure);
      });
    return () => controller.abort();
  }, [attempt, initialContract]);
  useEffect(() => {
    if (!selected) {
      setContract(null);
      setTools([]);
      return;
    }
    const controller = new AbortController();
    setContract(null);
    setTools([]);
    setError(null);
    api<{ contract: ContractRecord; tools: ToolDefinition[] }>(
      `contracts/${encodeURIComponent(selected)}`,
      undefined,
      "GET",
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setContract(data.contract);
          setTools(data.tools);
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure);
      });
    return () => controller.abort();
  }, [selected, attempt]);
  useEffect(() => {
    if (contract) document.documentElement.dataset.network = contract.network;
  }, [contract]);
  useEffect(() => {
    if (!selected) return;
    const url = new URL(window.location.href);
    url.searchParams.set("contract", selected);
    window.history.replaceState(null, "", url);
  }, [selected]);
  const context = selected ? `&contract=${encodeURIComponent(selected)}` : "";
  const open = `/workbench?view=functions${context}`;
  const example =
    contracts.find(
      (c) => c.network === "testnet" && c.provenance.source === "bundled",
    ) ?? contracts.find((c) => c.network === "testnet");
  const exampleLink = example
    ? `/workbench?view=functions&contract=${encodeURIComponent(example.id)}`
    : "/workbench?import=1";
  return (
    <div className="min-h-screen">
      <div className="wb-brand px-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1240px]">
          <header className="flex min-h-18 items-center justify-between gap-3 border-b border-border">
            <Link
              href={
                selected ? `/?contract=${encodeURIComponent(selected)}` : "/"
              }
              className="flex items-center gap-3 text-sm font-semibold tracking-tight sm:text-base"
              aria-label="Contract Workbench home"
            >
              <WorkbenchMark className="size-7 shrink-0" />
              <span>
                Contract
                <br className="sm:hidden" /> Workbench
              </span>
            </Link>
            <nav
              className="flex items-center gap-2 sm:gap-6"
              aria-label="Main navigation"
            >
              <a
                href="#how-it-works"
                className="wb-brand-link hidden text-xs sm:block"
              >
                How it works
              </a>
              <Link href="/docs" className="wb-brand-link text-xs">
                Docs
              </Link>
              <Link
                href="/demo"
                className="wb-brand-link hidden text-xs sm:block"
              >
                Demo
              </Link>
              <Link
                href={`/workbench?view=agents${context}`}
                className="wb-brand-link hidden text-xs sm:block"
              >
                Agent access
              </Link>
              <button
                className="grid size-9 place-items-center rounded-lg hover:bg-muted"
                aria-label="Toggle light and dark theme"
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
              >
                <Sun className="size-4 dark:hidden" />
                <Moon className="hidden size-4 dark:block" />
              </button>
              <Button size="sm" variant="secondary" asChild>
                <Link href={open}>
                  Open app <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </nav>
          </header>
        </div>
      </div>
      <main>
        <div className="wb-brand px-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-[1240px]">
            <section
              className="space-y-10 py-10 sm:space-y-12 sm:py-14"
              aria-labelledby="home-title"
            >
              <div className="flex flex-wrap items-end justify-between gap-8">
                <div className="max-w-3xl">
                  <p className="mb-4 text-xs font-medium text-muted-foreground">
                    Contract Workbench / Hedera EVM
                  </p>
                  <h1
                    id="home-title"
                    className="text-[clamp(2.3rem,4.3vw,3.5rem)] font-medium leading-[1.12] tracking-[-.04em]"
                  >
                    A deployed contract.
                    <br />A workspace to make it useful.
                  </h1>
                  <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground">
                    Explore functions, run a call, and take the same typed tools
                    into your terminal or agent. Start with an address and ABI.
                  </p>
                </div>
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-3">
                    <Button asChild className="wb-brand-button">
                      <Link
                        href={
                          hostedDemo
                            ? "/docs/quickstart"
                            : "/workbench?import=1"
                        }
                      >
                        {hostedDemo
                          ? "Get the template"
                          : "Import your contract"}{" "}
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={exampleLink}>
                        {example ? "Try testnet" : "Open workspace"}
                      </Link>
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    {["Runs locally", "No wallet needed for reads"].map(
                      (label) => (
                        <span key={label} className="flex items-center gap-1.5">
                          <Check className="size-3.5" />
                          {label}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
              {hostedDemo && (
                <p className="text-xs leading-5 text-muted-foreground">
                  Public preview · Live bundled contract reads and unsigned
                  simulation. Imports, chat and wallet transactions run in your
                  local template.{" "}
                  <Link
                    href="/docs/quickstart"
                    className="underline underline-offset-4"
                  >
                    Set up locally
                  </Link>
                </p>
              )}
              <div className="min-w-0">
                {Boolean(error) ? (
                  <div className="wb-preview space-y-5 p-6">
                    <ErrorNotice error={error} />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setAttempt((n) => n + 1)}
                    >
                      Retry connection
                    </Button>
                  </div>
                ) : contract ? (
                  <ContractPreview
                    key={`${contract.id}:${contract.revision}`}
                    contract={contract}
                    tools={tools}
                    contracts={contracts}
                    select={setSelected}
                  />
                ) : loaded && !selected ? (
                  <div className="wb-preview flex min-h-80 flex-col justify-center p-6 sm:p-8">
                    <Blocks className="mb-6 size-8 wb-brand-accent" />
                    <h2 className="text-xl font-medium">
                      Your workspace is ready.
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Import a deployed contract to discover its functions and
                      typed agent tools.
                    </p>
                    <Button asChild className="mt-6 w-fit">
                      <Link href="/workbench?import=1">
                        Import a contract <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div
                    role="status"
                    className="wb-preview flex min-h-96 items-center justify-center gap-2 p-6 text-sm text-muted-foreground"
                  >
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    Loading your local catalog…
                  </div>
                )}
              </div>
            </section>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-5 text-xs text-muted-foreground">
              <HederaIdentity light />
              <span className="flex items-center gap-3">
                <span>Browser</span>
                <span className="text-border">/</span>
                <span>CLI</span>
                <span className="text-border">/</span>
                <span>MCP & skills</span>
              </span>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-[1336px] px-5 sm:px-8 lg:px-12">
          <section
            id="how-it-works"
            className="scroll-mt-8 border-b border-border py-14 sm:py-20"
            aria-labelledby="interfaces-title"
          >
            <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="mb-3 text-xs uppercase tracking-[.15em] text-muted-foreground">
                  From address to action
                </p>
                <h2
                  id="interfaces-title"
                  className="max-w-lg text-3xl font-medium tracking-tight sm:text-4xl"
                >
                  A workspace that follows
                  <br className="hidden sm:block" /> your contract.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                Change the contract. Its functions, arguments, and agent
                commands follow automatically.
              </p>
            </div>
            <div className="grid gap-7 sm:grid-cols-3">
              {[
                {
                  title: "Explore in your browser",
                  icon: Blocks,
                  copy: "Import an address and ABI. Discover functions, enter typed arguments, and see structured results.",
                  href: open,
                  action: "Explore functions",
                },
                {
                  title: "Work from your terminal",
                  icon: Terminal,
                  copy: "Inspect current schemas, run reads, simulate calls, and prepare transactions with copyable CLI commands.",
                  href: `/workbench?view=agents${context}`,
                  action: "Get CLI commands",
                },
                {
                  title: "Bring your own agent",
                  icon: Braces,
                  copy: "Connect MCP or install a portable skill. Your agent discovers the current contract before it acts.",
                  href: `/workbench?view=agents${context}`,
                  action: "Connect an agent",
                },
              ].map(({ title, icon: Icon, copy, href, action }, i) => (
                <article
                  key={title}
                  className="min-w-0 border-t border-border pt-6"
                >
                  <div className="mb-6 flex items-center justify-between">
                    <Icon className="size-5" />
                    <span className="wb-interface-number font-mono text-xs">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {copy}
                  </p>
                  <Link
                    href={href}
                    className="mt-5 inline-flex items-center gap-2 text-xs font-medium"
                  >
                    {action}
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </article>
              ))}
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-between gap-6 border-t border-border pt-6">
              <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                When a function changes state, review the exact transaction and
                approve it in your wallet.
              </p>
              <span className="flex items-center gap-2 text-xs font-medium">
                <Check className="size-4 text-[var(--wb-success)]" /> You
                control every signature
              </span>
            </div>
          </section>
          <section
            className="grid gap-8 border-b border-border py-14 sm:py-16 lg:grid-cols-[1fr_1.2fr] lg:gap-16"
            aria-labelledby="assistant-title"
          >
            <div>
              <p className="mb-3 text-xs uppercase tracking-[.15em] text-muted-foreground">
                An optional conversation
              </p>
              <h2
                id="assistant-title"
                className="text-3xl font-medium tracking-tight"
              >
                Ask about your contract.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
                Use your configured model to explore functions, find the
                arguments you need, or prepare a transaction for wallet review.
              </p>
              <div className="mt-6">
                <Picker
                  label="Assistant contract"
                  placeholder="Choose a contract"
                  emptyLabel="No contracts yet"
                  value={selected}
                  onChange={setSelected}
                  options={contracts.map((c) => ({
                    value: c.id,
                    label: c.name,
                    description: `Hedera ${c.network}`,
                  }))}
                />
              </div>
              <p className="mt-4 text-xs leading-6 text-muted-foreground">
                OpenAI, Anthropic or Gemini. Without a provider key,
                deterministic contract tools remain available.
              </p>
            </div>
            <div className="min-w-0">
              {contract ? (
                <Assistant
                  key={`${contract.id}:${contract.revision}`}
                  embedded
                  contract={contract}
                  enabled={enabled}
                  onReview={(plan) =>
                    router.push(
                      `/workbench?plan=${encodeURIComponent(plan.id)}`,
                    )
                  }
                />
              ) : (
                <div className="wb-panel flex min-h-64 flex-col justify-center gap-3 p-6">
                  <h3 className="font-medium">Choose a contract to start.</h3>
                  <p className="text-sm text-muted-foreground">
                    The assistant uses the same selected catalog as your
                    workspace.
                  </p>
                </div>
              )}
            </div>
          </section>
          <section
            className="grid gap-8 border-b border-border py-14 sm:py-16 lg:grid-cols-[1fr_1.2fr] lg:gap-16"
            aria-labelledby="start-title"
          >
            <div>
              <p className="mb-3 text-xs uppercase tracking-[.15em] text-muted-foreground">
                Made for your machine
              </p>
              <h2
                id="start-title"
                className="text-3xl font-medium tracking-tight"
              >
                Start with a useful read.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
                The bundled testnet examples need no key or deployment. Import
                another contract with its address and a verified or supplied
                ABI.
              </p>
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Terminal className="size-4" />
                  From your installed template
                </span>
                <CopyButton
                  value="npm install\nnpm run dev"
                  label="Copy startup commands"
                  iconOnly
                />
              </div>
              <pre className="mt-3 overflow-x-auto rounded-xl border border-border bg-card p-5 font-mono text-sm leading-8">
                <code>
                  <span className="text-muted-foreground">$ </span>npm install
                  {"\n"}
                  <span className="text-muted-foreground">$ </span>npm run dev
                </code>
              </pre>
              <p className="mt-3 text-xs text-muted-foreground">
                Node 24 · Local state · Your wallet handles signing
              </p>
            </div>
          </section>
          <section
            className="flex flex-wrap items-center justify-between gap-6 py-10"
            aria-label="Portable agent setup"
          >
            <div>
              <h2 className="text-lg font-medium">
                Take your contract tools with you.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Read the skill. Copy the commands. Connect your agent.
              </p>
            </div>
            <div className="flex items-center gap-5">
              <div
                className="flex gap-4"
                aria-label="Codex, Claude Code and Cursor"
              >
                <AgentMark agent="codex" />
                <AgentMark agent="claude-code" />
                <AgentMark agent="cursor" />
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/workbench?view=agents${context}`}>
                  Agent setup <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </main>
      <footer className="mx-auto flex max-w-[1336px] flex-wrap items-start justify-between gap-6 border-t border-border px-5 py-8 sm:px-8 lg:px-12">
        <div>
          <p className="text-xs font-medium">Contract Workbench</p>
          <p className="mt-2 max-w-md text-[11px] leading-5 text-muted-foreground">
            An independent project. Not affiliated with, sponsored or endorsed
            by Hedera Hashgraph, LLC.
          </p>
        </div>
        <HederaIdentity />
      </footer>
    </div>
  );
}
