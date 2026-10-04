"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { formatUnits } from "viem";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  ArrowUpRight,
  Wallet,
  ChevronDown,
  X,
} from "lucide-react";
import type { Network } from "@sh/core";
import { Button } from "@/components/ui/button";
import { CopyButton, ErrorNotice } from "./result";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function readableBalance(value: bigint, decimals: number) {
  const exact = formatUnits(value, decimals);
  const [whole, fraction = ""] = exact.split(".");
  if (value > 0n && whole === "0" && !fraction.slice(0, 5).replaceAll("0", ""))
    return "<0.00001";
  return `${whole}${fraction ? `.${fraction.slice(0, 5).replace(/0+$/, "")}` : ""}`.replace(
    /\.$/,
    "",
  );
}

export function WalletFooter({
  network,
  open,
  compact = false,
}: {
  network: Network;
  open: () => void;
  compact?: boolean;
}) {
  const { address, status } = useAccount();
  const [visible, setVisible] = useState(true);
  const balance = useBalance({
    address,
    chainId: network === "testnet" ? 296 : 295,
    query: { enabled: !!address, staleTime: 30_000, retry: 1 },
  });
  const balanceLabel = !address
    ? "Connect wallet"
    : balance.isPending
      ? "Loading balance…"
      : balance.data
        ? `${readableBalance(balance.data.value, balance.data.decimals)} HBAR`
        : "Balance unavailable";
  if (compact)
    return (
      <button
        className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted"
        onClick={open}
        aria-label={
          address
            ? `Open account ${shortAddress(address)} on ${network}`
            : "Connect an EVM wallet"
        }
      >
        <Wallet className="size-4 shrink-0" />
        <span className="hidden sm:inline">
          {status === "reconnecting"
            ? "Reconnecting…"
            : address
              ? shortAddress(address)
              : "Connect wallet"}
        </span>
        <ChevronDown className="hidden size-3 text-muted-foreground sm:block" />
      </button>
    );
  return (
    <div className="wb-wallet-footer flex items-center gap-2">
      <button
        className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-border bg-card"
        aria-label="Open accounts"
        onClick={open}
      >
        <Wallet className="size-5" />
      </button>
      <div className="flex h-10 min-w-0 flex-1 items-center rounded-[10px] border border-border bg-card px-3">
        <button
          className="min-w-0 flex-1 truncate text-left text-sm"
          onClick={open}
          aria-label={
            address
              ? `Open account ${shortAddress(address)} on ${network}`
              : "Connect an EVM wallet"
          }
        >
          {status === "reconnecting"
            ? "Reconnecting…"
            : visible
              ? balanceLabel
              : "•••• HBAR"}
        </button>
        {address && (
          <button
            className="ml-1 grid size-7 shrink-0 place-items-center rounded-full"
            aria-label={visible ? "Hide balance" : "Show balance"}
            onClick={() => setVisible(!visible)}
          >
            {visible ? (
              <Eye className="size-4" />
            ) : (
              <EyeOff className="size-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function WalletPanel({
  open,
  close,
  network,
}: {
  open: boolean;
  close: () => void;
  network: Network;
}) {
  const { address, chainId, connector } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const [available, setAvailable] = useState<string[]>([]);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const target = network === "testnet" ? 296 : 295;
  useEffect(() => {
    if (!open) return;
    let active = true;
    setChecking(true);
    setError(null);
    void Promise.all(
      connectors.map(async (candidate) => {
        try {
          return (await candidate.getProvider()) ? candidate.uid : null;
        } catch {
          return null;
        }
      }),
    ).then((ids) => {
      if (active) {
        setAvailable(ids.filter((id): id is string => id !== null));
        setChecking(false);
      }
    });
    return () => {
      active = false;
    };
  }, [open, connectors]);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--wb-scrim)]" />
        <Dialog.Content className="wb-accounts-panel fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Dialog.Title className="text-xl font-semibold tracking-tight">
              Accounts
            </Dialog.Title>
            <Dialog.Close
              className="grid size-10 place-items-center rounded-lg bg-secondary"
              aria-label="Close accounts"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Connect a browser EVM wallet to Hedera {network}. Your wallet
            approves transactions.
          </Dialog.Description>
          <ErrorNotice error={error} />
          {address && (
            <div className="mb-4 space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-secondary p-4">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[var(--wb-success)]">
                  <Check className="size-4" />
                </span>
                <Wallet className="size-6 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base">{shortAddress(address)}</p>
                  <p className="text-xs text-muted-foreground">
                    {connector?.name ?? "Connected wallet"}
                  </p>
                </div>
                <CopyButton
                  value={address}
                  iconOnly
                  label="Copy wallet address"
                />
              </div>
              {chainId !== target && (
                <div className="rounded-lg bg-secondary p-4">
                  <p className="mb-3 text-sm">
                    Your wallet is on chain {chainId ?? "unknown"}. Switch to
                    Hedera {network} to review transactions.
                  </p>
                  <Button
                    className="w-full"
                    disabled={switching}
                    onClick={() =>
                      switchChainAsync({ chainId: target }).catch(setError)
                    }
                  >
                    {switching && <Loader2 className="size-4 animate-spin" />}
                    Switch to {network}
                  </Button>
                </div>
              )}
              <p className="text-sm leading-6 text-muted-foreground">
                Selected network: Hedera {network}. Connecting a wallet does not
                create a Hedera account. Ordinary reads work without one;
                caller-scoped reads and transactions need an account on this
                network.
              </p>
              <a
                href="https://docs.hedera.com/learn/core-concepts/accounts/auto-account-creation"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs underline"
              >
                Hedera account setup <ArrowUpRight className="size-3" />
              </a>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  disconnect();
                  close();
                }}
              >
                <LogOut className="size-4" />
                Disconnect wallet
              </Button>
            </div>
          )}
          {!address && (
            <p className="mb-4 text-sm text-muted-foreground">
              Connect your browser wallet. Contract reads work without an
              account.
            </p>
          )}
          {checking ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Finding browser wallets…
            </p>
          ) : available.length ? (
            <div className="space-y-2">
              {connectors
                .filter(
                  (candidate) =>
                    available.includes(candidate.uid) &&
                    candidate.uid !== connector?.uid,
                )
                .map((candidate) => (
                  <button
                    key={candidate.uid}
                    className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
                    disabled={isPending}
                    onClick={async () => {
                      setError(null);
                      try {
                        await connectAsync({
                          connector: candidate,
                          chainId: target,
                        });
                        close();
                      } catch (e) {
                        setError(e);
                      }
                    }}
                  >
                    <span className="grid size-8 place-items-center rounded-full bg-muted text-[var(--wb-success)]">
                      {isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : candidate.icon ? (
                        <Image
                          src={candidate.icon}
                          alt=""
                          width={32}
                          height={32}
                          unoptimized
                          className="size-8 rounded-lg"
                        />
                      ) : (
                        <Wallet className="size-5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {candidate.name}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Browser EVM wallet
                      </span>
                    </span>
                    <ArrowUpRight className="size-4 text-muted-foreground" />
                  </button>
                ))}
            </div>
          ) : (
            <div className="rounded-lg bg-secondary p-4">
              <p className="font-medium">No browser wallet detected</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Install or enable an EVM wallet extension, then reopen Accounts.
                Hedera testnet (296) and mainnet (295) are supported.
              </p>
            </div>
          )}
          <p className="mt-5 text-xs text-muted-foreground">
            Selected network: Hedera {network} · {target}
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
