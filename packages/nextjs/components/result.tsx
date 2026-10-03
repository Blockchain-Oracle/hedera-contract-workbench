"use client";
import { useState } from "react";
import { Copy, Check, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import type { ExecutionResult, TransactionPlan } from "@sh/core";
export function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null;
  const e = error as {
    message?: string;
    code?: string;
    path?: string;
    nextAction?: string;
  };
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle className="size-4" />
      <AlertTitle>
        {e.code?.replaceAll("_", " ") || "Unable to continue"}
      </AlertTitle>
      <AlertDescription>
        <p>{e.message || String(error)}</p>
        {e.path && <p className="font-mono text-xs">{e.path}</p>}
        {e.nextAction && <p>{e.nextAction}</p>}
      </AlertDescription>
    </Alert>
  );
}
export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </Button>
  );
}
function ValueTree({ value }: { value: unknown }) {
  if (value && typeof value === "object")
    return (
      <dl className="divide-y rounded-md border">
        {Object.entries(value).map(([key, child]) => (
          <div
            key={key}
            className="grid grid-cols-[minmax(50px,1fr)_minmax(0,3fr)] gap-4 p-3 text-sm"
          >
            <dt className="break-all font-mono text-muted-foreground">
              {Array.isArray(value) ? `[${key}]` : key}
            </dt>
            <dd className="min-w-0">
              <ValueTree value={child} />
            </dd>
          </div>
        ))}
      </dl>
    );
  return (
    <span className="break-all font-mono text-sm">
      {value === null ? "No return value" : String(value)}
    </span>
  );
}
export function ResultCard({
  result,
  simulation = false,
}: {
  result: ExecutionResult;
  simulation?: boolean;
}) {
  return (
    <section
      className="space-y-4 rounded-lg border bg-card p-5"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">
          {simulation ? "Simulation result" : "Result"}
        </h3>
        <CopyButton value={JSON.stringify(result, null, 2)} label="Copy JSON" />
      </div>
      <ValueTree value={result.value} />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="capitalize">{result.network}</span>
        <span>·</span>
        <time>{new Date(result.observedAt).toLocaleTimeString()}</time>
        {result.gasEstimate && (
          <span>· Estimated gas {result.gasEstimate}</span>
        )}
        <a
          className="ml-auto inline-flex items-center gap-1 underline-offset-4 hover:underline"
          href={`https://hashscan.io/${result.network}/contract/${result.address}`}
          target="_blank"
          rel="noreferrer"
        >
          View contract
          <ExternalLink className="size-3" />
        </a>
      </div>
      {result.gasEstimateError && (
        <p className="text-xs text-muted-foreground">
          Gas estimate unavailable: {result.gasEstimateError}
        </p>
      )}
    </section>
  );
}
export function PlanCard({
  plan,
  onReview,
}: {
  plan: TransactionPlan;
  onReview: (plan: TransactionPlan) => void;
}) {
  return (
    <section className="space-y-3 rounded-lg border bg-accent p-4">
      <h3 className="font-medium">Ready for wallet review</h3>
      <p className="break-all font-mono text-xs">{plan.signature}</p>
      <p className="text-sm">
        {plan.network} · chain {plan.chainId}. Simulation succeeded. Expires{" "}
        {new Date(plan.expiresAt).toLocaleTimeString()}.
      </p>
      <Button onClick={() => onReview(plan)}>Review transaction</Button>
      <p className="text-xs text-muted-foreground">
        Nothing has been submitted.
      </p>
    </section>
  );
}
