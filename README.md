# llm Chatter

A multi-provider LLM chat application that runs as both a **web app** (Next.js) and a **native desktop app** (Electron). Chat with OpenAI, Anthropic, Google Gemini, and any OpenAI/Anthropic-compatible API — with encrypted API key storage, custom assistants, conversation history, real-time streaming, MCP tools, and a built-in model catalog.

The codebase is a **pnpm + Turborepo monorepo**: the React frontend and the AI/data logic live in shared `packages/*`, consumed by two thin app shells — `apps/web` (full Next.js) and `apps/desktop` (Electron + static export).

---

## Features

- **Multi-Provider Support** — OpenAI, Anthropic, Google, and OpenAI/Anthropic-compatible endpoints
- **Custom Assistants** — system prompts, temperature, top-P
- **Conversation Management** — persistent history, search, sidebar navigation, message editing
- **Real-Time Streaming** — token-by-token streaming via the Vercel AI SDK
- **Dual Runtime** — one shared codebase, runs as a Next.js web app or a native desktop app (macOS, Windows, Linux)
- **MCP Tools** — connect Model Context Protocol servers; built-in web-fetch and web-search tools
- **Model Catalog** — browse and import providers/models from a shared catalog
- **Encrypted API Keys** — AES-256-GCM at rest
- **Material Design 3** — polished UI with glassmorphism and light/dark themes
- **Keyboard Shortcuts** — `Cmd/Ctrl+N` new chat, `Cmd/Ctrl+B` sidebar, `Cmd/Ctrl+,` settings
- **Data Portability** — export everything, full reset

---

## Supported Providers

| Provider | Types | Notes |
|---|---|---|
| OpenAI | `openai`, `openai-compatible` | GPT models and custom endpoints |
| Anthropic | `anthropic`, `anthropic-compatible` | Claude models and custom endpoints |
| Google | `google` | Gemini models |

---

## Tech Stack

