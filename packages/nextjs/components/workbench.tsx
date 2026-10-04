"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { useTheme } from "next-themes";
import {
  Blocks,
  Plus,
  Menu,
  Sun,
  Moon,
  Wallet,
  ArrowRightLeft,
  Terminal,
  RefreshCw,
  Search,
  Trash2,
  Loader2,
} from "lucide-react";
import type {
  ContractRecord,
  Network,
  ToolDefinition,
  TransactionPlan,
  TransactionRecord,
} from "@sh/core";
import { api } from "@/lib/api";
import { recoveryRecords } from "@/lib/recovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { FunctionForm } from "./function-form";
import { Swap } from "./swap";
import { ImportContract } from "./import-contract";
import { Receipt } from "./receipt";
const TransactionReview = dynamic(
  () =>
    import("./transaction-review").then((module) => module.TransactionReview),
  { ssr: false },
);
import { ErrorNotice, CopyButton } from "./result";
const Assistant = dynamic(
  () => import("./assistant").then((m) => m.Assistant),
  {
    loading: () => (
      <p className="text-sm text-muted-foreground">Loading assistant…</p>
    ),
  },
);
type Catalog = {
  contract: ContractRecord;
  tools: ToolDefinition[];
  unsupported: { name: string; reason: string }[];
};
export function Workbench() {
  const [contracts, setContracts] = useState<ContractRecord[]>([]),
    [selected, setSelected] = useState(""),
    [network, setNetwork] = useState<Network>("testnet"),
    [catalog, setCatalog] = useState<Catalog | null>(null),
    [toolId, setToolId] = useState(""),
    [query, setQuery] = useState(""),
    [tab, setTab] = useState("functions"),
    [plan, setPlan] = useState<TransactionPlan | null>(null),
    [records, setRecords] = useState<TransactionRecord[]>([]),
    [polling, setPolling] = useState<{
      intervalMs: number;
      budgetMs: number;
    } | null>(null),
    [assistantEnabled, setAssistantEnabled] = useState(false),
    [importOpen, setImportOpen] = useState(false),
    [navOpen, setNavOpen] = useState(false),
    [error, setError] = useState<unknown>(null),
    [loading, setLoading] = useState(true);
  const { address, chainId } = useAccount(),
    { connectors, connectAsync, isPending: connecting } = useConnect(),
    { disconnect } = useDisconnect(),
    { switchChainAsync } = useSwitchChain(),
    { resolvedTheme, setTheme } = useTheme();
  const chainForNetwork = network === "testnet" ? 296 : 295;
  async function load(id?: string) {
    const data = await api("state");
    setContracts(data.contracts);
    setAssistantEnabled(data.assistant);
    setPolling(data.polling);
    const browserRecords = recoveryRecords();
    for (const record of browserRecords)
      void api("transactions", record).catch(() => {});
    const merged = new Map(
      [...data.transactions, ...browserRecords].map((r: TransactionRecord) => [
        `${r.network}:${r.hash}`,
        r,
      ]),
    );
    setRecords([...merged.values()] as TransactionRecord[]);
    if (id) {
      const c = data.contracts.find((c: ContractRecord) => c.id === id);
      setNetwork(c.network);
      setSelected(id);
    } else {
      if (!selected) setNetwork(data.defaultNetwork);
      setSelected(
        (previous) => previous || `saucerswap-${data.defaultNetwork}`,
      );
    }
    setLoading(false);
  }
  useEffect(() => {
    load().catch((e) => {
      setError(e);
      setLoading(false);
    });
    const planId = new URL(window.location.href).searchParams.get("plan");
    if (planId)
      api<TransactionPlan>(`plans/${planId}`)
        .then((p) => {
          setSelected(p.contractId);
          setNetwork(p.network);
          setPlan(p);
        })
        .catch(setError);
  }, []);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setCatalog(null);
    setError(null);
    api<Catalog>(`contracts/${selected}`, undefined, "GET", controller.signal)
      .then((data) => {
        setCatalog(data);
        setToolId(
          data.tools.find(
            (t) => t.parameters.length === 0 && t.action === "read",
          )?.id ??
            data.tools[0]?.id ??
            "",
        );
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e);
      });
    return () => controller.abort();
  }, [selected]);
  const priorWallet = useRef({ address, chainId });
  useEffect(() => {
    const previous = priorWallet.current;
    if (
      previous.address &&
      (previous.address !== address || previous.chainId !== chainId)
    )
      setPlan(null);
    else
      setPlan((p) =>
        p &&
        address &&
        (p.from.toLowerCase() !== address.toLowerCase() ||
          chainId !== p.chainId)
          ? null
          : p,
      );
    priorWallet.current = { address, chainId };
  }, [address, chainId]);
  const select = (id: string) => {
    setSelected(id);
    setPlan(null);
    setNavOpen(false);
    setTab("functions");
  };
  const changeNetwork = (n: Network) => {
    setNetwork(n);
    setSelected(`saucerswap-${n}`);
    setPlan(null);
    setTab("functions");
  };
  const submitted = (record: TransactionRecord) => {
    setRecords((previous) =>
      [record, ...previous.filter((r) => r.hash !== record.hash)].slice(0, 50),
    );
    setPlan(null);
  };
  const tool = catalog?.tools.find((t) => t.id === toolId);
  const navigation = (
    <div className="flex h-full flex-col">
      <div className="space-y-4 p-5">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Workspace
        </p>
        <select
          aria-label="Selected Hedera network"
          className="h-9 w-full rounded-md border bg-card px-3 text-sm"
          value={network}
          onChange={(e) => changeNetwork(e.target.value as Network)}
        >
          <option value="testnet">Hedera Testnet · 296</option>
          <option value="mainnet">Hedera Mainnet · 295</option>
        </select>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => {
            setNavOpen(false);
            setImportOpen(true);
          }}
        >
          <Plus className="size-4" />
          Import contract
        </Button>
      </div>
      <nav aria-label="Contracts" className="flex-1 space-y-1 px-3">
        {contracts
          .filter((c) => c.network === network)
          .map((c) => (
            <button
              key={c.id}
              onClick={() => select(c.id)}
              className={`w-full rounded-lg px-3 py-3 text-left ${selected === c.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
            >
              <span className="block text-sm font-medium">{c.name}</span>
              <span className="mt-1 block font-mono text-xs text-muted-foreground">
                {c.hederaId ||
                  `${c.address.slice(0, 8)}…${c.address.slice(-4)}`}
              </span>
            </button>
          ))}
      </nav>
      <div className="space-y-2 border-t p-5 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <Terminal className="size-3.5" />
          Browser · CLI · MCP · Skill
        </p>
        <code className="block rounded bg-muted px-2 py-2">
          npm run workbench -- doctor
        </code>
        <p>Your imports stay on this computer.</p>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b bg-card px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open contract navigation"
            onClick={() => setNavOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <Blocks className="size-6 shrink-0 text-primary" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold md:text-base">
              Contract Workbench
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              One contract. Every interface.
            </p>
          </div>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Scaffold HBAR
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle light and dark theme"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            <Sun className="size-4 dark:hidden" />
            <Moon className="hidden size-4 dark:block" />
          </Button>
          {address ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnect()}
                title="Disconnect wallet"
              >
                <Wallet className="size-4" />
                <span className="font-mono">
                  {address.slice(0, 6)}…{address.slice(-4)}
                </span>
              </Button>
              {chainId !== chainForNetwork && (
                <Button
                  size="sm"
                  onClick={() =>
                    switchChainAsync({ chainId: chainForNetwork }).catch(
                      setError,
                    )
                  }
                >
                  Switch network
                </Button>
              )}
            </>
          ) : (
            <Button
              size="sm"
              disabled={connecting}
              onClick={() =>
                connectAsync({ connector: connectors[0] }).catch(setError)
              }
            >
              <Wallet className="size-4" />
              <span className="hidden sm:inline">Connect wallet</span>
              <span className="sm:hidden">Connect</span>
            </Button>
          )}
        </div>
      </header>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1600px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r bg-card md:block">
          {navigation}
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto max-w-5xl space-y-6">
            <ErrorNotice error={error} />
            {loading ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Opening testnet examples…
              </p>
            ) : catalog ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold">
                        {catalog.contract.name}
                      </h2>
                      <Badge
                        variant={
                          network === "mainnet" ? "destructive" : "secondary"
                        }
                      >
                        {network}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <code className="break-all">
                        {catalog.contract.address}
                      </code>
                      <CopyButton
                        value={catalog.contract.address}
                        label="Copy address"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ABI: {catalog.contract.provenance.source}
                      {catalog.contract.provenance.url && (
                        <>
                          {" "}
                          ·{" "}
                          <a
                            className="underline"
                            href={catalog.contract.provenance.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Provenance
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Refresh ABI"
                      onClick={() =>
                        api(`contracts/${selected}/refresh`, {})
                          .then(() => {
                            setCatalog(null);
                            return load(selected).then(async () => {
                              const fresh = await api<Catalog>(
                                `contracts/${selected}`,
                              );
                              setCatalog(fresh);
                              setPlan(null);
                            });
                          })
                          .catch(setError)
                      }
                    >
                      <RefreshCw className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove contract"
                      onClick={async () => {
                        if (
                          window.confirm(
                            `Remove ${catalog.contract.name} from this local catalog?`,
                          )
                        ) {
                          try {
                            await api(
                              `contracts/${selected}?revision=${encodeURIComponent(catalog.contract.revision)}`,
                              undefined,
                              "DELETE",
                            );
                            setSelected("");
                            setPlan(null);
                            await load();
                          } catch (error) {
                            setError(error);
                          }
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <Tabs
                  value={tab}
                  onValueChange={(value) => {
                    setPlan(null);
                    setTab(value);
                  }}
                >
                  <TabsList>
                    <TabsTrigger value="functions">Functions</TabsTrigger>
                    {selected.startsWith("saucerswap-") && (
                      <TabsTrigger value="swap">
                        <ArrowRightLeft className="mr-1 size-3.5" />
                        Swap example
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="assistant">Assistant</TabsTrigger>
                  </TabsList>
                  <TabsContent value="functions" className="mt-6">
                    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 size-3.5 text-muted-foreground" />
                          <Input
                            aria-label="Filter functions"
                            placeholder="Find a function…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <div className="max-h-64 space-y-1 overflow-y-auto lg:max-h-[65vh]">
                          {catalog.tools
                            .filter((t) =>
                              t.signature
                                .toLowerCase()
                                .includes(query.toLowerCase()),
                            )
                            .map((t) => (
                              <button
                                key={t.id}
                                onClick={() => {
                                  setToolId(t.id);
                                  setPlan(null);
                                }}
                                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-left text-sm ${toolId === t.id ? "bg-accent" : "hover:bg-muted"}`}
                              >
                                <span className="min-w-0 break-all font-mono text-xs">
                                  {t.signature}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="shrink-0 text-[10px]"
                                >
                                  {t.action === "read" ? "Read" : "Write"}
                                </Badge>
                              </button>
                            ))}
                        </div>
                        {catalog.unsupported.length > 0 && (
                          <details className="text-xs text-muted-foreground">
                            <summary>
                              Unsupported functions (
                              {catalog.unsupported.length})
                            </summary>
                            {catalog.unsupported.map((u) => (
                              <p key={u.name}>
                                {u.name}: {u.reason}
                              </p>
                            ))}
                          </details>
                        )}
                      </div>
                      <div className="min-w-0 rounded-xl border bg-card p-5 md:p-6">
                        {tool ? (
                          <FunctionForm
                            key={`${tool.id}:${tool.revision}`}
                            tool={tool}
                            contract={catalog.contract}
                            onReview={setPlan}
                            invalidate={() => setPlan(null)}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No supported function is selected.
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="swap" className="mt-6">
                    <Swap
                      key={network}
                      network={network}
                      onReview={setPlan}
                      invalidate={() => setPlan(null)}
                    />
                  </TabsContent>
                  <TabsContent value="assistant" className="mt-6">
                    <Assistant
                      key={selected}
                      contract={catalog.contract}
                      enabled={assistantEnabled}
                      onReview={setPlan}
                    />
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="rounded-lg border bg-card p-8">
                <h2 className="font-medium">Choose or import a contract</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your typed tools will appear here.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setNavOpen(false);
                    setImportOpen(true);
                  }}
                >
                  Import contract
                </Button>
              </div>
            )}
            {records.length > 0 && polling && (
              <div className="space-y-3 border-t pt-6">
                <h2 className="text-sm font-medium">Recent transactions</h2>
                {records.slice(0, 5).map((record) => (
                  <Receipt
                    key={`${record.network}:${record.hash}`}
                    record={record}
                    polling={polling}
                  />
                ))}
              </div>
            )}
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">
                Open a transaction plan from CLI or MCP
              </summary>
              <Input
                type="file"
                accept=".json"
                aria-label="Import an unsigned transaction plan"
                className="mt-3 max-w-sm"
                onChange={async (e) => {
                  try {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1048576)
                      throw new Error("Plan exceeds 1 MiB.");
                    const parsed = JSON.parse(await file.text());
                    const candidate =
                      typeof parsed.data === "object" && parsed.data !== null
                        ? parsed.data
                        : parsed;
                    if (
                      !candidate.id ||
                      !candidate.from ||
                      !candidate.data ||
                      !candidate.valueWeibar
                    )
                      throw new Error("Choose a transaction-plan JSON file.");
                    const validated = await api("plans/validate", {
                      plan: candidate,
                      from: candidate.from,
                      chainId: candidate.chainId,
                    });
                    setPlan(validated.plan);
                  } catch (e) {
                    setError(e);
                  }
                }}
              />
            </details>
          </div>
        </main>
      </div>
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Contracts</SheetTitle>
            <SheetDescription>Select a network and contract.</SheetDescription>
          </SheetHeader>
          {navigation}
        </SheetContent>
      </Sheet>
      <ImportContract
        key={network}
        open={importOpen}
        close={() => setImportOpen(false)}
        initialNetwork={network}
        imported={(id) => load(id).catch(setError)}
      />
      {plan && (
        <TransactionReview
          plan={plan}
          onClose={() => setPlan(null)}
          onSubmitted={submitted}
          onRecoveryError={setError}
        />
      )}
    </div>
  );
}
