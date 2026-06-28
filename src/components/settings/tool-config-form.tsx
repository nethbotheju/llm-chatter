"use client";

import { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ConfigField } from "@/lib/builtin-tools";
import { fieldVisible, REDACTED } from "@/lib/builtin-tools";

interface ToolConfigFormProps {
  fields: ConfigField[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  className?: string;
}

export function ToolConfigForm({ fields, values, onChange, className }: ToolConfigFormProps) {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  return (
    <div className={cn("space-y-4", className)}>
      {fields.map((field) => {
        if (!fieldVisible(field, values)) return null;
        const value = values[field.key];

        return (
          <div key={field.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={field.key} className="text-xs font-semibold text-[var(--on-surface)]">
                {field.label}
              </Label>
              {field.type === "secret" && value === REDACTED && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--on-surface-variant)] opacity-70">
                  <Check className="h-3 w-3 text-green-500" />
                  Set
                </span>
              )}
            </div>

            {field.description && (
              <p className="text-[11px] leading-snug text-[var(--on-surface-variant)] opacity-70">
                {field.description}
              </p>
            )}

            {renderField(field, value, values, showSecrets, setShowSecrets, onChange)}
          </div>
        );
      })}
    </div>
  );
}

function renderField(
  field: ConfigField,
  value: unknown,
  values: Record<string, unknown>,
  showSecrets: Record<string, boolean>,
  setShowSecrets: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  onChange: (key: string, value: unknown) => void,
) {
  const inputClass =
    "border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/40 focus-visible:ring-[var(--primary)]/30";

  switch (field.type) {
    case "boolean":
      return (
        <Switch
          id={field.key}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(field.key, checked)}
        />
      );

    case "select":
      return (
        <Select
          id={field.key}
          options={field.options?.map((o) => ({ value: o.value, label: o.label })) ?? []}
          value={String(value ?? "")}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );

    case "number":
      return (
        <Input
          id={field.key}
          type="number"
          inputMode="numeric"
          value={value === undefined || value === null ? "" : String(value)}
          placeholder={field.placeholder}
          onChange={(e) => {
            const n = e.target.value === "" ? field.default : Number(e.target.value);
            onChange(field.key, Number.isNaN(n) ? field.default : n);
          }}
          className={inputClass}
        />
      );

    case "secret": {
      const visible = showSecrets[field.key];
      const isRedacted = value === REDACTED;
      return (
        <div className="relative">
          <Input
            id={field.key}
            type={visible ? "text" : "password"}
            value={isRedacted ? "" : (value as string) ?? ""}
            placeholder={isRedacted ? "•••••••• (unchanged)" : field.placeholder ?? "Enter value"}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={cn("pr-9", inputClass)}
          />
          <button
            type="button"
            onClick={() => setShowSecrets((s) => ({ ...s, [field.key]: !s[field.key] }))}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
      );
    }

    case "text":
    default:
      return (
        <Input
          id={field.key}
          type="text"
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputClass}
        />
      );
  }
}
