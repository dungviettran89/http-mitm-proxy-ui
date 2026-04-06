# Test Client for http-mitm-proxy-ui

This directory contains a simple Node.js client that demonstrates how to use the http-mitm-proxy-ui package to intercept and inspect HTTP/HTTPS traffic.

## Overview

The test client makes various types of requests to [Postman Echo](https://www.postman.com/postman/workspace/postman-echo/overview) service through the proxy, allowing you to test all features of http-mitm-proxy-ui:

- Request logging and inspection
- Real-time UI updates
- Request/response modification capabilities
- Filtering and search functionality
- Export capabilities
- HTTPS interception
- Traffic analysis

## Prerequisites

- Node.js >= 18 installed
- http-mitm-proxy-ui built and available (run `npm run build` in the root directory)
- Postman Echo service accessible (https://postman-echo.com)

## Setup

1. First, build the proxy UI package:
   ```bash
   cd /path/to/http-mitm-proxy-ui
   npm run build
   ```

2. Install test client dependencies:
   ```bash
   cd ../test-clients
   npm install
   ```

## Test Cases

The following test cases cover all major functions of http-mitm-proxy-ui. Run the proxy first, then execute these test clients.

### Test Case 1: Basic GET Request Logging
**Objective**: Verify basic request/response logging and UI display

**Steps**:
1. Start the proxy: `http-mitm-proxy-ui`
2. Run the GET test client: `node get-request.js`
3. Observe the UI at http://localhost:3000

**Expected Results**:
- Request appears in UI with:
  - Method: GET
  - URL: https://postman-echo.com/get
  - Status Code: 200
  - Request Headers: Includes User-Agent, Host, etc.
  - Response Headers: Includes content-type, etc.
  - Request Body: (empty for GET)
  - Response Body: JSON containing args, headers, url, etc.
- Real-time update in UI without page refresh
- Request appears immediately in the requests list

### Test Case 2: POST Request with JSON Body
**Objective**: Verify POST request logging with body inspection

**Steps**:
1. Ensure proxy is running (from Test Case 1)
2. Run the POST test client: `node post-request.js`
3. Observe the UI

**Expected Results**:
- Request appears with:
  - Method: POST
  - URL: https://postman-echo.com/post
  - Status Code: 200
  - Request Headers: content-type: application/json
  - Request Body: {"test": "data", "timestamp": "<current timestamp>"}
  - Response Body: Echoes back the sent data plus additional fields
- JSON syntax highlighting in both request and response bodies
- Ability to expand/collapse JSON objects in UI

### Test Case 3: Request with Custom Headers
**Objective**: Verify header inspection and modification capabilities

**Steps**:
1. Ensure proxy is running
2. Run the headers test client: `node headers-request.js`
3. Observe the UI

**Expected Results**:
- Request shows custom headers:
  - X-Test-Header: test-value
  - X-Client-Version: 1.0.0
  - User-Agent: http-mitm-proxy-ui-test-client/1.0
- Ability to search for requests containing "X-Test-Header"
- Header names and values displayed clearly in UI
- Response shows echoed headers from Postman Echo

### Test Case 4: Query Parameters and URL Inspection
**Objective**: Verify URL and query parameter handling

**Steps**:
1. Ensure proxy is running
2. Run the query params test client: `node query-params.js`
3. Observe the UI

**Expected Results**:
- URL shows: https://postman-echo.com/get?foo=bar&baz=qux&number=42
- Query parameters parsed and visible in UI
- Ability to filter by URL containing specific parameters
- URL decoding handled properly in display
- Fragment identifiers (if any) properly handled

### Test Case 5: Large Response Handling
**Objective**: Verify handling of larger JSON responses

**Steps**:
1. Ensure proxy is running
2. Run the large response test client: `node large-response.js`
3. Observe the UI

**Expected Results**:
- Response contains larger JSON body (simulated large data)
- UI shows syntax highlighting for large JSON
- Performance remains smooth (no freezing)
- Ability to collapse/expand JSON trees
- If response exceeds display limits, appropriate truncation indicator shown
- Full response available for export

### Test Case 6: Error Status Codes
**Objective**: Verify handling of non-200 status codes

**Steps**:
1. Ensure proxy is running
2. Run the error test client: `node error-request.js`
3. Observe the UI

**Expected Results**:
- Request shows status code: 404
- Status code displayed appropriately (likely in red or error styling)
- Response body contains error information from Postman Echo
- Ability to filter by status code (e.g., status:4xx or status:404)
- Error responses visually distinguished from successful ones

### Test Case 7: Concurrent Requests
**Objective**: Verify handling of multiple simultaneous requests

**Steps**:
1. Ensure proxy is running
2. Run the concurrent test client: `node concurrent-requests.js`
3. Observe the UI

**Expected Results**:
- Multiple requests (5+) appear in rapid succession
- Each request tracked separately with unique ID
- UI updates handle multiple concurrent WebSocket messages
- No request mixing or data corruption
- Summary statistics (if implemented) show correct counts
- Ability to select and inspect each request individually

### Test Case 8: Request/Response Modification (Breakpoints)
**Objective**: Verify traffic modification capabilities

**Steps**:
1. Ensure proxy is running with modification enabled (default)
2. Access UI at http://localhost:3000
3. Set a breakpoint for requests to postman-echo.com/* (if UI supports UI-based breakpoint setting)
   OR run the modification test client which will attempt to modify requests programmatically
4. Run the modification test client: `node modification-request.js`
5. Observe behavior in UI

**Expected Results** (if breakpoint UI available):
- Request appears in UI with "paused" or "breakpoint" indicator
- UI allows editing of request method, headers, or body
- After modification and "resume", modified request is sent
- UI shows both original and modified versions (if implemented)
- Final response reflects the modified request

**Expected Results** (programmatic modification test):
- Test client sends request with specific header
- Proxy modifies the request (adds/removes header) before forwarding
- UI shows original request from client
- UI shows modified request sent to target
- Response reflects the modification

### Test Case 9: Export Functionality
**Objective**: Verify data export capabilities

**Steps**:
1. Ensure proxy has processed several requests (run a few test clients)
2. In UI, click export button
3. Try exporting as JSON, CSV, and HAR formats
4. Save each file and inspect contents

**Expected Results**:
- All export options available and functional
- JSON export: Valid JSON containing all request/response data
- CSV export: Properly formatted CSV with request attributes as columns
- HAR export: Valid HAR 1.2 format readable by tools like Chrome DevTools
- Files contain correct data matching what's visible in UI
- Timestamps, sizes, and other metadata preserved

### Test Case 10: Configuration Persistence
**Objective**: Verify configuration options work correctly

**Steps**:
1. Stop any running proxy instances
2. Start proxy with custom configuration:
   ```
   http-mitm-proxy-ui --proxy-port 9090 --ui-port 4000 --max-requests 50 --no-modification
   ```
3. Verify it starts on the specified ports
4. Make a test request
5. Try to set a breakpoint (should be disabled due to --no-modification)
6. Generate more than 50 requests and verify oldest are removed

**Expected Results**:
- Proxy starts on port 9090, UI on 4000
- Modification features unavailable/grayed out in UI
- History limited to 50 most recent requests
- Older requests automatically removed when limit exceeded
- Configuration visible in UI or via /api/config endpoint

### Test Case 11: Headless Mode Verification
**Objective**: Verify proxy-only mode works correctly

**Steps**:
1. Stop any running proxy instances
2. Start proxy in headless mode: `http-mitm-proxy-ui --headless`
3. Verify only proxy starts (no UI server)
4. Make a test request through the proxy
5. Check that no web interface is available

**Expected Results**:
- Only "MITM Proxy listening on port XXXX" message appears
- No UI server startup messages
- Proxy successfully intercepts and logs the request
- Attempting to access http://localhost:[port] shows connection refused or error
- Request data accessible only via programmatic API (if implemented) or logs

### Test Case 12: SSL Certificate Generation and Trust
**Objective**: Verify HTTPS interception and certificate handling

**Steps**:
1. Stop any running proxy instances
2. Start proxy with custom SSL directory:
   ```
   http-mitm-proxy-ui --ssl-ca-dir ../docs/test-ca
   ```
3. Access http://localhost:3000/api/ca-cert to download certificate
4. Install certificate in system/trust store (follow OS-specific instructions)
5. Make HTTPS request to postman-echo.com
6. Verify request is intercepted and visible in UI

**Expected Results**:
- CA certificate generated in ../docs/test-ca directory
- Certificate download works via API endpoint
- After certificate trust installed, HTTPS requests succeed
- Full request/response details visible in UI for HTTPS traffic
- Certificate details visible in UI or API

## Running the Test Clients

Each test client is a standalone Node.js script. To run them:

```bash
# From the docs/test-clients directory
node get-request.js
node post-request.js
node headers-request.js
# etc.
```

Or run them all in sequence:
```bash
for script in *.js; do
  echo "Running $script..."
  node "$script"
  echo "Waiting 2 seconds..."
  sleep 2
done
```

## Expected Proxy Behavior

While running tests, you should observe in the proxy terminal:
- Startup messages showing proxy and UI ports
- Request/response logging (if enabled in proxy)
- No errors during normal operation
- Graceful shutdown when interrupted (Ctrl+C)

## Troubleshooting

If you encounter issues:
1. Verify proxy is running: `ps aux | grep http-mitm-proxy-ui`
2. Check ports are available: `lsof -i :8080` and `lsof -i :3000`
3. Ensure POSTMAN ECHO service is accessible: `curl https://postman-echo.com/get`
4. Check firewall/proxy settings if requests fail
5. Verify Node.js version: `node --version` (should be >=18)
6. Check console output of both proxy and client for error messages

## Cleaning Up

After testing:
1. Stop the proxy with Ctrl+C
2. Remove test CA directory if created: `rm -rf ../docs/test-ca`
3. Remove any exported test files
4. The proxy leaves no persistent state by default (history is in-memory only unless configured otherwise)

