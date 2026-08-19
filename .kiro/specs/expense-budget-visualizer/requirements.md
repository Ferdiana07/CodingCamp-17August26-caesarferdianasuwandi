# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side, single-page web application built with HTML, CSS, and Vanilla JavaScript. It allows users to log personal expenses by entering an item name, amount, and category; view a running total of their spending; visualize spending distribution by category via a Chart.js pie chart; and optionally set a budget cap with a warning banner, toggle dark/light mode, and sort their transaction list. All data is persisted exclusively in the browser's LocalStorage API. The application requires no backend, no JavaScript frameworks, and must function in modern versions of Chrome, Firefox, Edge, and Safari on both desktop and mobile viewports.

---

## Glossary

- **App**: The Expense & Budget Visualizer single-page application.
- **Transaction**: A single expense record containing an item name, a positive numeric amount, a category, and a timestamp.
- **Transaction List**: The scrollable UI section displaying all recorded Transactions.
- **Input Form**: The UI section containing the fields and submit button used to add a new Transaction.
- **Total Balance**: The sum of all Transaction amounts currently stored, displayed prominently at the top of the App.
- **Category**: One of three fixed classification labels for a Transaction — `Food`, `Transport`, or `Fun`.
- **Pie Chart**: A Chart.js-rendered pie chart that visualises the proportion of total spending per Category.
- **Budget Cap**: A single numeric value representing the user-defined overall spending limit for all Categories combined.
- **Warning Banner**: A persistent UI element shown when total spending meets or exceeds a defined threshold relative to the Budget Cap.
- **Theme**: The visual colour scheme of the App — either `light` or `dark`.
- **Sort Preference**: The user's selected criterion (`amount` or `category`) and order (`ascending` or `descending`) for displaying Transactions in the Transaction List.
- **LocalStorage**: The browser's `window.localStorage` API used for all client-side data persistence.
- **Validator**: The client-side input validation logic that evaluates Input Form field values before a Transaction is recorded.
- **Chart Controller**: The application module responsible for initialising, rendering, and updating the Pie Chart.
- **Theme Controller**: The application module responsible for reading, applying, and persisting the Theme preference.
- **Sort Controller**: The application module responsible for reading, applying, and persisting the Sort Preference.
- **Budget Controller**: The application module responsible for evaluating the Budget Cap and controlling the Warning Banner.
- **CDN**: Content Delivery Network; Chart.js is loaded via CDN script tag.

---

## Requirements

### Requirement 1 — Input Form

**User Story:** As a user, I want to enter an item name, amount, and category for a new expense, so that I can record my spending accurately.

#### Acceptance Criteria

1. THE App SHALL render an Input Form containing exactly three fields: a text input for item name, a numeric input for amount, and a dropdown select for category.
2. THE Input Form SHALL populate the category dropdown with exactly three options: `Food`, `Transport`, and `Fun`.
3. WHEN the user submits the Input Form, THE Validator SHALL check that the item name field contains at least one non-whitespace character.
4. WHEN the user submits the Input Form, THE Validator SHALL check that the amount field contains a numeric value greater than zero.
5. WHEN the user submits the Input Form, THE Validator SHALL check that a category has been selected from the dropdown.
6. IF the Validator detects that the item name field is empty or contains only whitespace, THEN THE App SHALL display an inline error message adjacent to the item name field reading "Item name is required."
7. IF the Validator detects that the amount field is empty, zero, negative, or non-numeric, THEN THE App SHALL display an inline error message adjacent to the amount field reading "Please enter a valid amount greater than 0."
8. IF the Validator detects that no category is selected, THEN THE App SHALL display an inline error message adjacent to the category field reading "Please select a category."
9. WHEN validation passes, THE App SHALL create a new Transaction record and add it to LocalStorage.
10. WHEN a Transaction is successfully saved, THE App SHALL reset all Input Form fields to their default empty/placeholder state.
11. WHEN a Transaction is successfully saved, THE App SHALL clear all previously displayed inline validation error messages.
12. THE Input Form SHALL associate each field with a visible `<label>` element linked via `for`/`id` attributes to satisfy accessibility requirements.
13. THE Input Form submit button SHALL have a descriptive `aria-label` attribute value of "Add expense".

---

### Requirement 2 — Transaction List

**User Story:** As a user, I want to see all my recorded expenses in a scrollable list, so that I can review and manage my spending history.

