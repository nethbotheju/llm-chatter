## Project Overview

**llm Chatter** is a multi-provider LLM chat application that runs as both a **web app** (Next.js) and a **native desktop app** (Electron). It supports OpenAI, Anthropic, Google, and compatible API providers, with conversation management, assistant customization, MCP tools, a model catalog, and encrypted API key storage.

The codebase is a **pnpm + Turborepo monorepo**: shared logic lives in `packages/*` and is consumed by two thin app shells — `apps/web` (full Next.js) and `apps/desktop` (Electron).

- **Package manager**: pnpm v10.32.1
- **Task runner**: Turborepo (`turbo.json`)
- **License**: ISC

## Repository Structure

```
chat-llm-web/
├── apps/
│   ├── web/                         # Next.js web app (full Next — server features allowed)
│   │   └── src/app/
│   │       ├── (chat)/              # chat route group (thin re-exports from @llm-chatter/frontend)
│   │       ├── settings/            # settings pages (re-exports)
│   │       └── api/                 # REST API routes (web backend)
│   └── desktop/                     # Electron desktop app
│       ├── electron/
│       │   ├── main.ts              # main process entry
│       │   ├── preload.ts           # IPC bridge → window.electronAPI
│       │   ├── chat-worker.ts       # utility process for AI streaming
│       │   ├── chat-runtime.ts      # re-exports from @llm-chatter/ai-runtime
│       │   ├── db/                  # better-sqlite3 client (userData) + migrations + seed + encryption
│       │   ├── ipc/                 # IPC handlers (mirror the API routes)
│       │   ├── build/               # icons + entitlements
│       │   └── *.ts                 # tray, menu, shortcuts, notifications, auto-launch, updater
│       ├── src/app/                 # static-export renderer (re-exports frontend pages)
│       ├── electron-builder.yml
│       ├── electron.vite.config.ts
│       ├── next.config.ts           # output: "export"
│       └── package.json
├── packages/
│   ├── contracts/                   # Zod schemas, DTOs, global Electron API types, builtin-tool configs
│   ├── db/                          # Drizzle schema + lazy getDb() + migrations + seed
│   ├── ai-runtime/                  # streamChatRuntime, provider clients, catalog, MCP, builtin tools
│   ├── services/                    # service layer (web/electron adapters), transports, runtime detection
│   ├── frontend/                    # React layer: pages, hooks, components, styles (source-consumed)
│   └── config/                      # shared tsconfig + eslint bases
├── turbo.json
├── pnpm-workspace.yaml              # packages: ["apps/*", "packages/*"]
├── AGENTS.md
└── package.json                     # root (lean: turbo + orchestration scripts only)
```

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | ^19.2.4 | UI framework |
| Next.js | ^16.1.7 | App Router, API routes, static export (desktop) |
| TypeScript | ^5.9.3 | Type safety |
| Tailwind CSS | ^4.2.1 | Styling (v4 via `@tailwindcss/postcss`) |
| Vercel AI SDK (`ai`) | ^6.0.116 | Chat streaming, `useChat`, `streamText` |
| Zod | ^4.3.6 | Runtime validation & schemas |

### AI Provider SDKs
- `@ai-sdk/openai` — OpenAI & OpenAI-compatible
- `@ai-sdk/anthropic` — Anthropic & Anthropic-compatible
- `@ai-sdk/google` — Google Gemini
- `@ai-sdk/mcp` — MCP tool integration
- `@ai-sdk/react` — React bindings (`useChat`)

### Desktop
| Technology | Purpose |
|---|---|
| Electron 34 | Native desktop shell |
| electron-vite | Build tooling for main/preload/utility processes |
| electron-builder | Packaging (dmg/nsis/AppImage…) |
| electron-updater | Auto-update via GitHub Releases |
| better-sqlite3 | SQLite driver (native module) |

