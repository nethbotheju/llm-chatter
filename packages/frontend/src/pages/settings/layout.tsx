"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../utils/cn";
import { isElectron } from "@llm-chatter/services";
import { ArrowLeft } from "lucide-react";

const settingsNav = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/providers", label: "Providers" },
  { href: "/settings/tools", label: "Tools" },
  { href: "/settings/assistants", label: "Assistants" },
  { href: "/settings/privacy", label: "Privacy" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-[var(--surface)]">
      {/* Settings Sidebar */}
      <aside className="flex w-64 flex-col bg-[var(--surface-container-low)] tracking-tight">
        {/* Header */}
        <div className={`titlebar-drag p-6 ${isElectron() ? "pt-16" : ""}`}>
          <Link
            href="/"
            className="titlebar-no-drag flex items-center gap-2 text-sm font-medium text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chat
          </Link>
          <h1 className="mt-4 text-lg font-bold tracking-tighter text-[var(--on-surface)]">
            Settings
          </h1>
          <p className="text-[10px] font-medium text-[var(--on-surface-variant)] opacity-60">
            Manage your preferences
          </p>
        </div>

        {/* Navigation */}
        <nav className="titlebar-drag flex-1 space-y-0.5 px-3">
          {settingsNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "titlebar-no-drag flex items-center rounded-xl px-4 py-2.5 text-sm transition-colors duration-150",
                  isActive
                    ? "bg-[var(--surface-container-highest)] font-semibold text-[var(--on-surface)]"
                    : "font-medium text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-[var(--outline-variant)]/10 p-4">
          <p className="text-center text-[10px] font-medium text-[var(--on-surface-variant)] opacity-40">
            llm Chatter v1.0
          </p>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl p-8">{children}</div>
      </main>
    </div>
  );
}
