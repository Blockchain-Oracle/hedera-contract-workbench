"use client";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import {
  ArrowDown,
  Loader2,
  Check,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { formatUnits } from "viem";
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
  const [associationChecking, setAssociationChecking] = useState(false);
  const associationRequest = useRef<AbortController | null>(null);
  async function checkAssociation(signal?: AbortSignal) {
    if (!address) return;
    setAssociationChecking(true);
    try {
      const result = await api(
        `swap/association?network=${network}&from=${address}`,
        undefined,
        "GET",
        signal,
      );
      if (!signal?.aborted) {
        setAssociated(result.value);
        setError(null);
      }
    } catch (e) {
      if (!signal?.aborted) setError(e);
    } finally {
      if (!signal?.aborted) setAssociationChecking(false);
    }
  }
  const request = useRef<{ controller?: AbortController }>({});
  useEffect(() => {
    request.current.controller?.abort();
    setPending("");
    setError(null);
    setQuote(null);
    setAssociated(null);
    setBalance(null);
    setAssociationChecking(false);
    associationRequest.current?.abort();
    const controller = new AbortController();
    if (address) {
      void checkAssociation(controller.signal);
      api(
        `account?network=${network}&address=${address}`,
        undefined,
        "GET",
        controller.signal,
      )
        .then((r) => {
          if (!controller.signal.aborted) setBalance(r.balanceHbar);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e);
        });
    }
    return () => {
      controller.abort();
      associationRequest.current?.abort();
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
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          Protocol example
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[30px] font-semibold leading-[1.14] tracking-[-0.75px]">
            Swap HBAR for SAUCE
          </h2>
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${network === "mainnet" ? "bg-destructive/10 text-destructive" : "bg-muted"}`}
          >
            {network}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          A real SaucerSwap V1 router workflow on {network}. Quote first, then
          review every wallet action.
        </p>
      </div>
      <div
        className="space-y-5 rounded-[32px] border border-border/70 bg-card p-5 sm:p-7"
        aria-busy={!!pending}
      >
        <FieldGroup>
          <Field>
            <FieldLabel
              htmlFor="swap-amount"
              className="flex items-center justify-between"
            >
              <span>You pay</span>
              <span className="rounded-full bg-muted px-3 py-1">HBAR</span>
            </FieldLabel>
            <Input
              id="swap-amount"
              className="h-16 border-0 bg-muted text-[30px] font-medium tracking-tight"
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
            <span className="flex size-9 items-center justify-center rounded-full bg-muted">
              <ArrowDown className="size-4" />
            </span>
          </div>
          <Field>
            <FieldLabel className="flex items-center justify-between">
              <span>You receive</span>
              <span className="rounded-full bg-muted px-3 py-1">SAUCE</span>
            </FieldLabel>
            <div
              aria-live="polite"
              className="flex min-h-16 items-center rounded-xl bg-muted px-4 py-3 text-[30px] font-medium tracking-tight tabular-nums"
            >
              {pending === "quote" ? (
                <span className="flex items-center gap-2 text-base text-muted-foreground">
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  Getting a live quote…
                </span>
              ) : (
                (quote?.amountOutDisplay ?? (
                  <span className="text-base font-normal text-muted-foreground">
                    Your quote will appear here
                  </span>
                ))
              )}
            </div>
          </Field>
          <Field className="flex-row items-center justify-between gap-4">
            <FieldLabel htmlFor="slippage">Slippage tolerance · %</FieldLabel>
            <Input
              id="slippage"
              className="w-24 text-right"
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
          {pending === "quote" && (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
          )}
          {pending === "quote"
            ? "Getting quote…"
            : quote
              ? "Refresh quote"
              : "Get a quote"}
        </Button>
      </div>
      {quote && (
        <div className="space-y-3 rounded-2xl bg-muted p-5 text-sm">
          <p>
            Minimum output:{" "}
            <strong>{formatUnits(BigInt(quote.minimumOutRaw), 6)} SAUCE</strong>
          </p>
          <p className="text-muted-foreground">
            Quote expires {new Date(quote.expiresAt).toLocaleTimeString()}.
            Preparation refreshes the quote and sets a 20-minute deadline; the
            wallet drawer shows the exact new minimum.
          </p>
        </div>
      )}
      <div className="space-y-4 rounded-[24px] border border-border/70 bg-card p-5 sm:p-6">
        <h3 className="text-sm font-medium">Before your first swap</h3>
        <ol className="space-y-4 text-sm text-muted-foreground">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
              {address ? <Check className="size-3" /> : "1"}
            </span>
            <span>Connect an EVM wallet on Hedera {network}.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
              2
            </span>
            <span>
              Hold HBAR for the swap and network fees.
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
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
              {associated === true ? <Check className="size-3" /> : "3"}
            </span>
            <span>
              Associate this wallet with SAUCE.
              {associated === true && (
                <span className="ml-2 font-medium text-foreground">
                  Verified
                </span>
              )}
            </span>
          </li>
        </ol>
        {address && associated === false && (
          <Button
            variant="outline"
            disabled={!!pending}
            onClick={() => act("associate")}
          >
            {pending === "associate" && (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            )}
            {pending === "associate"
              ? "Preparing association…"
              : "Prepare SAUCE association"}
          </Button>
        )}
        {address && associationChecking && (
          <p
            role="status"
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
            Checking this wallet’s SAUCE association…
          </p>
        )}
        {address && !associationChecking && associated !== true && (
          <Button
            variant="ghost"
            size="sm"
            disabled={!!pending}
            onClick={() => {
              associationRequest.current?.abort();
              const controller = new AbortController();
              associationRequest.current = controller;
              void checkAssociation(controller.signal);
            }}
          >
            <RefreshCw className="size-3.5" />
            Recheck association
          </Button>
        )}
      </div>
      <ErrorNotice error={error} />
      <Button
        className="w-full"
        disabled={!address || associated !== true || !quote || !!pending}
        onClick={() => act("prepare")}
      >
        {pending === "prepare" && (
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
        )}
        {pending === "prepare" ? "Preparing your swap…" : "Review swap"}
        {!pending && <ArrowUpRight className="size-4" />}
      </Button>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        The router handles native HBAR. This workflow requires no direct WHBAR
        wrapping or token allowance.
      </p>
    </div>
  );
}