### Data
- **SQLite** — single database file
- **Drizzle ORM** — one shared schema in `packages/db/src/schema.ts`, used by both web and desktop
- `better-sqlite3` — the driver (web reads via Drizzle over the shared lazy client; desktop has its own connection in `apps/desktop/electron/db/client.ts` pointing at `userData`)

### UI Libraries
- `lucide-react`, `class-variance-authority`, `tailwind-merge` + `clsx`, `@radix-ui/react-slider`, `react-markdown` + `remark-gfm` + `rehype-highlight`, `next-themes`, `date-fns`, `marked`, `nanoid`

## Architecture

### Dual-Mode Design (Web vs Desktop)

The same React layer (`@llm-chatter/frontend`) powers both runtimes. The service layer (`@llm-chatter/services`) detects `window.electronAPI` and loads the correct adapter. Only the data/chat transport differs.

**Web Mode:**
```
React (@llm-chatter/frontend)
  ├── Data: getXxxService() → Web Adapter → fetch() → apps/web API routes → Drizzle → SQLite
  └── Chat: useChat → POST /api/chat
        → resolve model + provider from DB → decrypt API key
        → streamChatRuntime() (@llm-chatter/ai-runtime) → AI Provider API
        → on finish: persist assistant message via Drizzle
```

**Desktop Mode (Electron):**
```
React (@llm-chatter/frontend)
  ├── Data: getXxxService() → Electron Adapter → IPC → main process handlers → better-sqlite3 → SQLite
  └── Chat: useChat (ElectronChatTransport) → IPC → utility process (chat-worker)
        → main process resolves model, decrypts API key, fetches assistant config
        → utility process calls streamChatRuntime() → AI Provider API
        → on finish: persist assistant message via IPC → better-sqlite3
```

Key difference: in web mode `/api/chat` resolves provider config server-side; in desktop mode the **main process** resolves it and hands the pre-resolved config to the utility process — the utility process never touches the database.

### Service Layer (Adapter Pattern)

`@llm-chatter/services` exposes 12 service interfaces (`packages/services/src/interfaces.ts`):

| Service | Purpose |
|---|---|
| `IProviderService` / `IModelService` | Provider & model CRUD |
| `IAssistantService` | Assistant CRUD |
| `IConversationService` / `IMessageService` | Conversation & message CRUD |
| `ISearchService` | Full-text message search |
| `IExportService` / `IStatsService` / `IResetService` | Export, stats, reset |
| `IMcpServerService` | MCP server config CRUD |
| `IProviderCatalogService` | Catalog browse/import/sync |
| `IAppConfigService` | App key/value config |

Each has two implementations:
- **Web adapter** (`packages/services/src/adapters/web.adapter.ts`) — calls `apps/web` API routes via `fetch()`
- **Electron adapter** (`packages/services/src/adapters/electron.adapter.ts`) — calls Electron IPC via `window.electronAPI`

Access through getters: `getProviderService()`, `getModelService()`, etc.

### Chat Streaming

`streamChatRuntime()` in `packages/ai-runtime/src/chat-runtime/stream.ts` is the single shared streaming engine. It uses the AI SDK `streamText()` with provider-specific model instances from `getRuntimeModel()` (`provider-client.ts`). Persistence is dependency-injected via a `ChatPersistenceStore` so neither web nor desktop hard-couples to a DB client.

Provider types: `openai`, `openai-compatible`, `anthropic`, `anthropic-compatible`, `google`.

### Database Schema

7 Drizzle tables in `packages/db/src/schema.ts` (shared by web and desktop):

- **Provider** — AI provider config (name, type, baseUrl, encrypted API key, catalog linkage)
- **Model** — model config (name, capabilities JSON, belongs to Provider)
- **Assistant** — assistant config (system prompt, temperature, topP)
- **Conversation** — chat conversation (title, belongs to Assistant)
- **Message** — chat message (role, parts JSON, metadata JSON)
- **McpServer** — MCP server config (slug, transport, config JSON)
- **AppConfig** — generic key/value app settings

