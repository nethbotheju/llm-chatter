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
import { Select } from "../ui/select";
import { Button } from "../ui/button";
import { Loader2, Check, AlertCircle, Zap } from "lucide-react";
import { ensureInit, getMcpServerService } from "@llm-chatter/services";
import type {
  McpServer,
  CreateMcpServerInput,
  UpdateMcpServerInput,
} from "@llm-chatter/services";
import type { McpUserTransportDTO } from "@llm-chatter/contracts";
import {
  KeyValueEditor,
  rowsToMap,
  mapToRows,
  type KeyValueRow,
} from "./key-value-editor";

interface McpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingServer: McpServer | null;
  onSaved: () => void;
}

const inputClass =
  "border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/40 focus-visible:ring-[var(--primary)]/30";

export function McpServerDialog({
  open,
  onOpenChange,
  editingServer,
  onSaved,
}: McpServerDialogProps) {
  const isEditing = !!editingServer;

  const [name, setName] = useState("");
  const [transport, setTransport] = useState<McpUserTransportDTO>("stdio");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [envRows, setEnvRows] = useState<KeyValueRow[]>([]);
  const [headerRows, setHeaderRows] = useState<KeyValueRow[]>([]);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: true; count: number } | { ok: false; error: string } | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTestResult(null);

    if (isEditing && editingServer) {
      setName(editingServer.name);
      setTransport(editingServer.transport as McpUserTransportDTO);
      setCommand(editingServer.command ?? "");
      setArgs(editingServer.args?.join(" ") ?? "");
      setUrl(editingServer.url ?? "");
      setEnabled(editingServer.enabled);
      const cfg = (editingServer.config ?? {}) as {
        envSecretKeys?: string[];
        headersSecretKeys?: string[];
      };
      setEnvRows(mapToRows(editingServer.env, cfg.envSecretKeys ?? []));
      setHeaderRows(mapToRows(editingServer.headers, cfg.headersSecretKeys ?? []));
    } else {
      setName("");
      setTransport("stdio");
      setCommand("");
      setArgs("");
      setUrl("");
      setEnabled(true);
      setEnvRows([]);
      setHeaderRows([]);
    }
  }, [open, editingServer, isEditing]);

  const handleTest = async () => {
    setError(null);
    setTesting(true);
    setTestResult(null);
    try {
      await ensureInit();
      const { map: env, secretKeys: envSecretKeys } = rowsToMap(envRows);
      const { map: headers, secretKeys: headersSecretKeys } = rowsToMap(headerRows);
      const tools = await getMcpServerService().discover({
        transport,
        command,
        args: args.trim() ? args.trim().split(/\s+/) : [],
        env,
        url,
        headers,
        envSecretKeys,
        headersSecretKeys,
      } as CreateMcpServerInput);
      setTestResult({ ok: true, count: tools.length });
    } catch (err) {
      setTestResult({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    try {
      await ensureInit();
      const argsArr = args.trim() ? args.trim().split(/\s+/) : [];
      const { map: env, secretKeys: envSecretKeys } = rowsToMap(envRows);
      const { map: headers, secretKeys: headersSecretKeys } = rowsToMap(headerRows);

      if (isEditing && editingServer) {
        const input: UpdateMcpServerInput = {
          id: editingServer.id,
          name: name.trim(),
          enabled,
          command,
          args: argsArr,
          env,
          url,
          headers,
          envSecretKeys,
          headersSecretKeys,
        };
        await getMcpServerService().update(input);
      } else {
        const input: CreateMcpServerInput = {
          name: name.trim(),
          transport,
          enabled,
          command,
          args: argsArr,
          env,
          url,
          headers,
          envSecretKeys,
          headersSecretKeys,
        };
        await getMcpServerService().create(input);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-auto border-[var(--outline-variant)]/10 bg-[var(--surface-container)] sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit MCP Server" : "Add MCP Server"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[var(--on-surface)]">Name</Label>
            <Input
              value={name}
              placeholder="e.g. Filesystem, GitHub"
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[var(--on-surface)]">Transport</Label>
            <Select
              options={[
                { value: "stdio", label: "stdio (local process)" },
                { value: "http", label: "HTTP (Streamable HTTP)" },
                { value: "sse", label: "SSE (Server-Sent Events)" },
              ]}
              value={transport}
              onChange={(e) => setTransport(e.target.value as McpUserTransportDTO)}
            />
          </div>

          {transport === "stdio" ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[var(--on-surface)]">Command</Label>
                <Input
                  value={command}
                  placeholder="e.g. npx"
                  onChange={(e) => setCommand(e.target.value)}
                  className={inputClass}
                />
                <p className="text-[11px] text-[var(--on-surface-variant)] opacity-70">
                  The executable to launch. For npx/yarn packages, use the package name in args.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[var(--on-surface)]">Arguments</Label>
                <Input
                  value={args}
                  placeholder="e.g. -y @modelcontextprotocol/server-filesystem /tmp"
                  onChange={(e) => setArgs(e.target.value)}
                  className={inputClass}
                />
                <p className="text-[11px] text-[var(--on-surface-variant)] opacity-70">
                  Space-separated arguments passed to the command.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--on-surface)]">Server URL</Label>
              <Input
                value={url}
                placeholder="https://example.com/mcp"
                onChange={(e) => setUrl(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[var(--on-surface)]">
              Environment variables
            </Label>
            <KeyValueEditor
              rows={envRows}
              onChange={setEnvRows}
              keyPlaceholder="e.g. API_KEY"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[var(--on-surface)]">HTTP headers</Label>
            <KeyValueEditor
              rows={headerRows}
              onChange={setHeaderRows}
              keyPlaceholder="e.g. Authorization"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[var(--surface-container-high)]/40 p-3">
            <Label className="text-xs font-semibold text-[var(--on-surface)]">Enabled</Label>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {testResult && (
            <div
              className={
                testResult.ok
                  ? "flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-500"
                  : "flex items-start gap-2 rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-xs text-[var(--destructive)]"
              }
            >
              {testResult.ok ? (
                <>
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Connected — {testResult.count} tool{testResult.count === 1 ? "" : "s"} discovered
                </>
              ) : (
                <>
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="break-words">{testResult.error}</span>
                </>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-[var(--destructive)]">{error}</p>
          )}
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleTest}
            disabled={testing || saving}
            className="flex items-center gap-1.5 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Test connection
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-[var(--on-surface-variant)]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
            >
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
              {isEditing ? "Save" : "Add"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
