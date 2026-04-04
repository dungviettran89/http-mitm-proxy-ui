Feature: Request Searching in HTTP MITM Proxy UI
  As a user
  I want to search requests by content
  So that I can find specific requests quickly

  Background:
    Given the HTTP MITM Proxy is running on port 19090
    And the UI is accessible at http://localhost:14096
    And I have cleared any existing request history
    And I have made the following requests through the proxy:
      | Method | URL                                      | Body/Params                     |
      | GET    | https://httpbin.org/get?user=alice&role=admin |                                 |
      | GET    | https://httpbin.org/get?user=bob&role=user    |                                 |
      | POST   | https://httpbin.org/post                   | {"username": "alice", "action": "login"} |
      | POST   | https://httpbin.org/post                   | {"username": "bob", "action": "logout"}  |
      | GET    | https://httpbin.org/headers                |                                 |

  Scenario: Search requests by URL parameter
    When I enter "user=alice" in the search box
    Then I should see exactly 2 requests in the table
    And both requests should contain "user=alice" in their URL
    And I should not see requests with "user=bob"

  Scenario: Search requests by username in JSON body
    When I enter "\"username\": \"bob\"" in the search box
    Then I should see exactly 2 requests in the table
    And both requests should contain bob in their request body
    And I should not see requests containing alice in the body

  Scenario: Search requests by action value
    When I enter "login" in the search box
    Then I should see exactly 1 request in the table
    And that request should have action: login in its body
    And I should not see requests with action: logout

  Scenario: Search requests by header-like term
    When I enter "Host:" in the search box
    Then I should see all 5 requests in the table
    And each request should contain Host: in its request headers

  Scenario: Clear search resets view
    When I have entered "alice" in the search box and see filtered results
    And I clear the search box
    Then I should see all 5 requests in the table

  Scenario: Search with no matches
    When I enter "nonexistent123" in the search box
    Then I should see 0 requests in the table
    And I should see an indication that no requests match the search

  Scenario: Search is case insensitive
    When I enter "ALICE" in the search box
    Then I should see the same results as searching for "alice"
    And I should see requests containing alice in URL or body