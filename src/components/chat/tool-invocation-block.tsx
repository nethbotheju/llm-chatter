"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { buildTriggerLabel, resolveToolMeta, type ToolInvocationPart } from "./tool-helpers";
import {
  GenericContent,
  ResultView,
  ToolDisclosure,
  WebFetchContent,
  WebSearchContent,
} from "./tool-parts";

interface ToolInvocationBlockProps {
  part: ToolInvocationPart;
}

export function ToolInvocationBlock({ part }: ToolInvocationBlockProps) {
  const [open, setOpen] = useState(false);
  const meta = resolveToolMeta(part);
  const state = part.state ?? "input-available";
  const isError = state === "output-error";
  const label = buildTriggerLabel(meta, state, part);

  const header = (
    <span className={cn("text-sm font-medium", isError && "text-[var(--destructive)]")}>
      {label.text}
    </span>
  );

  return (
    <ToolDisclosure open={open} onToggle={() => setOpen((o) => !o)} header={header}>
      {isError ? (
        <ResultView tone="error" value={part.errorText ?? part.output} />
      ) : meta.kind === "web_search" ? (
        <WebSearchContent input={part.input} output={part.output} />
      ) : meta.kind === "web_fetch" ? (
        <WebFetchContent input={part.input} output={part.output} />
      ) : (
        <GenericContent input={part.input} output={part.output} kind={meta.kind} />
      )}
    </ToolDisclosure>
  );
}
