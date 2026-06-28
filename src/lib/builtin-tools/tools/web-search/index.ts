import { tool } from "ai";
import { z } from "zod";
import { webSearchConfig } from "./config";
import { runWebSearch, formatSearchResults, type WebSearchConfig } from "./execute";
import type { BuiltinToolDefinition } from "../../types";

export const webSearchTool: BuiltinToolDefinition = {
  ...webSearchConfig,
  createTool(config: Record<string, unknown>) {
    const cfg = config as WebSearchConfig;
    return tool({
      description:
        "Search the web for current information. Returns ranked results with titles, URLs, and snippets. Use for recent events, facts, or anything not in your training data.",
      inputSchema: z.object({
        query: z.string().describe("The search query"),
        count: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe("Number of results to return (default 5, max 10)"),
      }),
      execute: async ({ query, count }, { abortSignal }) => {
        const { results, provider } = await runWebSearch({ query, count }, cfg, abortSignal);
        return {
          provider,
          count: results.length,
          results: formatSearchResults(results),
        };
      },
    });
  },
};
