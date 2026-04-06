# Product Requirements Document: HTTP MITM Proxy UI

## Problem Statement

Developers and security engineers need to inspect, debug, and manipulate HTTP/HTTPS traffic between clients and servers. While `http-mitm-proxy` provides a powerful programmatic MITM (Man-in-the-Middle) proxy for intercepting and modifying traffic, it lacks a user-friendly interface for real-time inspection and interaction. Users currently rely on logs, custom scripts, or third-party tools like Charles Proxy or mitmproxy, which may not integrate seamlessly into their Node.js workflows or offer the customization they need.

## Solution Overview

**http-mitm-proxy-ui** is a self-contained package that bundles `http-mitm-proxy` with a modern web-based UI. When started, it launches both the MITM proxy server and a dashboard accessible via browser, enabling users to:

- View all HTTP/HTTPS requests and responses in real-time
- Inspect headers, bodies, cookies, and query parameters
- Filter, search, and analyze traffic
- Modify requests/responses on-the-fly via UI controls
- Export traffic logs for further analysis

The package is designed to be started with a single command, making it accessible for quick debugging sessions while remaining powerful enough for advanced use cases.

## Key Features

1. **Real-Time Traffic Inspection**
   - Live stream of all HTTP/HTTPS requests and responses
   - WebSocket-based updates for zero-latency UI refreshes

2. **Request/Response Details**
   - Full inspection of headers, body, cookies, query params
   - Syntax highlighting for JSON, XML, HTML, and other formats
   - Request timing and size breakdowns

3. **Filtering & Search**
   - Filter by domain, method, status code, content type
   - Full-text search across requests and responses
   - Save filter presets

4. **Traffic Modification**
   - Breakpoints: pause requests/responses before they are sent
   - Edit and replay modified requests/responses
   - Rule-based auto-modification (e.g., inject headers, rewrite URLs)

5. **Export & Replay**
   - Export traffic as HAR files
   - Export as JSON/CSV
   - Replay individual requests

6. **HTTPS Interception**
   - Auto-generate and manage SSL certificates
   - Easy CA certificate download for client trust installation

7. **Standalone CLI**
   - Single command to start proxy + UI: `http-mitm-proxy-ui --port 8080`
   - Configurable proxy port, UI port, and options via CLI flags or config file

## User Stories

| As a... | I want to... | So that... |
|---------|--------------|------------|
| Frontend developer | Inspect API calls from my app | I can debug network issues without opening browser dev tools |
| Backend developer | See exact requests sent by clients | I can verify request formatting and headers |
| Security engineer | Intercept and modify traffic in transit | I can test how services handle modified or malicious payloads |
| QA engineer | Export traffic logs as HAR files | I can share reproducible network traces with the team |
| Mobile developer | Route device traffic through the proxy | I can inspect mobile app network calls on my workstation |
| Any developer | Start the tool with one command | I don't waste time configuring separate proxy and UI tools |

## Technical Requirements

### Architecture

```
┌─────────────────────────────────────────────┐
│           http-mitm-proxy-ui                │
├──────────────────┬──────────────────────────┤
│  MITM Proxy      │  Web UI Server           │
│  (http-mitm-     │  (Express/Fastify +      │
│   proxy core)    │   React frontend)        │
│                  │                          │
│  - Intercept     │  - WebSocket for         │
│    HTTP/HTTPS    │    real-time updates     │
│  - Modify on     │  - REST API for          │
│    the fly       │    history/query         │
│  - Emit events   │  - Static file serving   │
└────────┬─────────┴────────────┬─────────────┘
         │                      │
         ▼                      ▼
    Network Traffic        Browser (localhost:3000)
    (localhost:8080)
```

### Tech Stack

- **Backend**: Node.js + TypeScript
- **Proxy Core**: `http-mitm-proxy` (existing package)
- **Web Framework**: Express
- **Frontend**: Vue 3 + Vite + TypeScript
- **Real-Time**: WebSocket (ws)
- **UI Components**: Material Design (custom implementation)
- **Syntax Highlighting**: Prism.js
- **Packaging**: CLI entry point via `bin` in package.json

### Core Interfaces

```typescript
interface RequestRecord {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  protocol: string;
  headers: Record<string, string>;
  body?: string | Buffer;
  contentType?: string;
  requestTime?: number;
  response?: ResponseRecord;
}

interface ResponseRecord {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string>;
  body?: string | Buffer;
  contentType?: string;
  responseTime?: number;
}

interface ProxyUIConfig {
  proxyPort: number;        // Default: 8080
  uiPort: number;           // Default: 3000
  sslCaDir?: string;        // Directory for CA certificates
  maxRequests: number;      // Max requests to keep in memory (default: 1000)
  enableModification: boolean; // Enable breakpoint/edit features
}
```

### CLI Usage

```bash
# Start with defaults
npx http-mitm-proxy-ui

# Custom ports
npx http-mitm-proxy-ui --proxy-port 9090 --ui-port 4000

# With config file
npx http-mitm-proxy-ui --config ./proxy-config.json

# Headless mode (proxy only, no UI)
npx http-mitm-proxy-ui --headless
```

### Programmatic API

```typescript
import { createProxyUI } from 'http-mitm-proxy-ui';

const proxy = createProxyUI({
  proxyPort: 8080,
  uiPort: 3000,
  enableModification: true,
});

proxy.on('request', (req) => console.log(req.url));
proxy.on('response', (res) => console.log(res.statusCode));

await proxy.start();
```

## Non-functional Requirements

| Requirement | Target |
|-------------|--------|
| **Startup Time** | < 2 seconds from command to UI accessible |
| **Memory Usage** | < 200MB with 1000 requests in memory |
| **Request Latency** | < 10ms overhead added by proxy |
| **Browser Support** | Latest Chrome, Firefox, Safari, Edge |
| **Node.js Version** | >= 18 |
| **Max Concurrent Connections** | 100+ simultaneous browser tabs / clients |
| **Security** | UI bound to localhost only by default; warning if exposed |
| **Certificate Management** | Auto-generate CA on first run; store in `~/.http-mitm-proxy-ui/ca` |
| **Error Handling** | Graceful degradation; clear error messages for port conflicts, cert issues |

## Decisions Made

1. **Dependency**: Bundle `http-mitm-proxy` as a regular dependency (simplifies installation)

2. **Large Response Handling**: 
   - Non-text responses (images, videos, etc.) are not displayed in UI
   - Large JSON responses are streamed to disk and served on-demand
   - Text responses are kept in memory for display

3. **Multiple Instances**: Single embedded instance only (simpler architecture)

4. **Authentication**: No authentication (UI bound to localhost-only by default)

5. **History Retention**: Store request history on disk using flexsearch or lowdb for persistence

6. **WebSocket Support**: Yes, WebSocket traffic inspection is a must-have feature

7. **Compression Handling**: Auto-decompress gzip/brotli responses for logging and display

8. **Distribution**: npm package only (compiled with TypeScript, no pre-built binaries)

## Tech Stack Decisions

- **Language**: TypeScript
- **Backend**: Express
- **Build Tool**: Vite
- **Frontend**: Vue 3
- **CLI**: Commander.js
- **Design**: Material Design with red, black on white background
- **Database**: flexsearch or lowdb for request history persistence
