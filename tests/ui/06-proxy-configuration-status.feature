Feature: Proxy Configuration and Status in HTTP MITM Proxy UI
  As a user
  I want to see and configure proxy settings
  So that I can ensure the proxy is working correctly

  Background:
    Given the HTTP MITM Proxy UI is accessible at http://localhost:14096

  Scenario: View proxy status when running
    When the proxy is running on port 19090
    And I navigate to the UI
    Then I should see an indication that the proxy is "Running" or "Active"
    And I should see the proxy port (19090) displayed
    And I should see the UI port (14096) displayed
    And I should see the SSL CA directory path if configured

  Scenario: View proxy status when stopped
    Given the proxy is not running
    When I navigate to the UI
    Then I should see an indication that the proxy is "Stopped" or "Not Running"
    And I should see an option to start the proxy
    And I should not see request data (or see empty state)

  Scenario: Configure proxy ports via UI (if supported)
    When I navigate to the proxy settings/configuration page
    And I change the proxy port to 9090
    And I change the UI port to 3000
    And I save the configuration
    Then the proxy should restart on the new ports
    And I should be able to access the UI at http://localhost:3000
    And I should be able to make requests through localhost:9090

  Scenario: View SSL certificate information
    When the proxy is running with SSL interception enabled
    And I have made an HTTPS request through the proxy
    And I view the details of that HTTPS request
    Then I should see information about the SSL certificate used
    And I should see that the certificate is issued by the proxy's CA
    And I should see certificate validity dates
    And I should see the certificate subject (matching the target domain)

  Scenario: Show SSL CA certificate for trust installation
    When I navigate to the SSL certificate section
    Then I should see the proxy's CA certificate information
    And I should see instructions for installing the CA certificate
    And I should see the certificate fingerprint or serial number
    And I should see an option to download the CA certificate

  Scenario: Validate port configuration input
    When I attempt to set the proxy port to 80 (requiring sudo)
    Then I should see an appropriate error message if not running with sufficient privileges
    When I attempt to set the proxy port to 99999 (invalid port)
    Then I should see a validation error
    When I attempt to set the proxy port to 8080 (valid port)
    Then the input should be accepted
    When I attempt to set the proxy port to a value already in use
    Then I should see an error indicating the port is unavailable

  Scenario: Show connection statistics
    When the proxy has been running for some time
    Then I should see statistics about total connections handled
    And I should see statistics about active connections
    And I should see statistics about connection errors (if any)