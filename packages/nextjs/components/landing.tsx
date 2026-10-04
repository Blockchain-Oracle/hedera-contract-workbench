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
import type { ContractRecord } from "@sh/core";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { WorkbenchMark, AgentMark } from "./identity";
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

export function Landing({ initialContract }: { initialContract?: string }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [contract, setContract] = useState<ContractRecord | null>(null);
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
      return;
    }
    const controller = new AbortController();
    setContract(null);
    api<{ contract: ContractRecord }>(
      `contracts/${encodeURIComponent(selected)}`,
      undefined,
      "GET",
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) setContract(data.contract);
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
  return (
    <div className="min-h-screen px-5 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1240px]">
        <header className="flex min-h-24 items-center justify-between gap-4 border-b border-foreground/10">
          <Link
            href={selected ? `/?contract=${encodeURIComponent(selected)}` : "/"}
            className="flex items-center gap-2.5 font-semibold tracking-tight"
            aria-label="Contract Workbench home"
          >
            <WorkbenchMark className="size-8" />
            <span>
              Contract
              <br className="sm:hidden" /> Workbench
            </span>
          </Link>
          <nav
            className="flex items-center gap-2 sm:gap-5"
            aria-label="Main navigation"
          >
            <Link
              href={`/workbench?view=agents${context}`}
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:block"
            >
              Agent access
            </Link>
            <button
              className="grid size-9 place-items-center rounded-xl hover:bg-card/40"
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
        <main>
          <section
            className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_1.05fr] lg:gap-16"
            aria-labelledby="home-title"
          >
            <div>
              <p className="mb-6 flex items-center gap-2 text-xs font-medium uppercase tracking-[.18em]">
                <span className="size-2 rounded-full bg-primary" /> Built for
                Hedera EVM
              </p>
              <h1
                id="home-title"
                className="max-w-xl text-[clamp(2.7rem,5vw,4.5rem)] font-semibold leading-[1.05] tracking-[-.055em]"
              >
                Your contract.
                <br />
                <span className="text-foreground/60">Every interface.</span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
                Bring a deployed contract. Get typed functions in your browser,
                terminal, and AI agent — from the same ABI.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/workbench?import=1">
                    Import your contract <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={open}>Open workspace</Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5" /> Runs locally
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5" /> Testnet & mainnet
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5" /> Wallet-approved transactions
                </span>
              </div>
            </div>
            <div className="min-w-0 space-y-3">
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-xs text-muted-foreground">
                  Explore
                </span>
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
                  className="border-transparent bg-card/50"
                />
              </div>
              {Boolean(error) ? (
                <div className="rounded-3xl bg-card p-6">
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
              ) : loaded && !selected ? (
                <div className="min-h-80 rounded-3xl border border-border bg-card p-6">
                  <h2 className="text-xl font-semibold">
                    Your workspace is ready.
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Import a deployed contract to get its functions and agent
                    tools.
                  </p>
                  <Button asChild className="mt-5">
                    <Link href="/workbench?import=1">
                      Import a contract <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div
                  role="status"
                  className="flex min-h-80 items-center justify-center gap-2 rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground"
                >
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />{" "}
                  Loading your local catalog…
                </div>
              )}
            </div>
          </section>
          <section
            className="border-t border-foreground/10 py-12 sm:py-16"
            aria-labelledby="interfaces-title"
          >
            <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-[.18em] text-muted-foreground">
                  Work your way
                </p>
                <h2
                  id="interfaces-title"
                  className="text-3xl font-semibold tracking-tight"
                >
                  One ABI. A shared set of tools.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                Change the contract. The arguments, forms, and agent commands
                follow.
              </p>
            </div>
            <div className="grid gap-7 sm:grid-cols-3">
              {[
                {
                  title: "In your browser",
                  icon: Blocks,
                  copy: "Inspect functions, enter typed arguments, see results, and review transactions in your wallet.",
                  href: open,
                  action: "Explore functions",
                },
                {
                  title: "In your terminal",
                  icon: Terminal,
                  copy: "Discover tools, run reads, simulate calls, and prepare unsigned transactions with the CLI.",
                  href: `/workbench?view=agents${context}`,
                  action: "Get CLI commands",
                },
                {
                  title: "With your agent",
                  icon: Braces,
                  copy: "Install a portable skill or connect MCP. Your agent inspects the current schema before it acts.",
                  href: `/workbench?view=agents${context}`,
                  action: "Connect an agent",
                },
              ].map(({ title, icon: Icon, copy, href, action }, i) => (
                <article
                  key={title}
                  className="min-w-0 border-t border-foreground/15 pt-6"
                >
                  <div className="mb-6 flex items-center justify-between">
                    <Icon className="size-6" />
                    <span className="font-mono text-xs text-muted-foreground">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {copy}
                  </p>
                  <Link
                    href={href}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-medium"
                  >
                    {action}
                    <ArrowUpRight className="size-4" />
                  </Link>
                </article>
              ))}
            </div>
          </section>
          <section
            className="grid gap-8 rounded-3xl border border-border bg-card p-6 sm:p-9 lg:grid-cols-[1fr_1.15fr]"
            aria-labelledby="start-title"
          >
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[.18em] text-muted-foreground">
                The local template
              </p>
              <h2
                id="start-title"
                className="text-2xl font-semibold tracking-tight"
              >
                Start with a useful read.
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                The bundled testnet examples work without a key or deployment.
                Import another contract with its address and a verified or
                supplied ABI.
              </p>
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Terminal className="size-4" /> From your installed template
                </span>
                <CopyButton
                  value="npm install\nnpm run dev"
                  label="Copy startup commands"
                  iconOnly
                />
              </div>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-muted p-5 font-mono text-sm leading-7">
                <code>
                  <span className="text-muted-foreground">$ </span>npm install
                  {"\n"}
                  <span className="text-muted-foreground">$ </span>npm run dev
                </code>
              </pre>
              <p className="mt-3 text-xs text-muted-foreground">
                Use Node 24. Chat is optional; your wallet handles signing.
              </p>
            </div>
          </section>
          <section
            className="flex flex-wrap items-center justify-between gap-6 py-12"
            aria-label="Portable agent setup"
          >
            <div>
              <h2 className="text-lg font-semibold">
                Take the tools to your agent.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Copy the skill, inspect its Markdown, or install it locally.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div
                className="flex gap-3"
                aria-label="Codex, Claude Code and Cursor"
              >
                <AgentMark agent="codex" />
                <AgentMark agent="claude-code" />
                <AgentMark agent="cursor" />
              </div>
              <Button variant="outline" asChild>
                <Link href={`/workbench?view=agents${context}`}>
                  Agent setup <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </section>
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 py-6 text-xs text-muted-foreground">
          <span>Contract Workbench · Hedera EVM</span>
          <Link href={open} className="hover:text-foreground">
            Open your workspace →
          </Link>
        </footer>
      </div>
    </div>
  );
}
