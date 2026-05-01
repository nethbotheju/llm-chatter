"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationItemProps {
  id: string;
  title: string | null;
  createdAt: Date;
  isActive?: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export function ConversationItem({
  id,
  title,
  createdAt,
  isActive,
  onClick,
  onDelete,
}: ConversationItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-center rounded-full px-5 py-2 text-[15px] transition-colors",
        isActive
          ? "bg-[var(--surface-bright)] text-[var(--primary)]"
          : "text-neutral-400 hover:bg-[var(--surface-container-high)] hover:text-neutral-100"
      )}
      onClick={() => {
        if (!menuOpen) onClick();
      }}
    >
      <div className="flex-1 truncate">
        <span className="truncate font-medium">
          {title || "New conversation"}
        </span>
      </div>

      <div
        className={cn(
          "relative ml-1 shrink-0",
          menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        ref={menuRef}
      >
        <button
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
            isActive
              ? "text-[var(--primary)] hover:bg-[var(--surface-container-highest)]"
              : "text-neutral-400 hover:bg-[var(--surface-container-high)] hover:text-neutral-100"
          )}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-32 rounded-lg border border-[var(--outline-variant)]/20 bg-[var(--surface-container-highest)] py-1 shadow-lg">
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-[var(--surface-container-high)]"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
