# Debugging Qwen Code API Traffic with http-mitm-proxy-ui

Intercept, inspect, and analyze every API request Qwen Code sends — including prompts, model parameters, token usage, and raw responses.

---

## 1. Prerequisites

| Requirement | Details |
|---|---|
| **http-mitm-proxy-ui** | Installed globally (`npm install -g http-mitm-proxy-ui`) or available via `npx` |
| **Qwen Code CLI** | Installed (`npm install -g @anthropic-ai/qwen-code` or your installation method) |
| **Node.js** | v18+ (required by both tools) |
| **macOS** | This guide uses macOS for CA certificate installation. Adapt steps for Linux/Windows as needed |

Verify installations:

```bash
npx http-mitm-proxy-ui --help
qwen --version
node --version
```

---

## 2. Start the Proxy

Launch the proxy with default settings:

```bash
npx http-mitm-proxy-ui
```

**Default ports:**

| Service | Port | URL |
|---|---|---|
| MITM Proxy | 8080 | `http://localhost:8080` |
| Web UI | 3000 | `http://localhost:3000` |

Customize if needed:

```bash
npx http-mitm-proxy-ui --proxy-port 9090 --ui-port 4000
```

**Using a custom CA certificate** (e.g., from a corporate PKI):

```bash
npx http-mitm-proxy-ui --ca-cert /path/to/ca.pem --ca-key /path/to/ca.key
```

Both `--ca-cert` and `--ca-key` must be provided together. When omitted, a new CA is auto-generated on first run.

**Verify the proxy is running:**

```bash
# Check proxy port
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080

# Check UI server
curl -s http://localhost:3000/api/health
# Expected: {"status":"ok"} or similar
```

You should see terminal output confirming both the proxy and UI server started. Keep this terminal window open — stopping the process stops the proxy.

---

## 3. Set Up the CA Certificate

Qwen Code communicates over HTTPS. To intercept and decrypt that traffic, you must trust the proxy's CA certificate.

### Download the CA Certificate

```bash
curl http://localhost:3000/api/ca-cert -o ~/.http-mitm-proxy/certs/ca.pem
```

### Add to macOS Keychain

```bash
security add-trusted-cert \
  -d \
  -r trustRoot \
  -k ~/Library/Keychains/login.keychain \
  ~/.http-mitm-proxy/certs/ca.pem
```

This command:
- `-d` — Adds to the user's domain
- `-r trustRoot` — Sets the trust policy to "always trust" as a root certificate
- `-k` — Specifies the login keychain

**Verify the certificate is trusted:**

```bash
security find-certificate -c "http-mitm-proxy" -p ~/Library/Keychains/login.keychain | openssl x509 -noout -text | grep "Trust Policy"
```

**Alternative — Manual method:**

1. Open **Keychain Access** (`/Applications/Utilities/Keychain Access.app`)
2. Drag `~/.http-mitm-proxy/certs/ca.pem` into the **login** keychain
3. Double-click the certificate
4. Expand **Trust** → Set "When using this certificate" to **Always Trust**
5. Close and authenticate with your password

### Linux Alternative

```bash
sudo cp ~/.http-mitm-proxy/certs/ca.pem /usr/local/share/ca-certificates/http-mitm-proxy.crt
sudo update-ca-certificates
```

---

## 4. Configure Qwen Code to Use the Proxy

Qwen Code makes HTTPS API calls (typically to OpenRouter or other providers). Route its traffic through the proxy by setting environment variables.

### Set Proxy Environment Variables

```bash
export HTTP_PROXY=http://localhost:8080
export HTTPS_PROXY=http://localhost:8080
```

For a one-off command (no shell pollution):

```bash
HTTP_PROXY=http://localhost:8080 HTTPS_PROXY=http://localhost:8080 qwen -y -p "What is 2+2"
```

### How It Works

Qwen Code uses the `fetch` API or HTTP clients that respect standard proxy environment variables. When `HTTPS_PROXY` is set, all HTTPS requests (including those to `openrouter.ai/api/v1/`) are routed through `localhost:8080`, where the proxy:

