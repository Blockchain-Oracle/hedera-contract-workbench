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
import { Loader2, Play, FileCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { TypedInput, initialValue } from "./typed-input";
import { ErrorNotice, ResultCard, CopyButton } from "./result";
export function FunctionForm({
  tool,
  contract,
  onReview,
  invalidate,
}: {
  tool: ToolDefinition;
  contract: ContractRecord;
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
  const [simulation, setSimulation] = useState(false);
  const request = useRef<{ controller?: AbortController }>({});
  useEffect(() => {
    request.current.controller?.abort();
    setPending("");
    setResult(null);
    return () => request.current.controller?.abort();
  }, [address, tool.id, tool.revision]);
  function changed() {
    request.current.controller?.abort();
    setPending("");
    invalidate();
    setResult(null);
    setError(null);
  }
  async function run(action: "call" | "simulate" | "prepare") {
    request.current.controller?.abort();
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
          from: address || caller || undefined,
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
      if (!controller.signal.aborted) setError(e);
    } finally {
      if (request.current.controller === controller) setPending("");
    }
  }
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="break-all font-mono text-lg font-semibold">
            {tool.signature}
          </h2>
          <CopyButton value={tool.id} label="Tool ID" />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {tool.action === "read"
            ? "Read from the selected contract. No wallet or model key required."
            : "Simulate with a caller, then prepare an unsigned plan for wallet approval."}
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(tool.action === "read" ? "call" : "prepare");
        }}
        className="space-y-6"
      >
        <FieldGroup>
          {tool.parameters.map((p) => (
            <TypedInput
              key={p.key}
              parameter={p}
              value={args[p.key]}
              path={p.key}
              onChange={(value) => {
                changed();
                setArgs({ ...args, [p.key]: value });
              }}
            />
          ))}
          {tool.parameters.length === 0 && (
            <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              This function takes no arguments.
            </p>
          )}
          <Field>
            <FieldLabel htmlFor="caller">
              {address
                ? "Connected caller"
                : `Caller address${tool.action === "read" ? " (optional)" : ""}`}
            </FieldLabel>
            <Input
              id="caller"
              className="font-mono"
              placeholder="0x…"
              value={address || caller}
              readOnly={!!address}
              onChange={(e) => {
                changed();
                setCaller(e.target.value);
              }}
            />
            <FieldDescription>
              Caller-scoped functions use this address during execution.
            </FieldDescription>
          </Field>
          {tool.mutability === "payable" && (
            <Field>
              <FieldLabel htmlFor="value-hbar">
                Transaction value · HBAR
              </FieldLabel>
              <Input
                id="value-hbar"
                inputMode="decimal"
                value={valueHbar}
                onChange={(e) => {
                  changed();
                  setValue(e.target.value);
                }}
              />
              <FieldDescription>
                Up to 8 decimal places. Converted to JSON-RPC weibar separately
                from ABI arguments.
              </FieldDescription>
            </Field>
          )}
        </FieldGroup>
        <ErrorNotice error={error} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!!pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {tool.action === "read" ? (
              <>
                <Play className="size-4" />
                Read function
              </>
            ) : (
              <>
                <FileCheck className="size-4" />
                Prepare transaction
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!!pending || !(address || caller)}
            onClick={() => run("simulate")}
          >
            Simulate
          </Button>
        </div>
        {tool.action === "prepare" && (
          <p className="text-xs text-muted-foreground">
            Review on {contract.network}; your browser wallet signs and submits.
          </p>
        )}
      </form>
      {result && <ResultCard result={result} simulation={simulation} />}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">
          Schemas and positional mapping
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
  );
}
