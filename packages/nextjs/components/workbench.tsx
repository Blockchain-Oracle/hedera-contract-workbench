"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { RadioGroup } from "radix-ui";
import { useAccount } from "wagmi";
import { useTheme } from "next-themes";
import {
  Blocks,
  MessageCircle,
  Activity,
  Globe,
  Check,
  ChevronDown,
  ArrowLeft,
  Plus,
  Menu,
  Sun,
  Moon,
  ArrowRightLeft,
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
    [loading, setLoading] = useState(true);
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
      if (!selected) setNetwork(data.defaultNetwork);
      setSelected(
        (previous) => previous || `saucerswap-${data.defaultNetwork}`,
      );
    }
    setCatalogEpoch((previous) => previous + 1);
    setLoading(false);
  }
  useEffect(() => {
    load()
      .then(async () => {
        const planId = new URL(window.location.href).searchParams.get("plan");
        if (!planId) return;
        const prepared = await api<TransactionPlan>(`plans/${planId}`);
        setSelected(prepared.contractId);
        setNetwork(prepared.network);
        setPlan(prepared);
      })
      .catch((e) => {
        setError(e);
        setLoading(false);
      });
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
  }, [selected, catalogEpoch]);
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
    setTab((previous) => (previous === "agents" ? "agents" : "functions"));
  };
  const changeNetwork = (n: Network) => {
    setNetwork(n);
    setSelected(`saucerswap-${n}`);
    setPlan(null);
    setTab("functions");
    setNetworkOpen(false);
    setNavOpen(false);
  };
  const submitted = (record: TransactionRecord) => {
    setRecords((previous) =>
      [record, ...previous.filter((r) => r.hash !== record.hash)].slice(0, 50),
    );
    setPlan(null);
  };
  const tool = catalog?.tools.find((t) => t.id === toolId);
  const navigate = (value: string) => {
    setPlan(null);
    setTab(value);
    setNavOpen(false);
    if (value === "swap" && !selected.startsWith("saucerswap-"))
      setSelected(`saucerswap-${network}`);
  };
  const navigation = (
    <div className="flex h-full flex-col p-6">
      <div className="mb-10 flex items-center gap-2">
        <div
          className="grid size-12 shrink-0 place-items-center rounded-full bg-card"
          aria-label="Contract Workbench"
        >
          <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
            <path
              d="M10 7v18M22 7v18M7 12h18M7 20h18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <button
          onClick={() => {
            setNavOpen(false);
            setNetworkOpen(true);
          }}
          className="wb-network-pill flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
          aria-label={`Change network, current ${network}`}
        >
          {network === "testnet" ? "Testnet" : "Mainnet"}
          <ChevronDown className="size-3" />
        </button>
      </div>
      <nav aria-label="Workbench" className="wb-navigation space-y-3">
        {[
          { value: "functions", label: "Contracts", Icon: Blocks },
          { value: "assistant", label: "Assistant", Icon: MessageCircle },
          { value: "agents", label: "Agent access", Icon: Terminal },
          { value: "swap", label: "Swap", Icon: ArrowRightLeft },
          { value: "activity", label: "Activity", Icon: Activity },
        ].map(({ value, label, Icon }) => (
          <button
            key={value}
            className={`wb-nav-item flex h-12 w-full items-center gap-3 rounded-full px-3 text-left text-lg tracking-[.54px] ${tab === value ? "bg-[var(--wb-nav-active)]" : "hover:bg-[var(--wb-nav-active)]/50"}`}
            aria-current={tab === value ? "page" : undefined}
            onClick={() => navigate(value)}
          >
            <Icon className="size-6 shrink-0" strokeWidth={2.2} />
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-auto space-y-4 pt-10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setNavOpen(false);
              setNetworkOpen(true);
            }}
            className="flex items-center gap-2 text-sm"
          >
            <Globe className="size-4" />
            Network
          </button>
          <button
            className="grid size-9 place-items-center rounded-full hover:bg-[var(--wb-nav-active)]"
            aria-label="Toggle light and dark theme"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            <Sun className="size-4 dark:hidden" />
            <Moon className="hidden size-4 dark:block" />
          </button>
        </div>
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
  const heading =
    tab === "functions"
      ? "Contracts"
      : tab === "assistant"
        ? "Assistant"
        : tab === "agents"
          ? "Agent access"
          : tab === "swap"
            ? "Swap"
            : "Activity";
  const subtitles: Record<string, string> = {
    functions: "Explore your contract. Read, simulate, and prepare.",
    assistant: "A conversation with your contract.",
    agents: "One portable skill. Current tools for your selected contract.",
    swap: "HBAR to SAUCE, through SaucerSwap.",
    activity: "Your submitted transactions, all in one place.",
  };
  return (
    <div className="wb-shell min-h-screen p-3 md:p-8" data-network={network}>
      <div className="mx-auto flex max-w-[1700px] gap-6">
        <aside className="wb-sidebar sticky top-8 hidden h-[calc(100dvh-64px)] min-h-[580px] w-[248px] shrink-0 rounded-[32px] bg-[var(--wb-sidebar)] md:block">
          {navigation}
        </aside>
        <main className="wb-main min-w-0 flex-1 py-1 md:py-4">
          <header className="mb-6 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation"
                onClick={() => setNavOpen(true)}
              >
                <Menu className="size-5" />
              </Button>
              <div>
                <p className="mb-1 hidden text-xs text-muted-foreground md:block">
                  Contract Workbench
                </p>
                <button
                  className="wb-network-pill mb-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold md:hidden"
                  aria-label={`Change network, current ${network}`}
                  onClick={() => setNetworkOpen(true)}
                >
                  {network === "testnet" ? "Testnet" : "Mainnet"}
                  <ChevronDown className="size-3" />
                </button>
                <h1 className="text-[30px] font-bold leading-[34.2px] tracking-[-.75px]">
                  {heading}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {subtitles[tab]}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="shrink-0"
              onClick={() => setImportOpen(true)}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Import contract</span>
              <span className="sm:hidden">Import</span>
            </Button>
          </header>
          <div className="wb-content space-y-6">
            <ErrorNotice error={error} />
            {tab === "activity" ? (
              <div className="space-y-4">
                {records.filter((record) => record.network === network)
                  .length && polling ? (
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
                  <div className="wb-panel flex min-h-80 flex-col items-center justify-center rounded-3xl bg-card p-8 text-center">
                    <Activity className="mb-5 size-10 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">
                      No transactions yet
                    </h2>
                    <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                      Transactions submitted on {network} appear here. Preparing
                      a transaction does not submit it.
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
                className="wb-panel space-y-5 rounded-3xl bg-card p-6"
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
                <div className="wb-secondary-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary p-4">
                  <div className="min-w-0 flex-1">
                    <label htmlFor="contract-navigator" className="sr-only">
                      Selected contract
                    </label>
                    <select
                      id="contract-navigator"
                      className="max-w-full rounded-lg bg-transparent pr-8 text-base font-medium"
                      value={selected}
                      onChange={(e) => select(e.target.value)}
                    >
                      {contracts
                        .filter((c) => c.network === network)
                        .map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <code className="truncate">
                        {catalog.contract.hederaId || catalog.contract.address}
                      </code>
                      <CopyButton
                        value={catalog.contract.address}
                        iconOnly
                        label="Copy contract address"
                      />
                    </div>
                    <details className="mt-1 text-xs text-muted-foreground">
                      <summary className="cursor-pointer">
                        ABI provenance
                      </summary>
                      <p className="mt-2">
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
                  <TabsContent value="functions" className="mt-6">
                    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-4 top-4 size-4 text-muted-foreground" />
                          <Input
                            aria-label="Filter functions"
                            placeholder="Find a function…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-10"
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
                        {!catalog.tools.some((candidate) =>
                          candidate.signature
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                        ) && (
                          <p className="rounded-2xl bg-secondary p-4 text-sm text-muted-foreground">
                            {query
                              ? `No functions match “${query}”. Try another name.`
                              : "This ABI has no supported functions."}
                          </p>
                        )}
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
                      <div className="wb-panel min-w-0 rounded-3xl bg-card p-5 md:p-6">
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
                  <TabsContent value="agents" className="mt-6">
                    <AgentAccess
                      key={`${catalog.contract.id}:${catalog.contract.revision}`}
                      contract={catalog.contract}
                    />
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="wb-panel rounded-3xl bg-card p-8">
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
                  <Check className="size-5 text-[#0ca35d] dark:text-[#47e299]" />
                )}
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
          <p className="text-sm text-muted-foreground">
            {network === "mainnet"
              ? "Mainnet transactions use real HBAR. Your wallet approves each transaction."
              : "Testnet uses test HBAR. Reads and quotes need no wallet."}
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
