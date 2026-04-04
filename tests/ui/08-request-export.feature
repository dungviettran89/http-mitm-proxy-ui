Feature: Request Data Export in HTTP MITM Proxy UI
  As a user
  I want to export request data
  So that I can save, share, or analyze traffic outside the UI

  Background:
    Given the HTTP MITM Proxy is running on port 19090
    And the UI is accessible at http://localhost:14096
    And I have cleared any existing request history
    And I have made the following requests through the proxy:
      | Method | URL                                      |
      | GET    | https://httpbin.org/get?export=test1     |
      | POST   | https://httpbin.org/post                 |
      | GET    | https://httpbin.org/headers              |

  Scenario: Export all requests as JSON
    When I click the "Export" button and select "JSON" format
    Then I should be prompted to save a file
    And the saved file should contain all 3 requests in JSON format
    And each request should have method, URL, headers, body, timing, etc.
    And the JSON should be valid and parseable

  Scenario: Export filtered requests as JSON
    When I apply a method filter to show only GET requests
    And I click the "Export" button and select "JSON" format
    Then I should be prompted to save a file
    And the saved file should contain exactly 2 requests (both GET)
    And the saved file should not contain the POST request

  Scenario: Export requests as CSV
    When I click the "Export" button and select "CSV" format
    Then I should be prompted to save a file
    And the saved file should contain all requests in CSV format
    And the first row should be headers (Method, URL, Status, Timestamp, etc.)
    And each subsequent row should represent one request
    And the CSV should be properly formatted with quotes and commas

  Scenario: Export request details
    When I have viewed the details of a specific request
    And I click the "Export" button while viewing details
    And I select to export only the current request
    Then I should be prompted to save a file
    And the saved file should contain only the data for that one request
    And the file should include all available details (request, response, timing, etc.)

  Scenario: Export includes request and response bodies
    When I make a POST request with body {"export": "test"}
    And I export the requests as JSON
    Then the exported data should show the request body
    And the exported data should show the response body
    And bodies should be properly formatted (JSON, form data, text, etc.)

  Scenario: Export handles binary data safely
    When I make a request that returns binary data (e.g., image)
    And I export the requests
    Then the exported data should represent binary data appropriately
    And the export should not corrupt or lose data
    And binary data should be encoded (e.g., base64) if necessary for the format

  Scenario: Export respects current filters and search
    When I have entered "test1" in the search box
    And I have applied a method filter for GET requests
    And I click the "Export" button
    Then the exported data should contain only requests matching both criteria
    And the exported data should contain exactly 1 request (the GET with test1)

  Scenario: Export shows export progress for large datasets
    Given I have 1000+ requests in the history
    When I click the "Export" button
    Then I should see an export progress indicator
    And I should be able to cancel the export if needed
    And the export should complete successfully