The desktop side (`apps/desktop/electron/db/`) uses the same schema objects via `@llm-chatter/db`, with its own connection (`getDb()` → `userData` dir) and a migration runner that reads `drizzle/` migrations.

### Security Model

- API keys encrypted at rest using AES-256-GCM
- Web: Node.js `crypto` with `MASTER_SECRET` env var
- Desktop: Node.js `crypto` with a UUID-based secret stored in `{app_data_dir}/master_secret`
- API keys never sent to the frontend — only a `hasApiKey: boolean` flag

## Development Setup

### Requirements
- **Node.js**: v22 LTS recommended (newer Node releases often lack `better-sqlite3` prebuilds and force slow source compiles)
- **pnpm**: v10+

### Initial Setup
```bash
pnpm install
pnpm db:generate    # generate Drizzle migrations
pnpm db:push        # push schema to SQLite
pnpm db:seed        # seed default providers, models, assistants
```

### Environment Variables (Web)
Create `.env` at the repo root (the web app loads it via `apps/web/next.config.ts`):
| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | SQLite database path | `file:./dev.db` |
| `MASTER_SECRET` | Encryption key for API keys | any string |

### Run
```bash
pnpm dev:web       # Next.js dev server (http://localhost:3000)
pnpm dev:desktop   # Electron dev mode
```

### Native Module ABI — `better-sqlite3` (important)

