Feature: Request Sorting in HTTP MITM Proxy UI
  As a user
  I want to sort requests by different columns
  So that I can organize and analyze traffic efficiently

  Background:
    Given the HTTP MITM Proxy is running on port 19090
    And the UI is accessible at http://localhost:14096
    And I have cleared any existing request history
    And I have made the following requests through the proxy:
      | Method | URL                                      | Timestamp          |
      | GET    | https://httpbin.org/get?sort=timestamp1  | 10:00:00.001       |
      | POST   | https://httpbin.org/post                 | 10:00:00.002       |
      | GET    | https://httpbin.org/get?sort=timestamp3  | 10:00:00.003       |

  Scenario: Sort requests by timestamp (ascending)
    When I click on the "Timestamp" column header
    Then the requests should be ordered from oldest to newest
    And the first request should have timestamp 10:00:00.001
    And the last request should have timestamp 10:00:00.003

  Scenario: Sort requests by timestamp (descending)
    When I click on the "Timestamp" column header twice
    Then the requests should be ordered from newest to oldest
    And the first request should have timestamp 10:00:00.003
    And the last request should have timestamp 10:00:00.001

  Scenario: Sort requests by method (alphabetical)
    When I click on the "Method" column header
    Then the requests should be ordered alphabetically by method
    And the first request should be GET (alphabetically first)
    And the last request should be POST (alphabetically last among GET/POST)

  Scenario: Sort requests by URL (alphabetical)
    When I click on the "URL" column header
    Then the requests should be ordered alphabetically by URL
    And URLs containing "get?sort=timestamp1" should come first
    And URLs containing "get?sort=timestamp3" should come last
    And the POST request should be in the middle

  Scenario: Sort requests by status code
    When I make requests that return different status codes
    And I click on the "Status" column header
    Then the requests should be ordered by status code
    And error responses (4xx, 5xx) should be separate from success (2xx)
    And redirect responses (3xx) should be in their appropriate position

  Scenario: Sort persists with new requests
    When I have sorted requests by timestamp (newest first)
    And I make a new request through the proxy
    Then the new request should appear in the correct position based on its timestamp
    And the sort order should be maintained for all requests

  Scenario: Sort indicator shows current sort state
    When I have not clicked any column headers
    Then no sort indicator should be visible
    When I click on the "Method" column header once
    Then an ascending sort indicator should appear on the Method column
    When I click on the "Method" column header twice
    Then a descending sort indicator should appear on the Method column
    When I click on another column (e.g., "URL")
    Then the sort indicator should move to the URL column
    And the Method column should no longer show a sort indicator