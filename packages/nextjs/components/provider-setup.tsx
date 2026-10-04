"use client";
import { useState } from "react";
import { Dialog } from "radix-ui";
import { X, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./result";

const providers = [
  { id: "openai", name: "OpenAI", key: "OPENAI_API_KEY" },
  { id: "anthropic", name: "Anthropic", key: "ANTHROPIC_API_KEY" },
  { id: "gemini", name: "Gemini", key: "GEMINI_API_KEY" },
];
export function ProviderSetup() {
  const [provider, setProvider] = useState(providers[0]);
  const config = `WORKBENCH_AI_PROVIDER=${provider.id}\nWORKBENCH_AI_MODEL=your-model-id\n${provider.key}=your-provider-key`;
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="sm" className="text-xs">
          Set up assistant <ArrowUpRight className="size-3.5" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--wb-scrim)]" />
        <Dialog.Content className="wb-accounts-panel fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="text-xl font-semibold tracking-tight">
              Bring your model
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close assistant setup"
              className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-muted"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-3 text-sm leading-6 text-muted-foreground">
            Choose a provider, add an explicit model ID and key on your local
            server, then restart the app.
          </Dialog.Description>
          <div
            className="my-5 flex gap-1 rounded-xl bg-muted p-1"
            role="group"
            aria-label="Model provider"
          >
            {providers.map((option) => (
              <button
                key={option.id}
                aria-pressed={provider.id === option.id}
                onClick={() => setProvider(option)}
                className={`min-h-10 flex-1 rounded-lg px-2 text-sm ${provider.id === option.id ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {option.name}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="break-all font-mono text-[11px] text-muted-foreground">
              packages/nextjs/.env.local
            </p>
            <CopyButton value={config} label="Copy configuration" iconOnly />
          </div>
          <pre className="my-3 overflow-x-auto rounded-xl bg-muted p-4 text-xs leading-6">
            {config}
          </pre>
          <p className="text-xs leading-5 text-muted-foreground">
            Replace the placeholders. Keys stay on your server. Contract
            functions, CLI and MCP work without this configuration. Transactions
            always require wallet approval.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