#### Acceptance Criteria

1. THE App SHALL render a Transaction List section that displays all Transactions currently stored in LocalStorage.
2. WHILE at least one Transaction exists, THE Transaction List SHALL display each Transaction as a list item showing the item name, amount formatted to two decimal places with a currency symbol, and category label.
3. WHEN a Transaction is added or deleted, THE App SHALL re-render the Transaction List to reflect the current state of LocalStorage without a full page reload.
4. THE Transaction List SHALL include a delete button for each Transaction list item.
5. WHEN the user activates the delete button on a Transaction list item, THE App SHALL remove that Transaction from LocalStorage and re-render the Transaction List.
6. WHEN the user activates the delete button on a Transaction list item, THE App SHALL update the Total Balance to reflect the removal.
7. IF no Transactions exist in LocalStorage, THEN THE App SHALL display an empty-state message within the Transaction List reading "No expenses recorded yet."
8. WHILE the number of Transaction list items exceeds the visible height of the Transaction List container, THE Transaction List container SHALL scroll vertically without expanding the page layout.
9. THE Transaction List SHALL have a defined maximum height to constrain its visible area and enable internal scrolling.
10. THE delete button for each Transaction SHALL have an `aria-label` attribute that includes the item name of the corresponding Transaction (e.g., "Delete Coffee").
11. Each Transaction list item SHALL be rendered as an `<li>` element within a `<ul>` element to provide semantic list structure.

---

### Requirement 3 — Total Balance

**User Story:** As a user, I want to see my total spending displayed prominently and kept up to date, so that I always know how much I have spent overall.

#### Acceptance Criteria

1. THE App SHALL render a Total Balance display at the top of the main content area showing the sum of all Transaction amounts stored in LocalStorage.
2. THE Total Balance display SHALL format the sum as a numeric value rounded to two decimal places, prefixed with a currency symbol.
3. WHEN a new Transaction is saved, THE App SHALL recalculate and update the Total Balance display without a full page reload.
4. WHEN a Transaction is deleted, THE App SHALL recalculate and update the Total Balance display without a full page reload.
5. WHILE no Transactions exist, THE Total Balance display SHALL show a value of `0.00` with the currency symbol.
6. THE Total Balance display SHALL be contained within a landmark region or heading structure so that assistive technologies can identify it as the spending summary.

---

### Requirement 4 — Visual Chart

**User Story:** As a user, I want to see a pie chart that breaks down my spending by category, so that I can quickly understand where my money is going.

#### Acceptance Criteria

1. THE App SHALL load Chart.js from a CDN `<script>` tag in the HTML file.
2. THE Chart Controller SHALL render a pie chart inside a `<canvas>` element using Chart.js.
3. THE Pie Chart SHALL contain one slice per Category that has at least one Transaction, sized proportionally to that Category's share of the Total Balance.
4. THE Pie Chart SHALL use distinct, consistent fill colours for each Category: one colour for `Food`, one for `Transport`, and one for `Fun`.
5. WHEN a Transaction is added or deleted, THE Chart Controller SHALL destroy the existing Chart.js instance and render a new Pie Chart reflecting the updated Category totals.
6. IF no Transactions exist, THEN THE Chart Controller SHALL display a placeholder message within the chart area reading "No data to display."
7. THE `<canvas>` element used by the Pie Chart SHALL have an `aria-label` attribute describing its content (e.g., "Pie chart showing spending by category") and a `role="img"` attribute.
8. THE Pie Chart SHALL display a legend mapping each Category label to its corresponding slice colour.
9. WHILE rendering, THE Chart Controller SHALL set Chart.js `responsive: true` so that the Pie Chart scales with its container.

---

### Requirement 5 — Spending Limit Warning (Optional)

**User Story:** As a user, I want to set a single overall budget cap and receive a visible warning when my total spending is approaching or has exceeded it, so that I can manage my budget proactively.

#### Acceptance Criteria

