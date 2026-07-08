"use client";

import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { marked } from "marked";
import {
  markdownComponents,
  markdownPlugins,
  markdownProseClass,
} from "./markdown-renderer";

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw);
}

const MemoizedMarkdownBlock = memo(
  function MemoizedMarkdownBlock({ content }: { content: string }) {
    return (
      <ReactMarkdown {...markdownPlugins} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    );
  },
  (prev, next) => prev.content === next.content,
);

interface MemoizedMarkdownProps {
  content: string;
  className?: string;
  compact?: boolean;
}

export const MemoizedMarkdown = memo(function MemoizedMarkdown({
  content,
  className,
  compact = false,
}: MemoizedMarkdownProps) {
  const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);
  return (
    <div className={markdownProseClass(compact, className)}>
      {blocks.map((block, index) => (
        <MemoizedMarkdownBlock key={index} content={block} />
      ))}
    </div>
  );
});