### Frontend
- [Next.js](https://nextjs.org/) 16 + [React](https://react.dev/) 19 (App Router)
- [TypeScript](https://www.typescriptlang.org/) 5.9
- [Tailwind CSS](https://tailwindcss.com/) 4 + MD3 theme
- [Vercel AI SDK](https://sdk.vercel.ai/) 6 (`ai`, `@ai-sdk/react`, `@ai-sdk/{openai,anthropic,google,mcp}`)
- [Radix UI](https://www.radix-ui.com/) + [Lucide](https://lucide.dev/) + CVA

### Data
- **SQLite** with [Drizzle ORM](https://orm.drizzle.team/) — one shared schema in `packages/db`, used by both web and desktop
- `better-sqlite3` driver

### Desktop
- [Electron](https://www.electronjs.org/) 34 + `electron-vite` + `electron-builder`
- `electron-updater` — auto-update via GitHub Releases
- AI streaming runs in a **utility process** (`chat-worker`)

### Monorepo
- **pnpm** workspaces + [Turborepo](https://turbo.build/) for task orchestration

---

## Architecture

```
                  ┌─────────────────────────────────────────────┐
                  │  packages/*  (shared, import-side-effect-free) │
                  │  contracts · db · ai-runtime · services ·     │
                  │  frontend · config                            │
                  └────────────┬───────────────────┬─────────────┘
                               │                   │
              ┌────────────────▼───────┐  ┌────────▼──────────────────┐
              │  apps/web (Next.js)    │  │  apps/desktop (Electron)  │
              │  • API routes (server) │  │  • main process + IPC     │
              │  • Drizzle → SQLite    │  │  • utility process        │
              │  • renderer shell      │  │  • better-sqlite3         │
              └────────────────────────┘  │  • static-export renderer │
                                          └───────────────────────────┘
```

- **Shared logic** lives in `packages/*`:
  - `@llm-chatter/db` — Drizzle schema + lazy `getDb()` connection + migrations + seed
  - `@llm-chatter/ai-runtime` — `streamChatRuntime()` streaming engine, provider clients, catalog sync, MCP discovery, built-in tools
  - `@llm-chatter/services` — service layer (adapter pattern) + runtime detection + chat transports
  - `@llm-chatter/contracts` — Zod schemas, DTOs, global Electron API types
  - `@llm-chatter/frontend` — the entire React layer (pages, hooks, components)
  - `@llm-chatter/config` — shared tsconfig/eslint bases
- **Adapter pattern**: `services` exposes getters (`getModelService()`, …) that return a **web adapter** (→ Next.js API routes) or an **electron adapter** (→ IPC), decided by whether `window.electronAPI` exists.
- **Chat streaming** is shared: both modes ultimately call `streamChatRuntime()` (`packages/ai-runtime`). In desktop mode the main process resolves & decrypts the provider config first, so the utility process never touches the database.

---

## Development Setup

### Prerequisites
- **Node.js** v22 LTS recommended (bleeding-edge Node releases lack `better-sqlite3` prebuilds)
- **pnpm** v10+

### Install
```bash
pnpm install
```

### Database setup (web)
The web app reads/writes the SQLite file via Drizzle. From the repo root:
```bash
pnpm db:generate   # generate Drizzle migrations from the schema
pnpm db:push       # push schema to SQLite
pnpm db:seed       # seed default providers, models, assistants
```

### Environment variables (web)
Create a `.env` at the repo root (the web app loads it automatically):
```env
DATABASE_URL=file:./dev.db
MASTER_SECRET=your-encryption-secret-here
```
| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite database file path (`file:./dev.db`) |
| `MASTER_SECRET` | Yes | AES-256-GCM encryption key for API keys |

### Run
```bash
pnpm dev:web       # Next.js dev server (http://localhost:3000)
pnpm dev:desktop   # Electron dev mode
```

---

## Desktop App

Built with Electron; packaged for macOS, Windows, and Linux. The desktop renderer is a Next.js **static export** (`output: "export"`) served by a tiny in-process HTTP server; the AI stream runs in a utility process.

### Build & package
```bash
pnpm desktop:build:mac      # .dmg + .zip (macOS)
pnpm desktop:build:win      # .exe installer + portable (Windows)
pnpm desktop:build:linux    # .AppImage + .deb + .rpm (Linux)
pnpm desktop:build:dist     # current platform
pnpm desktop:build:dir      # unpacked dir (fastest, for local testing)
```

> **Native module note:** `desktop:build:*` recompiles `better-sqlite3` for Electron's Node ABI. Each script ends with `pnpm rebuild:sqlite` to restore the system-Node binary so `dev:web` keeps working. If `dev:web` ever shows `NODE_MODULE_VERSION … ERR_DLOPEN_FAILED`, run `pnpm rebuild:sqlite`.

### Auto-update
The desktop app auto-updates via GitHub Releases. New versions are detected on launch; users are prompted to restart to apply.

---

## Available Scripts (root)

| Command | Description |
|---|---|
| `pnpm dev:web` | Next.js dev server |
| `pnpm dev:desktop` | Electron dev mode |
| `pnpm build` | Build all workspace packages + apps |
| `pnpm lint` | ESLint across the workspace |
| `pnpm type-check` | TypeScript check across the workspace |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:push` | Push schema to SQLite |
| `pnpm db:migrate` | Run Drizzle migrations |
| `pnpm db:seed` | Seed defaults |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm rebuild:sqlite` | Recompile `better-sqlite3` for system Node |
| `pnpm desktop:build:{mac,win,linux,dist,dir}` | Build & package the desktop app |

---

## Project Structure

```
chat-llm-web/
├── apps/
│   ├── web/                     # Next.js web app (full Next, server features OK)
│   │   └── src/app/
│   │       ├── (chat)/          # chat pages (thin re-exports from frontend)
│   │       ├── settings/        # settings pages
│   │       └── api/             # REST API routes (web backend)
│   └── desktop/                 # Electron desktop app
│       ├── electron/
│       │   ├── main.ts          # main process entry
│       │   ├── preload.ts       # IPC bridge (window.electronAPI)
│       │   ├── chat-worker.ts   # utility process for AI streaming
│       │   ├── db/              # better-sqlite3 client (userData) + migrations + seed
│       │   ├── ipc/             # IPC handlers (mirror the API routes)
│       │   └── …                # tray, menu, shortcuts, updater, auto-launch
│       ├── electron-builder.yml
│       ├── electron.vite.config.ts
│       └── src/app/             # static-export renderer (re-exports frontend pages)
├── packages/
│   ├── contracts/               # Zod schemas, DTOs, global Electron API types
│   ├── db/                      # Drizzle schema + lazy client + migrations + seed
│   ├── ai-runtime/              # streamChatRuntime, provider clients, catalog, MCP, tools
│   ├── services/                # service layer (web/electron adapters) + transports
│   ├── frontend/                # React layer: pages, hooks, components, styles
│   └── config/                  # shared tsconfig + eslint bases
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Security

- **API keys encrypted at rest** with AES-256-GCM
  - **Web:** Node.js `crypto` with the `MASTER_SECRET` env var
  - **Desktop:** Node.js `crypto` with a UUID-based secret stored in the app data directory
- **The frontend never sees API keys** — only a `hasApiKey: boolean` flag is exposed
- In desktop mode, the utility process receives **pre-resolved, decrypted config** from the main process and never accesses the database directly

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + N` | New chat |
| `Cmd/Ctrl + B` | Toggle sidebar |
| `Cmd/Ctrl + ,` | Open settings |
| `Enter` | Send message |
| `Shift + Enter` | New line |

---

## Customization

### Add a new AI provider type
1. Add the type to the Drizzle schema in `packages/db/src/schema.ts` (and regenerate: `pnpm db:generate`).
2. Add the case in `getRuntimeModel()` at `packages/ai-runtime/src/chat-runtime/provider-client.ts`.
3. Update the provider-type enum in Zod schemas at `packages/contracts/src/schemas.ts`.
4. Update the provider settings UI in `packages/frontend/src/pages/settings/providers.tsx`.

### Modify the database schema
1. Edit `packages/db/src/schema.ts` (one schema, shared by web and desktop).
2. Run `pnpm db:generate` then `pnpm db:push`.
3. Update the matching Zod schemas in `packages/contracts` and any service interfaces/adapters in `packages/services`.

### Add a new API data resource
1. Add the Drizzle table + Zod schema.
2. Add a service interface + both adapters in `packages/services`.
3. Add the web route in `apps/web/src/app/api/` and the matching IPC handler in `apps/desktop/electron/ipc/`.

---

## License

ISC
