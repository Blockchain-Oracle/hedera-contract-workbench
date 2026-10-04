"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Search, X, Loader2 } from "lucide-react";
import type {
  ExecutionResult,
  Json,
  Parameter,
  ToolDefinition,
} from "@sh/core";
import { gettersFor, resultChoices } from "@sh/core/inputs";
import { argumentIssues, validateValue } from "@sh/core/validation";
import { api } from "@/lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Field, FieldLabel, FieldError, FieldGroup } from "./ui/field";
import { Picker } from "./picker";
import { ErrorNotice } from "./result";
import { TypedInput, initialValue } from "./typed-input";

export const InputAssistance = createContext<{
  tools: ToolDefinition[];
  targetId: string;
  address?: string;
} | null>(null);
const initialArgs = (tool?: ToolDefinition) =>
  Object.fromEntries(
    tool?.parameters.map((p) => [p.key, initialValue(p)]) ?? [],
  );

export function GetterValuePicker({
  parameter,
  onUse,
  path,
}: {
  parameter: Parameter;
  onUse: (value: Json) => void;
  path: string;
}) {
  const context = useContext(InputAssistance);
  const getters = context
    ? gettersFor(parameter, context.tools, context.targetId)
    : [];
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState(
    getters.find((t) => !t.parameters.length)?.id ?? getters[0]?.id ?? "",
  );
  const source = getters.find((t) => t.id === sourceId);
  const [args, setArgs] = useState<Record<string, Json>>(() =>
    initialArgs(source),
  );
  const [caller, setCaller] = useState("");
  const [callerOpen, setCallerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  function clear() {
    request.current?.abort();
    setPending(false);
    setResult(null);
    setError(null);
    setErrors({});
  }
  if (!context) return null;
  const choices =
    source && result
      ? resultChoices(parameter, source.outputs, result.value)
      : null;
  async function read() {
    if (!source) return;
    const issues = argumentIssues(source.parameters, args);
    if (caller.trim()) {
      try {
        validateValue(
          { key: "from", name: "Read as address", type: "address", schema: {} },
          caller.trim(),
          "from",
        );
      } catch (failure) {
        issues.push({ path: "from", message: (failure as Error).message });
      }
    }
    setErrors(
      Object.fromEntries(
        issues.map((i) => [i.path.replace(/^arguments\./, ""), i.message]),
      ),
    );
    if (issues.some((issue) => issue.path === "from")) setCallerOpen(true);
    if (issues.length) return;
    clear();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    try {
      const value = await api<ExecutionResult>(
        `tools/${source.id}/call`,
        {
          arguments: args,
          revision: source.revision,
          ...(caller.trim() ? { from: caller.trim() } : {}),
        },
        "POST",
        controller.signal,
      );
      if (!controller.signal.aborted) setResult(value);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure);
    } finally {
      if (request.current === controller) setPending(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {parameter.type === "address" && context.address && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => onUse(context.address!)}
        >
          Use wallet address
        </Button>
      )}
      {getters.length > 0 && (
        <Dialog.Root
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) clear();
          }}
        >
          <Dialog.Trigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              aria-label={`Find a value for ${path}`}
            >
              <Search data-icon="inline-start" /> Find a value
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--wb-scrim)]" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85dvh] w-[calc(100vw-32px)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-3xl border border-border bg-card p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <Dialog.Title className="text-xl font-semibold">
                  Find a value for {path}
                </Dialog.Title>
                <Dialog.Close
                  aria-label="Close value finder"
                  className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-muted"
                >
                  <X className="size-4" />
                </Dialog.Close>
              </div>
              <Dialog.Description className="text-sm leading-6 text-muted-foreground">
                Read a getter from this contract, then choose an actual result.
                Confirm its meaning and units. A count does not prove which IDs
                exist.
              </Dialog.Description>
              <Picker
                label="Source getter"
                value={sourceId}
                options={getters.map((t) => ({
                  value: t.id,
                  label: t.signature,
                  description: t.parameters.length
                    ? `${t.parameters.length} required arguments`
                    : "No arguments required",
                }))}
                onChange={(id) => {
                  clear();
                  setSourceId(id);
                  setArgs(initialArgs(getters.find((t) => t.id === id)));
                  setCaller("");
                  setCallerOpen(false);
                }}
              />
              {source && (
                <form
                  noValidate
                  className="flex flex-col gap-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void read();
                  }}
                >
                  <FieldGroup>
                    {source.parameters.map((p) => (
                      <TypedInput
                        key={p.key}
                        parameter={p}
                        value={args[p.key]}
                        path={`getter.${p.key}`}
                        errors={Object.fromEntries(
                          Object.entries(errors).map(([key, value]) => [
                            `getter.${key}`,
                            value,
                          ]),
                        )}
                        assist={false}
                        onChange={(value) => {
                          clear();
                          setArgs((previous) => ({
                            ...previous,
                            [p.key]: value,
                          }));
                        }}
                      />
                    ))}
                  </FieldGroup>
                  <details
                    open={callerOpen}
                    onToggle={(event) =>
                      setCallerOpen(event.currentTarget.open)
                    }
                    className="text-xs text-muted-foreground"
                  >
                    <summary>Caller context · optional</summary>
                    <Field
                      className="mt-3"
                      data-invalid={!!errors.from || undefined}
                    >
                      <FieldLabel htmlFor={`getter-caller-${path}`}>
                        Read as address
                      </FieldLabel>
                      <Input
                        id={`getter-caller-${path}`}
                        value={caller}
                        placeholder="0x…"
                        aria-invalid={!!errors.from || undefined}
                        aria-describedby={
                          errors.from
                            ? `getter-caller-${path}-error`
                            : undefined
                        }
                        onChange={(e) => {
                          clear();
                          setCaller(e.target.value);
                        }}
                      />
                      {errors.from && (
                        <FieldError id={`getter-caller-${path}-error`}>
                          {errors.from}
                        </FieldError>
                      )}
                      {context.address && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            clear();
                            setCaller(context.address!);
                          }}
                        >
                          Use connected wallet for this read
                        </Button>
                      )}
                    </Field>
                  </details>
                  <ErrorNotice error={error} />
                  <Button type="submit" variant="secondary" disabled={pending}>
                    {pending ? (
                      <Loader2 className="animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Search />
                    )}{" "}
                    {pending ? "Reading getter…" : "Read getter"}
                  </Button>
                </form>
              )}
              {result && choices && (
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">
                    {result.signature} · {result.network} ·{" "}
                    {new Date(result.observedAt).toLocaleTimeString()}
                  </p>
                  <p className="break-all font-mono text-[10px] text-muted-foreground">
                    ABI revision {result.revision}
                  </p>
                  {choices.values.map((choice, index) => (
                    <div
                      key={`${choice.path}:${index}`}
                      className="flex items-start gap-3 rounded-xl border border-border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 font-mono text-[10px] text-muted-foreground">
                          {choice.path} · {choice.type}
                        </p>
                        <pre className="max-h-32 whitespace-pre-wrap break-all overflow-y-auto text-xs">
                          {typeof choice.value === "string"
                            ? choice.value || '"" (empty text)'
                            : JSON.stringify(choice.value, null, 2)}
                        </pre>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Use ${choice.path}`}
                        onClick={() => {
                          onUse(choice.value);
                          setOpen(false);
                          clear();
                        }}
                      >
                        Use value
                      </Button>
                    </div>
                  ))}
                  {!choices.values.length && (
                    <FieldError>
                      No returned value fits this argument’s type and bounds.
                    </FieldError>
                  )}
                  {choices.truncated && (
                    <p className="text-xs text-muted-foreground">
                      Showing a bounded selection of results. Use the CLI for
                      the full getter response.
                    </p>
                  )}
                </div>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}
