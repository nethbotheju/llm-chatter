"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../utils/cn";
import type { Model } from "@llm-chatter/services";
import {
  parseModelCapabilities,
  parseModelMetadata,
  getModelDisplayName,
  type ModelMetadata,
} from "@llm-chatter/contracts";

interface AddModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  editingModel: Model | null;
  onSubmit: (input: {
    name: string;
    displayName: string;
    capabilities: string[];
    metadata: ModelMetadata;
  }) => Promise<void>;
}

const capabilityOptions = [
  { value: "vision", label: "Vision", desc: "Accepts image inputs" },
  { value: "tools", label: "Tools", desc: "Supports function/tool calling" },
  { value: "reasoning", label: "Reasoning", desc: "Produces reasoning steps" },
  { value: "structured", label: "Structured output", desc: "JSON mode support" },
];

export function AddModelDialog({
  open,
  onOpenChange,
  providerId,
  editingModel,
  onSubmit,
}: AddModelDialogProps) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [contextLimit, setContextLimit] = useState("");
  const [inputPrice, setInputPrice] = useState("");
  const [outputPrice, setOutputPrice] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCatalog = !!editingModel?.catalogModelId;

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingModel) {
      const caps = parseModelCapabilities(editingModel.capabilities);
      const meta = parseModelMetadata(editingModel.metadata);
      setName(editingModel.name);
      setDisplayName(meta.displayName ?? "");
      setCapabilities(caps.filter((c) => c !== "chat"));
      setContextLimit(meta.limit?.context ? String(meta.limit.context) : "");
      setInputPrice(meta.cost?.input !== undefined ? String(meta.cost.input) : "");
      setOutputPrice(meta.cost?.output !== undefined ? String(meta.cost.output) : "");
      setShowAdvanced(
        meta.limit?.context !== undefined ||
          meta.cost?.input !== undefined ||
          meta.cost?.output !== undefined,
      );
    } else {
      setName("");
      setDisplayName("");
      setCapabilities([]);
      setContextLimit("");
      setInputPrice("");
      setOutputPrice("");
      setShowAdvanced(false);
    }
  }, [open, editingModel]);

  const toggleCapability = (cap: string) => {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const caps = ["chat", ...capabilities];
      const metadata: ModelMetadata = {};
      if (displayName.trim()) metadata.displayName = displayName.trim();
      if (contextLimit.trim()) {
        const ctx = Number(contextLimit);
        if (!Number.isNaN(ctx)) metadata.limit = { context: ctx };
      }
      const inPrice = Number(inputPrice);
      const outPrice = Number(outputPrice);
      if (
        (!inputPrice.trim() || !Number.isNaN(inPrice)) &&
        (!outputPrice.trim() || !Number.isNaN(outPrice)) &&
        (inputPrice.trim() || outputPrice.trim())
      ) {
        metadata.cost = {};
        if (inputPrice.trim()) metadata.cost.input = inPrice;
        if (outputPrice.trim()) metadata.cost.output = outPrice;
      }
      await onSubmit({
        name: name.trim(),
        displayName: displayName.trim(),
        capabilities: caps,
        metadata,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save model");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/40 focus-visible:ring-[var(--primary)]/30";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden border-[var(--outline-variant)]/10 bg-[var(--surface-container)] p-0 sm:rounded-2xl">
        <DialogHeader className="shrink-0 border-b border-[var(--outline-variant)]/10 px-5 py-4">
          <DialogTitle className="tracking-tight text-[var(--on-surface)]">
            {editingModel ? "Edit Model" : "Add Model"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
              Model ID <span className="text-[var(--destructive)]">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. gpt-4o-mini"
              required
              disabled={isCatalog}
              className={cn(inputClass, isCatalog && "opacity-60")}
            />
            <p className="text-[11px] text-[var(--on-surface-variant)] opacity-70">
              Exact model ID the API expects. {isCatalog && "Locked for catalog-synced models."}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
              Display Name
            </Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={name ? getModelDisplayName(name) : "Friendly name"}
              className={inputClass}
            />
            <p className="text-[11px] text-[var(--on-surface-variant)] opacity-70">
              Shown in the model selector. Falls back to the Model ID.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
              Capabilities
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {capabilityOptions.map((opt) => {
                const active = capabilities.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    role="checkbox"
                    aria-checked={active}
                    tabIndex={0}
                    onClick={() => toggleCapability(opt.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleCapability(opt.value);
                      }
                    }}
                    className={cn(
                      "flex cursor-pointer flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30",
                      active
                        ? "border-[var(--primary)]/40 bg-[var(--primary)]/10"
                        : "border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)]",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Switch checked={active} className="pointer-events-none" />
                      <span className="text-xs font-semibold text-[var(--on-surface)]">
                        {opt.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--on-surface-variant)] opacity-70">
                      {opt.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--outline-variant)]/10">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60 transition-colors hover:text-[var(--on-surface)]"
            >
              Advanced
              {showAdvanced ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            {showAdvanced && (
              <div className="space-y-3 border-t border-[var(--outline-variant)]/10 p-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-[var(--on-surface-variant)]">
                    Context Limit (tokens)
                  </Label>
                  <Input
                    type="number"
                    value={contextLimit}
                    onChange={(e) => setContextLimit(e.target.value)}
                    placeholder="128000"
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-[var(--on-surface-variant)]">
                      Input $ / 1M
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={inputPrice}
                      onChange={(e) => setInputPrice(e.target.value)}
                      placeholder="2.50"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-[var(--on-surface-variant)]">
                      Output $ / 1M
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={outputPrice}
                      onChange={(e) => setOutputPrice(e.target.value)}
                      placeholder="10.00"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs font-medium text-[var(--destructive)]">{error}</p>
          )}
          </div>

          <DialogFooter className="shrink-0 justify-end gap-2 border-t border-[var(--outline-variant)]/10 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[var(--outline-variant)]/15 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !name.trim()}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingModel ? (
                "Save Changes"
              ) : (
                "Add Model"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
