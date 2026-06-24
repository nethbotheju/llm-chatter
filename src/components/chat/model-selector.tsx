"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, Settings, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

import type { ModelWithProvider } from "@/types";
import { getModelDisplayName } from "@/lib/models";

interface ModelSelectorProps {
  models: ModelWithProvider[];
  selectedModelId: string | null;
  onSelectModel: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

export function ModelSelector({
  models,
  selectedModelId,
  onSelectModel,
  disabled,
  className,
  compact = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const selectedDisplayName = selectedModel
    ? getModelDisplayName(selectedModel.name, selectedModel.metadata)
    : null;

  const filteredModels = useMemo(() => {
    return models.filter((m) =>
      getModelDisplayName(m.name, m.metadata)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      m.provider?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [models, searchQuery]);

  const groupedModels = filteredModels.reduce(
    (acc, model) => {
      const providerKey = model.provider?.id || "unknown";
      if (!acc[providerKey]) {
        acc[providerKey] = {
          provider: model.provider,
          models: [],
        };
      }
      acc[providerKey].models.push(model);
      return acc;
    },
    {} as Record<string, { provider?: ModelWithProvider["provider"]; models: ModelWithProvider[] }>
  );

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setSearchQuery("");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handleOpenChange(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (models.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--on-surface-variant)]">
        <span>No models available.</span>
        <Link
          href="/settings/providers"
          className="inline-flex items-center text-[var(--primary)] hover:underline"
        >
          <Settings className="mr-1 h-3 w-3" />
          Configure providers
        </Link>
      </div>
    );
  }

  if (compact) {
    return (
      <div ref={ref} className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => !disabled && handleOpenChange(!open)}
          disabled={disabled}
          className="flex items-center gap-1 text-sm font-semibold text-[var(--on-surface)] transition-colors hover:text-[var(--primary)] disabled:opacity-50"
        >
          {selectedDisplayName ?? selectedModel?.name ?? "Select a model"}
          <ChevronDown className={cn("h-4 w-4 text-[var(--on-surface-variant)] transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute -left-4 top-full z-50 mt-3 flex w-[260px] max-h-[420px] flex-col overflow-hidden rounded-2xl bg-[var(--surface-container-low)]/90 dropdown-shadow backdrop-blur-xl">
            {/* Search Bar */}
            <div className="px-3 pt-3 pb-2 bg-[var(--surface-container-low)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--on-surface-variant)]/50" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-[var(--surface-container-high)] py-2 pl-9 pr-8 text-sm text-[var(--on-surface)] outline-none transition-all placeholder:text-[var(--on-surface-variant)]/40"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto px-1.5 pb-2 bg-[var(--surface-container-low)] scrollbar-none">
              {Object.keys(groupedModels).length === 0 ? (
                <div className="px-4 py-12 text-center text-[var(--on-surface-variant)]">
                  <p className="text-sm font-medium">No results</p>
                </div>
              ) : (
                Object.entries(groupedModels).map(([providerId, { provider, models: providerModels }]) => (
                  <div key={providerId} className="mb-1 last:mb-0">
                    <div className="sticky top-0 z-10 bg-[var(--surface-container-low)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--on-surface-variant)]/60">
                      {provider?.name || "Unknown"}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {providerModels.map((model) => (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => {
                            onSelectModel(model.id);
                            handleOpenChange(false);
                          }}
                          className={cn(
                            "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-200",
                            model.id === selectedModelId
                              ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                              : "text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)]"
                          )}
                        >
                          <span className="truncate">{getModelDisplayName(model.name, model.metadata)}</span>
                          {model.id === selectedModelId && (
                            <Check className="h-3.5 w-3.5 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full dropdown (non-compact)
  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && handleOpenChange(!open)}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border border-[var(--outline-variant)]/30 bg-[var(--surface-container-low)] px-4 py-2 text-sm transition-all duration-300",
          "hover:bg-[var(--surface-container-high)]",
          "focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-[var(--primary)]/50 ring-4 ring-[var(--primary)]/5 shadow-lg"
        )}
      >
        <div className="flex items-baseline gap-2 truncate overflow-hidden text-left">
          {selectedModel ? (
            <>
              <span className="truncate font-semibold text-[var(--on-surface)]">
                {selectedDisplayName ?? selectedModel.name}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-40">
                {selectedModel.provider?.name}
              </span>
            </>
          ) : (
            <span className="font-medium text-[var(--on-surface-variant)]">Select a model</span>
          )}
        </div>
        <ChevronDown className={cn("ml-2 h-4 w-4 text-[var(--on-surface-variant)] transition-transform duration-300", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute -left-4 z-50 mt-3 flex w-[280px] max-h-[450px] flex-col overflow-hidden rounded-2xl bg-[var(--surface-container-low)]/90 dropdown-shadow backdrop-blur-xl">
          {/* Search Bar */}
          <div className="p-3 pb-2 bg-[var(--surface-container-low)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--on-surface-variant)]/50" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-[var(--surface-container-high)] py-2.5 pl-9 pr-8 text-sm text-[var(--on-surface)] outline-none transition-all placeholder:text-[var(--on-surface-variant)]/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto px-1.5 pb-3 bg-[var(--surface-container-low)] scrollbar-none">
            {Object.keys(groupedModels).length === 0 ? (
              <div className="px-4 py-16 text-center text-[var(--on-surface-variant)]">
                <p className="text-sm font-medium">No results found</p>
              </div>
            ) : (
              Object.entries(groupedModels).map(([providerId, { provider, models: providerModels }]) => (
                <div key={providerId} className="mb-2 last:mb-0">
                  <div className="sticky top-0 z-10 bg-[var(--surface-container-low)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--on-surface-variant)]/60">
                    {provider?.name || "Unknown"}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {providerModels.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          onSelectModel(model.id);
                          handleOpenChange(false);
                        }}
                        className={cn(
                          "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-200",
                          model.id === selectedModelId
                            ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                            : "text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)]"
                        )}
                      >
                        <span className="truncate font-medium">{getModelDisplayName(model.name, model.metadata)}</span>
                        {model.id === selectedModelId && (
                          <Check className="h-4 w-4 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
