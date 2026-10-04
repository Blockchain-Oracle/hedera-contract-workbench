"use client";

import { useState } from "react";
import { Popover, Select } from "radix-ui";
import { Command } from "cmdk";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "cn";

type Option = { value: string; label: string; description?: string };

/** Search and keyboard navigation belong to cmdk; focus and dismissal to Radix. */
export function Picker({
  label,
  value,
  options,
  onChange,
  className,
  disabled,
  placeholder = "Choose an option",
  emptyLabel = "No options available",
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          disabled={disabled || !options.length}
          className={cn(
            "wb-picker flex min-h-12 w-full min-w-0 items-center justify-between gap-3 rounded-[12px] border border-input bg-card px-4 py-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
            className,
          )}
        >
          <span className="min-w-0 truncate font-medium">
            {selected?.label ?? (options.length ? placeholder : emptyLabel)}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="wb-picker-menu z-[70] w-[var(--radix-popover-trigger-width)] min-w-0 max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
        >
          <Command label={label} defaultValue={value} loop>
            <div className="flex items-center gap-2 border-b border-border px-3 py-1">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                aria-label={`Search ${label.toLowerCase()}`}
                placeholder="Search by name or signature"
                className="h-11 w-full min-w-0 rounded-lg border-0 bg-transparent px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              />
            </div>
            <Command.List className="max-h-[min(320px,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain py-1">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                No matching options.
              </Command.Empty>
              <Command.Group>
                {options.map((option) => (
                  <Command.Item
                    key={option.value}
                    value={option.value}
                    keywords={[option.label, option.description ?? ""]}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-[12px] px-3 py-3 text-sm data-[selected=true]:bg-accent"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-medium">
                        {option.label}
                      </span>
                      {option.description && (
                        <span className="mt-1 block break-all font-mono text-[11px] text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </span>
                    {value === option.value && (
                      <Check className="size-4 shrink-0 text-primary" />
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Choice({
  id,
  label,
  value,
  options,
  onChange,
  invalid,
  describedBy,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  onBlur?: () => void;
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        data-slot="select-trigger"
        id={id}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onBlur={onBlur}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-[12px] border border-input bg-card px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive"
      >
        <Select.Value />
        <Select.Icon>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={8}
          className="z-[70] min-w-[var(--radix-select-trigger-width)] rounded-[12px] border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="relative cursor-pointer rounded-lg py-3 pl-3 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[highlighted]:bg-accent"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="absolute right-3 top-3">
                  <Check className="size-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
