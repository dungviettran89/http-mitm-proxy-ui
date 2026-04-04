Feature: Error Handling in HTTP MITM Proxy UI
  As a user
  I want the UI to handle errors gracefully
  So that I can understand and recover from issues

  Background:
    Given the HTTP MITM Proxy UI is accessible at http://localhost:14096

  Scenario: Handle proxy not running
    Given the proxy server is not running
    When I navigate to the UI
    Then I should see an error message indicating the proxy is not available
    And I should see options to start the proxy or check the configuration
    And I should not see request data (or see an appropriate empty state)
    And I should be able to attempt to reconnect

  Scenario: Handle invalid proxy configuration
    Given the proxy fails to start due to invalid configuration (e.g., port in use)
    When I navigate to the UI
    Then I should see an error message explaining the configuration issue
    And I should see details about what went wrong (e.g., "Port 19090 is already in use")
    And I should see options to fix the configuration
    And I should not see request data until the issue is resolved

  Scenario: Handle malformed requests
    When I make a request through the proxy that is malformed
    Then the UI should still display the request in the table
    And the request details should show that it was malformed
    And the UI should not crash or become unresponsive
    And I should be able to continue making other requests

  Scenario: Handle oversized requests/responses
    When I make a request through the proxy that exceeds size limits
    Then the UI should handle it gracefully
    And I should see an indication that the request/response was truncated
    And I should see the available data
    And the UI should not crash or become unresponsive

  Scenario: Handle network errors
    When I make a request through the proxy to an unreachable host
    Then the UI should display the request in the table
    And the request details should show the network error (e.g., "Failed to connect")
    And the request should show an appropriate error status or timeout
    And I should be able to continue making other requests

  Scenario: Handle SSL certificate errors
    When I make an HTTPS request through the proxy to a site with invalid SSL
    Then the UI should display the request in the table
    And the request details should show the SSL certificate issue
    And I should see information about what was wrong with the certificate
    And I should be able to proceed if I choose to ignore the error (if security settings allow)

  Scenario: Handle UI JavaScript errors gracefully
    Given an unexpected error occurs in the UI JavaScript
    Then the UI should display an error message or fallback interface
    And the core functionality (request display) should remain usable if possible
    And I should see an option to report the error or refresh the page

  Scenario: Show validation errors for input fields
    When I enter an invalid value in a configuration field (e.g., letters in port field)
    Then I should see a validation error message
    And the input should be highlighted as invalid
    And I should not be able to save the configuration until it's valid
    When I correct the input
    Then the validation error should disappear
    And I should be able to save the configuration