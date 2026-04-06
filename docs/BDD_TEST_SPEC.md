# HTTP MITM Proxy UI - BDD Test Specification

## Feature: Proxy Traffic Visualization

### Scenario: Making HTTP requests through proxy should populate UI
Given the HTTP MITM Proxy UI is running and accessible
When I make an HTTP GET request through the proxy to a test endpoint
Then I should see the request appear in the requests table within 5 seconds
And the request row should display the HTTP method (GET)
And the request row should display the target domain
And the request row should display an HTTP status code

### Scenario: Viewing request details
Given the HTTP MITM Proxy UI is running and accessible
And I have made at least one HTTP request through the proxy
When I click on a request row in the table
Then a detailed view of that request should be displayed
And the detail view should show the HTTP method used
And the detail view should show request headers
And the detail view should show request body (if present)
And the detail view should show response status code
And the detail view should show response headers
And the detail view should show response body (if present)

### Scenario: Filtering requests by method
Given the HTTP MITM Proxy UI is running and accessible
And I have made both GET and POST requests through the proxy
When I use the method filter to show only GET requests
Then only GET requests should be visible in the table
When I use the method filter to show only POST requests  
Then only POST requests should be visible in the table
When I clear the method filter
Then all requests should be visible in the table

### Scenario: Searching requests
Given the HTTP MITM Proxy UI is running and accessible
And I have made requests containing unique search terms
When I enter a search term in the search box
Then only requests containing that term should be visible
When I clear the search box
Then all requests should be visible

## Feature: Proxy Server Management

### Scenario: Starting proxy server
Given I am in the project directory
When I start the HTTP MITM Proxy with default settings
Then the proxy server should start listening on the configured proxy port
And the UI server should start listening on the configured UI port
And I should be able to access the UI at the configured URL
And the system should log startup completion messages

### Scenario: Stopping proxy server
Given the HTTP MITM Proxy is running
When I send a termination signal to the proxy process
Then the proxy server should stop accepting new connections
And existing connections should be allowed to complete or be terminated gracefully
And the UI server should stop
And the process should exit cleanly