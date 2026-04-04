# AGENTS.md — http-mitm-proxy-ui

## Project Overview

A MITM (Man-in-the-Middle) HTTP/HTTPS proxy with a web-based UI for inspecting, debugging, filtering, and exporting network traffic in real-time.

Starts with a single command. Bundles the proxy server and Vue 3 dashboard into one package.

## Architecture

```
┌─────────────────────────────────────────────┐
│           http-mitm-proxy-ui                │
├──────────────────┬──────────────────────────┤
│  MITM Proxy      │  Web UI Server           │
│  (http-mitm-     │  (Express + Vue 3)       │
│   proxy core)    │                          │
│  - Intercept     │  - WebSocket for         │
│    HTTP/HTTPS    │    real-time updates     │
│  - Modify on     │  - REST API for          │
│    the fly       │    history/query         │
└────────┬─────────┴────────────┬─────────────┘
         │                      │
         ▼                      ▼
    Network Traffic        Browser (localhost:UI_PORT)
    (localhost:PROXY_PORT)
```

## Directory Structure

```
├── src/                        # Backend (TypeScript → dist/)
│   ├── index.ts                # CLI entry point (Commander.js)
│   ├── proxy/
│   │   └── index.ts            # MitmProxy class — wraps http-mitm-proxy
│   └── ui/
│       └── server.ts           # Express server + WebSocket + REST API
├── ui/                         # Frontend (Vue 3 + Vite → dist/public/)
│   ├── index.html              # SPA entry point
│   ├── src/
│   │   ├── main.js             # Vue bootstrap
│   │   ├── App.vue             # Root component
│   │   ├── components/
│   │   │   ├── ProxyHeader.vue     # Status bar, request count, actions
│   │   │   ├── FilterBar.vue       # Method/status/search filters
│   │   │   ├── RequestList.vue     # Sortable traffic table
│   │   │   ├── RequestDetail.vue   # Slide-in detail panel
│   │   │   ├── EmptyState.vue      # Empty/no-results states
│   │   │   └── ExportDialog.vue    # JSON/CSV export modal
│   │   ├── composables/
│   │   │   └── useRequests.ts      # Reactive state management
│   │   ├── services/
│   │   │   ├── api.ts              # REST API client
│   │   │   └── websocket.ts        # WebSocket client with reconnect
│   │   ├── styles/
│   │   │   └── main.css            # Material Design theme (red/black/white)
│   │   └── types/
│   │       └── index.ts            # TypeScript interfaces
├── patches/                    # patch-package patches for dependencies
│   └── http-mitm-proxy+1.1.0.patch  # macOS IPv4 fix
├── tests/                      # Playwright BDD tests
├── test-clients/               # Node.js HTTP client test scripts
├── test-ca/                    # Test SSL certificates (regenerated per run)
├── dist/                       # Build output (git-ignored)
│   ├── index.js, proxy/, ui/   # Compiled backend
│   └── public/                 # Compiled Vue frontend
├── package.json
├── tsconfig.json               # Compiles src/ → dist/
├── vite.config.ts              # Builds ui/ → dist/public/
└── integration-test.sh         # End-to-end test script
```

## Key Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | TypeScript + Vite build |
| `npm run dev` | Watch TypeScript + Vite dev server |
| `npm start` | Run compiled backend |
| `npx http-mitm-proxy-ui` | CLI entry (after global install) |
| `bash integration-test.sh` | End-to-end integration tests |

## Build Pipeline

1. `tsc` — Compiles `src/` → `dist/` (backend, CommonJS)
2. `vite build` — Compiles `ui/` → `dist/public/` (frontend SPA)

The Express server at `dist/ui/server.js` serves the Vue SPA from `dist/public/`.