1. THE App SHALL render an input field and a save button that allow the user to enter and persist a numeric Budget Cap value.
2. WHEN the user saves a Budget Cap, THE Budget Controller SHALL store the value in LocalStorage under the key `budgetCap`.
3. WHEN the user saves a Budget Cap, THE Validator SHALL check that the entered value is a numeric value greater than zero.
4. IF the Budget Cap entry is not a numeric value greater than zero, THEN THE App SHALL display an inline error message adjacent to the budget cap field reading "Please enter a valid budget greater than 0."
5. WHILE the Budget Cap is set and the Total Balance is greater than or equal to 90% of the Budget Cap and less than 100% of the Budget Cap, THE Budget Controller SHALL display the Warning Banner with the message "Warning: You are approaching your budget limit."
6. WHILE the Budget Cap is set and the Total Balance is greater than or equal to 100% of the Budget Cap, THE Budget Controller SHALL display the Warning Banner with the message "Warning: You have exceeded your budget limit."
7. WHILE the Budget Cap is set and the Total Balance is less than 90% of the Budget Cap, THE Budget Controller SHALL ensure the Warning Banner is not visible.
8. IF no Budget Cap is set, THEN THE Budget Controller SHALL ensure the Warning Banner is not visible.
9. WHEN a Transaction is added or deleted, THE Budget Controller SHALL re-evaluate the Budget Cap threshold and update the Warning Banner visibility and message accordingly.
10. THE Warning Banner SHALL use a distinct background colour and sufficient colour contrast ratio of at least 4.5:1 against its text to meet WCAG 2.1 AA.
11. THE Warning Banner SHALL include `role="alert"` so that assistive technologies announce it when it becomes visible.

---

### Requirement 6 — Dark/Light Mode Toggle (Optional)

**User Story:** As a user, I want to toggle between dark and light colour schemes and have my preference remembered, so that I can use the App comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL render a toggle button that switches the Theme between `light` and `dark`.
2. WHEN the user activates the theme toggle button, THE Theme Controller SHALL apply the selected Theme to the `<body>` element by setting or removing a `data-theme` attribute (e.g., `data-theme="dark"`).
3. WHEN the user activates the theme toggle button, THE Theme Controller SHALL persist the selected Theme value in LocalStorage under the key `theme`.
4. WHEN the App initialises, THE Theme Controller SHALL read the `theme` key from LocalStorage and apply the stored Theme before rendering any other UI elements.
5. IF no `theme` key exists in LocalStorage on initialisation, THEN THE Theme Controller SHALL apply the `light` Theme as the default.
6. WHILE the `dark` Theme is active, THE App SHALL apply a dark background colour and light foreground text colour to all UI sections via CSS custom properties or data-attribute selectors.
7. WHILE the `light` Theme is active, THE App SHALL apply a light background colour and dark foreground text colour to all UI sections via CSS custom properties or data-attribute selectors.
8. THE theme toggle button SHALL have an `aria-label` attribute that reflects the current action (e.g., "Switch to dark mode" when light is active, "Switch to light mode" when dark is active).
9. WHEN the theme changes, THE theme toggle button's `aria-label` SHALL be updated to reflect the new available action.

---

### Requirement 7 — Sort Transactions (Optional)

**User Story:** As a user, I want to sort my transaction list by amount or category and have my sort preference remembered, so that I can view my expenses in a meaningful order across sessions.

#### Acceptance Criteria

1. THE App SHALL render a sort control section containing a dropdown to select the sort criterion (`amount` or `category`) and a second dropdown or toggle to select the sort order (`ascending` or `descending`).
2. WHEN the user changes the sort criterion or sort order, THE Sort Controller SHALL re-render the Transaction List in the newly selected order.
3. WHEN the user changes the sort criterion or sort order, THE Sort Controller SHALL persist the Sort Preference as a JSON object `{ "criterion": "amount"|"category", "order": "ascending"|"descending" }` in LocalStorage under the key `sortPreference`.
4. WHEN the App initialises, THE Sort Controller SHALL read the `sortPreference` key from LocalStorage and apply the stored Sort Preference to the initial Transaction List render.
5. IF no `sortPreference` key exists in LocalStorage on initialisation, THEN THE Sort Controller SHALL apply a default sort of criterion `category` and order `ascending`.
6. WHEN sorting by `amount` in `ascending` order, THE Sort Controller SHALL render Transactions from the lowest amount to the highest amount.
7. WHEN sorting by `amount` in `descending` order, THE Sort Controller SHALL render Transactions from the highest amount to the lowest amount.
8. WHEN sorting by `category` in `ascending` order, THE Sort Controller SHALL render Transactions grouped alphabetically by Category label from A to Z.
9. WHEN sorting by `category` in `descending` order, THE Sort Controller SHALL render Transactions grouped alphabetically by Category label from Z to A.
10. THE sort criterion dropdown and sort order dropdown SHALL each have an associated `<label>` element for accessibility.

