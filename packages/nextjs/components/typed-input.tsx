"use client";
import type { Json, Parameter } from "@sh/core";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Choice } from "./picker";
import { Plus, X } from "lucide-react";
import { GetterValuePicker } from "./input-assistance";
export function initialValue(p: Parameter): Json {
  if (p.item)
    return p.length === undefined
      ? null
      : Array.from({ length: p.length }, () => initialValue(p.item!));
  if (p.children)
    return Object.fromEntries(p.children.map((c) => [c.key, initialValue(c)]));
  if (p.type === "bool") return false;
  return null;
}
export function TypedInput({
  parameter: p,
  value,
  onChange,
  path,
  errors = {},
  onTouch,
  assist = true,
}: {
  parameter: Parameter;
  value: Json;
  onChange: (value: Json) => void;
  path: string;
  errors?: Record<string, string>;
  onTouch?: (path: string) => void;
  assist?: boolean;
}) {
  const id = `arg-${path}`;
  const error = errors[path];
  const errorId = error ? `${id}-error` : undefined;
  if (p.children)
    return (
      <fieldset
        id={id}
        tabIndex={error ? -1 : undefined}
        aria-invalid={!!error || undefined}
        aria-describedby={errorId}
        className="rounded-2xl border border-border/70 bg-muted/40 p-4 sm:p-5 aria-invalid:border-destructive"
      >
        <legend className="px-2 text-sm font-medium">
          {p.name || p.key}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            required
          </span>{" "}
          <span className="font-mono text-xs text-muted-foreground">tuple</span>
        </legend>
        <FieldGroup>
          {p.children.map((child) => (
            <TypedInput
              key={child.key}
              parameter={child}
              value={
                (value as Record<string, Json>)?.[child.key] ??
                initialValue(child)
              }
              path={`${path}.${child.key}`}
              errors={errors}
              onTouch={onTouch}
              assist={assist}
              onChange={(next) =>
                onChange({
                  ...(value as Record<string, Json>),
                  [child.key]: next,
                })
              }
            />
          ))}
        </FieldGroup>
        {error && <FieldError id={errorId}>{error}</FieldError>}
        {assist && (
          <GetterValuePicker parameter={p} path={path} onUse={onChange} />
        )}
      </fieldset>
    );
  if (p.item) {
    const items = Array.isArray(value) ? value : [];
    return (
      <fieldset
        id={id}
        tabIndex={error ? -1 : undefined}
        aria-invalid={!!error || undefined}
        aria-describedby={errorId}
        className="space-y-4 rounded-2xl border border-border/70 bg-muted/40 p-4 sm:p-5 aria-invalid:border-destructive"
      >
        <legend className="px-2 text-sm font-medium">
          {p.name || p.key}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            required
          </span>{" "}
          <span className="font-mono text-xs text-muted-foreground">
            {p.type}
          </span>
        </legend>
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-2 rounded-xl bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <TypedInput
                parameter={{ ...p.item!, name: `[${i}]`, key: String(i) }}
                value={item}
                path={`${path}[${i}]`}
                errors={errors}
                onTouch={onTouch}
                assist={assist}
                onChange={(next) =>
                  onChange(items.map((x, index) => (index === i ? next : x)))
                }
              />
            </div>
            {p.length === undefined && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${p.key} item ${i}`}
                onClick={() =>
                  onChange(items.filter((_, index) => index !== i))
                }
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}
        {p.length === undefined && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={items.length >= 1024}
            onClick={() => onChange([...items, initialValue(p.item!)])}
          >
            <Plus className="size-4" /> Add item
          </Button>
        )}
        {!items.length && (
          <div className="flex flex-col gap-2 rounded-xl bg-card p-4 text-sm text-muted-foreground">
            <p>No items yet. Add values in the order the contract expects.</p>
            {p.length === undefined && value === null && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange([])}
              >
                Use an empty array
              </Button>
            )}
            {value !== null && (
              <p className="text-xs">
                An empty array is selected. The contract may require items.
              </p>
            )}
          </div>
        )}
        {error && <FieldError id={errorId}>{error}</FieldError>}
        {assist && (
          <GetterValuePicker parameter={p} path={path} onUse={onChange} />
        )}
      </fieldset>
    );
  }
  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={id}>
        {p.name || p.key}{" "}
        <span className="text-xs font-normal text-muted-foreground">
          required
        </span>
        <span className="ml-auto font-mono text-xs font-normal text-muted-foreground">
          {p.type}
        </span>
      </FieldLabel>
      {p.type === "bool" ? (
        <Choice
          id={id}
          invalid={!!error}
          describedBy={errorId}
          onBlur={() => onTouch?.(path)}
          label={p.name || p.key}
          value={String(value)}
          onChange={(next) => onChange(next === "true")}
          options={[
            { value: "false", label: "false" },
            { value: "true", label: "true" },
          ]}
        />
      ) : (
        <Input
          id={id}
          aria-label={p.name || p.key}
          aria-invalid={!!error || undefined}
          aria-required
          onBlur={() => onTouch?.(path)}
          className={p.type === "string" ? "" : "font-mono"}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            p.type === "address"
              ? "0x…"
              : p.type.startsWith("bytes")
                ? "0x"
                : /int/.test(p.type)
                  ? "Decimal integer"
                  : "Enter text"
          }
          autoComplete="off"
          spellCheck={false}
          aria-describedby={
            [errorId, /int/.test(p.type) ? `${id}-help` : undefined]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
      {p.type === "string" && value === null && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => onChange("")}
        >
          Use empty text
        </Button>
      )}
      {p.type === "bytes" && value === null && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => onChange("0x")}
        >
          Use empty bytes
        </Button>
      )}
      {assist && (
        <GetterValuePicker parameter={p} path={path} onUse={onChange} />
      )}
      {/int/.test(p.type) && (
        <FieldDescription id={`${id}-help`}>
          Use a whole number. Large values stay exact; no rounding.
        </FieldDescription>
      )}
    </Field>
  );
}
