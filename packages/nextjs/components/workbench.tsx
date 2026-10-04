"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Picker } from "./picker";
import { WorkbenchMark, HederaIdentity } from "./identity";
import { RadioGroup } from "radix-ui";
import { useAccount } from "wagmi";
import { useTheme } from "next-themes";
import {
  Blocks,
  MessageCircle,
  Activity,
  Check,
  ChevronDown,
  ArrowLeft,
  Plus,
  Menu,
  Sun,
  Moon,
  X,
  RefreshCw,
  Search,
  Trash2,
  Loader2,
  Terminal,
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
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { FunctionForm } from "./function-form";
import { ImportContract } from "./import-contract";
import { Receipt } from "./receipt";
import { WalletFooter, WalletPanel } from "./wallet-panel";
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
const AgentAccess = dynamic(
  () => import("./agent-access").then((module) => module.AgentAccess),
  { loading: () => <p role="status">Loading agent access…</p> },
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
    [catalogEpoch, setCatalogEpoch] = useState(0),
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
    [accountsOpen, setAccountsOpen] = useState(false),
    [networkOpen, setNetworkOpen] = useState(false),
    [error, setError] = useState<unknown>(null),
    [loading, setLoading] = useState(true),
    [initialised, setInitialised] = useState(false);
  const { address, chainId } = useAccount();
  const { resolvedTheme, setTheme } = useTheme();
  useEffect(() => {
    document.documentElement.dataset.network = network;
  }, [network]);
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
      if (!c)
        throw new Error(
          "Imported contract could not be found. Refresh your workspace.",
        );
      setNetwork(c.network);
      setSelected(id);
    } else {
      const current = data.contracts.find(
        (c: ContractRecord) => c.id === selected,
      );
      const fallback =
        current ??
        data.contracts.find(
          (c: ContractRecord) =>
            c.network === (selected ? network : data.defaultNetwork),
        );
      setNetwork(fallback?.network ?? data.defaultNetwork);
      setSelected(fallback?.id ?? "");
    }
    setCatalogEpoch((previous) => previous + 1);
    setLoading(false);
  }
  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const view = params.get("view");
    if (view && ["functions", "assistant", "agents", "activity"].includes(view))
      setTab(view);
    if (params.get("import") === "1") setImportOpen(true);
    load(params.get("contract") || undefined)
      .then(async () => {
        const planId = params.get("plan");
        if (!planId) return;
        const prepared = await api<TransactionPlan>(`plans/${planId}`);
        setSelected(prepared.contractId);
        setNetwork(prepared.network);
        setPlan(prepared);
      })
      .catch((e) => {
        setError(e);
        setLoading(false);
      })
      .finally(() => setInitialised(true));
  }, []);
  useEffect(() => {
    if (!selected) {
      setCatalog(null);
      setToolId("");
      return;
    }
    setQuery("");
    const controller = new AbortController();
    setCatalog(null);
    setError(null);
    api<Catalog>(`contracts/${selected}`, undefined, "GET", controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setCatalog(data);
        const preferredTool = new URL(window.location.href).searchParams.get(
          "tool",
        );
        setToolId(
          data.tools.find((t) => t.id === preferredTool)?.id ??
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
  }, [selected, catalogEpoch]);
  useEffect(() => {
    if (!initialised) return;
    const url = new URL(window.location.href);
    url.searchParams.set("view", tab);
    if (selected) url.searchParams.set("contract", selected);
    else url.searchParams.delete("contract");
    if (tab !== "functions") url.searchParams.delete("tool");
    else if (catalog?.contract.id === selected) {
      if (toolId) url.searchParams.set("tool", toolId);
      else url.searchParams.delete("tool");
    }
    if (plan) url.searchParams.set("plan", plan.id);
    else url.searchParams.delete("plan");
    url.searchParams.delete("import");
    window.history.replaceState(null, "", url);
  }, [initialised, selected, tab, plan, catalog, toolId]);
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
    setQuery("");
    setPlan(null);
    setNavOpen(false);
    setTab((previous) => (previous === "activity" ? "functions" : previous));
  };
  const changeNetwork = (n: Network) => {
    setNetwork(n);
    setSelected(contracts.find((c) => c.network === n)?.id ?? "");
    setQuery("");
    setPlan(null);
    setNetworkOpen(false);
    setNavOpen(false);
  };
  const submitted = (record: TransactionRecord) => {
    setRecords((previous) =>
      [record, ...previous.filter((r) => r.hash !== record.hash)].slice(0, 50),
    );
    setPlan(null);
  };
  const visibleTools =
    catalog?.tools.filter((t) =>
      t.signature.toLowerCase().includes(query.trim().toLowerCase()),
    ) ?? [];
  const tool = catalog?.tools.find((t) => t.id === toolId);
  const navigate = (value: string) => {
    setPlan(null);
    setTab(value);
    setNavOpen(false);
  };
  const views = [
    { value: "functions", label: "Functions", Icon: Blocks },
    { value: "assistant", label: "Assistant", Icon: MessageCircle },
    { value: "agents", label: "Agent access", Icon: Terminal },
    { value: "activity", label: "Activity", Icon: Activity },
  ];
  const navigation = (
    <div className="flex h-full flex-col p-6">
      <Link href="/" className="mb-8 flex items-center gap-2.5 font-semibold">
        <WorkbenchMark className="size-6" /> Contract Workbench
      </Link>
      <nav aria-label="Mobile workbench" className="space-y-2">
        {views.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => navigate(value)}
            aria-current={tab === value ? "page" : undefined}
            className="wb-nav-item flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm"
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-auto space-y-5 border-t border-border pt-5">
        <HederaIdentity />
        <WalletFooter
          network={network}
          open={() => {
            setNavOpen(false);
            setAccountsOpen(true);
          }}
        />
      </div>
    </div>
  );
  return (
    <div className="wb-shell min-h-screen bg-card" data-network={network}>
      <header className="wb-workspace-header border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-[1800px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation"
              onClick={() => setNavOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <Link
              href={
                selected ? `/?contract=${encodeURIComponent(selected)}` : "/"
              }
              className="flex min-w-0 items-center gap-2.5 text-sm font-semibold tracking-tight"
              aria-label="Contract Workbench home"
            >
              <WorkbenchMark className="size-6 shrink-0" />
              <span className="hidden sm:inline">Contract Workbench</span>
              <span className="sm:hidden">Workbench</span>
            </Link>
            <span className="mx-2 hidden h-5 w-px bg-border md:block" />
            <span className="hidden text-xs text-muted-foreground md:block">
              Workspace
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              className="wb-network-pill min-h-9"
              aria-label={`Change network, current ${network}`}
              onClick={() => setNetworkOpen(true)}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {network === "testnet" ? "Testnet" : "Mainnet"}
              <ChevronDown className="size-3" />
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Toggle light and dark theme"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <Sun className="size-4 dark:hidden" />
              <Moon className="hidden size-4 dark:block" />
            </Button>
            <WalletFooter
              network={network}
              compact
              open={() => setAccountsOpen(true)}
            />
          </div>
        </div>
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 px-4 sm:px-6">
          <nav aria-label="Workbench" className="flex min-w-0 gap-1 sm:gap-5">
            {views.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => navigate(value)}
                aria-current={tab === value ? "page" : undefined}
                className={`wb-workspace-tab relative flex h-12 items-center gap-2 px-1 text-sm font-medium ${tab === value ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="hidden size-4 sm:block" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">
                  {value === "agents" ? "Agents" : label}
                </span>
              </button>
            ))}
          </nav>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setImportOpen(true)}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Import contract</span>
            <span className="sm:hidden">Import</span>
          </Button>
        </div>
      </header>
      <main className="wb-main mx-auto min-w-0 max-w-[1800px]">
        <h1 className="sr-only">Contract Workbench workspace</h1>
        <div className="wb-content">
          {Boolean(error) && (
            <div className="p-4 sm:p-6">
              <ErrorNotice error={error} />
            </div>
          )}
          {tab === "activity" ? (
            <div className="space-y-4 p-4 sm:p-8">
              <h2 className="text-xl font-semibold tracking-tight">Activity</h2>
              {records.filter((record) => record.network === network).length &&
              polling ? (
                records
                  .filter((record) => record.network === network)
                  .map((record) => (
                    <Receipt
                      key={`${record.network}:${record.hash}`}
                      record={record}
                      polling={polling}
                    />
                  ))
              ) : (
                <div className="wb-panel flex min-h-80 flex-col items-center justify-center rounded-2xl bg-card p-8 text-center">
                  <Activity className="mb-5 size-10 text-muted-foreground" />
                  <h2 className="text-xl font-semibold">No transactions yet</h2>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Transactions submitted on {network} appear here. Preparing a
                    transaction does not submit it.
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-6"
                    onClick={() => navigate("functions")}
                  >
                    Explore contracts
                  </Button>
                </div>
              )}
            </div>
          ) : loading || (!catalog && !error && selected) ? (
            <div
              className="wb-panel space-y-5 rounded-2xl bg-card p-6"
              role="status"
              aria-label="Loading contract tools"
            >
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Opening {network} tools…
              </p>
              <div className="wb-skeleton h-10 w-2/3 rounded-xl" />
              <div className="wb-skeleton h-20 rounded-2xl" />
              <div className="wb-skeleton h-32 rounded-2xl" />
            </div>
          ) : catalog ? (
            <>
              <div className="wb-contract-bar flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border bg-muted/30 px-4 py-3 sm:px-6">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="w-full min-w-0 sm:w-80">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Contract
                    </p>
                    <Picker
                      label="Selected contract"
                      placeholder="Choose a contract"
                      value={selected}
                      onChange={select}
                      options={contracts
                        .filter((c) => c.network === network)
                        .map((c) => ({
                          value: c.id,
                          label: c.name,
                          description: c.hederaId || c.address,
                        }))}
                      className="min-h-10 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
                    <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                      <code className="truncate">
                        {catalog.contract.hederaId || catalog.contract.address}
                      </code>
                      <CopyButton
                        value={catalog.contract.address}
                        iconOnly
                        label="Copy contract address"
                      />
                    </div>
                    <details className="relative text-xs text-muted-foreground">
                      <summary className="cursor-pointer">
                        ABI provenance
                      </summary>
                      <p className="absolute left-0 top-6 z-20 w-48 rounded-lg border border-border bg-popover p-3 shadow-lg">
                        {catalog.contract.provenance.source}
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
                              View source
                            </a>
                          </>
                        )}
                      </p>
                    </details>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Refresh ABI"
                    onClick={() => {
                      setPlan(null);
                      api(`contracts/${selected}/refresh`, {})
                        .then(() => {
                          setCatalog(null);
                          return load(selected);
                        })
                        .catch(setError);
                    }}
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
                <TabsContent value="functions" className="mt-0">
                  <div className="grid min-h-[calc(100dvh-200px)] lg:grid-cols-[256px_minmax(0,1fr)]">
                    <section
                      className="min-w-0 space-y-3 border-b border-border bg-muted/30 p-4 lg:border-b-0 lg:border-r"
                      aria-label="Function navigator"
                    >
                      <div className="flex items-center justify-between px-1">
                        <h2 className="text-sm font-semibold">Functions</h2>
                        <span className="hidden text-xs tabular-nums text-muted-foreground lg:inline">
                          {visibleTools.length} / {catalog.tools.length}
                        </span>
                      </div>
                      <div className="hidden h-10 items-center gap-2 rounded-lg border border-input bg-card px-3 focus-within:ring-2 focus-within:ring-ring lg:flex">
                        <Search className="size-4 shrink-0 text-muted-foreground" />
                        <input
                          aria-label="Search functions"
                          placeholder="Filter functions…"
                          type="search"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setQuery("");
                            if (event.key === "Enter" && visibleTools[0]) {
                              setToolId(visibleTools[0].id);
                              setPlan(null);
                            }
                          }}
                          className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-search-cancel-button]:appearance-none"
                        />
                        {query && (
                          <button
                            aria-label="Clear function search"
                            onClick={() => setQuery("")}
                            className="grid size-6 shrink-0 place-items-center rounded-md hover:bg-accent"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="lg:hidden">
                        <Picker
                          label="Function"
                          placeholder="Choose a function"
                          value={toolId}
                          onChange={(id) => {
                            setToolId(id);
                            setPlan(null);
                          }}
                          options={catalog.tools.map((candidate) => ({
                            value: candidate.id,
                            label: candidate.signature,
                          }))}
                        />
                      </div>
                      <div className="hidden max-h-[calc(100dvh-300px)] space-y-0.5 overflow-y-auto lg:block">
                        {visibleTools.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setToolId(t.id);
                              setPlan(null);
                            }}
                            aria-current={toolId === t.id ? "true" : undefined}
                            className={`wb-function-item group flex w-full items-start gap-2 rounded-md px-3 py-2.5 text-left transition-colors ${toolId === t.id ? "" : "hover:bg-muted"}`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block break-words text-sm font-medium">
                                {t.signature.split("(")[0]}
                              </span>
                              <span className="mt-0.5 block break-all font-mono text-[10px] leading-4 text-muted-foreground">
                                {t.signature.slice(t.signature.indexOf("("))}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                      {!visibleTools.length && (
                        <p className="hidden rounded-2xl bg-secondary p-4 text-sm text-muted-foreground lg:block">
                          {query
                            ? `No functions match “${query}”. Try another name.`
                            : "This ABI has no supported functions."}
                        </p>
                      )}
                      {catalog.unsupported.length > 0 && (
                        <details className="text-xs text-muted-foreground">
                          <summary>
                            Unsupported functions ({catalog.unsupported.length})
                          </summary>
                          {catalog.unsupported.map((u) => (
                            <p key={u.name}>
                              {u.name}: {u.reason}
                            </p>
                          ))}
                        </details>
                      )}
                    </section>
                    <div className="min-w-0 p-4 sm:p-6 xl:p-8">
                      {tool ? (
                        <FunctionForm
                          key={`${tool.id}:${tool.revision}`}
                          tool={tool}
                          tools={catalog.tools}
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
                <TabsContent
                  value="assistant"
                  className="mx-auto mt-0 max-w-5xl p-4 sm:p-8"
                >
                  <Assistant
                    key={`${selected}:${catalog.contract.revision}`}
                    contract={catalog.contract}
                    enabled={assistantEnabled}
                    onReview={setPlan}
                  />
                </TabsContent>
                <TabsContent value="agents" className="mt-0 p-4 sm:p-8">
                  <AgentAccess
                    key={`${catalog.contract.id}:${catalog.contract.revision}`}
                    contract={catalog.contract}
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="wb-panel rounded-2xl bg-card p-8">
              <h2 className="font-medium">Choose or import a contract</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {error
                  ? "Your workspace could not be loaded. Retry or import a deployed contract."
                  : "Your typed tools will appear here."}
              </p>
              {Boolean(error) && (
                <Button
                  variant="secondary"
                  className="mt-4 mr-2"
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    load().catch((e) => {
                      setError(e);
                      setLoading(false);
                    });
                  }}
                >
                  Retry workspace
                </Button>
              )}
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
        </div>
      </main>
      <footer className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 sm:px-6">
        <HederaIdentity />
        <p className="max-w-xl text-[10px] leading-4 text-muted-foreground">
          Independent project · Not affiliated with, sponsored or endorsed by
          Hedera Hashgraph, LLC.
        </p>
      </footer>
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side="left"
          className="wb-sidebar w-[280px] bg-[var(--wb-sidebar)] p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Contracts</SheetTitle>
            <SheetDescription>Select a network and contract.</SheetDescription>
          </SheetHeader>
          {navigation}
        </SheetContent>
      </Sheet>
      <WalletPanel
        open={accountsOpen}
        close={() => setAccountsOpen(false)}
        network={network}
      />
      <Sheet open={networkOpen} onOpenChange={setNetworkOpen}>
        <SheetContent
          className="wb-network-drawer w-full gap-6 border-0 bg-card p-6 sm:max-w-[384px]"
          showCloseButton={false}
        >
          <SheetHeader className="relative p-0 text-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-0 top-0"
              aria-label="Back from network selection"
              onClick={() => setNetworkOpen(false)}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <SheetTitle className="pt-3 text-lg">Network</SheetTitle>
            <SheetDescription className="sr-only">
              Select the network for contract tools. Changing network clears the
              current transaction review.
            </SheetDescription>
          </SheetHeader>
          <RadioGroup.Root
            className="mt-4 space-y-2"
            value={network}
            onValueChange={(value) => changeNetwork(value as Network)}
            aria-label="Hedera network"
          >
            {(["mainnet", "testnet"] as Network[]).map((value) => (
              <RadioGroup.Item
                value={value}
                key={value}
                className={`flex min-h-16 w-full items-center justify-between rounded-2xl px-4 py-4 text-lg font-semibold ${network === value ? "bg-secondary" : "hover:bg-secondary"}`}
              >
                <span>{value === "mainnet" ? "Mainnet" : "Testnet"}</span>
                {network === value && (
                  <Check className="size-5 text-[var(--wb-success)]" />
                )}
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
          <p className="text-sm text-muted-foreground">
            {network === "mainnet"
              ? "Mainnet transactions use real HBAR. Your wallet approves each transaction."
              : "Testnet uses test HBAR. Contract reads need no wallet."}
          </p>
          <p className="mt-auto text-xs text-muted-foreground">
            Hedera · chain {network === "mainnet" ? "295" : "296"}
          </p>
        </SheetContent>
      </Sheet>
      <ImportContract
        key={network}
        open={importOpen}
        close={() => setImportOpen(false)}
        initialNetwork={network}
        imported={(id) => {
          setPlan(null);
          return load(id).catch(setError);
        }}
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