---

### Requirement 8 — Transaction Data Structure

**User Story:** As a developer, I want each Transaction to be stored as a well-defined JSON object in LocalStorage, so that the App can reliably read, render, and manipulate expense data across sessions.

#### Acceptance Criteria

1. THE App SHALL represent each Transaction in LocalStorage as a JSON object with exactly four fields: `id` (string, unique identifier), `name` (string, item name), `amount` (number, positive), and `category` (string, one of `"Food"`, `"Transport"`, `"Fun"`).
2. THE App SHALL store all Transactions as a JSON array under the LocalStorage key `transactions`.
3. WHEN a new Transaction is created, THE App SHALL generate a unique `id` value using `Date.now().toString()` combined with a random suffix to avoid collision.
4. WHEN the App initialises, THE App SHALL read the `transactions` key from LocalStorage and parse the JSON array to populate the Transaction List and compute the Total Balance.
5. IF the `transactions` key does not exist in LocalStorage on initialisation, THEN THE App SHALL treat the transaction dataset as an empty array.
6. IF the JSON stored under `transactions` in LocalStorage is malformed or cannot be parsed, THEN THE App SHALL treat the transaction dataset as an empty array and log a console warning.

---

### Requirement 9 — LocalStorage Structure

**User Story:** As a developer, I want the App to use a consistent and documented LocalStorage key schema, so that persistence behaviour is predictable and maintainable.

#### Acceptance Criteria

1. THE App SHALL use the LocalStorage key `transactions` to store the JSON array of all Transaction objects.
2. THE App SHALL use the LocalStorage key `budgetCap` to store the numeric Budget Cap value as a string when the Spending Limit Warning feature is used.
3. THE App SHALL use the LocalStorage key `theme` to store the Theme preference string (`"light"` or `"dark"`).
4. THE App SHALL use the LocalStorage key `sortPreference` to store the Sort Preference JSON object.
5. THE App SHALL not write to any LocalStorage key other than `transactions`, `budgetCap`, `theme`, and `sortPreference`.

---

### Requirement 10 — Validation Rules

**User Story:** As a user, I want all form inputs to be validated before submission, so that only valid expense data is recorded.

#### Acceptance Criteria

1. THE Validator SHALL reject an item name that is empty or consists solely of whitespace characters.
2. THE Validator SHALL reject an amount that is not a finite number, is less than or equal to zero, or cannot be parsed as a valid decimal number.
3. THE Validator SHALL reject a category value that is not exactly one of `"Food"`, `"Transport"`, or `"Fun"`.
4. THE Validator SHALL reject a Budget Cap value that is not a finite number greater than zero.
5. WHEN all fields pass validation, THE Validator SHALL allow the Transaction to be created and stored.
6. WHEN a validation error is present, THE App SHALL prevent form submission and keep all entered field values intact so the user can correct them.

---

### Requirement 11 — UI Layout Structure

**User Story:** As a user, I want a clear, logical page layout, so that I can navigate and use the App's sections without confusion.

#### Acceptance Criteria

1. THE App SHALL render a single HTML page (`index.html`) with a `<header>`, a `<main>` element, and a `<footer>`.
2. THE `<header>` SHALL contain the App title and the theme toggle button.
3. THE `<main>` element SHALL contain, in order from top to bottom: the Total Balance display, the Warning Banner (conditionally visible), the Input Form, the sort controls, the Transaction List, and the Pie Chart.
4. THE App SHALL use a single CSS file located at `css/styles.css`.
5. THE App SHALL use a single JavaScript file located at `js/app.js`.
6. THE App SHALL load Chart.js via a CDN `<script>` tag placed before the `js/app.js` script tag in `index.html`.
7. THE App SHALL include a `<meta name="viewport" content="width=device-width, initial-scale=1.0">` tag to enable responsive scaling on mobile devices.

---

### Requirement 12 — Responsive Behaviour

**User Story:** As a user, I want the App to be usable on both desktop and mobile screens, so that I can log and review expenses from any device.

#### Acceptance Criteria

