"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Download, AlertTriangle, Database, MessageSquare, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  getStatsService,
  getConversationService,
  getResetService,
  getExportService,
  ensureInit,
} from "@/lib/services";
import { isElectron } from "@/lib/runtime";
import type { Stats } from "@/lib/services";

export default function PrivacySettingsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      await ensureInit();
      const data = await getStatsService().get();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleDeleteAllConversations = async () => {
    setIsLoading(true);
    try {
      await ensureInit();
      await getConversationService().deleteAll();
      setDeleteDialogOpen(false);
      fetchStats();
    } catch (error) {
      console.error("Failed to delete conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetApp = async () => {
    setIsLoading(true);
    try {
      await ensureInit();
      await getResetService().reset();
      setResetDialogOpen(false);
      fetchStats();
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to reset app:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await ensureInit();
      const data = await getExportService().export();
      const json = JSON.stringify(data, null, 2);

      if (isElectron()) {
        await window.electronAPI!.dialogs.saveExport({
          defaultName: `chat-export-${new Date().toISOString().split("T")[0]}.json`,
          json,
        });
      } else {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat-export-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to export:", error);
    } finally {
      setExporting(false);
    }
  }, []);

  useEffect(() => {
    if (!isElectron()) return;
    const cleanup = window.electronAPI!.onAction("export-data", handleExport);
    return cleanup;
  }, [handleExport]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tighter text-[var(--on-surface)]">
          Privacy & Data
        </h1>
        <p className="text-sm text-[var(--on-surface-variant)]">
          Manage your data and privacy settings
        </p>
      </div>

      {/* Storage Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
            <MessageSquare className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-[var(--on-surface)]">
              {stats?.conversations ?? "—"}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
              Conversations
            </p>
          </div>
        </div>
        <div className="glass-card flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--tertiary)]/10">
            <Database className="h-5 w-5 text-[var(--tertiary)]" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-[var(--on-surface)]">
              {stats?.messages ?? "—"}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
              Messages
            </p>
          </div>
        </div>
      </div>

      {/* Export Data */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-sm font-bold tracking-tight text-[var(--on-surface)]">
            Export Data
          </h2>
          <p className="text-xs text-[var(--on-surface-variant)]">
            Download all your conversations as JSON
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
          className="rounded-xl border-[var(--outline-variant)]/15 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Exporting..." : "Export Conversations"}
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-[var(--destructive)]/20 bg-[var(--destructive)]/5 p-6">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-[var(--destructive)]">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </h2>
          <p className="text-xs text-[var(--on-surface-variant)]">
            These actions are irreversible. Please be careful.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-[var(--destructive)]/20 bg-transparent px-4 py-2.5 text-xs font-semibold text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)] hover:text-[var(--destructive-foreground)]"
          >
            <Trash2 className="h-4 w-4" />
            Delete All Conversations
          </button>
          <button
            type="button"
            onClick={() => setResetDialogOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--destructive)] px-4 py-2.5 text-xs font-semibold text-[var(--destructive-foreground)] transition-opacity hover:opacity-90"
          >
            Reset Application
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-[var(--outline-variant)]/10 bg-[var(--surface-container)] sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="tracking-tight text-[var(--on-surface)]">
              Delete All Conversations?
            </DialogTitle>
            <DialogDescription className="text-[var(--on-surface-variant)]">
              This will permanently delete all your conversations and messages.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-[var(--outline-variant)]/15 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAllConversations}
              disabled={isLoading}
              className="bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90"
            >
              {isLoading ? "Deleting..." : "Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="border-[var(--outline-variant)]/10 bg-[var(--surface-container)] sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="tracking-tight text-[var(--on-surface)]">
              Reset Application?
            </DialogTitle>
            <DialogDescription className="text-[var(--on-surface-variant)]">
              This will delete ALL data including conversations, providers,
              assistants, and models. The app will be restored to its initial
              state. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              className="border-[var(--outline-variant)]/15 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetApp}
              disabled={isLoading}
              className="bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90"
            >
              {isLoading ? "Resetting..." : "Reset App"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
