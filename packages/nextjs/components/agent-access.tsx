"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Loader2, Terminal } from "lucide-react";
import type { ContractRecord, skillView } from "@sh/core";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <pre className="overflow-x-auto rounded-2xl bg-muted p-4 text-xs leading-6">
        <code>{value}</code>
      </pre>
    </div>
  );
}

export function AgentAccess({ contract }: { contract: ContractRecord }) {
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
        setToolId(data.tools[0]?.id ?? "");
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure);
      });
    return () => controller.abort();
  }, [contract.id, contract.revision, attempt]);
  const tool = view?.tools.find((candidate) => candidate.id === toolId);
  useEffect(() => {
    setArgumentsText(
      tool?.templateAvailable ? JSON.stringify(tool.template, null, 2) : "",
    );
  }, [tool]);
  if (!view)
    return (
      <section className="wb-panel space-y-4 rounded-3xl bg-card p-6">
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
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{view.contract.network}</Badge>
        <span className="break-all">Revision {view.contract.revision}</span>
        <span>{view.tools.length} current tools</span>
      </div>
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <section className="wb-panel min-w-0 space-y-5 rounded-3xl bg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileText className="size-5" /> Portable skill
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The same instructions work for every supported ABI. Your agent
            discovers the current contract, inspects its schema, then reads or
            prepares a wallet review.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton value={view.markdown} label="Copy SKILL.md" />
            <Button variant="secondary" size="sm" asChild>
              <a
                href={`/api/workbench/skills/markdown?contract=${encodeURIComponent(contract.id)}`}
                download="SKILL.md"
              >
                <Download className="size-4" /> Download SKILL.md
              </a>
            </Button>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">
              Read SKILL.md
            </summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-muted p-4 text-xs leading-6">
              {view.markdown}
            </pre>
          </details>
          {Object.entries(view.references).map(([path, markdown]) => (
            <details key={path} className="text-sm">
              <summary className="cursor-pointer break-all">{path}</summary>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-muted p-4 text-xs leading-6">
                {markdown}
              </pre>
            </details>
          ))}
        </section>
        <section className="wb-panel min-w-0 space-y-5 rounded-3xl bg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Terminal className="size-5" /> Connect your agent
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Run this command from the project where you want the skill
            installed. Vercel’s skills CLI copies the local skill into your
            agent’s project folder.
          </p>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Agent</span>
            <select
              className="w-full rounded-xl border border-border bg-muted p-3"
              value={agent}
              onChange={(event) => setAgent(event.target.value)}
            >
              {view.skill.install.map((option) => (
                <option key={option.agent} value={option.agent}>
                  {option.agent === "codex"
                    ? "Codex"
                    : option.agent === "claude-code"
                      ? "Claude Code"
                      : "Cursor"}
                </option>
              ))}
            </select>
          </label>
          <Command label="Install skill" value={install.shell} />
          <p className="text-xs leading-relaxed text-muted-foreground">
            These are examples. Other compatible hosts are available through CLI{" "}
            <code>skills install-command --agent &lt;agent-id&gt;</code>. No
            hosted service is needed.
          </p>
          <Command
            label="Export full contract bundle"
            value={view.commands.export.shell}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Export creates a new local folder containing the skill, current
            catalog and argument files. Its output includes installation
            commands for that bundle.
          </p>
        </section>
      </div>
      <section className="wb-panel min-w-0 space-y-5 rounded-3xl bg-card p-5 sm:p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Current CLI tools</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Integers are decimal strings. Replace example values with your
            intended arguments. Native HBAR is separate; write commands prepare,
            and your browser wallet signs.
          </p>
        </div>
        <Command
          label="Discover current tools"
          value={view.commands.list.shell}
        />
        {tool ? (
          <>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Function signature</span>
              <select
                className="w-full min-w-0 rounded-xl border border-border bg-muted p-3 font-mono text-xs"
                value={toolId}
                onChange={(event) => setToolId(event.target.value)}
              >
                {view.tools.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.signature}
                  </option>
                ))}
              </select>
            </label>
            <Command
              label="Inspect schema"
              value={tool.commands.inspect.shell}
            />
            {tool.templateAvailable ? (
              <div className="space-y-3">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Argument example JSON</span>
                  <Textarea
                    className="min-h-32 font-mono text-xs"
                    spellCheck={false}
                    value={argumentsText}
                    onChange={(event) => setArgumentsText(event.target.value)}
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <CopyButton
                    value={argumentsText}
                    label="Copy argument JSON"
                  />
                  <p className="break-all text-xs text-muted-foreground">
                    Save as <code>{tool.argumentsFile}</code> relative to your
                    terminal’s current folder.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {tool.templateError}
              </p>
            )}
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
            {tool.action === "prepare" && (
              <p className="text-xs text-muted-foreground">
                Replace <code>WALLET_ADDRESS</code> with the intended sender.
                Review any <code>--value-hbar 0</code> example before preparing.
              </p>
            )}
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">
                Input and output schemas
              </summary>
              <pre className="mt-3 max-h-96 overflow-auto rounded-2xl bg-muted p-4 text-xs leading-6">
                {JSON.stringify(
                  { input: tool.inputSchema, output: tool.outputSchema },
                  null,
                  2,
                )}
              </pre>
            </details>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            This ABI has no supported functions.
          </p>
        )}
        {view.unsupported.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer">
              Unsupported functions ({view.unsupported.length})
            </summary>
            {view.unsupported.map((item) => (
              <p
                key={item.name}
                className="mt-2 break-words text-xs text-muted-foreground"
              >
                {item.name}: {item.reason}
              </p>
            ))}
          </details>
        )}
      </section>
    </div>
  );
}
