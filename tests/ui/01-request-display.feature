Feature: Request Display in HTTP MITM Proxy UI
  As a user
  I want to see HTTP/HTTPS requests displayed in a table
  So that I can monitor and inspect network traffic

  Background:
    Given the HTTP MITM Proxy is running on port 19090
    And the UI is accessible at http://localhost:14096
    And I have cleared any existing request history

  Scenario: Display GET request in the requests table
    When I make a GET request through the proxy to "https://httpbin.org/get?test=display-get"
    Then I should see the request appear in the requests table within 5 seconds
    And the request row should display the HTTP method "GET"
    And the request row should display the URL containing "httpbin.org/get"
    And the request row should display an HTTP status code (e.g., 200)
    And the request row should display a timestamp

  Scenario: Display POST request in the requests table
    When I make a POST request through the proxy to "https://httpbin.org/post" with JSON body {"test": "display-post"}
    Then I should see the request appear in the requests table within 5 seconds
    And the request row should display the HTTP method "POST"
    And the request row should display the URL containing "httpbin.org/post"
    And the request row should display an HTTP status code (e.g., 200)
    And the request row should display a timestamp

  Scenario: Display HTTPS request in the requests table
    When I make an HTTPS GET request through the proxy to "https://httpbin.org/headers"
    Then I should see the request appear in the requests table within 5 seconds
    And the request row should indicate HTTPS traffic
    And the request row should display the URL containing "httpbin.org/headers"

  Scenario: Display HTTP request in the requests table
    When I make an HTTP GET request through the proxy to "http://httpbin.org/get"
    Then I should see the request appear in the requests table within 5 seconds
    And the request row should indicate HTTP traffic
    And the request row should display the URL containing "httpbin.org/get"

  Scenario: Handle multiple requests in table
    When I make a GET request to "https://httpbin.org/get?test=multi1"
    And I make a POST request to "https://httpbin.org/post" with body {"test": "multi2"}
    And I make a GET request to "https://httpbin.org/headers?test=multi3"
    Then I should see exactly 3 requests in the requests table
    And I should be able to distinguish each request by its method and URL