1. Intercepts the connection
2. Generates a forged certificate for the target domain (signed by the proxy's CA)
3. Decrypts the traffic
4. Forwards it to the real destination
5. Returns the response

Because you trusted the CA in Step 3, Qwen Code's HTTP client accepts the forged certificate without error.

### Confirm Traffic Is Flowing

After running a Qwen Code command, check the UI at `http://localhost:3000`. You should see requests appear in real time, including:
- `POST` requests to `openrouter.ai`
- `POST` requests to other API providers you've configured

---

## 5. Inspecting Requests

Open the UI at **http://localhost:3000** to view all captured traffic.

### Filter to Qwen Code API Traffic

Use the **Domain** filter to narrow down to API endpoints:

```
openrouter.ai
```

Or use the **Search** field to find specific patterns:
- `api/v1/chat` — Chat completions
- `api/v1/models` — Model listing
- `api/v1/auth` — Authentication

### Click Into a Request

Click any row to open the **Request Detail Panel**. Explore the following tabs:

#### Request Tab
- **Body** — The full prompt, model selection, temperature, max_tokens, and all generation parameters
- **Content-Type** — Typically `application/json`

#### Response Tab
- **Body** — The complete AI response including `choices`, `usage` (token counts), and metadata
- **Status Code** — `200` for success, `429` for rate limits, `401` for auth failures, `503` for service issues

#### Headers Tab

| Request Headers | Response Headers |
|---|---|
| `Content-Type: application/json` | `Content-Type: application/json` |
| `Authorization: Bearer sk-or-...` | `x-ratelimit-limit-requests: ...` |
| `User-Agent` | `x-ratelimit-remaining-tokens: ...` |
| `Content-Length` | `cf-ray`, `date`, etc. |

> **⚠️ Your API key is visible in the `Authorization` header.** See [Security Warning](#7-security-warning).

#### Timing Tab
- Total latency from request start to response complete
- Request send time, time to first byte, and download time
- Useful for identifying slow model responses or network bottlenecks

---

## 6. What to Look For

### Prompt Engineering Insights

- **Full request body** — See exactly what system prompts, user messages, and tool definitions are being sent
- **Model parameters** — Temperature, top_p, max_tokens, stop sequences — all visible
- **Message structure** — Multi-turn conversation history, role assignments, and context windows

### Token Usage Analysis

In the response body, look for the `usage` object:

```json
{
  "usage": {
    "prompt_tokens": 1234,
    "completion_tokens": 567,
    "total_tokens": 1801
  }
}
```

Track token consumption across requests to:
- Identify unexpectedly large prompts
- Monitor cost per query
- Compare token efficiency between models

### Error Debugging

When things go wrong, the proxy gives you the **raw** response — far more detail than CLI error messages:

| Status | What You'll See |
|---|---|
| **401 Unauthorized** | Full error body explaining the auth failure, which API key prefix was rejected |
| **429 Rate Limited** | Exact rate limit headers showing your limit, remaining quota, and retry-after time |
| **503 Service Unavailable** | Upstream provider error details, which specific provider failed |
| **500 Internal Server Error** | Raw server error payloads for provider-side debugging |

### Model Comparison

Run the same prompt with different models, then compare:
- Response latency (Timing tab)
- Token usage (Response body `usage` field)
- Response content (Response body `choices`)
- Error rates across providers

---

## 7. Security Warning

### ⚠️ API Keys Are Visible in Plain Text

Every request to the API provider includes an `Authorization: Bearer sk-or-...` header. The proxy captures and displays this in full.

**Best practices:**

1. **Never share screenshots** of the Headers tab without redacting the Authorization header
2. **Use temporary API keys** when possible — rotate keys after debugging sessions
3. **Clear history when done** — Click the **Clear** button in the UI to remove all captured data from memory
4. **Do not export traffic** containing API keys unless you intend to and understand the risk
5. **Run locally only** — Do not expose the proxy UI or proxy port to untrusted networks

### Clear History After Debugging

```bash
# Via the UI: Click the "Clear" button in the header
# Or via the REST API:
curl -X DELETE http://localhost:3000/api/requests
```

---

## 8. Example Walkthrough

### Run a Simple Query

In a **new terminal** (keep the proxy running in the original one):

```bash
HTTP_PROXY=http://localhost:8080 HTTPS_PROXY=http://localhost:8080 qwen -y -p "What is 2+2"
```

### What the Request Looks Like

In the UI, you'll see a `POST` request to `openrouter.ai`. Click it to inspect the request body:

```json
{
  "model": "qwen/qwen-2.5-coder-32b-instruct",
  "messages": [
    {
      "role": "user",
      "content": "What is 2+2"
    }
  ],
  "temperature": 1,
  "max_tokens": 4096
}
```

**Headers you'll see:**

```
POST https://openrouter.ai/api/v1/chat/completions
Content-Type: application/json
Authorization: Bearer sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx
Accept: application/json
```

### What the Response Looks Like

The response body will contain:

```json
{
  "id": "gen-xxxxxxxxxxxxxxxxxxxx",
  "model": "qwen/qwen-2.5-coder-32b-instruct",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "2 + 2 equals 4."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 8,
    "total_tokens": 20
  }
}
```

**Response headers:**

```
HTTP/1.1 200 OK
Content-Type: application/json
x-ratelimit-limit-requests: 1000
x-ratelimit-remaining-requests: 999
cf-ray: 8a1b2c3d4e5f6789-SJC
date: Sun, 05 Apr 2026 12:00:00 GMT
```

**Timing:** You might see total latency of 200ms–3000ms depending on model complexity and provider load.

### Analyze the Results

- **Total tokens: 20** — A very cheap request. Useful for testing connectivity
- **200 OK** — Authentication is working, the provider is healthy
- **Latency** — Note the time for future comparison
- **No errors** — The full round-trip succeeded through the proxy

This confirms the entire chain is working:
```
Qwen Code → localhost:8080 (proxy) → openrouter.ai → (response) → Qwen Code
```

---

## Quick Reference

| Action | Command |
|---|---|
| Start proxy | `npx http-mitm-proxy-ui` |
| Set proxy env | `export HTTP_PROXY=http://localhost:8080 && export HTTPS_PROXY=http://localhost:8080` |
| Run Qwen Code | `qwen -y -p "your prompt"` |
| Open UI | `http://localhost:3000` |
| Download CA cert | `curl http://localhost:3000/api/ca-cert -o ~/.http-mitm-proxy/certs/ca.pem` |
| Trust CA (macOS) | `security add-trusted-cert -d -r trustRoot -k ~/Library/Keychains/login.keychain ~/.http-mitm-proxy/certs/ca.pem` |
| Clear history | `curl -X DELETE http://localhost:3000/api/requests` |
| Stop proxy | `Ctrl+C` in the proxy terminal |

---

*Debug what your AI tools are really sending. No black boxes.*
