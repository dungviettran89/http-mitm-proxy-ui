# http-mitm-proxy-ui Test Plan

## Overview
This document outlines the test scenarios and cases for verifying the functionality of http-mitm-proxy-ui.

## Test Environment
- Node.js >= 18
- Operating System: Cross-platform (tested on macOS, Linux, Windows)
- Browser: Latest Chrome, Firefox, Safari, Edge

## Test Categories

### 1. Installation & Setup Tests
**Objective**: Verify proper installation and initial configuration

#### Test Case 1.1: Package Installation
- Preconditions: Clean npm environment
- Steps:
  1. `npm pack http-mitm-proxy-ui`
  2. Create new test directory
  3. `npm install ./http-mitm-proxy-ui-X.Y.Z.tgz`
- Expected Result: Package installs without errors, binaries available

#### Test Case 1.2: Binary Availability
- Preconditions: Package installed globally or via npx
- Steps:
  1. Run `http-mitm-proxy-ui --help`
- Expected Result: Help text displays correctly with all options

### 2. Core Functionality Tests

#### Test Case 2.1: Proxy Startup
- Preconditions: Ports 8080 and 3000 available
- Steps:
  1. Run `http-mitm-proxy-ui`
  2. Wait for startup messages
- Expected Result:
  - "Starting http-mitm-proxy-ui..." message appears
  - Proxy listening on port 8080
  - UI Server listening on port 3000
  - Process remains running until interrupted

#### Test Case 2.2: Health Check Endpoint
- Preconditions: UI server running
- Steps:
  1. Send GET request to `http://localhost:3000/api/health`
- Expected Result:
  - HTTP 200 OK
  - Response body: `{"status":"ok","uptime":<number>}`

#### Test Case 2.3: Basic Traffic Interception
- Preconditions: Proxy running, test HTTP server available
- Steps:
  1. Configure client to use localhost:8080 as proxy
  2. Make HTTP request to `http://httpbin.org/get`
  3. Check UI for captured request
- Expected Result:
  - Request appears in UI with method GET, URL, headers
  - Response appears with status 200
  - Request and response bodies visible

### 3. UI Functionality Tests

#### Test Case 3.1: UI Loads Correctly
- Preconditions: UI server running
- Steps:
  1. Navigate to `http://localhost:3000`
- Expected Result:
  - Page loads without errors
  - Material Design styling applied (red/black theme)
  - Main layout visible (header, main content area)

#### Test Case 3.2: Request Listing
- Preconditions: Some requests have been intercepted
- Steps:
  1. Navigate to requests list view
- Expected Result:
  - Table shows intercepted requests
  - Columns: Method, URL, Status, Time, Size
  - Data updates in real-time via WebSocket

#### Test Case 3.3: Request Details View
- Preconditions: At least one request intercepted
- Steps:
  1. Click on a request in the list
- Expected Result:
  - Detailed view shows:
    - Request: Method, URL, Headers, Body
    - Response: Status Code, Headers, Body
    - Timing information
  - Syntax highlighting applied to JSON/XML bodies

#### Test Case 3.4: Filtering Functionality
- Preconditions: Multiple requests with varied attributes
- Steps:
  1. Enter filter criteria (e.g., method: POST, domain: example.com)
  2. Apply filter
- Expected Result:
  - Only matching requests displayed
  - Filter persists until cleared
  - Multiple filter types work together (AND logic)

#### Test Case 3.5: Search Functionality
- Preconditions: Requests with searchable content
- Steps:
  1. Enter search term in search box
  2. Execute search
- Expected Result:
  - Only requests containing the term in URL, headers, or body are shown
  - Case-insensitive search
  - Real-time filtering as user types

#### Test Case 3.6: WebSocket Real-time Updates
- Preconditions: UI loaded, WebSocket connected
- Steps:
  1. Make a new request through the proxy
- Expected Result:
  - New request appears in UI immediately without page refresh
  - Response appears when received
  - Update happens within 100ms of request completion

### 4. Advanced Features Tests

