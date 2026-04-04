Feature: Request/Response Detail View in HTTP MITM Proxy UI
  As a user
  I want to see detailed information about a request and response
  So that I can inspect the full HTTP exchange

  Background:
    Given the HTTP MITM Proxy is running on port 19090
    And the UI is accessible at http://localhost:14096
    And I have cleared any existing request history
    And I have made a POST request through the proxy to "https://httpbin.org/post" 
      with JSON body {"feature": "detail-view", "timestamp": 12345}

  Scenario: View request details after clicking a request
    When I click on the request row in the table
    Then a detailed view panel should appear
    And the detail view should show the request method as "POST"
    And the detail view should show the request URL as "https://httpbin.org/post"
    And the detail view should show the request headers including Content-Type
    And the detail view should show the request body as JSON
    And the detail view should show the response status code
    And the detail view should show the response headers
    And the detail view should show the response body

  Scenario: View request details for GET request
    When I make a GET request through the proxy to "https://httpbin.org/get?info=get-detail"
    And I click on that request row in the table
    Then the detail view should show the request method as "GET"
    And the detail view should show the request URL containing "info=get-detail"
    And the detail view should show request headers (including User-Agent, Accept, etc.)
    And the detail view should show an empty or minimal request body
    And the detail view should show response status code 200
    And the detail view should show response headers
    And the detail view should show response body containing the query parameters

  Scenario: View request details shows timing information
    When I make a request through the proxy to "https://httpbin.org/delay/1"
    And I click on that request row in the table
    Then the detail view should show request start time
    And the detail view should show request end time
    And the detail view should show request duration (should be ~1000ms)
    And the detail view should show DNS lookup time
    And the detail view should show connection time
    And the detail view should show SSL handshake time (for HTTPS)
    And the detail view should show time to first byte
    And the detail view should show content download time

  Scenario: View request details shows request/response sizes
    When I make a GET request through the proxy to "https://httpbin.org/bytes/1024"
    And I click on that request row in the table
    Then the detail view should show request size (headers + body)
    And the detail view should show response size (headers + 1024 bytes body)
    And the detail view should show encoded sizes if applicable
    And the detail view should show decoded body size

  Scenario: View request details shows cookies
    When I make a request through the proxy to "https://httpbin.org/cookies/set?session_id=abc123&user_token=xyz789"
    And I click on that request row in the table
    Then the detail view should show request headers containing Cookie
    And the detail view should show response headers containing Set-Cookie
    And the detail view should parse and display cookie name-value pairs
    And the detail view should show cookie attributes (path, domain, expires, etc.)

  Scenario: View request details shows encoding information
    When I make a request through the proxy with Accept-Encoding: gzip
    And I click on that request row in the table
    Then the detail view should show request Accept-Encoding header
    And the detail view should show response Content-Encoding header if present
    And the detail view should indicate if content was decoded for display
    And the detail view should show both raw and decoded sizes if different

  Scenario: View request details redirects
    When I make a request through the proxy to "https://httpbin.org/redirect/2"
    And I click on that request row in the table
    Then the detail view should show the initial request URL
    And the detail view should show the final destination URL
    And the detail view should show intermediate redirect URLs (if available)
    And the detail view should show status codes for each redirect (301, 302, etc.)
    And the detail view should show redirect location headers