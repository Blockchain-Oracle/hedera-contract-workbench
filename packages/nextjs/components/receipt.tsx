"use client";
import { useEffect, useState } from "react";
import {
  ExternalLink,
  CircleCheck,
  Clock3,
  TriangleAlert,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { TransactionRecord } from "@sh/core";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "./result";
export function Receipt({
  record,
  polling: configuration,
}: {
  record: TransactionRecord;
  polling: { intervalMs: number; budgetMs: number };
}) {
  const [status, setStatus] = useState<any>(null),
    [error, setError] = useState<unknown>(null),
    [polling, setPolling] = useState(true);
  const [checking, setChecking] = useState(false);
  const update = async (signal?: AbortSignal) => {
    setChecking(true);
    try {
      const data = await api(
        `transactions/${record.hash}?network=${record.network}`,
        undefined,
        "GET",
        signal,
      );
      if (signal?.aborted) return;
      setStatus(data);
      setError(null);
      return data;
    } catch (e) {
      if (!signal?.aborted) setError(e);
    } finally {
      if (!signal?.aborted) setChecking(false);
    }
  };
  useEffect(() => {
    setPolling(true);
    setStatus(null);
    setError(null);
    setChecking(false);
    const controller = new AbortController(),
      start = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const data = await update(controller.signal);
      if (controller.signal.aborted) return;
      if (
        ((data?.state === "confirmed" || data?.state === "reverted") &&
          data.indexing === "indexed") ||
        Date.now() - start >= configuration.budgetMs
      ) {
        setPolling(false);
        return;
      }
      timer = setTimeout(poll, configuration.intervalMs);
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [
    record.hash,
    record.network,
    configuration.intervalMs,
    configuration.budgetMs,
  ]);
  return (
    <section
      className="space-y-4 rounded-[24px] border border-border/70 bg-card p-5 sm:p-6"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            {status?.state === "confirmed" ? (
              <CircleCheck className="size-5" />
            ) : status?.state === "reverted" ? (
              <TriangleAlert className="size-5 text-destructive" />
            ) : (
              <Clock3 className="size-5" />
            )}
          </span>
          <div>
            <h3 className="text-sm font-medium capitalize">
              {status?.state || "Submitted"}
            </h3>
            <p className="text-xs capitalize text-muted-foreground">
              Hedera {record.network}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={checking}
          onClick={() => update()}
        >
          {checking ? (
            <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          {checking ? "Checking…" : "Check receipt"}
        </Button>
      </div>
      <a
        className="flex items-center gap-3 rounded-2xl bg-muted p-4 font-mono text-xs underline-offset-4 hover:underline"
        href={`https://hashscan.io/${record.network}/transaction/${record.hash}`}
        target="_blank"
        rel="noreferrer"
      >
        <span className="min-w-0 break-all">{record.hash}</span>
        <ExternalLink className="size-3 shrink-0" />
      </a>
      {status?.indexing === "pending" && (
        <p className="text-xs text-muted-foreground">
          RPC receipt {status.state}. Mirror indexing is still pending.
        </p>
      )}
      {!polling &&
        (status?.state === "pending" || status?.indexing !== "indexed") && (
          <p className="text-xs text-muted-foreground">
            Polling paused. Use Check receipt; never resend just because
            confirmation is uncertain.
          </p>
        )}
      {status?.state === "reverted" && (
        <p className="text-sm text-destructive">
          The submitted transaction reverted. Inspect the receipt before
          preparing another transaction.
        </p>
      )}
      {!status && polling && !error && (
        <p className="text-xs text-muted-foreground">
          Your transaction hash is saved. Checking the network for its receipt.
        </p>
      )}
      <ErrorNotice error={error} />
    </section>
  );
}
