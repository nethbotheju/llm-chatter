import type { BuiltinToolMeta } from "../../types";

export const webFetchConfig: BuiltinToolMeta = {
  id: "web_fetch",
  name: "Web Fetch",
  description: "Fetch a web page and convert it to clean markdown.",
  configFields: [
    {
      key: "format",
      label: "Default format",
      description: "Lean strips links/images for minimal tokens. Markdown preserves them.",
      type: "select",
      options: [
        { label: "Lean", value: "lean" },
        { label: "Markdown", value: "markdown" },
      ],
      default: "lean",
    },
    {
      key: "maxLength",
      label: "Max content length (chars)",
      type: "number",
      default: 10000,
    },
    {
      key: "timeoutMs",
      label: "Request timeout (ms)",
      type: "number",
      default: 30000,
    },
    {
      key: "useJina",
      label: "Try Jina Reader first",
      description:
        "Routes through r.jina.ai for higher-quality extraction. Falls back to local extraction on failure.",
      type: "boolean",
      default: false,
    },
    {
      key: "jinaApiKey",
      label: "Jina API key",
      description: "Optional. Higher rate limits when set.",
      type: "secret",
      default: "",
      showWhen: { field: "useJina", equals: true },
    },
  ],
  defaultConfig: {
    format: "lean",
    maxLength: 10000,
    timeoutMs: 30000,
    useJina: false,
    jinaApiKey: "",
  },
};
