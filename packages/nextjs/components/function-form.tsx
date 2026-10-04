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
      <div className="wb-function-form space-y-6">
        <header className="space-y-3 border-b border-border pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-words text-2xl font-semibold tracking-tight">
                {tool.signature.split("(")[0]}
              </h2>
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                {tool.signature}
              </p>
            </div>
            <CopyButton value={tool.id} label="Copy tool ID" iconOnly />
          </div>
          <p className="text-xs text-muted-foreground">
            Hedera {contract.network} ·{" "}
            {tool.action === "read"
              ? "No transaction required"
              : "Wallet approval required"}
          </p>
        </header>
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void run(tool.action === "read" ? "call" : "prepare");
              }}
              className="space-y-5"
              aria-busy={!!pending}
            >
              {!compactRead && (
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Arguments</h3>
                  <span className="text-xs text-muted-foreground">
                    {tool.parameters.length}{" "}
                    {tool.parameters.length === 1 ? "argument" : "arguments"}
                  </span>
                </div>
              )}
              <FieldGroup className={compactRead ? "gap-3" : "gap-5"}>
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
                    onToggle={(event) =>
                      setCallerOpen(event.currentTarget.open)
                    }
                    className="border-t border-border pt-3"
                  >
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      Read as another account
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
                        Ordinary reads do not use your wallet. Set this only to
                        read caller-scoped state.
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
                      The intended wallet account on {contract.network}; used
                      for simulation and wallet review.
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
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={!!pending}
                  className="h-10 min-w-40 flex-1 sm:flex-none"
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
            <details className="border-t border-border pt-4 text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground">
                Tool schema & CLI
              </summary>
              <div className="my-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Inspect this function from your terminal
                </span>
                <CopyButton
                  value={`npm run --silent workbench -- tools inspect ${tool.id} --json`}
                  label="Copy inspect command"
                />
              </div>
              <pre className="mb-3 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-background p-3 text-xs">
                <code>{`npm run --silent workbench -- tools inspect ${tool.id} --json`}</code>
              </pre>
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
          <section
            className="min-w-0 space-y-4 border-t border-border pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0"
            aria-label="Function response"
          >
            <div className="flex items-center justify-between text-sm">
              <h3 className="font-semibold">Response</h3>
              <span className="font-mono text-xs text-muted-foreground">
                {tool.outputs.length}{" "}
                {tool.outputs.length === 1 ? "return value" : "return values"}
              </span>
            </div>
            <ErrorNotice error={error} />
            {result ? (
              <ResultCard result={result} simulation={simulation} />
            ) : (
              <div
                className="space-y-5 rounded-lg border border-border bg-background p-5"
                aria-busy={!!pending}
              >
                {pending ? (
                  <p role="status" className="flex items-center gap-2 text-sm">
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    {pending === "simulate"
                      ? "Simulating…"
                      : pending === "prepare"
                        ? "Preparing wallet review…"
                        : "Waiting for the contract…"}
                  </p>
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {tool.action === "read"
                      ? "Run this function to see its live response."
                      : "Simulate to inspect the response. Prepared transactions open in wallet review."}
                  </p>
                )}
                {tool.outputs.length > 0 && (
                  <dl className="space-y-3 border-t border-border pt-4">
                    {tool.outputs.map((output, index) => (
                      <div
                        key={output.key}
                        className="flex min-w-0 justify-between gap-4 text-xs"
                      >
                        <dt className="min-w-0 break-all text-muted-foreground">
                          {output.name || `Return ${index + 1}`}
                        </dt>
                        <dd className="break-all font-mono">{output.type}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </InputAssistance.Provider>
  );
}
