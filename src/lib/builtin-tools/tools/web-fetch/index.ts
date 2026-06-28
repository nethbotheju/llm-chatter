import { tool } from "ai";
import { z } from "zod";
import { webFetchConfig } from "./config";
import { runWebFetch, type WebFetchConfig, type WebFetchFormat } from "./execute";
import type { BuiltinToolDefinition } from "../../types";

export const webFetchTool: BuiltinToolDefinition = {
  ...webFetchConfig,
  createTool(config: Record<string, unknown>) {
    const cfg = config as WebFetchConfig;
    return tool({
      description:
        "Fetch the content of a web page and convert it to clean markdown. Use after web_search to read a specific result, or for any URL. Use lean format for minimal tokens.",
      inputSchema: z.object({
        url: z.string().describe("The http(s) URL to fetch"),
        format: z
          .enum(["lean", "markdown"])
          .optional()
          .describe("lean strips links/images; markdown preserves them. Defaults to lean."),
        maxLength: z
          .number()
          .int()
          .min(100)
          .max(50000)
          .optional()
          .describe("Max chars to return (default 10000, max 50000)"),
      }),
      execute: async (
        { url, format, maxLength },
        { abortSignal },
      ) => {
        const result = await runWebFetch(
          { url, format: format as WebFetchFormat | undefined, maxLength },
          cfg,
          abortSignal,
        );
        return {
          title: result.title,
          url: result.url,
          content: result.content,
          tier: result.tier,
          format: result.format,
          chars: result.chars,
        };
      },
    });
  },
};
