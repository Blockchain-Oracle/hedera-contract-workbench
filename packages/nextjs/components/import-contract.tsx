"use client";
import { useEffect, useState } from "react";
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
    if (open) setNetwork(initialNetwork);
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
        <SheetHeader>
          <SheetTitle>Import a deployed contract</SheetTitle>
          <SheetDescription>
            Enter its network and address. We look for a verified ABI, or you
            can supply one.
          </SheetDescription>
        </SheetHeader>
        <form
          className="space-y-6 px-4 pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="import-network">Network</FieldLabel>
              <select
                id="import-network"
                value={network}
                onChange={(e) => setNetwork(e.target.value as Network)}
                className="h-9 rounded-md border bg-background px-3"
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
              />
            </Field>
          </FieldGroup>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowAbi(!showAbi)}
          >
            {showAbi ? "Hide ABI input" : "Supply an ABI or artifact"}
          </Button>
          {showAbi && (
            <Field>
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
            </Field>
          )}
          <ErrorNotice error={error} />
          <Button type="submit" disabled={pending || !address}>
            {pending ? "Verifying contract…" : "Import contract"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Imports persist in this local workspace. The interface is generated
            from the ABI; no model or deployment is needed.
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}
