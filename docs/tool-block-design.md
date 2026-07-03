# Tool Block Redesign

## Goal

Unify every tool invocation — built-in (`web_search`, `web_fetch`) **and** MCP — into the same lightweight, transparent disclosure style used by the reasoning (thoughts) block. Replace the current generic bordered card + raw `Input`/`Result` JSON dump with a semantic, tool-aware UI.

## Design principles

- **Same shell as thoughts.** A `▸ <narrative label>` trigger (chevron-right rotates to chevron-down), with an indented content panel using a faint left border (`border-l` + `pl-3`). No heavy card/border around the whole block.
- **Tool-aware.** Detect the tool kind and render a tailored, meaningful UI *inside* the shared panel.
- **Built-in tools get full customization.** `web_search` → source links; `web_fetch` → page preview.
- **MCP tools get a smart generic renderer**, adaptive to the shape of the input:
  - key/value parameters → key: value list + result
  - no parameters → result only
  - non-key/value input (primitive/array) → input + result

---

## Shared shell (all tools)

```
▸ <narrative label>          ← muted text; ▸ rotates to ▾ on expand
│                            ← faint left border + pl-3 (same as thoughts)
└── tool-specific content
```

### Trigger label (narrative)

Present tense + `…` while running; past tense when done; destructive tint on error.

| Tool | Running | Done | Error |
|---|---|---|---|
| `web_search` | `Searching the web…` | `Searched the web · N results` | `Searched the web — failed` |
| `web_fetch` | `Reading <host>…` | `Read <host>` | `Read <host> — failed` |
| MCP | `Running <name>…` | `Ran <name> · via <server>` | `Ran <name> — failed` |
| unknown | `Running <name>…` | `Ran <name>` | `Ran <name> — failed` |

Trigger is **text-only** to match the thoughts block exactly. Real favicons only appear *inside* the content where they are meaningful (source links, fetched page domain) — never as decorative trigger icons.

---

## Kind resolution

A `resolveToolMeta(part)` helper inspects `part.toolName` and returns `{ kind, label, subtitle }`:

| Condition | `kind` |
|---|---|
| `toolName === "web_search"` | `web_search` |
| `toolName === "web_fetch"` | `web_fetch` |
| `toolName` contains `__` | `mcp` (name = part after `__`, server slug = part before `__`) |
| otherwise | `generic` |

---

## Built-in: `web_search`

### Model vs UI output split (via `toModelOutput`)

The AI SDK supports separating what the **model** receives from what the **UI** receives, using the tool's optional `toModelOutput` function (verified in the SDK source/docs):

- `execute()` returns the **structured result** → this is what the UI receives as `part.output` (clean source rows, no parsing).
- `toModelOutput({ output })` converts that into what the **language model** receives → we return `{ type: 'text', value }` so the model still gets the compact text only.

```ts
execute: async ({ query, count }, { abortSignal }) => {
  const { results, provider } = await runWebSearch({ query, count }, cfg, abortSignal);
  return {
    provider,
    count: results.length,
    sources: results.map((r) => ({ title: r.title, url: r.url, description: r.description })),
  };
},
toModelOutput({ output }) {
  return { type: 'text', value: formatSearchResults(output.sources) };
},
```

**Outcome:** the model gets the same compact search text as today (actually fewer tokens — no JSON wrapper, no `provider`/`count` fields), and the UI gets structured `sources` for rich cards. No client-side parser, no format-sync burden.

### Rendering

- **Collapsed:** `Searched the web · 5 results` (+ the query as a muted subtitle).
- **Expanded:** a vertical list of source rows — favicon, clickable title (opens externally), domain, snippet.
- **Running:** `Searching the web…` with the query shown + a subtle pulse.

```
▾ Searched the web · 5 results
│  "nextjs app router changes"                 ← the query (muted/italic)
│
│  🌐 Title of the first result  ↗             ← favicon + title (external link)
│     example.com · short snippet…             ← domain + snippet
│  🌐 Title of the second result  ↗
│     other.org · snippet…
```

Favicons via `https://www.google.com/s2/favicons?domain=<host>&sz=32` (no dependencies). External links reuse the app's existing open-external handling.

---

## Built-in: `web_fetch`

No backend change needed for the UI — `web_fetch` already returns structured `{ title, url, content, tier, format, chars }`, which the renderer reads directly.

