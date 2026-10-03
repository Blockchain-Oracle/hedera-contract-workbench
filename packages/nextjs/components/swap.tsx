"use client";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { ArrowDown, Loader2 } from "lucide-react";
import type { Network, SwapQuote, TransactionPlan } from "@sh/core";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ErrorNotice } from "./result";
export function Swap({
  network,
  onReview,
  invalidate,
}: {
  network: Network;
  onReview: (p: TransactionPlan) => void;
  invalidate: () => void;
}) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("1"),
    [slippage, setSlippage] = useState("0.5"),
    [quote, setQuote] = useState<SwapQuote | null>(null),
    [pending, setPending] = useState(""),
    [error, setError] = useState<unknown>(null),
    [associated, setAssociated] = useState<boolean | null>(null),
    [balance, setBalance] = useState<string | null>(null);
  const request = useRef<{ controller?: AbortController }>({});
  useEffect(() => {
    request.current.controller?.abort();
    setPending("");
    setError(null);
    setQuote(null);
    setAssociated(null);
    setBalance(null);
    const controller = new AbortController();
    if (address) {
      api(
        `swap/association?network=${network}&from=${address}`,
        undefined,
        "GET",
        controller.signal,
      )
        .then((r) => setAssociated(r.value))
        .catch((e) => {
          if (!controller.signal.aborted) setError(e);
        });
      api(
        `account?network=${network}&address=${address}`,
        undefined,
        "GET",
        controller.signal,
      )
        .then((r) => setBalance(r.balanceHbar))
        .catch((e) => {
          if (!controller.signal.aborted) setError(e);
        });
    }
    return () => {
      controller.abort();
      request.current.controller?.abort();
    };
  }, [address, network]);
  const change = () => {
    request.current.controller?.abort();
    setPending("");
    setQuote(null);
    invalidate();
    setError(null);
  };
  async function act(action: "quote" | "associate" | "prepare") {
    request.current.controller?.abort();
    const controller = new AbortController();
    request.current.controller = controller;
    setError(null);
    setPending(action);
    try {
      const result = await api(
        `swap/${action}`,
        action === "quote"
          ? { network, amountHbar: amount, slippageBps: Number(slippage) * 100 }
          : { network, from: address, quote },
        "POST",
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (action === "quote") setQuote(result);
      else onReview(result);
    } catch (e) {
      if (!controller.signal.aborted) setError(e);
    } finally {
      if (request.current.controller === controller) setPending("");
    }
  }
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">
          Protocol example
        </p>
        <h2 className="text-xl font-semibold">HBAR → SAUCE</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A real SaucerSwap V1 router workflow on {network}. Quote first, then
          review every wallet action.
        </p>
      </div>
      <div className="space-y-4 rounded-xl border bg-card p-5">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="swap-amount">You pay · HBAR</FieldLabel>
            <Input
              id="swap-amount"
              className="h-12 text-lg"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                change();
                setAmount(e.target.value);
              }}
            />
            {balance && (
              <p className="text-xs text-muted-foreground">
                Wallet balance: {balance} HBAR. Reserve funds for network fees.
              </p>
            )}
          </Field>
          <div className="flex justify-center">
            <ArrowDown className="size-4 text-muted-foreground" />
          </div>
          <Field>
            <FieldLabel>You receive · SAUCE</FieldLabel>
            <div className="rounded-md bg-muted px-3 py-3 text-lg tabular-nums">
              {quote?.amountOutDisplay ?? "Get a live quote"}
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="slippage">Slippage · %</FieldLabel>
            <Input
              id="slippage"
              inputMode="decimal"
              value={slippage}
              onChange={(e) => {
                change();
                setSlippage(e.target.value);
              }}
            />
          </Field>
        </FieldGroup>
        <Button
          disabled={!!pending}
          className="w-full"
          onClick={() => act("quote")}
        >
          {pending === "quote" && <Loader2 className="size-4 animate-spin" />}
          Get fresh quote
        </Button>
      </div>
      {quote && (
        <div className="space-y-3 rounded-lg border p-4 text-sm">
          <p>
            Minimum output:{" "}
            <strong>
              {(Number(quote.minimumOutRaw) / 1e6).toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })}{" "}
              SAUCE
            </strong>
          </p>
          <p className="text-muted-foreground">
            Quote expires {new Date(quote.expiresAt).toLocaleTimeString()}.
            Preparation refreshes the quote and sets a 20-minute deadline; the
            wallet drawer shows the exact new minimum.
          </p>
        </div>
      )}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Before your first swap</h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>1. Connect an EVM wallet on Hedera {network}.</li>
          <li>
            2. Hold HBAR for the swap and network fees.
            {network === "testnet" && (
              <>
                {" "}
                <a
                  className="text-primary underline"
                  href="https://portal.hedera.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Get testnet HBAR
                </a>
              </>
            )}
          </li>
          <li>
            3. Associate this wallet with SAUCE.
            {associated === true && (
              <span className="ml-2 text-primary">Association verified ✓</span>
            )}
          </li>
        </ol>
        {address && associated === false && (
          <Button
            variant="outline"
            disabled={!!pending}
            onClick={() => act("associate")}
          >
            Prepare SAUCE association
          </Button>
        )}
        {address && associated === null && (
          <p className="text-xs">Checking caller-scoped association…</p>
        )}
      </div>
      <ErrorNotice error={error} />
      <Button
        className="w-full"
        disabled={!address || associated !== true || !quote || !!pending}
        onClick={() => act("prepare")}
      >
        {pending === "prepare" && <Loader2 className="size-4 animate-spin" />}
        Prepare swap for review
      </Button>
      <p className="text-xs text-muted-foreground">
        The router handles native HBAR. This workflow requires no direct WHBAR
        wrapping or token allowance.
      </p>
    </div>
  );
}