1. THE App SHALL apply a single-column layout for all main content sections on viewports with a width of 600 pixels or less.
2. THE App SHALL apply a two-column layout — Input Form and Pie Chart side by side — on viewports with a width greater than 600 pixels, where available space permits.
3. THE Input Form fields SHALL expand to 100% of their container width on viewports with a width of 600 pixels or less.
4. THE Transaction List SHALL maintain its internal vertical scroll behaviour on all viewport sizes.
5. THE Pie Chart canvas SHALL scale responsively within its container without overflowing its parent element on any supported viewport width.
6. THE App SHALL use relative units (percentages, `em`, `rem`, or viewport units) rather than fixed pixel widths for layout containers to support fluid resizing.

---

### Requirement 13 — Chart.js Integration

**User Story:** As a developer, I want Chart.js to be integrated via CDN and managed through a dedicated controller, so that the Pie Chart is rendered correctly and updated reliably.

#### Acceptance Criteria

1. THE App SHALL load Chart.js using a `<script>` tag referencing the Chart.js CDN URL before `js/app.js` is loaded.
2. THE Chart Controller SHALL initialise a Chart.js instance of type `"pie"` targeting a `<canvas>` element with a defined `id`.
3. THE Chart Controller SHALL pass Category labels and aggregated amount totals as the `data.labels` and `data.datasets[0].data` properties of the Chart.js configuration object.
4. WHEN re-rendering the Pie Chart, THE Chart Controller SHALL call `.destroy()` on the existing Chart.js instance before creating a new one to prevent canvas reuse errors.
5. THE Chart Controller SHALL set the Chart.js option `responsive: true` and `maintainAspectRatio: true` to ensure the chart scales correctly within its container.
6. IF Chart.js fails to load from the CDN, THEN THE App SHALL display a static fallback message within the chart container reading "Chart unavailable. Please check your internet connection."

---

### Requirement 14 — Error and Empty-State Handling

**User Story:** As a user, I want the App to handle missing data and errors gracefully, so that I am never left with a broken or confusing interface.

#### Acceptance Criteria

1. IF no Transactions exist in LocalStorage, THEN THE App SHALL display the empty-state message "No expenses recorded yet." in the Transaction List area.
2. IF no Transactions exist, THEN THE Chart Controller SHALL display the placeholder message "No data to display." in the chart area instead of rendering an empty chart.
3. IF the `transactions` JSON in LocalStorage is malformed, THEN THE App SHALL silently reset to an empty transaction state and log a warning to the browser console.
4. IF Chart.js is unavailable because the CDN script failed to load, THEN THE App SHALL display the message "Chart unavailable. Please check your internet connection." in the chart container.
5. WHEN a LocalStorage write operation fails (e.g., storage quota exceeded), THE App SHALL display a non-blocking notification message reading "Unable to save data. Storage may be full." to the user.

---

### Requirement 15 — Accessibility

**User Story:** As a user who relies on assistive technologies, I want the App to follow accessibility best practices, so that I can use all features with a keyboard and screen reader.

#### Acceptance Criteria

1. THE App SHALL achieve a colour contrast ratio of at least 4.5:1 between all foreground text colours and their corresponding background colours in both light and dark themes, in compliance with WCAG 2.1 AA criterion 1.4.3.
2. THE App SHALL ensure all interactive elements (buttons, inputs, selects) are reachable and operable using keyboard Tab and Enter/Space navigation without requiring a mouse.
3. THE App SHALL provide a visible focus indicator on all interactive elements when they receive keyboard focus.
4. THE Input Form SHALL associate every input and select element with a descriptive `<label>` element via matching `for` and `id` attributes.
5. THE Warning Banner SHALL include `role="alert"` so that screen readers announce the banner text when it becomes visible or its text changes.
6. THE Pie Chart `<canvas>` element SHALL have `role="img"` and an `aria-label` attribute describing its current content.
7. THE delete button for each Transaction list item SHALL have a unique `aria-label` that includes the item name so screen reader users know which Transaction will be deleted.
8. THE theme toggle button SHALL have an `aria-label` that describes the action it will perform (not the current state), updated dynamically when the theme changes.
9. THE App SHALL use semantic HTML elements (`<header>`, `<main>`, `<footer>`, `<ul>`, `<li>`, `<form>`, `<button>`) to provide meaningful document structure for assistive technologies.
10. THE App SHALL not rely solely on colour to convey information; category labels, warning text, and status messages SHALL also be communicated through visible text.
