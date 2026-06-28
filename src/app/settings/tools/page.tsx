"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Wrench, SlidersHorizontal, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ensureInit,
  getMcpServerService,
} from "@/lib/services";
import type { McpServer, UpdateMcpServerInput } from "@/lib/services";
import {
  getBuiltinCatalog,
  normalizeConfig,
  type BuiltinConfig,
  type BuiltinToolMeta,
} from "@/lib/builtin-tools";
import { Monogram } from "@/components/settings/monogram";
import { ToolConfigForm } from "@/components/settings/tool-config-form";

const EMPTY_CONFIG: BuiltinConfig = { enabled: [], configs: {} };

export default function ToolsSettingsPage() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);

  const [configuringTool, setConfiguringTool] = useState<BuiltinToolMeta | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const catalog = useMemo(() => getBuiltinCatalog(), []);

  const builtinServer = servers.find((s) => s.isBuiltin);
  const builtinConfig: BuiltinConfig = (builtinServer?.config as BuiltinConfig) ?? EMPTY_CONFIG;

  const fetchServers = async () => {
    try {
      setLoading(true);
      await ensureInit();
      const data = await getMcpServerService().getAll();
      setServers(data);
    } catch (error) {
      console.error("Failed to fetch MCP servers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const saveConfig = async (next: BuiltinConfig) => {
    if (!builtinServer) return;
    try {
      setSaving(true);
      const input: UpdateMcpServerInput = {
        id: builtinServer.id,
        config: next,
      };
      const updated = await getMcpServerService().update(input);
      setServers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (error) {
      console.error("Failed to save tool config:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTool = (toolId: string, enabled: boolean) => {
    const isEnabled = builtinConfig.enabled.includes(toolId);
    if (isEnabled === enabled) return;
    const nextEnabled = enabled
      ? [...builtinConfig.enabled, toolId]
      : builtinConfig.enabled.filter((id) => id !== toolId);
    saveConfig({ ...builtinConfig, enabled: nextEnabled });
  };

  const openConfigure = (tool: BuiltinToolMeta) => {
    setConfiguringTool(tool);
    setFormValues(normalizeConfig(tool, builtinConfig.configs[tool.id]));
  };

  const handleFieldChange = (key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveConfig = async () => {
    if (!configuringTool) return;
    await saveConfig({
      ...builtinConfig,
      configs: { ...builtinConfig.configs, [configuringTool.id]: formValues },
    });
    setConfiguringTool(null);
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
      <div>
        <h1 className="text-2xl font-bold tracking-tighter text-[var(--on-surface)]">Tools</h1>
        <p className="text-sm text-[var(--on-surface-variant)]">
          Built-in tools and MCP servers available to the model
        </p>
      </div>

      {builtinServer && (
        <div
          className={cn(
            "glass-card overflow-hidden transition-opacity",
            !builtinServer.enabled && "opacity-50",
          )}
        >
          <div className="flex items-center justify-between gap-3 p-5">
            <div className="flex min-w-0 items-center gap-3">
              <Monogram name={builtinServer.name} className="h-10 w-10" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight text-[var(--on-surface)]">
                    {builtinServer.name}
                  </h3>
                  <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                    Built-in
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-[var(--on-surface-variant)]">
                  Runs in-process with the chat engine
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <Switch checked={builtinServer.enabled} disabled />
            </div>
          </div>

          <div className="border-t border-[var(--outline-variant)]/10 p-5">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
              Tools
            </h4>
            <div className="space-y-2">
              {catalog.map((tool) => {
                const enabled = builtinConfig.enabled.includes(tool.id);
                return (
                  <div
                    key={tool.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-container-high)]/40 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-container-high)]">
                        <Wrench className="h-4 w-4 text-[var(--on-surface-variant)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--on-surface)]">{tool.name}</p>
                        <p className="truncate text-xs text-[var(--on-surface-variant)] opacity-70">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        title="Configure"
                        onClick={() => openConfigure(tool)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Configure
                      </button>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => handleToggleTool(tool.id, checked)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!configuringTool} onOpenChange={(open) => !open && setConfiguringTool(null)}>
        <DialogContent className="border-[var(--outline-variant)]/10 bg-[var(--surface-container)] sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-[var(--on-surface-variant)]" />
              {configuringTool?.name}
            </DialogTitle>
          </DialogHeader>

          {configuringTool && (
            <ToolConfigForm
              fields={configuringTool.configFields}
              values={formValues}
              onChange={handleFieldChange}
            />
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfiguringTool(null)}
              className="text-[var(--on-surface-variant)]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={saving}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
            >
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
