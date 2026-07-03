"use client";

import { useEffect, useSyncExternalStore, useState } from "react";
import { useAppTheme } from "@/components/theme-provider";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { isElectron } from "@/lib/runtime";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function GeneralSettingsPage() {
  const { theme, setTheme } = useAppTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [openAtLogin, setOpenAtLogin] = useState(false);

  useEffect(() => {
    if (isElectron()) {
      window.electronAPI!.autoLaunch.get().then(setOpenAtLogin);
    }
  }, []);

  const handleToggleOpenAtLogin = async (checked: boolean) => {
    setOpenAtLogin(checked);
    if (isElectron()) {
      await window.electronAPI!.autoLaunch.set(checked);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tighter text-[var(--on-surface)]">
          General Settings
        </h1>
        <p className="text-sm text-[var(--on-surface-variant)]">
          Manage your application preferences
        </p>
      </div>

      {/* Theme Card */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-sm font-bold tracking-tight text-[var(--on-surface)]">
            Theme
          </h2>
          <p className="text-xs text-[var(--on-surface-variant)]">
            Choose your preferred color scheme
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isActive = mounted && theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-2xl border p-5 transition-all",
                  isActive
                    ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--on-surface)]"
                    : "border-[var(--outline-variant)]/10 bg-[var(--surface-container)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
                )}
              >
                <Icon className={cn("h-6 w-6", isActive && "text-[var(--primary)]")} />
                <span className="text-xs font-semibold">{option.label}</span>
                {isActive && (
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Settings (Electron only) */}
      {mounted && isElectron() && (
        <div className="glass-card p-6">
          <div className="mb-4">
            <h2 className="text-sm font-bold tracking-tight text-[var(--on-surface)]">
              Desktop
            </h2>
            <p className="text-xs text-[var(--on-surface-variant)]">
              Native integration settings
            </p>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[var(--surface-container-high)] p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-[var(--on-surface)]">
                Open at login
              </p>
              <p className="text-xs text-[var(--on-surface-variant)] opacity-60">
                Launch llm Chatter automatically when you sign in
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={openAtLogin}
              onClick={() => handleToggleOpenAtLogin(!openAtLogin)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
                openAtLogin
                  ? "bg-[var(--primary)]"
                  : "bg-[var(--surface-container-highest)]"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-[var(--on-primary)] shadow-lg transition-transform",
                  openAtLogin ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
