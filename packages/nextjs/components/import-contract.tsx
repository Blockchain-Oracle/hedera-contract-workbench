"use client";
import { useEffect, useState } from "react";
import { ArrowDownToLine, Braces, Loader2 } from "lucide-react";
import type { Network } from "@sh/core";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ErrorNotice } from "./result";
export function ImportContract({
  open,
  close,
  initialNetwork,
  imported,
}: {
  open: boolean;
  close: () => void;
  initialNetwork: Network;
  imported: (id: string) => void;
}) {
  const [network, setNetwork] = useState<Network>(initialNetwork),
    [address, setAddress] = useState(""),
    [name, setName] = useState(""),
    [abi, setAbi] = useState(""),
    [showAbi, setShowAbi] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (open) {
      setNetwork(initialNetwork);
      setError(null);
    }
  }, [open, initialNetwork]);
  async function submit() {
    setPending(true);
    setError(null);
    try {
      const contract = await api("contracts", {
        network,
        address,
        name,
        ...(abi.trim() ? { abi: JSON.parse(abi) } : {}),
      });
      imported(contract.id);
      close();
    } catch (e) {
      setError(e);
      if ((e as any).code === "ABI_REQUIRED") setShowAbi(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value && !pending) close();
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="px-6 pb-3 pt-8 sm:px-8">
          <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <ArrowDownToLine className="size-5" />
          </span>
          <SheetTitle>Import a deployed contract</SheetTitle>
          <SheetDescription>
            Enter its network and address. We look for a verified ABI, or you
            can supply one.
          </SheetDescription>
        </SheetHeader>
        <form
          className="space-y-6 px-6 pb-8 sm:px-8"
          aria-busy={pending}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <fieldset disabled={pending} className="space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="import-network">Network</FieldLabel>
                <select
                  id="import-network"
                  value={network}
                  onChange={(e) => setNetwork(e.target.value as Network)}
                  className="h-12 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="testnet">Hedera Testnet</option>
                  <option value="mainnet">Hedera Mainnet</option>
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="import-address">
                  Contract address or ID
                </FieldLabel>
                <Input
                  id="import-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="0x… or 0.0.12345"
                  required
                  autoComplete="off"
                  className="font-mono"
                />
                <FieldDescription>
                  Contract IDs resolve using metadata from the selected network.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="import-name">Name (optional)</FieldLabel>
                <Input
                  id="import-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  placeholder="Give your contract a recognizable name"
                />
              </Field>
            </FieldGroup>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start rounded-2xl bg-muted px-4"
              onClick={() => setShowAbi(!showAbi)}
            >
              <Braces className="size-4" />
              {showAbi ? "Hide ABI input" : "Have an ABI? Add it here"}
            </Button>
            {showAbi && (
              <Field className="rounded-2xl bg-muted/50 p-4">
                <FieldLabel htmlFor="import-abi">ABI JSON</FieldLabel>
                <Textarea
                  id="import-abi"
                  className="min-h-52 font-mono text-xs"
                  value={abi}
                  onChange={(e) => setAbi(e.target.value)}
                  placeholder='[{"type":"function",…}]'
                />
                <Input
                  type="file"
                  accept=".json,application/json"
                  aria-label="Choose an ABI JSON file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 1048576)
                        setError(new Error("ABI file exceeds 1 MiB."));
                      else setAbi(await file.text());
                    }
                  }}
                />
                <FieldDescription>
                  A JSON ABI array or Solidity artifact. Maximum file size: 1
                  MiB.
                </FieldDescription>
              </Field>
            )}
          </fieldset>
          <ErrorNotice error={error} />
          <Button
            type="submit"
            className="w-full"
            disabled={pending || !address.trim()}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <ArrowDownToLine className="size-4" />
            )}
            {pending ? "Verifying contract…" : "Import contract"}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Imports persist in this local workspace. The interface is generated
            from the ABI; no model or deployment is needed.
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}
