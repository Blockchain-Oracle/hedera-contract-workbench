"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { hedera, hederaTestnet } from "viem/chains";
import { useAccount, useSendTransaction, useSwitchChain } from "wagmi";
import { formatUnits, getAddress } from "viem";
import { Loader2, ShieldCheck } from "lucide-react";
import type { TransactionPlan, TransactionRecord } from "@sh/core";
import { api, ApiError } from "@/lib/api";
import { saveRecovery } from "@/lib/recovery";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ErrorNotice, CopyButton, ResultCard } from "./result";
const ScaffoldAddress = dynamic(
  () => import("@scaffold-hbar-ui/components").then((module) => module.Address),
  { ssr: false },
);
export function TransactionReview({
  plan,
  onClose,
  onSubmitted,
  onRecoveryError,
}: {
  plan: TransactionPlan | null;
  onClose: () => void;
  onSubmitted: (record: TransactionRecord) => void;
  onRecoveryError: (error: unknown) => void;
}) {
  const { address, chainId } = useAccount(),
    { switchChainAsync } = useSwitchChain(),
    { sendTransactionAsync } = useSendTransaction();
  const [uncertain, setUncertain] = useState(false);
  const [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null),
    [now, setNow] = useState(Date.now());
  const context = useRef({ address, chainId, planId: plan?.id });
  context.current = { address, chainId, planId: plan?.id };
  useEffect(() => {
    setError(null);
    setPending(false);
    setUncertain(false);
  }, [plan?.id]);
  useEffect(() => {
    if (!plan) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [plan]);
  const matches =
    !!plan &&
    !!address &&
    getAddress(address) === getAddress(plan.from) &&
    chainId === plan.chainId;
  const expired = !!plan && now >= Date.parse(plan.expiresAt);
  async function submit() {
    if (!plan || !address || chainId === undefined) return;
    setError(null);
    setPending(true);
    let submittedHash: `0x${string}` | undefined;
    let walletRequested = false;
    try {
      const reviewed = { address, chainId, planId: plan.id };
      const validated = await api("plans/validate", {
        plan,
        from: address,
        chainId,
      });
      if (JSON.stringify(context.current) !== JSON.stringify(reviewed))
        throw new ApiError(
          "Account, network, or review changed. Review again.",
          "PRECONDITION",
        );
      walletRequested = true;
      submittedHash = await sendTransactionAsync({
        account: address,
        chainId,
        to: validated.plan.to,
        data: validated.plan.data,
        value: BigInt(validated.plan.valueWeibar),
      });
      const record: TransactionRecord = {
        hash: submittedHash,
        network: plan.network,
        planId: plan.id,
        submittedAt: new Date().toISOString(),
      };
      let browserSaved = false;
      // Browser recovery is written before the server journal request.
      try {
        saveRecovery(record);
        browserSaved = true;
      } catch {
        /* Server journal remains independent of browser storage. */
      }
      onSubmitted(record);
      try {
        await api("transactions", record);
      } catch {
        onRecoveryError(
          new ApiError(
            browserSaved
              ? "Submitted and saved in this browser. Server journal is temporarily unavailable; keep the hash and check its status."
              : `Submitted: ${submittedHash}. Recovery storage is unavailable. Copy this hash before closing the browser and check its receipt.`,
            "JOURNAL_UNAVAILABLE",
          ),
        );
      }
      onClose();
    } catch (e) {
      if (submittedHash) {
        onSubmitted({
          hash: submittedHash,
          network: plan.network,
          planId: plan.id,
          submittedAt: new Date().toISOString(),
        });
        setError(
          new ApiError(
            `Transaction submitted: ${submittedHash}. Check its receipt before any further action.`,
            "SUBMITTED",
          ),
        );
      } else {
        const rejected = /user rejected|user denied|rejected the request/i.test(
          (e as Error).message,
        );
        if (walletRequested && !rejected) setUncertain(true);
        setError(
          rejected
            ? new ApiError(
                "Wallet request rejected. Nothing was submitted.",
                "WALLET_REJECTED",
              )
            : walletRequested
              ? new ApiError(
                  "The wallet did not return a transaction hash. Check its activity and the correct network before preparing another transaction; the workbench will not resend this request.",
                  "SUBMISSION_UNCERTAIN",
                )
              : e,
        );
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <Sheet
      open={!!plan}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Review transaction</SheetTitle>
          <SheetDescription>
            Verify these exact fields before approving the request in your
            wallet.
          </SheetDescription>
        </SheetHeader>
        {plan && (
          <div className="space-y-6 px-4 pb-6">
            <div
              className={`rounded-lg border p-4 ${plan.network === "mainnet" ? "border-destructive text-destructive" : "bg-accent"}`}
            >
              <p className="font-semibold">
                Hedera {plan.network} · chain {plan.chainId}
              </p>
              <p className="mt-1 text-sm">
                {plan.network === "mainnet"
                  ? "Mainnet uses real HBAR and tokens."
                  : "Testnet uses test funds."}
              </p>
            </div>
            <dl className="space-y-4 text-sm">
              {[
                ["From", plan.from],
                ["To", plan.to],
                ["Function", plan.signature],
                ["Value", `${formatUnits(BigInt(plan.valueWeibar), 18)} HBAR`],
                ["Expires", new Date(plan.expiresAt).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="mb-1 text-muted-foreground">{label}</dt>
                  <dd className="break-all font-mono">
                    {label === "From" || label === "To" ? (
                      <ScaffoldAddress
                        address={value as `0x${string}`}
                        format="long"
                        size="xs"
                        chain={
                          plan.network === "mainnet" ? hedera : hederaTestnet
                        }
                        blockExplorerAddressLink={`https://hashscan.io/${plan.network}/account/${value}`}
                      />
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <div>
              <h3 className="mb-2 text-sm font-medium">Exact arguments</h3>
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
                {JSON.stringify(plan.args, null, 2)}
              </pre>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer">
                Calldata and interface revision
              </summary>
              <p className="mt-3 break-all font-mono">{plan.data}</p>
              <CopyButton value={plan.data} label="Copy calldata" />
              <p className="mt-2 break-all font-mono">
                ABI revision: {plan.revision}
              </p>
            </details>
            <ResultCard result={plan.simulation} simulation />
            <ErrorNotice error={error} />
            {!address && (
              <p className="text-sm">
                Connect the prepared account to continue.
              </p>
            )}
            {address && getAddress(address) !== getAddress(plan.from) && (
              <p className="text-sm text-destructive">
                Connect {plan.from}, or prepare a new transaction with your
                current wallet.
              </p>
            )}
            {address && chainId !== plan.chainId && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  switchChainAsync({ chainId: plan.chainId }).catch(setError)
                }
              >
                Switch wallet to {plan.network}
              </Button>
            )}
            {expired && (
              <p className="text-sm text-destructive">
                This plan expired. Prepare a new one.
              </p>
            )}
            <Button
              className="w-full"
              disabled={!matches || expired || pending || uncertain}
              onClick={submit}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              {pending
                ? "Checking simulation / waiting for wallet…"
                : "Approve exact transaction in wallet"}
            </Button>
            <p className="text-xs text-muted-foreground">
              The workbench rechecks calldata, ABI revision, account, network,
              expiry, and simulation before requesting your wallet approval.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