> Optional token optimization (not required): add a `toModelOutput` to send only `content` as text to the model, trimming the `title`/`url`/`tier`/`format`/`chars` meta from the model payload. The UI still gets the full structured object. Only worth doing if you want to shave those few meta tokens.

### Rendering

- **Collapsed:** `Read <host>` (+ page title as subtitle).
- **Expanded:** title + domain (favicon) + meta (`chars · format · tier`), then the page content below.
- **Running:** `Reading <host>…`.

```
▾ Read example.com
│  Page Title Here                             ← title
│     🌐 example.com · 8,431 chars · markdown  ← domain + meta
│
│  <rendered markdown content, scrollable>     ← readable preview (see open decision)
```

---

## MCP (smart generic)

Display name = strip the `<slug>__` prefix. Server slug shown as a subtle `via <server>` suffix on the label.

### Input-shape decision tree

```
input is null / undefined / {} / ""
   → show Result only

input is a non-array object with >= 1 keys
   → show key: value list, then Result

input is a primitive (string/number/boolean) or an array
   → show Input (raw), then Result
```

### Result rendering (shared with generic fallback)

- string → wrapped text block
- object / array → pretty-printed JSON
- large → scrollable / truncated

### Skeletons

**Case A — key/value parameters:**
```
▾ Ran search_docs · via my-server
│  query: "authentication"
│  limit: 5
│
│  Result
│  { "matches": [ … ] }
```

**Case B — no parameters:**
```
▾ Ran list_files · via fs-server
│  Result
│  ["README.md", "src/", "package.json"]
```

**Case C — non-key/value input (primitive/array):**
```
▾ Ran echo · via cli
│  Input
│  hello world
│
│  Result
│  hello world
```

---

## Generic fallback

For any unrecognized built-in or tool that does not match a known kind. Same shell; `Input` and `Result` rendered as formatted JSON via the shared Result renderer.

```
▾ Ran <tool name>
│  Input
│  { …pretty JSON… }
│
│  Result
│  { … }
```

---

## Error state (all kinds)

Trigger takes a destructive tint and suffixes `— failed`. The panel shows the error text (from `part.errorText`).

```
▾ Searched the web — failed
│  DuckDuckGo HTTP 503: …
```

---

## Persistence & reload behavior (`web_search` + `toModelOutput`)

- **Saving:** tool parts are stored as a JSON string in the message `parts` column regardless of shape — the structured `sources` serialize normally. **No DB/migration change, no breakage.** Confirmed against the SDK source.
- **Live generation:** `toModelOutput` is applied by the SDK's tool loop (it has the tool definition), so the model sees the compact text while it reasons over the results. This is the main token saving, and it's *better* than today (no JSON wrapper).
- **Reload / later turns:** when a saved conversation is resumed, `convertToModelMessages` sends the stored `part.output` (the structured `sources`) to the model **directly** — it cannot re-apply `toModelOutput` (no tool definitions available at that point). So on reload the model sees the structured sources (modestly more tokens than today's text field).
- **Net:** live turn = minimal text (better than today); reload = structured (slightly more). If reload-token frugality matters, the fallback is the client-side parser (keeps `part.output` as text → minimal everywhere, at the cost of maintaining a parser).

## Scope

- `toModelOutput` is **only** for `web_search` (compact text to the model, rich cards to the UI).
- `web_fetch`, MCP, and generic tools do **not** use `toModelOutput` — the model needs their full output, and the UI renders that same output.

---

## Component structure

- `ToolDisclosure` — mirrors the thoughts block's transparent disclosure (trigger button + animated indented panel).
- `resolveToolMeta(part)` — returns `{ kind, label, subtitle }`.
- Content renderers:
  - `WebSearchContent` — source link rows.
  - `WebFetchContent` — title + meta + content.
  - `McpContent` / `GenericContent` — input-shape-aware key/values + Result.
- `ResultView` — shared string-vs-JSON result rendering (used by MCP + generic).
- `web_search` — `execute` returns structured `sources`; `toModelOutput` returns compact text to the model (see above).

---

## Open decisions

- **`web_fetch` content on expand:** rendered markdown (recommended — nicer to read) vs raw `pre` (faithful to what the model received).
- **Trigger glyph:** text-only (recommended — matches thoughts exactly) vs a tiny muted semantic glyph per kind.
