"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Search,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  Globe,
  Cpu,
  Image as ImageIcon,
  Wrench,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ensureInit,
  getProviderCatalogService,
} from "@/lib/services";
import type {
  ProviderCatalogItem,
  ModelCatalogItem,
} from "@/lib/services";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

function CapabilityBadge({ cap }: { cap: string }) {
  const map: Record<string, { icon: typeof ImageIcon; label: string }> = {
    vision: { icon: ImageIcon, label: "Vision" },
    tools: { icon: Wrench, label: "Tools" },
    reasoning: { icon: Brain, label: "Reasoning" },
  };
  const entry = map[cap];
  if (!entry) return null;
  const Icon = entry.icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-container-high)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--on-surface-variant)]">
      <Icon className="h-2.5 w-2.5" />
      {entry.label}
    </span>
  );
}

function formatContext(limit: number): string {
  if (limit <= 0) return "";
  if (limit >= 1000000) return `${(limit / 1000000).toFixed(1)}M`;
  return `${Math.round(limit / 1000)}K`;
}

export function CatalogBrowseDialog({ open, onOpenChange, onImported }: Props) {
  const [providers, setProviders] = useState<ProviderCatalogItem[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [query, setQuery] = useState("");

  const [selected, setSelected] = useState<ProviderCatalogItem | null>(null);
  const [models, setModels] = useState<ModelCatalogItem[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [baseUrlOverride, setBaseUrlOverride] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return providers;
    const q = query.toLowerCase();
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.catalogId.toLowerCase().includes(q),
    );
  }, [providers, query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingProviders(true);
    setError(null);
    ensureInit()
      .then(() => getProviderCatalogService().listProviders())
      .then((data) => {
        if (!cancelled) setProviders(data);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load catalog");
      })
      .finally(() => !cancelled && setLoadingProviders(false));
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open && !selected) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, selected]);

  const handleSelect = (provider: ProviderCatalogItem) => {
    setSelected(provider);
    setApiKey("");
    setBaseUrlOverride(provider.baseUrl ?? "");
    setShowApiKey(false);
    setError(null);
    setLoadingModels(true);
    setModels([]);
    ensureInit()
      .then(() => getProviderCatalogService().listModels(provider.catalogId))
      .then((data) => setModels(data))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load models"),
      )
      .finally(() => setLoadingModels(false));
  };

  const handleBack = () => {
    setSelected(null);
    setModels([]);
    setError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSelected(null);
      setModels([]);
      setApiKey("");
      setBaseUrlOverride("");
      setError(null);
    }, 200);
  };

  const handleImport = async () => {
    if (!selected || !apiKey.trim()) return;
    setImporting(true);
    setError(null);
    try {
      await ensureInit();
      await getProviderCatalogService().importProvider({
        catalogId: selected.catalogId,
        apiKey: apiKey.trim(),
        baseUrlOverride: baseUrlOverride.trim() || null,
      });
      onImported();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import provider");
    } finally {
      setImporting(false);
    }
  };

  const typeLabel: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    "openai-compatible": "OpenAI Compatible",
    "anthropic-compatible": "Anthropic Compatible",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : handleClose())}>
      <DialogContent className="max-h-[85vh] overflow-hidden border-[var(--outline-variant)]/10 bg-[var(--surface-container)] p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-[var(--outline-variant)]/10 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 tracking-tight text-[var(--on-surface)]">
            {selected && (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-lg p-1 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {selected ? selected.name : "Browse Provider Catalog"}
          </DialogTitle>
        </DialogHeader>

        {!selected ? (
          <div className="flex max-h-[60vh] flex-col">
            <div className="border-b border-[var(--outline-variant)]/10 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--on-surface-variant)]/50" />
                <Input
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search providers..."
                  className="border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] pl-9 text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/40 focus-visible:ring-[var(--primary)]/30"
                />
              </div>
              {error && (
                <p className="mt-2 text-xs font-medium text-[var(--destructive)]">
                  {error}
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loadingProviders ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--on-surface-variant)]" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--on-surface-variant)]">
                  No providers found
                </p>
              ) : (
                filtered.map((provider) => (
                  <button
                    key={provider.catalogId}
                    type="button"
                    onClick={() => handleSelect(provider)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--surface-container-high)]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-container-high)]">
                      <Globe className="h-4 w-4 text-[var(--on-surface-variant)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--on-surface)]">
                        {provider.name}
                      </p>
                      <p className="truncate text-xs text-[var(--on-surface-variant)]">
                        {typeLabel[provider.type] ?? provider.type}
                        {provider.baseUrl && ` · ${provider.baseUrl}`}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-[var(--on-surface-variant)]">
                      <Cpu className="h-3 w-3" />
                      {provider.modelCount}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex max-h-[60vh] flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              {loadingModels ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--on-surface-variant)]" />
                </div>
              ) : (
                <>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
                    {models.length} models available
                  </p>
                  <div className="mb-4 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-[var(--outline-variant)]/10 bg-[var(--surface)] p-2">
                    {models.slice(0, 50).map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-[var(--on-surface)]">
                            {model.displayName}
                          </p>
                          <p className="truncate text-[10px] text-[var(--on-surface-variant)]">
                            {model.id}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {model.capabilities
                            .filter((c) => c !== "chat")
                            .map((cap) => (
                              <CapabilityBadge key={cap} cap={cap} />
                            ))}
                          {model.contextLimit > 0 && (
                            <span className="text-[10px] text-[var(--on-surface-variant)]">
                              {formatContext(model.contextLimit)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {models.length > 50 && (
                      <p className="py-1 text-center text-[10px] text-[var(--on-surface-variant)]">
                        +{models.length - 50} more
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
                    API Key
                  </Label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your API key"
                      className="border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] pr-10 text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/40 focus-visible:ring-[var(--primary)]/30"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                {selected.baseUrl && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
                      Base URL (optional override)
                    </Label>
                    <Input
                      value={baseUrlOverride}
                      onChange={(e) => setBaseUrlOverride(e.target.value)}
                      placeholder={selected.baseUrl}
                      className="border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/40 focus-visible:ring-[var(--primary)]/30"
                    />
                  </div>
                )}
                {error && (
                  <p className="text-xs font-medium text-[var(--destructive)]">
                    {error}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="border-t border-[var(--outline-variant)]/10 px-5 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={importing}
                className="border-[var(--outline-variant)]/15 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={importing || !apiKey.trim()}
                className={cn("bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90")}
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Import ${selected.name}`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
