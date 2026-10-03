"use client";
import type { Json, Parameter } from "@sh/core";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function initialValue(p: Parameter): Json {
  if (p.item)
    return Array.from({ length: p.length ?? 0 }, () => initialValue(p.item!));
  if (p.children)
    return Object.fromEntries(p.children.map((c) => [c.key, initialValue(c)]));
  if (p.type === "bool") return false;
  return "";
}
export function TypedInput({
  parameter: p,
  value,
  onChange,
  path,
}: {
  parameter: Parameter;
  value: Json;
  onChange: (value: Json) => void;
  path: string;
}) {
  const id = `arg-${path}`;
  if (p.children)
    return (
      <fieldset className="rounded-lg border p-4">
        <legend className="px-2 text-sm font-medium">
          {p.name || p.key}{" "}
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
              onChange={(next) =>
                onChange({
                  ...(value as Record<string, Json>),
                  [child.key]: next,
                })
              }
            />
          ))}
        </FieldGroup>
      </fieldset>
    );
  if (p.item) {
    const items = Array.isArray(value) ? value : [];
    return (
      <fieldset className="space-y-3 rounded-lg border p-4">
        <legend className="px-2 text-sm font-medium">
          {p.name || p.key}{" "}
          <span className="font-mono text-xs text-muted-foreground">
            {p.type}
          </span>
        </legend>
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <TypedInput
                parameter={{ ...p.item!, name: `[${i}]`, key: String(i) }}
                value={item}
                path={`${path}.${i}`}
                onChange={(next) =>
                  onChange(items.map((x, index) => (index === i ? next : x)))
                }
              />
            </div>
            {p.length === undefined && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${p.key} item ${i}`}
                onClick={() =>
                  onChange(items.filter((_, index) => index !== i))
                }
              >
                Remove
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
            Add item
          </Button>
        )}
        {!items.length && (
          <p className="text-xs text-muted-foreground">
            Empty array. Add items in their intended order.
          </p>
        )}
      </fieldset>
    );
  }
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {p.name || p.key}{" "}
        <span className="font-mono text-xs text-muted-foreground">
          {p.type}
        </span>
      </FieldLabel>
      {p.type === "bool" ? (
        <select
          id={id}
          value={String(value)}
          onChange={(e) => onChange(e.target.value === "true")}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="false">false</option>
          <option value="true">true</option>
        </select>
      ) : (
        <Input
          id={id}
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
        />
      )}
      {/int/.test(p.type) && (
        <FieldDescription>
          Exact integer. Decimal strings preserve precision.
        </FieldDescription>
      )}
    </Field>
  );
}
