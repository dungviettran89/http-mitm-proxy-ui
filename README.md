# http-mitm-proxy-ui

A self-contained Node.js package that bundles `http-mitm-proxy` with a modern web-based UI for inspecting, debugging, and manipulating HTTP/HTTPS traffic in real-time.

## Features

- **Real-time Traffic Inspection**: Live stream of HTTP/HTTPS requests and responses with WebSocket updates
- **Complete Request/Response Details**: Headers, bodies, cookies, query parameters with syntax highlighting
- **Advanced Filtering & Search**: Filter by domain, method, status code, content type with full-text search
- **Traffic Modification**: Breakpoints, edit/replay, and rule-based auto-modification capabilities
- **Export & Replay**: Export traffic as HAR, JSON, or CSV; replay individual requests
- **HTTPS Interception**: Auto-generates and manages SSL certificates with easy CA download
- **Standalone CLI**: Single command to start both proxy and UI with configurable options
- **REST API**: Programmatic access to traffic data and configuration
- **Material Design UI**: Clean, responsive interface with red/black on white theme

## Installation

```bash
npm install http-mitm-proxy-ui
```

## Usage

### CLI Usage

Start with default ports (proxy: 8080, UI: 3000):

```bash
npx http-mitm-proxy-ui
```

Custom configuration:

```bash
http-mitm-proxy-ui --proxy-port 9090 --ui-port 4000 --ssl-ca-dir ./my-certs
```

Available options:
- `-p, --proxy-port <port>`: MITM proxy server port (default: 8080)
- `-u, --ui-port <port>`: Web UI server port (default: 3000)
- `-H, --headless`: Run in proxy-only mode (no UI)
- `-c, --config <path>`: Path to JSON config file
- `--ssl-ca-dir <path>`: Directory for SSL CA certificates
- `--max-requests <count>`: Max requests to keep in memory (default: 1000)
- `--no-modification`: Disable request/response modification features
- `-h, --help`: Display help

### Programmatic Usage

```typescript
import { createProxyUI } from 'http-mitm-proxy-ui';

const proxy = createProxyUI({
  proxyPort: 8080,
  uiPort: 3000,
  enableModification: true,
});

proxy.on('request', (req) => {
  console.log('Request:', req.method, req.url);
});

proxy.on('response', (req) => {
  console.log('Response:', req.response?.statusCode);
});

await proxy.start();
```

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
│  - Emit events   │  - Static file serving   │
└────────┬─────────┴────────────┬─────────────┘
         │                      │
         ▼                      ▼
    Network Traffic        Browser (localhost:3000)
    (localhost:8080)
```

## API Endpoints

When the UI server is running (not headless):

- `GET /api/health` - Health check
- `GET /api/requests` - List requests with filtering/pagination
- `GET /api/requests/:id` - Get specific request details
- `DELETE /api/requests` - Clear request history
- `GET /api/config` - Get current configuration
- `GET /api/ca-cert` - Download CA certificate for trust installation
- `GET /*` - Serves the Vue SPA (all other routes)

## WebSocket Events

Connect to `ws://localhost:3000/ws` for real-time updates:

- `{ type: 'init', data: [...] }` - Initial state on connection
- `{ type: 'request', data: RequestRecord }` - New request intercepted
- `{ type: 'response', data: RequestRecord }` - Response received
- `{ type: 'error', data: { message: string } }` - Error occurred
- `{ type: 'clear', data: {} }` - History cleared

## Configuration

Create a `proxy-config.json` file:

```json
{
  "proxyPort": 8080,
  "uiPort": 3000,
  "sslCaDir": "./certs",
  "maxRequests": 1000,
  "enableModification": true,
  "headless": false
}
```

Then start with: `http-mitm-proxy-ui --config ./proxy-config.json`

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Start in development mode (watches for changes)
npm run dev

# Run tests
npm test
```

## Use Cases

### Debugging API Calls
1. Start the proxy: `http-mitm-proxy-ui`
2. Configure your application to use `localhost:8080` as HTTP/HTTPS proxy
3. Visit `http://localhost:3000` to see live traffic
4. Use filtering to isolate specific endpoints
5. Modify requests/responses to test edge cases

### Mobile App Testing
1. Start the proxy on your development machine
2. Configure your mobile device to use your machine's IP:8080 as proxy
3. Install the CA certificate on your device (download from `http://YOUR_IP:3000/api/ca-cert`)
4. Test mobile app network calls with full visibility

### Security Testing
1. Intercept and modify requests in real-time
2. Test injection attacks by modifying request bodies
3. Test authentication bypass by modifying headers
4. Export suspicious traffic as HAR for team analysis

## License

ISC

## Author

Dung Tran (dungviettran89)
