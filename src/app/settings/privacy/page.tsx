"use client";

import { useState, useEffect } from "react";
import { Trash2, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface StorageStats {
  conversations: number;
  messages: number;
  totalSize: string;
}

export default function PrivacySettingsPage() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleDeleteAllConversations = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/conversations?all=true", { method: "DELETE" });
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
      await fetch("/api/reset", { method: "POST" });
      setResetDialogOpen(false);
      fetchStats();
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to reset app:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export:", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Privacy & Data</h1>
        <p className="text-muted-foreground">
          Manage your data and privacy settings
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border p-4">
          <h2 className="font-medium">Storage Usage</h2>
          <p className="text-sm text-muted-foreground">
            View how much data is stored locally
          </p>
          {stats ? (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Conversations:</span>
                <span>{stats.conversations}</span>
              </div>
              <div className="flex justify-between">
                <span>Messages:</span>
                <span>{stats.messages}</span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-medium">Export Data</h2>
          <p className="text-sm text-muted-foreground">
            Download all your conversations as JSON
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Exporting..." : "Export Conversations"}
          </Button>
        </div>

        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <h2 className="flex items-center gap-2 font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These actions are irreversible. Please be careful.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All Conversations
            </Button>
            <Button
              variant="destructive"
              onClick={() => setResetDialogOpen(true)}
            >
              Reset Application
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Conversations?</DialogTitle>
            <DialogDescription>
              This will permanently delete all your conversations and messages.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllConversations}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Application?</DialogTitle>
            <DialogDescription>
              This will delete ALL data including conversations, providers,
              assistants, and models. The app will be restored to its initial
              state. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetApp}
              disabled={isLoading}
            >
              {isLoading ? "Resetting..." : "Reset App"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
