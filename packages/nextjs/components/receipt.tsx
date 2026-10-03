"use client";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
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
  const update = async (signal?: AbortSignal) => {
    try {
      const data = await api(
        `transactions/${record.hash}?network=${record.network}`,
        undefined,
        "GET",
        signal,
      );
      setStatus(data);
      setError(null);
      return data;
    } catch (e) {
      if (!signal?.aborted) setError(e);
    }
  };
  useEffect(() => {
    setPolling(true);
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
    <section className="space-y-2 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium capitalize">
          {status?.state || "Submitted"} · {record.network}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => update()}>
          Check receipt
        </Button>
      </div>
      <a
        className="flex items-center gap-2 break-all font-mono text-xs text-primary underline"
        href={`https://hashscan.io/${record.network}/transaction/${record.hash}`}
        target="_blank"
        rel="noreferrer"
      >
        {record.hash}
        <ExternalLink className="size-3 shrink-0" />
      </a>
      {status?.indexing === "pending" && (
        <p className="text-xs text-muted-foreground">
          RPC receipt {status.state}. Mirror indexing is still pending.
        </p>
      )}
      {!polling && status?.state === "pending" && (
        <p className="text-xs text-muted-foreground">
          Polling paused. Use Check receipt; never resend just because
          confirmation is uncertain.
        </p>
      )}
      <ErrorNotice error={error} />
    </section>
  );
}