`better-sqlite3` is a native module shared by **web** (Next.js dev server → your system Node) and **desktop** (Electron → Electron's bundled Node). The two runtimes have **different native ABIs**, and there is only one compiled binary in the workspace. This creates a tug-of-war:

- `pnpm install` / `pnpm rebuild:sqlite` compiles it for **system Node** (what `dev:web` needs).
- `desktop:build:*` runs `@electron/rebuild`, which recompiles the same binary for **Electron** (what the packaged app needs).

To prevent `dev:web` from silently breaking after a desktop build, every `desktop:build:*` script ends with `pnpm rebuild:sqlite` to restore the system-Node binary. If you ever see `NODE_MODULE_VERSION … This version of Node.js requires …` / `ERR_DLOPEN_FAILED` from `better-sqlite3` in `dev:web`, just run:

```bash
pnpm rebuild:sqlite
```

## Development Commands

| Command | Description |
|---|---|
| `pnpm dev:web` | Next.js dev server |
| `pnpm dev:desktop` | Electron dev mode |
| `pnpm build` | Build all packages + apps (turbo) |
| `pnpm lint` | ESLint across the workspace |
| `pnpm type-check` | TypeScript check across the workspace |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:push` | Push schema to SQLite |
| `pnpm db:migrate` | Run Drizzle migrations |
| `pnpm db:seed` | Seed defaults |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm rebuild:sqlite` | Recompile `better-sqlite3` for system Node |
| `pnpm desktop:build:dir` | Build + package desktop (unpacked dir, fast) |
| `pnpm desktop:build:mac` | Build + package desktop for macOS |
| `pnpm desktop:build:win` | …for Windows |
| `pnpm desktop:build:linux` | …for Linux |
| `pnpm desktop:build:dist` | …for the current platform |

Package-level scripts (run inside `apps/web`, `apps/desktop`, or any `packages/*`) also work directly, but prefer the root orchestration scripts above.

## Key Conventions

### File Naming
- React components: `kebab-case.tsx` (e.g. `chat-input.tsx`)
- Hooks: `use-*.ts`
- Utilities: `kebab-case.ts`

### Path Aliases
- **Inside an app** (`apps/web`, `apps/desktop`): `@/*` → `./src/*` (each app has its own)
- **Across packages**: import by package name — `@llm-chatter/{contracts,db,ai-runtime,services,frontend,config}`

### State Management
No external state library. All UI state lives in custom React hooks in `packages/frontend/src/hooks/` (composed in the chat layout): `use-transport`, `use-models`, `use-assistants`, `use-conversations`, `use-conversation-messages`, `use-chat-actions`, `use-chat-options`, `use-chat-scroll`, `use-sidebar-state`, `use-keyboard-shortcuts`, `use-catalog-sync`. (`useChat` comes from `@ai-sdk/react`.) State coordination uses refs to avoid stale closures.

### Styling
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **MD3 theme** as CSS custom properties — the shared stylesheet partial lives in `packages/frontend/src/styles/globals.css`; each app owns a `src/app/globals.css` that imports it and declares its own `@source` scan paths
- UI primitives with CVA variants in `packages/frontend/src/components/ui/`
- Utility classes: `.glass-card`, `.custom-scrollbar`, `.scrollbar-none`, `.titlebar-drag`

### Validation
- Zod schemas in `packages/contracts/src/schemas.ts` for all entity types and API inputs
- Parse helpers for runtime validation at API/IPC boundaries

### Static Export Compatibility — scoped to the desktop renderer

The desktop renderer (`apps/desktop`) builds with Next.js `output: "export"` (no SSR). The web app (`apps/web`) is a **separate, full Next.js app** and is free to use server features (API routes, RSC, middleware) in its own code.

The constraint that remains: the **shared `@llm-chatter/frontend` package** is consumed by both apps, so its components stay static-export-safe — specifically:
- No `next/navigation` `useRouter()` — chat navigation uses `window.history.pushState`
- Components are client components (`"use client"`) where they touch browser/Electron APIs

This is the monorepo split that lifted the previous app-wide desktop tax: web is no longer forced to the static-export lowest common denominator; only the shared frontend layer is.

## API Routes

All web API routes are in `apps/web/src/app/api/`:

| Route | Purpose |
|---|---|
| `/api/providers`, `/api/providers/validate` | Provider CRUD + API-key validation |
| `/api/models` | Model CRUD |
| `/api/assistants` | Assistant CRUD |
| `/api/conversations`, `/api/conversations/[id]/messages` | Conversation + message CRUD |
| `/api/chat` | Chat streaming endpoint |
| `/api/search` | Message search |
| `/api/export`, `/api/stats`, `/api/reset` | Export, stats, reset |
| `/api/app-config` | App key/value config |
| `/api/mcp-servers`, `/api/mcp-servers/discover` | MCP server config + tool discovery |
| `/api/catalog/{providers,sync,import,providers/[id]/models}` | Model catalog |

## Electron IPC

IPC handlers are in `apps/desktop/electron/ipc/`, mirroring the API routes for desktop mode. The preload script (`apps/desktop/electron/preload.ts`) exposes `window.electronAPI` with namespaced methods. The ambient `Window.electronAPI` type is declared in `packages/contracts/src/types/electron.d.ts` and ships globally via the contracts package (no tsconfig `include` hacks needed).

## Import Patterns

| What | Import From |
|---|---|
| UI components / pages / hooks | `@llm-chatter/frontend` |
| Service layer (getters + adapters) | `@llm-chatter/services` |
| Zod schemas / DTOs / types | `@llm-chatter/contracts` |
| DB schema + `getDb()` / `db` | `@llm-chatter/db` |
| Chat streaming engine | `@llm-chatter/ai-runtime` |
| Runtime detection (`isElectron`, `isWeb`) | `@llm-chatter/services` |
| Shared tsconfig/eslint bases | `@llm-chatter/config` |
| `cn()` utility | `@llm-chatter/frontend` |
| AI SDK core / React / providers | `ai`, `@ai-sdk/react`, `@ai-sdk/{openai,anthropic,google,mcp}` |
| Within an app's own source | `@/*` (maps to that app's `./src/*`) |

## Common Workflows

