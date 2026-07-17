import type { BuiltinToolMeta } from "../../../index";

export const webSearchConfig: BuiltinToolMeta = {
  id: "web_search",
  name: "Web Search",
  description: "Search the web for current information.",
  configFields: [
    {
      key: "provider",
      label: "Search provider",
      description:
        "DuckDuckGo needs no configuration. SearXNG requires a self-hosted or public instance URL.",
      type: "select",
      options: [
        { label: "DuckDuckGo", value: "duckduckgo" },
        { label: "SearXNG", value: "searxng" },
      ],
      default: "duckduckgo",
    },
    {
      key: "searxngUrl",
      label: "SearXNG instance URL",
      type: "text",
      default: "",
      placeholder: "https://searx.example.com",
      showWhen: { field: "provider", equals: "searxng" },
    },
    {
      key: "searxngApiKey",
      label: "SearXNG API key",
      description: "Optional. Required only if your instance requires a Bearer token.",
      type: "secret",
      default: "",
      showWhen: { field: "provider", equals: "searxng" },
    },
    {
      key: "maxResults",
      label: "Max results per search",
      type: "number",
      default: 5,
    },
    {
      key: "safeSearch",
      label: "Safe search",
      type: "boolean",
      default: true,
    },
  ],
  defaultConfig: {
    provider: "duckduckgo",
    searxngUrl: "",
    searxngApiKey: "",
    maxResults: 5,
    safeSearch: true,
  },
};
