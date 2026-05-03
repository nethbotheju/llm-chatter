# llm Chatter

A multi-provider LLM chat application that runs as both a **web app** (Next.js) and a **native desktop app** (Tauri v2). Chat with OpenAI, Anthropic, Google Gemini, and any OpenAI-compatible or Anthropic-compatible API — all with encrypted API key storage, custom assistants, conversation history, and real-time streaming.

---

## Features

- **Multi-Provider Support** — Connect to OpenAI, Anthropic, Google, and custom API-compatible endpoints
- **Custom Assistants** — Create assistants with custom system prompts, temperature, and top-P settings
- **Conversation Management** — Persistent chat history with search, sidebar navigation, and message editing
- **Real-Time Streaming** — Smooth token-by-token streaming via Vercel AI SDK
- **Dual Runtime** — Runs as a Next.js web app or a native desktop app (macOS, Windows, Linux)
- **Encrypted API Keys** — AES-256-GCM encryption for all stored provider credentials
- **Material Design 3** — Polished dark-themed UI with glassmorphism and custom scrollbars
- **Keyboard Shortcuts** — `Cmd/Ctrl+N` new chat, `Cmd/Ctrl+B` toggle sidebar, `Cmd/Ctrl+,` settings
- **Data Portability** — Export all conversations and settings, full data reset support

---

## Supported Providers

| Provider | Types | Notes |
|---|---|---|
| OpenAI | `openai`, `openai-compatible` | GPT-4, GPT-3.5, and custom endpoints |
| Anthropic | `anthropic`, `anthropic-compatible` | Claude models and custom endpoints |
| Google | `google` | Gemini models |

---

## Tech Stack

