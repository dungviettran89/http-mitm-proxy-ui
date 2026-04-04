Feature: Request Filtering in HTTP MITM Proxy UI
  As a user
  I want to filter requests by HTTP method
  So that I can focus on specific types of traffic

  Background:
    Given the HTTP MITM Proxy is running on port 19090
    And the UI is accessible at http://localhost:14096
    And I have cleared any existing request history
    And I have made the following requests through the proxy:
      | Method | URL                                      |
      | GET    | https://httpbin.org/get?test=filter-get  |
      | POST   | https://httpbin.org/post                 |
      | PUT    | https://httpbin.org/put                  |
      | DELETE | https://httpbin.org/delete               |
      | PATCH  | https://httpbin.org/patch                |

  Scenario: Filter requests by GET method
    When I apply the method filter to show only "GET" requests
    Then I should see exactly 2 requests in the table (GET and GET)
    And I should not see any POST, PUT, DELETE, or PATCH requests
    And each visible request should display the method "GET"

  Scenario: Filter requests by POST method
    When I apply the method filter to show only "POST" requests
    Then I should see exactly 1 request in the table
    And that request should display the method "POST"
    And I should not see any GET, PUT, DELETE, or PATCH requests

  Scenario: Filter requests by PUT method
    When I apply the method filter to show only "PUT" requests
    Then I should see exactly 1 request in the table
    And that request should display the method "PUT"

  Scenario: Clear method filter
    When I have applied a method filter (e.g., showing only GET requests)
    And I clear the method filter
    Then I should see all 5 requests in the table
    And I should see requests with methods GET, POST, PUT, DELETE, and PATCH

  Scenario: Filter with no matching requests
    When I apply the method filter to show only "HEAD" requests
    Then I should see 0 requests in the table
    And I should see an indication that no requests match the filter

  Scenario: Filter persists across new requests
    When I have applied the method filter to show only "POST" requests
    And I make a new GET request to "https://httpbin.org/get"
    Then I should still see only the 1 POST request in the table
    And the new GET request should not appear until I clear or change the filter