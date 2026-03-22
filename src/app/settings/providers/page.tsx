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
import { Eye, EyeOff, Loader2, Pencil, Trash2, Plus, Check, X } from "lucide-react";

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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Providers</h1>
          <p className="text-muted-foreground">
            Configure AI providers and their models
          </p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Provider
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? "Edit Provider" : "Add Provider"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Provider name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input
                  id="baseUrl"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder="https://api.example.com/v1"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={formData.apiKey}
                    onChange={(e) => {
                      setFormData({ ...formData, apiKey: e.target.value });
                      setValidationResult(null);
                    }}
                    placeholder={editingProvider?.hasApiKey ? "Leave empty to keep existing" : "Enter your API key"}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                >
                  {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                </Button>
              </div>
              {validationResult && (
                <p className={`text-sm ${validationResult.valid ? "text-green-600" : "text-red-600"}`}>
                  {validationResult.valid ? (
                    <span className="flex items-center gap-1"><Check className="h-4 w-4" /> Connection successful</span>
                  ) : (
                    <span className="flex items-center gap-1"><X className="h-4 w-4" /> {validationResult.error}</span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label>Enabled</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancel
              </Button>
              <Button type="submit">
                {editingProvider ? "Save Changes" : "Create Provider"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {providers.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">No providers configured yet.</p>
            <Button className="mt-4" onClick={() => handleOpenForm()}>
              Add your first provider
            </Button>
          </div>
        ) : (
          providers.map((provider) => (
            <div key={provider.id} className="rounded-lg border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={provider.enabled}
                    onCheckedChange={() => handleToggleEnabled(provider)}
                  />
                  <div>
                    <h3 className="font-medium">{provider.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {provider.type}
                      {provider.baseUrl && ` • ${provider.baseUrl}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs ${provider.hasApiKey ? "text-green-600" : "text-yellow-600"}`}
                  >
                    {provider.hasApiKey ? "API Key Set" : "No API Key"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setExpandedProvider(expandedProvider === provider.id ? null : provider.id)
                    }
                  >
                    {provider.models.length > 0 && (
                      <span className="mr-1 text-xs">{provider.models.length}</span>
                    )}
                    Models
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenForm(provider)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(provider.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {expandedProvider === provider.id && (
                <div className="border-t p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-medium">Models</h4>
                    {defaultModels[provider.type]?.length > 0 && provider.models.length === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddDefaultModels(provider)}
                      >
                        Add default models
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {provider.models.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={model.enabled}
                            onCheckedChange={() => handleToggleModel(model)}
                          />
                          <span className="text-sm">{model.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDeleteModel(model.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        placeholder="Add new model..."
                        className="h-8"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddModel(provider.id);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddModel(provider.id)}
                        disabled={addingModel || !newModelName.trim()}
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