### Frontend
- [Next.js](https://nextjs.org/) 16 + React 19 (App Router)
- [TypeScript](https://www.typescriptlang.org/) 5.9
- [Tailwind CSS](https://tailwindcss.com/) 4 + MD3 Dark Theme
- [Vercel AI SDK](https://sdk.vercel.ai/) (`ai`, `@ai-sdk/react`)
- [Radix UI](https://www.radix-ui.com/) + [Lucide React](https://lucide.dev/)

### Backend / Desktop
- **Web:** Next.js API Routes + Prisma + SQLite
- **Desktop:** Tauri v2 (Rust) + rusqlite + Node.js SEA sidecar

### Database
- SQLite (shared schema across web and desktop)
- Prisma ORM (web mode)
- rusqlite with migrations (desktop mode)

---

## Architecture

The application uses an **adapter pattern** to share the same React frontend across two runtime environments:

### Web Mode
```
React Frontend
  ├── Data: Service Layer → Web Adapter → fetch() → Next.js API → Prisma → SQLite
  └── Chat: useChat → POST /api/chat → streamChatRuntime() → AI Provider API
```

### Desktop Mode
```
React Frontend
  ├── Data: Service Layer → Tauri Adapter → invoke() → Rust Commands → rusqlite → SQLite
  └── Chat: useChat → POST localhost:{port}/chat → Node.js Sidecar → streamChatRuntime() → AI Provider API
```

Key architectural decisions:
- **Shared streaming engine** — `streamChatRuntime()` in `src/lib/chat-runtime/stream.ts` is the only module shared directly between web and desktop
- **Pre-resolved config** — In desktop mode, Rust resolves and decrypts provider config before sending it to the sidecar; the sidecar never touches the database
- **Static export compatibility** — Desktop build uses `output: "export"` with client-side `window.history.pushState` navigation

---

## Development Setup

### Prerequisites

- **Node.js** v18+ (v22 recommended)
- **pnpm** v10+
- **Rust** 1.85.0+ (for desktop development)

### Install Dependencies

```bash
pnpm install
```

### Database Setup (Web Mode)

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to SQLite
pnpm db:push

# Seed default providers, models, and assistants
pnpm db:seed
```

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=file:./dev.db
MASTER_SECRET=your-encryption-secret-here
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite database file path |
| `MASTER_SECRET` | Yes | AES-256-GCM encryption key for API keys |
| `BUILD_TARGET` | No | Set to `desktop` for static export builds |

---

## Available Scripts

### Web Development

| Command | Description |
|---|---|
| `pnpm dev` | Start Next.js dev server with Turbopack |
| `pnpm build` | Build Next.js for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

### Database

| Command | Description |
|---|---|
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push Prisma schema to SQLite |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed database with defaults |
| `pnpm db:studio` | Open Prisma Studio |

### Desktop Development

| Command | Description |
|---|---|
| `pnpm desktop-runtime:build` | Build sidecar with esbuild |
| `pnpm desktop-runtime:build-sea` | Build sidecar as Node.js SEA |
| `pnpm build:desktop` | Full desktop build (sidecar + static export) |
| `pnpm tauri:dev` | Run Tauri in dev mode |
| `pnpm tauri:build` | Build Tauri desktop app |

---

## Project Structure

```
chat-llm-web/
├── src/                          # Next.js application source
│   ├── app/                      # App Router pages & API routes
│   │   ├── (chat)/               # Main chat UI
│   │   │   ├── layout.tsx        # Chat orchestrator (hooks composed here)
│   │   │   ├── page.tsx          # New chat page
│   │   │   └── c/[id]/           # Conversation detail page
│   │   ├── settings/             # Settings pages
│   │   │   ├── general/          # Theme selection
│   │   │   ├── providers/        # Provider & model management
│   │   │   ├── assistants/       # Assistant CRUD
│   │   │   └── privacy/          # Data export & reset
│   │   └── api/                  # REST API routes (web only)
│   ├── components/               # React components
│   │   ├── chat/                 # Chat UI (messages, input, welcome)
│   │   ├── layout/               # Top app bar
│   │   ├── markdown/             # Markdown rendering
│   │   ├── settings/             # Settings forms
│   │   ├── sidebar/              # Sidebar & conversation list
│   │   └── ui/                   # Reusable UI primitives
│   ├── hooks/                    # Custom React hooks
│   ├── lib/
│   │   ├── ai/                   # Encryption utilities
│   │   ├── chat-runtime/         # Shared AI streaming engine
│   │   ├── contracts/            # Zod schemas & DTOs
│   │   ├── db/                   # Prisma client singleton
│   │   ├── models.ts             # Model capability helpers
│   │   └── services/             # Service layer with adapters
│   └── types/                    # UI-facing type definitions
├── src-tauri/                    # Tauri v2 desktop app (Rust)
│   ├── src/
│   │   ├── lib.rs                # App setup & command registration
│   │   ├── crypto.rs             # AES-256-GCM encryption
│   │   ├── db.rs                 # SQLite schema & migrations
│   │   ├── desktop_runtime.rs    # Sidecar process management
│   │   └── commands/             # Tauri IPC command modules
│   ├── Cargo.toml
│   └── tauri.conf.json
├── desktop-runtime/              # Node.js sidecar for desktop streaming
│   ├── src/server.ts             # HTTP server with /chat endpoint
│   ├── build.mjs                 # esbuild bundler
│   └── build-sea.mjs             # Node.js SEA builder
├── prisma/
│   ├── schema.prisma             # SQLite database schema
│   └── seed.ts                   # Database seed script
└── package.json
```

---

## Security

- **API keys are encrypted at rest** using AES-256-GCM
  - **Web:** Node.js `crypto` module with `MASTER_SECRET` env var
  - **Desktop:** Rust `aes-gcm` crate with a UUID-based secret stored in app data directory
- **Frontend never sees API keys** — only a `hasApiKey: boolean` flag is exposed
- Desktop sidecar receives **pre-resolved, decrypted config** from Rust and never accesses the database directly

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + N` | Start new chat |
| `Cmd/Ctrl + B` | Toggle sidebar |
| `Cmd/Ctrl + ,` | Open settings |
| `Enter` | Send message |
| `Shift + Enter` | New line in input |

---

## Customization

### Adding a New AI Provider Type

1. Add the provider type to `prisma/schema.prisma` and `src-tauri/src/db.rs`
2. Add the runtime case in `src/lib/chat-runtime/provider-client.ts`
3. Update Zod schemas in `src/lib/contracts/schemas.ts`
4. Update the provider settings UI in `src/app/settings/providers/page.tsx`

### Modifying the Database Schema

1. Update `prisma/schema.prisma` for web mode
2. Update `src-tauri/src/db.rs` for desktop mode (schema + migrations)
3. Run `pnpm db:push` to apply Prisma changes
4. Update Zod schemas, service interfaces, and both adapter implementations

---

## License

ISC
