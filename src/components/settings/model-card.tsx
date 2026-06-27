"use client";

import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Model } from "@/lib/services";
import {
  parseModelCapabilities,
  parseModelMetadata,
  getModelDisplayName,
  formatContextLimit,
} from "@/lib/models";

interface ModelCardProps {
  model: Model;
  onToggle: (model: Model) => void;
  onEdit: (model: Model) => void;
  onDelete: (modelId: string) => void;
}

const capabilityLabels: Record<string, string> = {
  vision: "Vision",
  tools: "Tools",
  reasoning: "Reasoning",
  structured: "Structured",
};

function formatPrice(cost?: number): string {
  if (cost === undefined || cost === null) return "";
  if (cost === 0) return "Free";
  return `$${cost.toFixed(2)}`;
}

export function ModelCard({ model, onToggle, onEdit, onDelete }: ModelCardProps) {
  const capabilities = parseModelCapabilities(model.capabilities);
  const metadata = parseModelMetadata(model.metadata);
  const displayName = getModelDisplayName(model.name, model.metadata);
  const contextStr = formatContextLimit(metadata.limit?.context);
  const isCatalog = !!model.catalogModelId;
  const hasCost =
    metadata.cost &&
    (metadata.cost.input !== undefined || metadata.cost.output !== undefined);

  const extraCapabilities = capabilities.filter((c) => c !== "chat");
  const hasMeta = extraCapabilities.length > 0 || contextStr || hasCost;

  return (
    <div className="rounded-xl border border-[var(--outline-variant)]/10 bg-[var(--surface-container)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Switch
            checked={model.enabled}
            onCheckedChange={() => onToggle(model)}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-semibold text-[var(--on-surface)]">
                {displayName}
              </span>
              {isCatalog && (
                <span
                  title="Synced from models.dev"
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]"
                />
              )}
              {displayName !== model.name && (
                <code className="font-mono text-[10px] text-[var(--on-surface-variant)] opacity-60">
                  {model.name}
                </code>
              )}
            </div>

            {hasMeta && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {extraCapabilities.map((cap) => (
                  <span
                    key={cap}
                    className="rounded bg-[var(--surface-container-high)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--on-surface-variant)]"
                  >
                    {capabilityLabels[cap] ?? cap}
                  </span>
                ))}

                {hasMeta && (extraCapabilities.length > 0) && (contextStr || hasCost) && (
                  <span className="text-[10px] text-[var(--outline)]">·</span>
                )}

                {contextStr && (
                  <span className="text-[10px] text-[var(--on-surface-variant)] opacity-70">
                    {contextStr} context
                  </span>
                )}

                {hasCost && metadata.cost && (
                  <span className="text-[10px] text-[var(--on-surface-variant)] opacity-70">
                    {formatPrice(metadata.cost.input)} in · {formatPrice(metadata.cost.output)} out
                    <span className="opacity-60"> /1M</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            title="Edit model"
            onClick={() => onEdit(model)}
            className="rounded-lg p-1.5 text-[var(--on-surface-variant)] opacity-60 transition-all hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] hover:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Delete model"
            onClick={() => onDelete(model.id)}
            className={cn(
              "rounded-lg p-1.5 text-[var(--on-surface-variant)] opacity-60 transition-all",
              "hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] hover:opacity-100",
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
