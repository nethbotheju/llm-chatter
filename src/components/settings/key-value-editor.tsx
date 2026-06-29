"use client";

import { Plus, X, Lock, Unlock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { REDACTED } from "@/lib/builtin-tools";

export interface KeyValueRow {
  key: string;
  value: string;
  isSecret: boolean;
}

interface KeyValueEditorProps {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: KeyValueEditorProps) {
  const update = (index: number, patch: Partial<KeyValueRow>) => {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));
  const add = () =>
    onChange([...rows, { key: "", value: "", isSecret: false }]);

  return (
    <div className="space-y-2">
      {rows.map((row, index) => {
        const isRedacted = row.value === REDACTED;
        return (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={row.key}
              placeholder={keyPlaceholder}
              onChange={(e) => update(index, { key: e.target.value })}
              className="w-1/3 border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/40 focus-visible:ring-[var(--primary)]/30"
            />
            <div className="relative flex-1">
              <Input
                type={row.isSecret && !isRedacted ? "password" : "text"}
                value={isRedacted ? "" : row.value}
                placeholder={isRedacted ? "•••••••• (unchanged)" : valuePlaceholder}
                onChange={(e) => update(index, { value: e.target.value })}
                className="border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/40 focus-visible:ring-[var(--primary)]/30"
              />
            </div>
            <button
              type="button"
              title={row.isSecret ? "Secret (encrypted at rest)" : "Mark as secret"}
              onClick={() => update(index, { isSecret: !row.isSecret })}
              className={cn(
                "shrink-0 rounded-md p-2 transition-colors",
                row.isSecret
                  ? "text-[var(--primary)]"
                  : "text-[var(--on-surface-variant)] opacity-50 hover:text-[var(--on-surface)] hover:opacity-100",
              )}
            >
              {row.isSecret ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              title="Remove"
              onClick={() => remove(index)}
              className="shrink-0 rounded-md p-2 text-[var(--on-surface-variant)] opacity-50 transition-colors hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      <Button
        type="button"
        variant="ghost"
        onClick={add}
        className="flex items-center gap-1.5 text-xs font-medium text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
      >
        <Plus className="h-3.5 w-3.5" />
        Add row
      </Button>
    </div>
  );
}

export function rowsToMap(
  rows: KeyValueRow[],
): { map: Record<string, string>; secretKeys: string[] } {
  const map: Record<string, string> = {};
  const secretKeys: string[] = [];
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    map[key] = row.value;
    if (row.isSecret) secretKeys.push(key);
  }
  return { map, secretKeys };
}

export function mapToRows(
  map: Record<string, string> | null | undefined,
  secretKeys: string[],
): KeyValueRow[] {
  if (!map) return [];
  const secretSet = new Set(secretKeys);
  return Object.entries(map).map(([key, value]) => ({
    key,
    value,
    isSecret: secretSet.has(key),
  }));
}
