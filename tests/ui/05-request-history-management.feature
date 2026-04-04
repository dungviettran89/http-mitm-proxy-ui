Feature: Request History Management in HTTP MITM Proxy UI
  As a user
  I want to manage the request history
  So that I can control what data is stored and displayed

  Background:
    Given the HTTP MITM Proxy is running on port 19090
    And the UI is accessible at http://localhost:14096

  Scenario: Clear request history
    When I have made several requests through the proxy
    And I click the "Clear History" button
    Then I should see 0 requests in the table
    And I should see an indication that no requests are captured
    And the request counter should show 0

  Scenario: Automatically clear old requests when limit reached
    Given the proxy is configured to keep only 100 requests
    When I make 150 requests through the proxy
    Then I should see exactly 100 requests in the table (the most recent)
    And the oldest 50 requests should not be accessible

  Scenario: Request counter updates correctly
    When I make a GET request through the proxy
    Then the request counter should increase by 1
    When I make a POST request through the proxy
    Then the request counter should increase by 1
    When I clear the request history
    Then the request counter should reset to 0

  Scenario: History persists across UI refreshes
    When I make a request through the proxy to "https://httpbin.org/get"
    And I refresh the UI page
    Then I should still see the request in the table
    And the request details should be unchanged

  Scenario: History survives proxy restart (if persistence enabled)
    Given the proxy is configured with persistent storage
    When I make a request through the proxy
    And I restart the proxy server
    And I reconnect the UI to the proxy
    Then I should see the request from before the restart
    And I should be able to view its details

  Scenario: Max requests setting is respected
    Given I have set the maximum requests to 10
    When I make 15 requests through the proxy
    Then I should see exactly 10 requests in the table
    And I should see an indication that older requests were dropped