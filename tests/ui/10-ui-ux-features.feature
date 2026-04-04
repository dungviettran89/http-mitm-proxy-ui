Feature: UI/UX Enhancements in HTTP MITM Proxy UI
  As a user
  I want a polished and user-friendly interface
  So that I can use the proxy efficiently and comfortably

  Background:
    Given the HTTP MITM Proxy is running on port 19090
    And the UI is accessible at http://localhost:14096

  Scenario: Show empty state when no requests
    When I have cleared the request history or before making any requests
    Then I should see an empty state indication
    And the empty state should be helpful and not confusing
    And the empty state should suggest how to start capturing requests
    And the request table should be hidden or disabled appropriately

  Scenario: Show loading states
    When I make a request that takes time to complete
    Then I should see a loading indicator for that request
    And the loading indicator should disappear when the request completes
    And I should be able to interact with other parts of the UI while waiting

  Scenario: Theme toggle (dark/light mode)
    When I toggle the theme to dark mode
    Then the UI should switch to a dark color scheme
    And the text should remain readable
    And UI elements should have appropriate contrast
    When I toggle the theme back to light mode
    Then the UI should switch to a light color scheme
    And the theme preference should be remembered for future sessions

  Scenario: Keyboard shortcuts
    When I press Ctrl+L (or Cmd+L on Mac)
    Then the search box should receive focus
    When I press Ctrl+K (or Cmd+K on Mac)
    Then I should clear the request history (if confirmed)
    When I press Ctrl+E (or Cmd+E on Mac)
    Then the export dialog should open
    When I press Escape
    Then any open dialog or detail view should close
    When I press F5
    Then the UI should refresh the request data

  Scenario: Responsive design
    When I view the UI on a narrow screen (mobile width)
    Then the layout should adapt to the smaller width
    And the request table should still be usable
    And important controls should remain accessible
    When I view the UI on a wide screen (desktop width)
    Then the layout should use the additional space appropriately
    And I should see additional information or wider columns

  Scenario: Accessibility compliance
    When I navigate the UI using only a keyboard
    Then I should be able to reach all interactive elements
    And I should see a visible focus indicator
    And I should not be trapped in any element
    When I use a screen reader
    Then elements should have appropriate ARIA labels
    And buttons should have clear, descriptive labels
    And table headers should be properly scoped
    And form fields should have associated labels

  Scenario: Tooltips and helper text
    When I hover over an icon or button with a tooltip
    Then I should see a helpful tooltip explaining its function
    And the tooltip should appear after a short delay
    And the tooltip should disappear when I move the cursor away
    When I focus on an element using keyboard navigation
    Then I should see the same tooltip (if applicable)

  Scenario: Confirmation dialogs for destructive actions
    When I attempt to clear the request history
    Then I should see a confirmation dialog asking if I'm sure
    And the dialog should explain what will be deleted
    And I should have options to confirm or cancel
    When I confirm
    Then the history should be cleared
    When I cancel
    Then the history should remain unchanged

  Scenario: Error message styling and clarity
    When an error occurs in the UI
    Then I should see an error message that is clearly visible
    And the error message should use appropriate colors (e.g., red for errors)
    And the error message should explain what went wrong in plain language
    And the error message should suggest how to fix the issue if possible
    And the error message should not contain stack traces or technical jargon (unless in debug mode)