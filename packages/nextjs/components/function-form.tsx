"use client";
import { useEffect, useRef, useState } from "react";
import type {
  ContractRecord,
  ExecutionResult,
  Json,
  ToolDefinition,
  TransactionPlan,
} from "@sh/core";
import { useAccount } from "wagmi";
import { argumentIssues, validateValue, parseHbar } from "@sh/core/validation";
import { InputAssistance } from "./input-assistance";
import { Loader2, Play, FileCheck, FlaskConical } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { TypedInput, initialValue } from "./typed-input";
import { ErrorNotice, ResultCard, CopyButton } from "./result";
export function FunctionForm({
  tool,
  contract,
  tools,
  onReview,
  invalidate,
}: {
  tool: ToolDefinition;
  contract: ContractRecord;
  tools: ToolDefinition[];
  onReview: (p: TransactionPlan) => void;
  invalidate: () => void;
}) {
  const { address } = useAccount();
  const [args, setArgs] = useState<Record<string, Json>>(() =>
    Object.fromEntries(tool.parameters.map((p) => [p.key, initialValue(p)])),
  );
  const [caller, setCaller] = useState(""),
    [valueHbar, setValue] = useState("0"),
    [pending, setPending] = useState(""),
    [error, setError] = useState<unknown>(null),
    [result, setResult] = useState<ExecutionResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [contextErrors, setContextErrors] = useState<Record<string, string>>(
    {},
  );
  const [callerOpen, setCallerOpen] = useState(false);
  const issues = argumentIssues(tool.parameters, args);
  const fieldErrors = Object.fromEntries(
    issues
      .filter((i) => submitted || touched[i.path.replace(/^arguments\./, "")])
      .map((i) => [i.path.replace(/^arguments\./, ""), i.message]),
  );
  const effectiveCaller =
    tool.action === "read"
      ? caller.trim() || undefined
      : address || caller.trim() || undefined;
  const [simulation, setSimulation] = useState(false);
  const request = useRef<{ controller?: AbortController }>({});
  useEffect(() => {
    request.current.controller?.abort();
    setPending("");
    setResult(null);
    setError(null);
    return () => request.current.controller?.abort();
  }, [address, tool.id, tool.revision]);
  useEffect(() => {
    setArgs(
      Object.fromEntries(tool.parameters.map((p) => [p.key, initialValue(p)])),
    );
    setValue("0");
    setCaller("");
    setSubmitted(false);
    setTouched({});
    setContextErrors({});
    setCallerOpen(false);
  }, [tool.id, tool.revision]);
  function changed() {
    request.current.controller?.abort();
    setPending("");
    invalidate();
    setResult(null);
    setError(null);
    setContextErrors({});
  }
  async function run(action: "call" | "simulate" | "prepare") {
    request.current.controller?.abort();
    setSubmitted(true);
    const problems: Record<string, string> = {};
    if (action !== "call" && !effectiveCaller)
      problems.from = "Enter the intended sender address or connect a wallet.";
    if (effectiveCaller) {
      try {
        validateValue(
          { key: "from", name: "Read as address", type: "address", schema: {} },
          effectiveCaller,
          "from",
        );
      } catch (failure) {
        problems.from = (failure as Error).message;
      }
    }
    try {
      parseHbar(valueHbar);
    } catch (failure) {
      problems.valueHbar = (failure as Error).message;
    }
    setContextErrors(problems);
    if (problems.from) setCallerOpen(true);
    setError(null);
    if (issues.length || Object.keys(problems).length) {
      setResult(null);
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(),
      );
      return;
    }
    const controller = new AbortController();
    request.current.controller = controller;
    setPending(action);
    setError(null);
    setResult(null);
    try {
      const result = await api(
        `tools/${tool.id}/${action}`,
        {
          arguments: args,
          revision: tool.revision,
          from: effectiveCaller,
          valueHbar,
        },
        "POST",
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (action === "prepare") onReview(result);
      else {
        setResult(result);
        setSimulation(action === "simulate");
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        const failure = e as { path?: string; message?: string };
        if (failure.path?.startsWith("arguments."))
          setTouched((previous) => ({
            ...previous,
            [failure.path!.slice(10)]: true,
          }));
        else if (failure.path === "from" || failure.path === "valueHbar") {
          setContextErrors({
            [failure.path]: failure.message || "Check this value.",
          });
          if (failure.path === "from") setCallerOpen(true);
        }
        setError(e);
      }
    } finally {
      if (request.current.controller === controller) setPending("");
    }
  }
  const compactRead = tool.action === "read" && tool.parameters.length === 0;
  return (
    <InputAssistance.Provider value={{ tools, targetId: tool.id, address }}>
      <div className="space-y-6">
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground">
            Hedera {contract.network} ·{" "}
            {tool.action === "read"
              ? "No transaction required"
              : "Wallet approval required"}
          </p>
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 break-words text-[30px] font-semibold leading-[1.14] tracking-[-0.75px]">
              {tool.signature.split("(")[0]}
            </h2>
            <CopyButton value={tool.id} label="Copy tool ID" iconOnly />
          </div>
          <p className="break-all font-mono text-xs text-muted-foreground">
            {tool.signature}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {tool.action === "read"
              ? "Read from the selected contract. No wallet or model key required."
              : "Simulate with a caller, then prepare an unsigned plan for wallet approval."}
          </p>
        </div>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void run(tool.action === "read" ? "call" : "prepare");
          }}
          className={compactRead ? "space-y-5" : "space-y-6"}
          aria-busy={!!pending}
        >
          {!compactRead && (
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-4">
              <h3 className="text-base font-medium">Arguments</h3>
              <span className="text-xs text-muted-foreground">
                {tool.parameters.length}{" "}
                {tool.parameters.length === 1 ? "argument" : "arguments"}
              </span>
            </div>
          )}
          <FieldGroup className={compactRead ? "gap-3" : undefined}>
            {tool.parameters.map((p) => (
              <TypedInput
                key={p.key}
                parameter={p}
                value={args[p.key]}
                path={p.key}
                errors={fieldErrors}
                onTouch={(path) =>
                  setTouched((previous) => ({ ...previous, [path]: true }))
                }
                onChange={(value) => {
                  changed();
                  setArgs({ ...args, [p.key]: value });
                }}
              />
            ))}
            {tool.parameters.length === 0 && (
              <p
                className={
                  compactRead
                    ? "text-sm text-muted-foreground"
                    : "rounded-2xl bg-muted p-4 text-sm text-muted-foreground"
                }
              >
                No arguments needed.
              </p>
            )}
            {tool.action === "read" ? (
              <details
                open={callerOpen}
                onToggle={(event) => setCallerOpen(event.currentTarget.open)}
                className="rounded-2xl bg-muted/40 p-3"
              >
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Caller context · optional
                </summary>
                <Field
                  className="mt-4"
                  data-invalid={!!contextErrors.from || undefined}
                >
                  <FieldLabel htmlFor="caller">Read as address</FieldLabel>
                  <Input
                    id="caller"
                    className="font-mono"
                    placeholder="0x…"
                    value={caller}
                    aria-invalid={!!contextErrors.from || undefined}
                    aria-describedby={
                      contextErrors.from ? "caller-error" : "caller-help"
                    }
                    onChange={(e) => {
                      changed();
                      setCaller(e.target.value);
                    }}
                  />
                  <FieldDescription id="caller-help">
                    Ordinary reads do not use your wallet. Set this only to read
                    caller-scoped state.
                  </FieldDescription>
                  {address && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        changed();
                        setCaller(address);
                      }}
                    >
                      Use connected wallet for this read
                    </Button>
                  )}
                  {contextErrors.from && (
                    <FieldError id="caller-error">
                      {contextErrors.from}
                    </FieldError>
                  )}
                </Field>
              </details>
            ) : (
              <Field data-invalid={!!contextErrors.from || undefined}>
                <FieldLabel htmlFor="caller">Transaction sender</FieldLabel>
                <Input
                  id="caller"
                  className="font-mono"
                  placeholder="0x…"
                  value={address || caller}
                  readOnly={!!address}
                  aria-invalid={!!contextErrors.from || undefined}
                  aria-describedby={
                    contextErrors.from ? "caller-error" : undefined
                  }
                  onChange={(e) => {
                    changed();
                    setCaller(e.target.value);
                  }}
                />
                <FieldDescription>
                  The intended wallet account on {contract.network}; used for
                  simulation and wallet review.
                </FieldDescription>
                {contextErrors.from && (
                  <FieldError id="caller-error">
                    {contextErrors.from}
                  </FieldError>
                )}
              </Field>
            )}
            {tool.mutability === "payable" && (
              <Field data-invalid={!!contextErrors.valueHbar || undefined}>
                <FieldLabel htmlFor="value-hbar">
                  Transaction value · HBAR
                </FieldLabel>
                <Input
                  id="value-hbar"
                  aria-invalid={!!contextErrors.valueHbar || undefined}
                  aria-describedby={
                    contextErrors.valueHbar ? "value-error" : undefined
                  }
                  inputMode="decimal"
                  value={valueHbar}
                  onChange={(e) => {
                    changed();
                    setValue(e.target.value);
                  }}
                />
                <FieldDescription>
                  Up to 8 decimal places. Converted to JSON-RPC weibar
                  separately from ABI arguments.
                </FieldDescription>
                {contextErrors.valueHbar && (
                  <FieldError id="value-error">
                    {contextErrors.valueHbar}
                  </FieldError>
                )}
              </Field>
            )}
          </FieldGroup>
          <ErrorNotice error={error} />
          <div className="flex flex-wrap gap-3 border-t border-border pt-5">
            <Button
              type="submit"
              disabled={!!pending}
              className="min-w-44 flex-1 sm:flex-none"
            >
              {pending === "call" || pending === "prepare" ? (
                <>
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  {pending === "call"
                    ? "Reading function…"
                    : "Preparing review…"}
                </>
              ) : tool.action === "read" ? (
                <>
                  <Play className="size-4" />
                  Run function
                </>
              ) : (
                <>
                  <FileCheck className="size-4" />
                  Review transaction
                </>
              )}
            </Button>
            {(tool.action === "prepare" || !!effectiveCaller) && (
              <Button
                type="button"
                variant="secondary"
                disabled={!!pending || !effectiveCaller}
                onClick={() => run("simulate")}
              >
                {pending === "simulate" ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <FlaskConical className="size-4" />
                )}
                {pending === "simulate" ? "Simulating…" : "Simulate"}
              </Button>
            )}
          </div>
          {tool.action === "prepare" && (
            <p className="text-xs text-muted-foreground">
              Review on {contract.network}; your browser wallet signs and
              submits.
            </p>
          )}
        </form>
        {result && <ResultCard result={result} simulation={simulation} />}
        <details className="border-t border-border pt-5 text-xs">
          <summary className="cursor-pointer font-medium text-muted-foreground">
            Developer details · schema and positional mapping
          </summary>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-4">
            {JSON.stringify(
              {
                toolId: tool.id,
                revision: tool.revision,
                input: tool.inputSchema,
                output: tool.outputSchema,
              },
              null,
              2,
            )}
          </pre>
        </details>
      </div>
    </InputAssistance.Provider>
  );
}