**Important:** `src/ui/server.ts` resolves the UI dist path as `path.resolve(__dirname, '..', 'public')`. Since `__dirname` in compiled code is `dist/ui/`, this resolves to `dist/public/`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/requests` | List requests (supports `method`, `status`, `domain`, `contentType`, `search`, `limit`, `offset`) |
| GET | `/api/requests/:id` | Single request detail |
| DELETE | `/api/requests` | Clear request history |
| GET | `/api/config` | Proxy configuration |
| GET | `/api/ca-cert` | Download CA certificate |

## WebSocket (`/ws`)

| Type | Direction | Description |
|------|-----------|-------------|
| `init` | Server → Client | Initial request list on connect |
| `request` | Server → Client | New request intercepted |
| `response` | Server → Client | Response received |
| `error` | Server → Client | Error occurred |
| `clear` | Server → Client | History cleared |

## macOS Compatibility Patch

`http-mitm-proxy` has a bug on macOS: it hardcodes `host: "0.0.0.0"` for internal HTTPS server connections, but macOS resolves `localhost` to IPv6 `::1` while `0.0.0.0` is IPv4. This causes `ECONNREFUSED`.

**Fix:** `patches/http-mitm-proxy+1.1.0.patch` changes all internal hosts from `"0.0.0.0"` / `"localhost"` to `"127.0.0.1"`.

Auto-applied on `npm install` via the `postinstall` script running `patch-package`.

## Conventions

### Backend (`src/`)
- TypeScript, strict mode, CommonJS modules
- `noImplicitAny: true`, `noUncheckedIndexedAccess: true`
- Type declarations for all exports

### Frontend (`ui/src/`)
- Vue 3 Composition API with `<script setup lang="ts">`
- No generated `.js`/`.d.ts` files in `ui/src/` — Vite compiles at build time
- Types in `ui/src/types/index.ts`
- Styles in `ui/src/styles/main.css` — Material Design red/black/white theme
- Keyboard shortcuts: Ctrl+L (search), Ctrl+K (clear filters), Ctrl+E (export), Escape (close)

### Testing
- Integration tests: `integration-test.sh` (builds, starts proxy, makes HTTPS requests, verifies API)
- HTTPS requests through the proxy need `curl -sk` (insecure flag) since curl doesn't trust the dynamic CA
- BDD tests: `tests/ui/*.feature` + Playwright

### Git
- `dist/`, `test-ca/`, `node_modules/` are git-ignored
- `patches/` directory must be committed (used by patch-package on install)

---

## Pre-Commit Checklist

Before committing, run these steps in order:

### 1. Format code
```bash
npx prettier --write "src/**/*.{ts,js}" "ui/src/**/*.{vue,ts,js,css}" --log-level warn
```
*(If prettier config exists, use it. Otherwise the above covers all source files.)*

### 2. Build
```bash
npm run build
```
Must exit with code 0. No TypeScript errors. No Vite build errors.

### 3. Run integration tests
```bash
# Kill any leftover proxy instances first
lsof -ti:19090 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti:14096 2>/dev/null | xargs kill -9 2>/dev/null
rm -f /tmp/http-mitm-*.pid /tmp/http-mitm-*.log

bash integration-test.sh
```
All 15 test assertions must pass.

### 4. Verify no generated files in ui/src/
```bash
# There should be NO .js or .d.ts files in ui/src/
find ui/src -name "*.js" -o -name "*.d.ts" -o -name "*.js.map" -o -name "*.d.ts.map"
```
Output should be empty. Vite handles compilation — source files in `ui/src/` are `.ts`, `.vue`, and `.css` only.

### 5. Check git status
```bash
git status
```
Only the files you intend to commit should be staged. Do not commit:
- `dist/` (build output, git-ignored)
- `node_modules/` (git-ignored)
- `playwright-report/`, `test-results/` (test output)
- Generated `.js`/`.d.ts` in `ui/src/`

### 6. Commit
```bash
git add <files>
git commit -m "type: concise description

Detailed explanation of what changed and why.
- Bullet points for multiple changes
- Reference any related issues
"
```
