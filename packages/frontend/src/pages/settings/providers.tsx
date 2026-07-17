"use client";

import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import {
  Loader2,
  Trash2,
  Plus,
  Server,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import { cn } from "../../utils/cn";
import {
  getProviderService,
  getModelService,
  getProviderCatalogService,
  ensureInit,
} from "@llm-chatter/services";
import type { Provider, Model } from "@llm-chatter/services";
import type { UpdateProviderInput, CreateModelInput, UpdateModelInput } from "@llm-chatter/services";
import type { ModelMetadata } from "@llm-chatter/contracts";
import { formatDistanceToNow } from "date-fns";
import { ProviderDialog } from "../../components/settings/provider-dialog";
import { AddModelDialog } from "../../components/settings/add-model-dialog";
import { ModelCard } from "../../components/settings/model-card";
import { Monogram } from "../../components/settings/monogram";

interface ProviderWithModels extends Provider {
  models: Model[];
}

const typeLabel: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  "openai-compatible": "OpenAI Compatible",
  "anthropic-compatible": "Anthropic Compatible",
};

export default function ProvidersSettingsPage() {
  const [providers, setProviders] = useState<ProviderWithModels[]>([]);
  const [loading, setLoading] = useState(true);

  const [showProviderDialog, setShowProviderDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [showAddModel, setShowAddModel] = useState(false);
  const [addModelProviderId, setAddModelProviderId] = useState<string | null>(null);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      await ensureInit();
      const [providerData, modelData] = await Promise.all([
        getProviderService().getAll(),
        getModelService().getAll(undefined, true),
      ]);

      const modelsByProvider = new Map<string, Model[]>();
      for (const model of modelData) {
        const existing = modelsByProvider.get(model.providerId);
        if (existing) {
          existing.push(model);
        } else {
          modelsByProvider.set(model.providerId, [model]);
        }
      }

      setProviders(
        providerData.map((provider) => ({
          ...provider,
          models: modelsByProvider.get(provider.id) ?? [],
        })),
      );
    } catch (error) {
      console.error("Failed to fetch providers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleOpenAdd = () => {
    setEditingProvider(null);
    setShowProviderDialog(true);
  };

  const handleEditProvider = (provider: Provider) => {
    setEditingProvider(provider);
    setShowProviderDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this provider? All models will be deleted.")) {
      return;
    }
    try {
      await ensureInit();
      await getProviderService().delete(id);
      fetchProviders();
    } catch (error) {
      console.error("Failed to delete provider:", error);
    }
  };

  const handleToggleEnabled = async (provider: Provider) => {
    try {
      await ensureInit();
      await getProviderService().update({
        id: provider.id,
        enabled: !provider.enabled,
      } as UpdateProviderInput);
      fetchProviders();
    } catch (error) {
      console.error("Failed to toggle provider:", error);
    }
  };

  const handleSyncProvider = async (provider: Provider) => {
    setSyncingId(provider.id);
    try {
      await ensureInit();
      await getProviderCatalogService().syncProvider(provider.id);
      await fetchProviders();
    } catch (error) {
      console.error("Failed to sync provider:", error);
    } finally {
      setSyncingId(null);
    }
  };

  const handleOpenAddModel = (providerId: string) => {
    setEditingModel(null);
    setAddModelProviderId(providerId);
    setShowAddModel(true);
  };

  const handleEditModel = (model: Model) => {
    setEditingModel(model);
    setAddModelProviderId(model.providerId);
    setShowAddModel(true);
  };

  const handleToggleModel = async (model: Model) => {
    try {
      await ensureInit();
      await getModelService().update({
        id: model.id,
        enabled: !model.enabled,
      } as UpdateModelInput);
      fetchProviders();
    } catch (error) {
      console.error("Failed to toggle model:", error);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      await ensureInit();
      await getModelService().delete(modelId);
      fetchProviders();
    } catch (error) {
      console.error("Failed to delete model:", error);
    }
  };

  const handleSubmitModel = async (input: {
    name: string;
    displayName: string;
    capabilities: string[];
    metadata: ModelMetadata;
  }) => {
    if (!addModelProviderId) return;
    const metadataStr = Object.keys(input.metadata).length > 0 ? JSON.stringify(input.metadata) : null;
    if (editingModel) {
      await getModelService().update({
        id: editingModel.id,
        name: input.name,
        capabilities: input.capabilities,
        metadata: metadataStr,
      } as UpdateModelInput);
    } else {
      await getModelService().create({
        name: input.name,
        providerId: addModelProviderId,
        capabilities: input.capabilities,
        metadata: metadataStr,
      } as CreateModelInput);
    }
    await fetchProviders();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--on-surface-variant)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-[var(--on-surface)]">
            Providers
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)]">
            Configure AI providers and their models
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 font-semibold text-[var(--primary-foreground)] transition-all hover:opacity-90 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Provider
        </Button>
      </div>

      {/* Provider List */}
      <div className="space-y-4">
        {providers.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center p-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-container-high)]">
              <Server className="h-8 w-8 text-[var(--on-surface-variant)]" />
            </div>
            <p className="text-sm font-medium text-[var(--on-surface)]">
              No providers configured yet
            </p>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
              Add your first AI provider to start chatting
            </p>
            <Button
              className="mt-6 rounded-full bg-[var(--primary)] px-6 py-2.5 font-semibold text-[var(--primary-foreground)] hover:opacity-90"
              onClick={handleOpenAdd}
            >
              Add your first provider
            </Button>
          </div>
        ) : (
          providers.map((provider) => {
            const isExpanded = expandedProvider === provider.id;
            return (
              <div
                key={provider.id}
                className={cn(
                  "glass-card overflow-hidden transition-opacity",
                  !provider.enabled && "opacity-50",
                )}
              >
                {/* Provider Header */}
                <div className="flex items-center justify-between gap-3 p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Monogram name={provider.name} className="h-10 w-10" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold tracking-tight text-[var(--on-surface)]">
                          {provider.name}
                        </h3>
                        {!provider.hasApiKey && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--destructive)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--destructive)]">
                            No key
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--on-surface-variant)]">
                        {typeLabel[provider.type] ?? provider.type}
                        {provider.baseUrl && ` · ${provider.baseUrl}`}
                      </p>
                      {provider.catalogId && (
                        <p className="mt-0.5 text-[10px] text-[var(--on-surface-variant)] opacity-50">
                          {provider.lastSyncedAt
                            ? `Synced ${formatDistanceToNow(new Date(provider.lastSyncedAt), { addSuffix: true })}`
                            : "Not yet synced"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Switch
                      checked={provider.enabled}
                      onCheckedChange={() => handleToggleEnabled(provider)}
                    />
                    {provider.catalogId && (
                      <button
                        type="button"
                        title="Sync from models.dev"
                        onClick={() => handleSyncProvider(provider)}
                        disabled={syncingId === provider.id}
                        className="rounded-lg p-2 text-[var(--on-surface-variant)] opacity-60 transition-all hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] hover:opacity-100 disabled:opacity-50"
                      >
                        <RefreshCw className={cn("h-4 w-4", syncingId === provider.id && "animate-spin")} />
                      </button>
                    )}
                    <button
                      type="button"
                      title={isExpanded ? "Collapse" : "Expand models"}
                      onClick={() =>
                        setExpandedProvider(isExpanded ? null : provider.id)
                      }
                      className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
                    >
                      {provider.models.length} models
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      title="Edit provider"
                      onClick={() => handleEditProvider(provider)}
                      className="rounded-lg p-2 text-[var(--on-surface-variant)] opacity-60 transition-all hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] hover:opacity-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete provider"
                      onClick={() => handleDelete(provider.id)}
                      className="rounded-lg p-2 text-[var(--on-surface-variant)] opacity-60 transition-all hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Models Section */}
                {isExpanded && (
                  <div className="border-t border-[var(--outline-variant)]/10 p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
                        Models
                      </h4>
                      <Button
                        type="button"
                        onClick={() => handleOpenAddModel(provider.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-[var(--surface-container-high)] px-3 py-1.5 text-xs font-semibold text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
                      >
                        <Plus className="h-3 w-3" />
                        Add Model
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {provider.models.length === 0 ? (
                        <p className="py-6 text-center text-xs text-[var(--on-surface-variant)] opacity-60">
                          No models yet. Add one manually or
                          {provider.catalogId ? " sync from models.dev." : " import from models.dev."}
                        </p>
                      ) : (
                        provider.models.map((model) => (
                          <ModelCard
                            key={model.id}
                            model={model}
                            onToggle={handleToggleModel}
                            onEdit={handleEditModel}
                            onDelete={handleDeleteModel}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <ProviderDialog
        open={showProviderDialog}
        onOpenChange={setShowProviderDialog}
        editingProvider={editingProvider}
        onSaved={fetchProviders}
      />

      <AddModelDialog
        open={showAddModel}
        onOpenChange={setShowAddModel}
        providerId={addModelProviderId ?? ""}
        editingModel={editingModel}
        onSubmit={handleSubmitModel}
      />
    </div>
  );
}
