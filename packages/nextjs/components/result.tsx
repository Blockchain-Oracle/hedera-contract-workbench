"use client";
import { useState } from "react";
import {
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  CircleCheck,
  FlaskConical,
  ArrowUpRight,
} from "lucide-react";
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
  const titles: Record<string, string> = {
    INPUT: "Check the inputs",
    PRECONDITION: "Action required",
    TRANSPORT: "Network request failed",
    REVERT: "The contract rejected this call",
    STALE_REVISION: "The contract interface changed",
    NETWORK_MISMATCH: "Check the selected network",
  };
  return (
    <Alert variant="destructive" role="alert" className="rounded-2xl p-4">
      <AlertCircle className="size-4" />
      <AlertTitle>
        {(e.code && titles[e.code]) ||
          e.code?.replaceAll("_", " ") ||
          "Unable to continue"}
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
  iconOnly = false,
}: {
  value: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size={iconOnly ? "icon-sm" : "sm"}
      aria-label={
        copied ? `${label}: copied` : failed ? `${label}: unavailable` : label
      }
      title={copied ? "Copied" : failed ? "Copy unavailable" : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setFailed(false);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setFailed(true);
          setTimeout(() => setFailed(false), 3000);
        }
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      <span className={iconOnly ? "sr-only" : ""}>
        {copied ? "Copied" : failed ? "Copy unavailable" : label}
      </span>
    </Button>
  );
}
function ValueTree({ value }: { value: unknown }) {
  if (value && typeof value === "object" && !Object.keys(value).length)
    return (
      <span className="font-mono text-sm text-muted-foreground">
        {Array.isArray(value) ? "[] · Empty array" : "{} · Empty object"}
      </span>
    );
  if (value && typeof value === "object")
    return (
      <dl className="divide-y divide-border/60 rounded-2xl bg-muted/60">
        {Object.entries(value).map(([key, child]) => (
          <div
            key={key}
            className="grid gap-2 p-4 text-sm sm:grid-cols-[minmax(50px,1fr)_minmax(0,3fr)] sm:gap-4"
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
    <span className="break-all font-mono text-sm leading-relaxed">
      {value === null || value === undefined
        ? "No return value"
        : typeof value === "boolean"
          ? String(value)
          : value === ""
            ? '"" · Empty string'
            : String(value)}
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
      className="space-y-5 rounded-[24px] border border-border/70 bg-card p-5 sm:p-6"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
            {simulation ? (
              <FlaskConical className="size-4" />
            ) : (
              <CircleCheck className="size-4" />
            )}
          </span>
          <div>
            <h3 className="font-medium">
              {simulation ? "Simulation succeeded" : "Read complete"}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {simulation
                ? "Preview only · nothing submitted"
                : "Live contract response"}
            </p>
          </div>
        </div>
        <CopyButton value={JSON.stringify(result, null, 2)} label="Copy JSON" />
      </div>
      <div className="rounded-2xl bg-muted/40 p-4">
        <ValueTree value={result.value} />
      </div>
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
    <section className="space-y-4 rounded-[24px] border border-border/70 bg-muted p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">Ready for wallet review</h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${plan.network === "mainnet" ? "bg-destructive/10 text-destructive" : "bg-card"}`}
        >
          {plan.network} · {plan.chainId}
        </span>
      </div>
      <p className="break-all font-mono text-xs">{plan.signature}</p>
      <p className="text-sm text-muted-foreground">
        Simulation succeeded. Expires{" "}
        {new Date(plan.expiresAt).toLocaleTimeString()}.
      </p>
      <Button className="w-full" onClick={() => onReview(plan)}>
        Review transaction <ArrowUpRight className="size-4" />
      </Button>
      <p className="text-xs text-muted-foreground">
        Nothing has been submitted.
      </p>
    </section>
  );
}