#### Test Case 4.1: Traffic Modification
- Preconditions: Modification features enabled
- Steps:
  1. Set breakpoint for specific URL pattern
  2. Make request matching pattern
  3. Observe request pause in UI
  4. Modify request headers/body
  5. Allow modified request to proceed
- Expected Result:
  - Request pauses at breakpoint
  - UI allows editing of request details
  - Modified request is sent to target server
  - Original request is not sent

#### Test Case 4.2: Export Functionality
- Preconditions: Requests in history
- Steps:
  1. Click export button
  2. Select format (HAR/JSON/CSV)
  3. Save file
- Expected Result:
  - File downloads successfully
  - File contains all request/response data in selected format
  - HAR file follows HAR 1.2 specification
  - JSON/CSV formats are properly structured

#### Test Case 4.3: HTTPS Interception
- Preconditions: Proxy running with SSL CA dir configured
- Steps:
  1. Make HTTPS request to `https://httpbin.org/get`
  2. Check if request was intercepted
  3. Download and install CA certificate
  4. Repeat HTTPS request
- Expected Result:
  - First attempt shows certificate error (expected without CA installed)
  - After CA installation, request succeeds and is intercepted
  - Full request/response details visible in UI

#### Test Case 4.4: Headless Mode
- Preconditions: Want proxy-only functionality
- Steps:
  1. Run `http-mitm-proxy-ui --headless`
  2. Verify no UI server starts
  3. Make request through proxy
- Expected Result:
  - Only "MITM Proxy listening on port 8080" message appears
  - No UI server messages
  - Proxy still intercepts and logs requests
  - No web interface available

### 5. Performance Tests

#### Test Case 5.1: Memory Usage
- Preconditions: Proxy running
- Steps:
  1. Generate 1000 requests through proxy
  2. Monitor memory usage
- Expected Result:
  - Memory usage stays below 200MB
  - No memory leaks observed

#### Test Case 5.2: Latency Overhead
- Preconditions: Baseline direct connection measured
- Steps:
  1. Measure request latency through proxy
  2. Compare to direct connection
- Expected Result:
  - Additional latency < 10ms per request
  - Throughput degradation < 5%

### 6. Security Tests

#### Test Case 6.1: Localhost Binding
- Preconditions: UI server running
- Steps:
  1. Attempt to connect to UI from remote machine
- Expected Result:
  - Connection refused or blocked
  - UI only accessible from localhost
  - No CORS headers allowing remote origins

#### Test Case 6.2: Error Handling
- Preconditions: Various error conditions
- Steps:
  1. Try to start proxy on already-in-use port
  2. Try to start with invalid port numbers
  3. Try to start with non-existent SSL CA directory (when creating new)
- Expected Result:
  - Clear error messages displayed
  - Process exits with non-zero code
  - No crash or undefined behavior

## Test Data

### Sample Requests for Testing
```
GET https://httpbin.org/get
POST https://httpbin.org/post (with JSON body)
GET https://httpbin.org/status/418
GET https://httpbin.org/headers
GET https://httpbin.org/bytes/1024
```

### Test Configuration Samples
```json
{
  "proxyPort": 8080,
  "uiPort": 3000,
  "sslCaDir": "../../docs/test-ca",
  "maxRequests": 100,
  "enableModification": true,
  "headless": false
}
```

## Pass/Fail Criteria
- A test passes if all expected results are observed
- A test fails if any expected result is missing or incorrect behavior occurs
- Blocking issues: Core functionality failures (proxy startup, basic interception)
- Minor issues: UI glitches, performance deviations within acceptable ranges

## Test Execution Order
1. Installation & Setup Tests
2. Core Functionality Tests (must pass before UI tests)
3. UI Functionality Tests
4. Advanced Features Tests
5. Performance Tests
6. Security Tests

## Automation Notes
- Consider using tools like Playwright or Cypress for end-to-end UI testing
- Use Jest or Mocha for unit testing backend services
- Use automation scripts to start/stop proxy and generate test traffic
- Monitor system resources during performance tests

