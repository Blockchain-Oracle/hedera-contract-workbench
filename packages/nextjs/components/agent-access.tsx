"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Loader2, Terminal } from "lucide-react";
import type { ContractRecord, skillView } from "@sh/core";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Picker } from "./picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { AgentMark, agentName } from "./identity";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton, ErrorNotice } from "./result";

type SkillView = Awaited<ReturnType<typeof skillView>>;

function Command({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-background p-4 text-xs leading-6">
        <code>{value}</code>
      </pre>
    </div>
  );
}

export function AgentAccess({
  contract,
  initialToolId,
}: {
  contract: ContractRecord;
  initialToolId?: string;
}) {
  const [view, setView] = useState<SkillView | null>(null),
    [error, setError] = useState<unknown>(null),
    [attempt, setAttempt] = useState(0),
    [agent, setAgent] = useState("codex"),
    [toolId, setToolId] = useState(""),
    [argumentsText, setArgumentsText] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setView(null);
    setError(null);
    api<SkillView>(
      `skills?contract=${encodeURIComponent(contract.id)}`,
      undefined,
      "GET",
      controller.signal,
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        if (
          data.contract.id !== contract.id ||
          data.contract.revision !== contract.revision
        )
          throw new ApiError(
            "The contract changed while loading its tools. Refresh the ABI to load its current revision.",
            "STALE_REVISION",
          );
        setView(data);
        setToolId(
          data.tools.find((tool) => tool.id === initialToolId)?.id ??
            data.tools.find(
              (tool) => !tool.needsInput && tool.action === "read",
            )?.id ??
            data.tools[0]?.id ??
            "",
        );
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure);
      });
    return () => controller.abort();
  }, [contract.id, contract.revision, initialToolId, attempt]);
  const tool = view?.tools.find((candidate) => candidate.id === toolId);
  useEffect(() => {
    setArgumentsText(
      tool?.templateAvailable ? JSON.stringify(tool.template, null, 2) : "",
    );
  }, [tool]);
  if (!view)
    return (
      <section className="wb-panel space-y-4 rounded-2xl bg-card p-6">
        {error ? (
          <>
            <ErrorNotice error={error} />
            <Button
              variant="secondary"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry agent access
            </Button>
          </>
        ) : (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            Loading the current contract skill and tools…
          </p>
        )}
      </section>
    );
  const install = view.skill.install.find(
    (candidate) => candidate.agent === agent,
  )!;
  return (
    <div className="min-w-0 space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          Your contract, in your tools.
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Install a skill, connect MCP, or copy a command for the current
          function.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          {view.tools.length} current tools · Hedera {view.contract.network} ·{" "}
          <span title={view.contract.revision}>
            Revision {view.contract.revision.slice(0, 10)}
          </span>
        </p>
      </header>
      <Tabs defaultValue="connect" className="min-w-0 gap-6">
        <TabsList
          variant="line"
          aria-label="Agent setup sections"
          className="max-w-full gap-0"
        >
          <TabsTrigger value="connect" className="px-2 text-sm sm:px-3">
            Connect
          </TabsTrigger>
          <TabsTrigger value="cli" className="px-2 text-sm sm:px-3">
            CLI commands
          </TabsTrigger>
          <TabsTrigger value="skill" className="px-2 text-sm sm:px-3">
            Skill & references
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="connect"
          className="mt-0 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
        >
          <section className="min-w-0 space-y-5">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Terminal className="size-4" /> Connect your agent
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Choose your host. Run the command from the project where you want
              the skill installed.
            </p>
            <div
              role="group"
              aria-label="Choose your agent"
              className="grid grid-cols-3 gap-2"
            >
              {view.skill.install.map((option) => (
                <button
                  key={option.agent}
                  aria-pressed={agent === option.agent}
                  onClick={() => setAgent(option.agent)}
                  className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border px-2 py-3 text-xs transition-colors ${agent === option.agent ? "border-ring bg-accent font-semibold" : "border-border hover:bg-muted"}`}
                >
                  <AgentMark agent={option.agent} />
                  <span>{agentName(option.agent)}</span>
                </button>
              ))}
            </div>
            <Command label="Install skill" value={install.shell} />
            <p className="text-xs leading-5 text-muted-foreground">
              Vercel’s skills CLI copies the local skill to your agent’s project
              folder. Other hosts:{" "}
              <code>skills install-command --agent &lt;agent-id&gt;</code>.
            </p>
            <details className="border-t border-border pt-4 text-sm">
              <summary className="cursor-pointer font-medium">
                Export a portable contract bundle
              </summary>
              <div className="mt-4 space-y-3">
                <Command
                  label="Export full contract bundle"
                  value={view.commands.export.shell}
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Creates a new local folder with the skill, current catalog,
                  argument files and installation commands. Existing bundles are
                  preserved.
                </p>
              </div>
            </details>
          </section>
          <aside className="min-w-0 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <h3 className="text-sm font-semibold">How the skill works</h3>
            <ol className="mt-5 space-y-5 text-sm">
              <li>
                <span className="font-medium">1. Discover the catalog</span>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Find the selected network, ABI revision and current functions.
                </p>
              </li>
              <li>
                <span className="font-medium">2. Inspect before calling</span>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Read argument schemas. Use actual getter results for unknown
                  values.
                </p>
              </li>
              <li>
                <span className="font-medium">3. Read or prepare</span>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Reads execute directly. Transactions go to your wallet for
                  approval.
                </p>
              </li>
            </ol>
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-sm font-semibold">Prefer MCP?</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Run from the installed workbench. Add the returned server
                configuration to your host’s MCP settings.
              </p>
              <div className="mt-4">
                <Command
                  label="MCP configuration"
                  value="npm run --silent workbench -- mcp config --json"
                />
              </div>
            </div>
          </aside>
        </TabsContent>
        <TabsContent value="skill" className="mt-0 max-w-3xl space-y-5">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <FileText className="size-4" /> Portable skill
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            One set of instructions for every supported ABI. Your agent
            discovers the current schema before acting. Imported contracts
            change the catalog, not the skill.
          </p>
          <div className="flex flex-wrap gap-2">
            <CopyButton value={view.markdown} label="Copy SKILL.md" />
            <Button variant="outline" size="sm" asChild>
              <a
                href={`/api/workbench/skills/markdown?contract=${encodeURIComponent(contract.id)}`}
                download="SKILL.md"
              >
                <Download className="size-4" /> Download SKILL.md
              </a>
            </Button>
          </div>
          <details open className="text-sm">
            <summary className="cursor-pointer font-medium">
              Read SKILL.md
            </summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-background p-4 text-xs leading-6">
              {view.markdown}
            </pre>
          </details>
          {Object.entries(view.references).map(([path, markdown]) => (
            <details key={path} className="border-t border-border pt-4 text-sm">
              <summary className="cursor-pointer break-all font-medium">
                {path}
              </summary>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background p-4 text-xs leading-6">
                {markdown}
              </pre>
            </details>
          ))}
        </TabsContent>
        <TabsContent value="cli" className="mt-0 space-y-6">
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Inspect the current schema, enter your intended arguments, then copy
            its command. Integers are decimal strings; native HBAR is separate.
          </p>
          <details className="border-b border-border pb-4 text-sm">
            <summary className="cursor-pointer font-medium">
              Discover all current tools
            </summary>
            <div className="mt-4">
              <Command
                label="Discover current tools"
                value={view.commands.list.shell}
              />
            </div>
          </details>
          {tool ? (
            <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <section className="min-w-0 space-y-5" aria-label="CLI arguments">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Function signature
                  </label>
                  <Picker
                    label="Function signature"
                    value={toolId}
                    onChange={setToolId}
                    options={view.tools.map((candidate) => ({
                      value: candidate.id,
                      label: candidate.signature,
                    }))}
                  />
                </div>
                {tool.templateAvailable ? (
                  <div className="space-y-3">
                    <label className="block space-y-2 text-sm">
                      <span className="font-medium">Argument example JSON</span>
                      <Textarea
                        className="min-h-40 font-mono text-xs"
                        spellCheck={false}
                        value={argumentsText}
                        onChange={(event) =>
                          setArgumentsText(event.target.value)
                        }
                      />
                    </label>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CopyButton
                        value={argumentsText}
                        label="Copy argument JSON"
                      />
                    </div>
                    <p className="break-all text-xs leading-5 text-muted-foreground">
                      Save as <code>{tool.argumentsFile}</code> relative to your
                      terminal’s current folder. Replace shape examples with
                      real arguments; example IDs are not discovered values.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {tool.templateError}
                  </p>
                )}
                <details className="border-t border-border pt-4 text-sm">
                  <summary className="cursor-pointer font-medium">
                    Input and output schemas
                  </summary>
                  <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-background p-4 text-xs leading-6">
                    {JSON.stringify(
                      { input: tool.inputSchema, output: tool.outputSchema },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </section>
              <section
                className="min-w-0 space-y-5 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
                aria-label="Generated CLI commands"
              >
                <Command
                  label="Inspect schema"
                  value={tool.commands.inspect.shell}
                />
                <Command
                  label={
                    tool.action === "read"
                      ? "Read contract"
                      : "Prepare wallet review"
                  }
                  value={tool.commands.execute.shell}
                />
                {tool.commands.simulate && (
                  <Command
                    label="Simulate transaction"
                    value={tool.commands.simulate.shell}
                  />
                )}
                {tool.action === "prepare" ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    Replace <code>WALLET_ADDRESS</code> with the intended
                    sender. Review any <code>--value-hbar 0</code> example. Your
                    browser wallet signs and submits.
                  </p>
                ) : (
                  <p className="text-xs leading-5 text-muted-foreground">
                    This read uses the selected network and revision. It
                    requires no wallet or model key.
                  </p>
                )}
              </section>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This ABI has no supported functions.
            </p>
          )}
          {view.unsupported.length > 0 && (
            <details className="text-sm">
              <summary>
                Unsupported functions ({view.unsupported.length})
              </summary>
              {view.unsupported.map((item) => (
                <p
                  key={item.name}
                  className="mt-2 text-xs text-muted-foreground"
                >
                  {item.name}: {item.reason}
                </p>
              ))}
            </details>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
