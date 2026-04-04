"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  Server,
  Cpu,
  Key,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Model {
  id: string;
  name: string;
  providerId: string;
  capabilities: string;
  enabled: boolean;
}

interface Provider {
  id: string;
  name: string;
  type: string;
  baseUrl: string | null;
  hasApiKey: boolean;
  enabled: boolean;
  models: Model[];
}

const providerTypes = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "openai-compatible", label: "OpenAI Compatible" },
  { value: "anthropic-compatible", label: "Anthropic Compatible" },
];

const defaultModels: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "o1", "o1-mini"],
  anthropic: ["claude-3-5-sonnet-latest", "claude-3-opus-latest", "claude-3-haiku-latest"],
  google: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  "openai-compatible": [],
  "anthropic-compatible": [],
};

export default function ProvidersSettingsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "openai",
    baseUrl: "",
    apiKey: "",
    enabled: true,
  });
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [newModelName, setNewModelName] = useState("");
  const [addingModel, setAddingModel] = useState(false);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/providers");
      const data = await res.json();
      setProviders(data);
    } catch (error) {
      console.error("Failed to fetch providers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const resetForm = () => {
    setFormData({ name: "", type: "openai", baseUrl: "", apiKey: "", enabled: true });
    setShowApiKey(false);
    setValidationResult(null);
    setEditingProvider(null);
  };

  const handleOpenForm = (provider?: Provider) => {
    if (provider) {
      setEditingProvider(provider);
      setFormData({
        name: provider.name,
        type: provider.type,
        baseUrl: provider.baseUrl || "",
        apiKey: "",
        enabled: provider.enabled,
      });
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch("/api/providers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: editingProvider?.id,
          type: formData.type,
          baseUrl: formData.baseUrl,
          apiKey: formData.apiKey,
        }),
      });
      const data = await res.json();
      setValidationResult({ valid: data.valid, error: data.error });
    } catch {
      setValidationResult({ valid: false, error: "Validation failed" });
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = "/api/providers";
      const method = editingProvider ? "PATCH" : "POST";
      const body = editingProvider
        ? { id: editingProvider.id, ...formData, apiKey: formData.apiKey || undefined }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        handleCloseForm();
        fetchProviders();
      }
    } catch (error) {
      console.error("Failed to save provider:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this provider? All models will be deleted.")) {
      return;
    }
    try {
      const res = await fetch(`/api/providers?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchProviders();
      }
    } catch (error) {
      console.error("Failed to delete provider:", error);
    }
  };

  const handleToggleEnabled = async (provider: Provider) => {
    try {
      await fetch("/api/providers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: provider.id, enabled: !provider.enabled }),
      });
      fetchProviders();
    } catch (error) {
      console.error("Failed to toggle provider:", error);
    }
  };

  const handleAddModel = async (providerId: string) => {
    if (!newModelName.trim()) return;
    setAddingModel(true);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newModelName.trim(),
          providerId,
          capabilities: ["chat"],
        }),
      });
      if (res.ok) {
        setNewModelName("");
        fetchProviders();
      }
    } catch (error) {
      console.error("Failed to add model:", error);
    } finally {
      setAddingModel(false);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      await fetch(`/api/models?id=${modelId}`, { method: "DELETE" });
      fetchProviders();
    } catch (error) {
      console.error("Failed to delete model:", error);
    }
  };

  const handleToggleModel = async (model: Model) => {
    try {
      await fetch("/api/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: model.id, enabled: !model.enabled }),
      });
      fetchProviders();
    } catch (error) {
      console.error("Failed to toggle model:", error);
    }
  };

  const handleAddDefaultModels = async (provider: Provider) => {
    const models = defaultModels[provider.type] || [];
    for (const modelName of models) {
      try {
        await fetch("/api/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: modelName,
            providerId: provider.id,
            capabilities: ["chat"],
          }),
        });
      } catch (error) {
        console.error(`Failed to add model ${modelName}:`, error);
      }
    }
    fetchProviders();
  };

  const isCompatible = formData.type === "openai-compatible" || formData.type === "anthropic-compatible";

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
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 font-semibold text-[var(--primary-foreground)] transition-all hover:opacity-90 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Provider
        </Button>
      </div>

      {/* Add/Edit Provider Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="border-[var(--outline-variant)]/10 bg-[var(--surface-container)] sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="tracking-tight text-[var(--on-surface)]">
              {editingProvider ? "Edit Provider" : "Add Provider"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
                Name
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Provider name"
                required
                className="border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/40 focus-visible:ring-[var(--primary)]/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
                Type
              </Label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] px-3 py-1 text-sm text-[var(--on-surface)] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)]/30"
              >
                {providerTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {isCompatible && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
                  Base URL
                </Label>
                <Input
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder="https://api.example.com/v1"
                  className="border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/40 focus-visible:ring-[var(--primary)]/30"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
                API Key
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={formData.apiKey}
                    onChange={(e) => {
                      setFormData({ ...formData, apiKey: e.target.value });
                      setValidationResult(null);
                    }}
                    placeholder={editingProvider?.hasApiKey ? "Leave empty to keep existing" : "Enter your API key"}
                    className="border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] pr-10 text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/40 focus-visible:ring-[var(--primary)]/30"
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
                  disabled={validating || !formData.apiKey}
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
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label className="text-sm text-[var(--on-surface)]">Enabled</Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseForm}
                className="border-[var(--outline-variant)]/15 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
              >
                {editingProvider ? "Save Changes" : "Create Provider"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              onClick={() => handleOpenForm()}
            >
              Add your first provider
            </Button>
          </div>
        ) : (
          providers.map((provider) => (
            <div
              key={provider.id}
              className={cn(
                "glass-card overflow-hidden transition-opacity",
                !provider.enabled && "opacity-50"
              )}
            >
              {/* Provider Header */}
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-container-high)]">
                    <Globe className="h-5 w-5 text-[var(--on-surface-variant)]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-[var(--on-surface)]">
                      {provider.name}
                    </h3>
                    <p className="text-xs text-[var(--on-surface-variant)]">
                      {provider.type}
                      {provider.baseUrl && ` · ${provider.baseUrl}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold",
                      provider.hasApiKey
                        ? "bg-[var(--tertiary)]/10 text-[var(--tertiary)]"
                        : "bg-[var(--destructive)]/10 text-[var(--destructive)]"
                    )}
                  >
                    <Key className="h-3 w-3" />
                    {provider.hasApiKey ? "Key Set" : "No Key"}
                  </div>
                  <Switch
                    checked={provider.enabled}
                    onCheckedChange={() => handleToggleEnabled(provider)}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedProvider(expandedProvider === provider.id ? null : provider.id)
                    }
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
                  >
                    <Cpu className="h-3.5 w-3.5" />
                    {provider.models.length}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenForm(provider)}
                    className="rounded-lg p-2 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(provider.id)}
                    className="rounded-lg p-2 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Models Section */}
              {expandedProvider === provider.id && (
                <div className="border-t border-[var(--outline-variant)]/10 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
                      Models
                    </h4>
                    {defaultModels[provider.type]?.length > 0 && provider.models.length === 0 && (
                      <button
                        type="button"
                        onClick={() => handleAddDefaultModels(provider)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
                      >
                        Add defaults
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {provider.models.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between rounded-xl bg-[var(--surface-container)] px-4 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={model.enabled}
                            onCheckedChange={() => handleToggleModel(model)}
                          />
                          <span className="text-sm text-[var(--on-surface)]">{model.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteModel(model.id)}
                          className="rounded-md p-1.5 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--destructive)]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <Input
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        placeholder="Add new model..."
                        className="h-9 border-[var(--outline-variant)]/15 bg-[var(--surface-container)] text-sm text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/40 focus-visible:ring-[var(--primary)]/30"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddModel(provider.id);
                          }
                        }}
                      />
                      <Button
                        onClick={() => handleAddModel(provider.id)}
                        disabled={addingModel || !newModelName.trim()}
                        className="rounded-xl bg-[var(--surface-container-high)] px-4 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
                        style={{ background: "var(--surface-container-high)" }}
                      >
                        {addingModel ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
