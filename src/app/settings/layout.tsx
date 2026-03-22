"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const settingsNav = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/providers", label: "Providers" },
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
    <div className="flex h-screen">
      <div className="w-64 border-r bg-muted/30 p-4">
        <div className="mb-6">
          <Link href="/" className="text-lg font-semibold hover:underline">
            ← Back to Chat
          </Link>
        </div>
        <nav className="space-y-1">
          {settingsNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                pathname === item.href && "bg-muted font-medium"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
