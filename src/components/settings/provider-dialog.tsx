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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Search,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  X,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ensureInit,
  getProviderService,
  getProviderCatalogService,
} from "@/lib/services";
import type {
  Provider,
  ProviderCatalogItem,
  ModelCatalogItem,
  CreateProviderInput,
  UpdateProviderInput,
  ValidateProviderInput,
} from "@/lib/services";
import { formatContextLimit } from "@/lib/models";
import { Monogram } from "./monogram";

interface ProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProvider: Provider | null;
  onSaved: () => void;
}

type Mode = "catalog" | "custom";

const typeLabel: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  "openai-compatible": "OpenAI Compatible",
  "anthropic-compatible": "Anthropic Compatible",
};

const inputClass =
  "border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/40 focus-visible:ring-[var(--primary)]/30";

const capabilityLabels: Record<string, string> = {
  vision: "Vision",
  tools: "Tools",
  reasoning: "Reasoning",
  structured: "Structured",
};

export function ProviderDialog({
  open,
  onOpenChange,
  editingProvider,
  onSaved,
}: ProviderDialogProps) {
  const isEditing = !!editingProvider;
  const editingIsCatalog = !!editingProvider?.catalogId;

  const [mode, setMode] = useState<Mode>("catalog");

  const [catalogProviders, setCatalogProviders] = useState<ProviderCatalogItem[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ProviderCatalogItem | null>(null);
  const [catalogModels, setCatalogModels] = useState<ModelCatalogItem[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [baseUrlOverride, setBaseUrlOverride] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState("openai-compatible");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);

  const filteredCatalog = useMemo(() => {
    if (!query.trim()) return catalogProviders;
    const q = query.toLowerCase();
    return catalogProviders.filter(
      (p) => p.name.toLowerCase().includes(q) || p.catalogId.toLowerCase().includes(q),
    );
  }, [catalogProviders, query]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setValidationResult(null);
    setApiKey("");
    setShowApiKey(false);

    if (isEditing && editingProvider) {
      setCustomName(editingProvider.name);
      setCustomType(
        editingProvider.type === "anthropic-compatible"
          ? "anthropic-compatible"
          : "openai-compatible",
      );
      setCustomBaseUrl(editingProvider.baseUrl ?? "");
      setEnabled(editingProvider.enabled);
      setMode(editingIsCatalog ? "catalog" : "custom");
      setSelected(null);
    } else {
      setMode("catalog");
      setCustomName("");
      setCustomType("openai-compatible");
      setCustomBaseUrl("");
      setEnabled(true);
      setSelected(null);
      setCatalogModels([]);
    }
  }, [open, isEditing, editingProvider, editingIsCatalog]);

  useEffect(() => {
    if (!open || isEditing || mode !== "catalog") return;
    let cancelled = false;
    setLoadingProviders(true);
    ensureInit()
      .then(() => getProviderCatalogService().listProviders())
      .then((data) => !cancelled && setCatalogProviders(data))
      .catch((e) =>
        !cancelled && setError(e instanceof Error ? e.message : "Failed to load catalog"),
      )
      .finally(() => !cancelled && setLoadingProviders(false));
    return () => {
      cancelled = true;
    };
  }, [open, isEditing, mode]);

  useEffect(() => {
    if (open && !isEditing && mode === "catalog" && !selected) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, isEditing, mode, selected]);

  const handleSelectCatalog = (provider: ProviderCatalogItem) => {
    setSelected(provider);
    setApiKey("");
    setBaseUrlOverride(provider.baseUrl ?? "");
    setShowApiKey(false);
    setError(null);
    setLoadingModels(true);
    setCatalogModels([]);
    ensureInit()
      .then(() => getProviderCatalogService().listModels(provider.catalogId))
      .then((data) => setCatalogModels(data))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load models"))
      .finally(() => setLoadingModels(false));
  };

  const handleBackToList = () => {
    setSelected(null);
    setCatalogModels([]);
    setError(null);
  };

  const handleImportCatalog = async () => {
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
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import provider");
    } finally {
      setImporting(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      await ensureInit();
      const result = await getProviderService().validate({
        providerId: editingProvider?.id,
        type: customType,
        baseUrl: customBaseUrl,
        apiKey,
      } as ValidateProviderInput);
      setValidationResult({ valid: result.valid, error: result.error });
    } catch {
      setValidationResult({ valid: false, error: "Validation failed" });
    } finally {
      setValidating(false);
    }
  };

  const handleSaveCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await ensureInit();
      if (isEditing && editingProvider) {
        const update: UpdateProviderInput = {
          id: editingProvider.id,
          enabled,
          apiKey: apiKey || undefined,
        };
        if (!editingIsCatalog) {
          update.name = customName;
          update.type = customType as "openai-compatible" | "anthropic-compatible";
          update.baseUrl = customBaseUrl;
        }
        await getProviderService().update(update);
      } else {
        await getProviderService().create({
          name: customName,
          type: customType,
          baseUrl: customBaseUrl,
          apiKey,
          enabled,
        } as CreateProviderInput);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save provider");
    }
  };

  const handleClose = () => onOpenChange(false);

  const showCatalogList = !isEditing && mode === "catalog" && !selected;
  const showCatalogDetail = !isEditing && mode === "catalog" && !!selected;
  const showCustomForm = isEditing || mode === "custom";

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : handleClose())}>
      <DialogContent
        className={cn(
          "flex max-h-[85vh] max-w-xl flex-col gap-0 overflow-hidden",
          "border-[var(--outline-variant)]/10 bg-[var(--surface-container)] p-0 sm:rounded-2xl",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-[var(--outline-variant)]/10 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 tracking-tight text-[var(--on-surface)]">
            {showCatalogDetail && (
              <button
                type="button"
                onClick={handleBackToList}
                className="rounded-lg p-1 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {isEditing
              ? "Edit Provider"
              : showCatalogDetail
                ? selected?.name
                : "Add Provider"}
          </DialogTitle>
        </DialogHeader>

        {!isEditing && (
          <div className="flex shrink-0 gap-1 border-b border-[var(--outline-variant)]/10 px-5 pt-3">
            {(["catalog", "custom"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setSelected(null);
                }}
                className={cn(
                  "rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors",
                  mode === m
                    ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                    : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]",
                )}
              >
                {m === "catalog" ? "Browse" : "Custom"}
              </button>
            ))}
          </div>
        )}

        {/* CATALOG LIST */}
        {showCatalogList && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-[var(--outline-variant)]/10 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--on-surface-variant)]/50" />
                <Input
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search providers..."
                  className={cn("pl-9", inputClass)}
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {loadingProviders ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--on-surface-variant)]" />
                </div>
              ) : filteredCatalog.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--on-surface-variant)]">
                  No providers found
                </p>
              ) : (
                filteredCatalog.map((provider) => (
                  <button
                    key={provider.catalogId}
                    type="button"
                    onClick={() => handleSelectCatalog(provider)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-container-high)]"
                  >
                    <Monogram name={provider.name} className="h-9 w-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--on-surface)]">
                        {provider.name}
                      </p>
                      <p className="truncate text-xs text-[var(--on-surface-variant)]">
                        {typeLabel[provider.type] ?? provider.type}
                        {provider.baseUrl && ` · ${provider.baseUrl}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--on-surface-variant)]">
                      {provider.modelCount} models
                    </span>
                  </button>
                ))
              )}
            </div>
            {error && (
              <p className="shrink-0 px-4 py-2 text-xs font-medium text-[var(--destructive)]">
                {error}
              </p>
            )}
          </div>
        )}

        {/* CATALOG DETAIL (import) */}
        {showCatalogDetail && selected && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {loadingModels ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--on-surface-variant)]" />
                </div>
              ) : (
                <>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
                    {catalogModels.length} models will be imported
                  </p>
                  <div className="mb-4 max-h-44 space-y-0.5 overflow-y-auto rounded-xl border border-[var(--outline-variant)]/10 bg-[var(--surface)] p-2">
                    {catalogModels.slice(0, 50).map((model) => {
                      const caps = model.capabilities.filter((c) => c !== "chat");
                      return (
                        <div
                          key={model.id}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-[var(--on-surface)]">
                              {model.displayName}
                            </p>
                            <p className="truncate font-mono text-[10px] text-[var(--on-surface-variant)] opacity-60">
                              {model.id}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {caps.map((cap) => (
                              <span
                                key={cap}
                                className="rounded bg-[var(--surface-container-high)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--on-surface-variant)]"
                              >
                                {capabilityLabels[cap] ?? cap}
                              </span>
                            ))}
                            {model.contextLimit > 0 && (
                              <span className="text-[10px] text-[var(--on-surface-variant)] opacity-70">
                                {formatContextLimit(model.contextLimit)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {catalogModels.length > 50 && (
                      <p className="py-1 text-center text-[10px] text-[var(--on-surface-variant)]">
                        +{catalogModels.length - 50} more
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
                      className={cn("pr-10", inputClass)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                      className={inputClass}
                    />
                  </div>
                )}
                {error && (
                  <p className="text-xs font-medium text-[var(--destructive)]">{error}</p>
                )}
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t border-[var(--outline-variant)]/10 px-5 py-4">
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
                onClick={handleImportCatalog}
                disabled={importing || !apiKey.trim()}
                className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Import ${selected.name}`
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* CUSTOM / EDIT FORM */}
        {showCustomForm && (
          <form onSubmit={handleSaveCustom} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
              {isEditing && editingIsCatalog && (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--outline-variant)]/10 bg-[var(--surface-container-high)] px-3 py-2">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--on-surface-variant)]" />
                  <p className="text-[11px] text-[var(--on-surface-variant)]">
                    Catalog-managed fields are locked. Sync from the provider list to update model data.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
                  Name
                </Label>
                {isEditing && editingIsCatalog ? (
                  <div className="rounded-lg border border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] px-3 py-2 text-sm text-[var(--on-surface)] opacity-70">
                    {customName}
                  </div>
                ) : (
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Provider name"
                    required
                    className={inputClass}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
                  Type
                </Label>
                {isEditing && editingIsCatalog ? (
                  <div className="rounded-lg border border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] px-3 py-2 text-sm text-[var(--on-surface)] opacity-70">
                    {typeLabel[customType] ?? customType}
                  </div>
                ) : (
                  <select
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] px-3 py-1 text-sm text-[var(--on-surface)] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)]/30"
                  >
                    <option value="openai-compatible">OpenAI Compatible</option>
                    <option value="anthropic-compatible">Anthropic Compatible</option>
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
                  Base URL {!(isEditing && editingIsCatalog) && <span className="text-[var(--destructive)]">*</span>}
                </Label>
                {isEditing && editingIsCatalog ? (
                  <div className="rounded-lg border border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] px-3 py-2 text-sm text-[var(--on-surface)] opacity-70">
                    {customBaseUrl || "—"}
                  </div>
                ) : (
                  <Input
                    value={customBaseUrl}
                    onChange={(e) => {
                      setCustomBaseUrl(e.target.value);
                      setValidationResult(null);
                    }}
                    placeholder="https://api.example.com/v1"
                    required
                    className={inputClass}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
                  API Key
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setValidationResult(null);
                      }}
                      placeholder={editingProvider?.hasApiKey ? "Leave empty to keep existing" : "Enter your API key"}
                      className={cn("pr-10", inputClass)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleValidate}
                    disabled={validating || !apiKey}
                    className="border-[var(--outline-variant)]/15 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
                  >
                    {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                  </Button>
                </div>
                {validationResult && (
                  <p className={cn("text-xs font-medium", validationResult.valid ? "text-[var(--tertiary)]" : "text-[var(--destructive)]")}>
                    {validationResult.valid ? (
                      <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Connection successful</span>
                    ) : (
                      <span className="flex items-center gap-1"><X className="h-3 w-3" /> {validationResult.error}</span>
                    )}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={enabled} onCheckedChange={setEnabled} />
                <Label className="text-sm text-[var(--on-surface)]">Enabled</Label>
              </div>

              {error && (
                <p className="text-xs font-medium text-[var(--destructive)]">{error}</p>
              )}
            </div>

            <DialogFooter className="shrink-0 border-t border-[var(--outline-variant)]/10 px-5 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="border-[var(--outline-variant)]/15 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
              >
                {isEditing ? "Save Changes" : "Create Provider"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