### When Adding a Feature
- **Touches data:** add the Drizzle table in `packages/db/src/schema.ts`, regenerate (`pnpm db:generate`), add the Zod schema in `packages/contracts`, add the service interface + both adapters in `packages/services`, then add the web route (`apps/web/src/app/api/`) and the matching IPC handler (`apps/desktop/electron/ipc/`).
- **Modifies chat flow:** change `packages/ai-runtime/src/chat-runtime/`.
- **Adds UI:** add components/pages/hooks in `packages/frontend/src/`.

### When Modifying the Database Schema
1. Edit `packages/db/src/schema.ts` (single shared schema).
2. `pnpm db:generate` then `pnpm db:push`.
3. Update Zod schemas in `packages/contracts/src/schemas.ts` and any service interfaces/adapters in `packages/services`.

### When Adding a New AI Provider Type
1. Add the type to the Drizzle schema + Zod enum (`packages/db`, `packages/contracts`).
2. Add the case in `getRuntimeModel()` at `packages/ai-runtime/src/chat-runtime/provider-client.ts`.
3. Update the provider settings UI at `packages/frontend/src/pages/settings/providers.tsx`.

### When Adding a Component
1. Place it under the right subdirectory of `packages/frontend/src/components/`.
2. Re-export it from `packages/frontend/src/index.ts`.
3. Use MD3 CSS custom properties and `cn()` from `@llm-chatter/frontend`.

## Shared Package Boundaries

The `packages/*` workspace packages are consumed by **both** `apps/web` (Next.js server) and `apps/desktop` (packaged Electron). They must obey one rule that prevents an entire class of startup crashes:

**Shared packages must be import-side-effect-free and must not assume a specific runtime.**

- **No environment-specific I/O at module top level.** Do not open database connections, touch the filesystem, call Electron's `app`/`process.resourcesPath`, or make network requests while a module is being imported. These run at import time in *every* consumer — including the Electron main process, where paths resolve against the read-only `app.asar` and crash before any app code runs.
- **Use a lazy factory for any connection or expensive resource.** The reference pattern is `getDb()` in `@llm-chatter/db` (creates the SQLite connection on first call, cached) plus a lazy `db` proxy so existing `db.select(...)` call sites are unchanged. Follow this for any new connection or resource.
- **Don't pull bundler-unfriendly Node libraries into a package's import graph unless truly needed at runtime.** Libraries that rely on real file paths (`jsdom`/`css-tree`, `turndown`/`domino`) break when inlined into the Electron CJS bundle. If a package needs them, externalize them in `apps/desktop/electron.vite.config.ts` and declare them as runtime deps of `apps/desktop` so they ship in `node_modules`.
- **Build-time data is fine at top level** — Zod schema construction, constant `Set`s, etc. are environment-agnostic and cheap. The rule targets runtime/environment-coupled work only.

This rule exists because three desktop startup crashes (`css-tree` `patch.json`, `@mixmark-io/domino`, and "unable to open database file") all traced back to one anti-pattern: shared packages executing environment-specific work at import time.

## Do Not

- Do not use Next.js `useRouter()` for navigation inside `@llm-chatter/frontend` — it must stay static-export-safe for the desktop renderer; use `window.history.pushState`
- Do not access API keys on the frontend — they are encrypted and only decrypted server-side
- Do not bypass the service layer — always use `getXxxService()` functions from `@llm-chatter/services`
- Do not perform environment-specific I/O (database connections, filesystem, `electron.app`) at module import time in shared `packages/*` — use the lazy `getDb()` factory pattern (see "Shared Package Boundaries")
- Do not declare a dependency only at the workspace root — every package/app must declare what it imports (root has been slimmed to `turbo` only)
- Do not add unnecessary inline comments — keep the code clean and self-documenting
- Do not run `git add`, `git commit`, or `git push` autonomously
- Do not create documentation files (*.md, README, etc.) unless explicitly requested
- Do not add emojis to code or file content unless explicitly requested
- Do not use external state management libraries — use the existing hook-based pattern
