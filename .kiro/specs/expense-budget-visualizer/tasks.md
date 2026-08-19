# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a client-side single-page expense tracker using HTML, CSS, and vanilla JavaScript. All logic lives in `js/app.js` using the Module Pattern. Chart.js is loaded via CDN. Persistence uses `window.localStorage`. Implementation follows the layered module architecture: Storage → Validator → Transaction → UI → Controllers → Event wiring.

---

## Tasks

- [ ] 1. Create HTML skeleton (`index.html`)
  - Write the full HTML document with `<header>`, `<main>`, `<footer>` structure
  - Include all required element IDs: `expense-form`, `input-name`, `input-amount`, `input-category`, `error-name`, `error-amount`, `error-category`, `total-balance`, `transaction-list`, `expense-chart`, `chart-fallback`, `budget-warning`, `budget-cap-input`, `btn-save-budget`, `error-budget`, `theme-toggle`, `sort-criterion`, `sort-order`, `storage-error`
  - Add `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
  - Wire `<link>` to `css/styles.css`, CDN `<script>` for Chart.js, and `<script>` for `js/app.js` in correct order
  - Add `<label>` elements for all form fields via `for`/`id` pairing; set `aria-label="Add expense"` on submit button; set `role="alert"` on `#budget-warning`; set `role="img"` and `aria-label` on `<canvas>`; set `role="status"` on `#storage-error`
  - _Requirements: 1.1, 1.2, 1.12, 1.13, 2.11, 4.7, 5.1, 5.11, 6.1, 7.1, 7.10, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 13.1, 15.4, 15.5, 15.6, 15.9_

- [ ] 2. Implement base CSS (`css/styles.css`)
  - [ ] 2.1 Define CSS custom properties and theme tokens
    - Declare `:root` variables: `--bg`, `--surface`, `--text`, `--text-muted`, `--border`, `--warning-bg`, `--warning-fg`, `--accent`
    - Declare `[data-theme="dark"]` overrides for all custom properties
    - _Requirements: 6.6, 6.7, 15.1_

  - [ ] 2.2 Implement base layout, typography, and component styles
    - Style `body`, `header`, `main`, `footer` using CSS custom properties and relative units (`rem`, `%`)
    - Style `.grid-container` as single-column grid; add `@media (min-width: 601px)` breakpoint for two-column grid
    - Set `#transaction-list` max-height and `overflow-y: auto`
    - Style `#budget-warning` with `--warning-bg` / `--warning-fg` and sufficient contrast
    - Add `:focus-visible` outline using `--accent` for all interactive elements
    - _Requirements: 5.10, 5.11, 8.9, 11.1, 11.3, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 15.1, 15.2, 15.3_

- [ ] 3. Implement Storage Module (`js/app.js`)
  - [ ] 3.1 Write the `Storage` IIFE with all read/write functions
    - Implement `getTransactions` with try/catch JSON parse and console warning on malformed data
    - Implement `saveTransactions`, `getBudgetCap`, `saveBudgetCap`, `getTheme`, `saveTheme`, `getSortPreference`, `saveSortPreference`
    - Use exact LocalStorage keys: `transactions`, `budgetCap`, `theme`, `sortPreference`
    - Wrap `localStorage.setItem` calls in try/catch and call `UI.showStorageError()` on quota error
    - _Requirements: 8.2, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 14.3, 14.5_

  - [ ]* 3.2 Write property tests for Storage round-trip functions
    - **Property 10: Budget Cap Persistence Round-Trip** — for any valid `v`, `saveBudgetCap(v)` then `getBudgetCap()` returns `v`
    - **Property 12: Theme Persistence Round-Trip** — for any `"light"` or `"dark"`, `saveTheme(v)` then `getTheme()` returns `v`
    - **Property 15: Sort Preference Persistence Round-Trip** — for any `{ criterion, order }`, `saveSortPreference(pref)` then `getSortPreference()` returns same values
    - **Validates: Requirements 5.2, 6.3, 6.4, 7.3, 7.4**

- [ ] 4. Implement Validator Module (`js/app.js`)
  - [ ] 4.1 Write the `Validator` IIFE with `validateTransaction` and `validateBudgetCap`
    - Implement `validateTransaction({ name, amount, category })` — reject blank/whitespace name, name > 100 chars, non-finite/zero/negative/over-limit/excess-decimal amount, invalid category
    - Implement `validateBudgetCap(value)` — reject non-finite, ≤ 0, or > 999,999,999.99
    - Return `{ valid, errors }` from `validateTransaction` and `{ valid, error }` from `validateBudgetCap`; never mutate DOM
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 5.3, 5.4, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 4.2 Write property tests for `Validator.validateTransaction` — name field
    - **Property 1: Name Validation Rejects Blank Inputs** — any empty or all-whitespace string → `valid: false`; any string with ≥1 non-whitespace char and ≤100 chars → `valid: true`
    - **Validates: Requirements 1.3, 10.1**

  - [ ]* 4.3 Write property tests for `Validator.validateTransaction` — amount field
    - **Property 2: Amount Validation Accepts Only Positive Finite Decimals** — non-numeric, zero, negative, > 999,999,999.99, or > 2 decimal places → `valid: false`; valid positive decimals → `valid: true`
    - **Validates: Requirements 1.4, 10.2**

  - [ ]* 4.4 Write property tests for `Validator.validateTransaction` — category field
    - **Property 3: Category Validation Accepts Only Defined Labels** — any value not exactly `"Food"`, `"Transport"`, `"Fun"` → `valid: false`; those three exact strings → `valid: true`
    - **Validates: Requirements 1.5, 10.3**

- [ ] 5. Implement Transaction Module (`js/app.js`)
  - [ ] 5.1 Write the `Transaction` IIFE with `getAll`, `addTransaction`, `deleteTransaction`
    - Implement `generateId` using `Date.now().toString() + Math.random().toString(36).slice(2)`
    - `addTransaction` must trim name, parse amount as float, push new object, call `Storage.saveTransactions`
    - `deleteTransaction(id)` must filter by id and call `Storage.saveTransactions`
    - _Requirements: 1.9, 2.5, 8.1, 8.2, 8.3_

  - [ ]* 5.2 Write property tests for Transaction Module
    - **Property 4: Transaction Persistence Round-Trip** — after `addTransaction`, `getAll()` contains record with matching `name`, `amount`, `category`, and non-empty `id`
    - **Property 6: Delete Removes Transaction and Reduces Total** — after `deleteTransaction(T.id)`, `getAll()` does not contain `T`; sum of remaining amounts equals previous total minus `T.amount`
    - **Property 16: Transaction IDs Are Unique Across a Batch** — for `n ≥ 2` sequential `addTransaction` calls, all generated `id` values are distinct
    - **Validates: Requirements 1.9, 2.5, 2.6, 8.1, 8.2, 8.3**

- [ ] 6. Implement UI.renderList and UI.renderTotal (`js/app.js`)
  - [ ] 6.1 Write `UI.renderList(transactions)`
    - Render empty-state `<li>` with text "No expenses recorded yet." when array is empty
    - Render each transaction as `<li class="transaction-item">` inside `<ul id="transaction-list">` showing name, formatted amount, category label
    - Add delete button per item with `aria-label="Delete {name}"` and `data-id` attribute
    - _Requirements: 2.1, 2.2, 2.4, 2.7, 2.8, 2.9, 2.10, 2.11_

  - [ ]* 6.2 Write property tests for `UI.renderList`
    - **Property 5: Transaction List Renders All Stored Items** — for any array of transactions, rendered `<ul>` contains exactly one `<li>` per transaction with correct name, formatted amount (2dp + currency prefix), and category
    - **Property 7: Delete Button Aria-Label Contains Item Name** — for any transaction, its delete button `aria-label` contains the transaction `name` as a substring
    - **Validates: Requirements 2.1, 2.2, 2.10, 15.7**

  - [ ] 6.3 Write `UI.renderTotal(transactions)`
    - Sum all amounts, format with `$` prefix and 2 decimal places, set `#total-balance` text content
    - Display `$0.00` for empty array
    - _Requirements: 3.1, 3.2, 3.5_

  - [ ]* 6.4 Write property tests for `UI.renderTotal`
    - **Property 8: Total Balance Equals the Arithmetic Sum** — for any array, displayed value equals sum of `amount` fields rounded to 2dp with `$` prefix; displays `$0.00` for empty array
    - **Validates: Requirements 3.1, 3.2, 3.5**

- [ ] 7. Implement UI.renderChart (Chart.js integration) (`js/app.js`)
  - [ ] 7.1 Write `UI.renderChart(transactions)` with Chart.js pie chart
    - Detect `typeof Chart === 'undefined'`; show fallback "Chart unavailable. Please check your internet connection." if true
    - Show "No data to display." fallback and hide canvas when array is empty; call `chartInstance.destroy()` if one exists
    - Aggregate totals per category, map to labels/data/colors using `CATEGORY_COLORS` (`Food=#FF6384`, `Transport=#36A2EB`, `Fun=#FFCE56`)
    - Destroy existing `chartInstance` before creating a new one; set `responsive: true`, `maintainAspectRatio: true`, `plugins.legend.display: true`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 13.2, 13.3, 13.4, 13.5, 13.6, 14.2, 14.4_

  - [ ]* 7.2 Write property tests for `UI.renderChart` data aggregation
    - **Property 9: Chart Data Aggregates Correctly per Category** — for any non-empty transactions array, Chart.js dataset `labels` contains exactly the distinct categories present, `data` values equal per-category sums, `backgroundColor` entries match defined category colours
    - **Validates: Requirements 4.3, 4.4**

- [ ] 8. Checkpoint — Core data flow complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Wire form validation and submission events (`js/app.js`)
  - [ ] 9.1 Implement `UI.showFieldErrors`, `UI.clearFieldErrors` helper functions
    - `showFieldErrors(errors)` sets text and removes `hidden` from `#error-name`, `#error-amount`, `#error-category` for each error key present
    - `clearFieldErrors()` clears text and adds `hidden` to all three error spans
    - _Requirements: 1.6, 1.7, 1.8, 1.10, 1.11_

  - [ ] 9.2 Implement `UI.showStorageError` helper function
    - Set text of `#storage-error` to "Unable to save data. Storage may be full." and remove `hidden`
    - _Requirements: 14.5_

  - [ ] 9.3 Wire `DOMContentLoaded`, `refreshAll`, and form `submit` event
    - Implement `refreshAll()` calling `renderList` (sorted), `renderTotal`, `renderChart`, `BudgetController.evaluate`
    - On valid submission: call `clearFieldErrors`, `addTransaction`, `e.target.reset()`, `refreshAll`
    - On invalid submission: call `showFieldErrors(errors)`, prevent reset, keep field values
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 3.3, 4.5, 10.5, 10.6_

  - [ ]* 9.4 Write property test for field preservation on validation failure
    - **Property 17: Field Values Preserved on Validation Failure** — for any invalid submission, name/amount/category DOM field values remain unchanged after the attempt; form is not reset
    - **Validates: Requirements 10.6**

- [ ] 10. Wire delete event delegation (`js/app.js`)
  - Attach `click` listener on `#transaction-list` using event delegation; match `.btn-delete` via `closest`
  - Call `Transaction.deleteTransaction(btn.dataset.id)` then `refreshAll()`
  - _Requirements: 2.3, 2.5, 2.6, 3.4_

- [ ] 11. Implement ThemeController and wire toggle button (`js/app.js`)
  - [ ] 11.1 Write the `ThemeController` IIFE with `init`, `toggle`, `apply`
    - `apply(theme)` sets or removes `data-theme="dark"` on `<body>`; calls `_updateToggleLabel`
    - `_updateToggleLabel` sets `aria-label` to "Switch to dark mode" (when light) or "Switch to light mode" (when dark)
    - `init()` reads from Storage and applies stored theme before other renders
    - Wire `#theme-toggle` `click` event to `ThemeController.toggle()`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [ ]* 11.2 Write property tests for ThemeController
    - **Property 12: Theme Persistence Round-Trip (DOM side)** — after `ThemeController.init()`, `<body>` has `data-theme="dark"` for dark theme and no such attribute for light theme
    - **Property 13: Theme Toggle Button Aria-Label Reflects Available Action** — `aria-label` equals "Switch to dark mode" when theme is "light", and "Switch to light mode" when theme is "dark"
    - **Validates: Requirements 6.3, 6.4, 6.8, 6.9**

- [ ] 12. Implement SortController and wire sort controls (`js/app.js`)
  - [ ] 12.1 Write the `SortController` IIFE with `init`, `apply`, `getSorted`
    - `getSorted(transactions, pref)` returns sorted copy: by `amount` (numeric) or `category` (localeCompare), in ascending or descending direction
    - `apply()` reads from Storage, calls `getSorted`, calls `UI.renderList` and `UI.renderSortControls`
    - `init()` calls `apply()` on startup
    - Wire `change` events on `#sort-criterion` and `#sort-order` to save preference and call `SortController.apply()`
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [ ] 12.2 Write `UI.renderSortControls(pref)`
    - Set `#sort-criterion` and `#sort-order` dropdown values to reflect current stored preference
    - _Requirements: 7.4, 7.5_

  - [ ]* 12.3 Write property tests for `SortController.getSorted`
    - **Property 14: Sort Produces a Correctly Ordered List** — for any non-empty transactions array and any `{ criterion, order }`, every consecutive pair satisfies the ordering invariant for all four combinations
    - **Validates: Requirements 7.2, 7.6, 7.7, 7.8, 7.9**

- [ ] 13. Implement BudgetController and wire budget cap form (`js/app.js`)
  - [ ] 13.1 Write the `BudgetController` IIFE with `init`, `evaluate`
    - `evaluate()` calls `UI.renderBudgetWarning(Transaction.getAll())`
    - `init()` reads stored cap, populates `#budget-cap-input`, calls `evaluate()`
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [ ] 13.2 Write `UI.renderBudgetWarning(transactions)`
    - Hide banner when no cap or `total < 0.9 × cap`
    - Show "Warning: You are approaching your budget limit." when `0.9 × cap ≤ total < cap`
    - Show "Warning: You have exceeded your budget limit." when `total ≥ cap`
    - _Requirements: 5.5, 5.6, 5.7, 5.8_

  - [ ] 13.3 Wire `#btn-save-budget` click event
    - Validate with `Validator.validateBudgetCap`; show/hide `#error-budget` accordingly
    - On success: call `Storage.saveBudgetCap`, `BudgetController.evaluate()`
    - _Requirements: 5.2, 5.3, 5.4_

  - [ ]* 13.4 Write property tests for `UI.renderBudgetWarning`
    - **Property 11: Budget Warning State is a Function of Total and Cap** — for any `C > 0` and `T ≥ 0`, banner is hidden when `T < 0.9C`, shows approaching message when `0.9C ≤ T < C`, shows exceeded message when `T ≥ C`
    - **Validates: Requirements 5.5, 5.6, 5.7**

- [ ] 14. Checkpoint — All modules implemented and wired
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Accessibility pass (`index.html`, `css/styles.css`, `js/app.js`)
  - [ ] 15.1 Audit and fix all ARIA attributes
    - Confirm every `<label>` is linked to its field; verify `aria-label="Add expense"` on submit button
    - Verify `role="alert"` on `#budget-warning` and `role="status"` on `#storage-error`
    - Verify `role="img"` and `aria-label` on `<canvas>`; verify dynamic `aria-label` update on theme toggle button
    - Verify each delete button `aria-label` includes the item name
    - _Requirements: 1.12, 1.13, 2.10, 4.7, 5.11, 6.8, 6.9, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9_

  - [ ] 15.2 Verify focus management and keyboard operability
    - Confirm `:focus-visible` styles apply to all interactive elements (buttons, inputs, selects)
    - Confirm all interactive elements are reachable via Tab and operable via Enter/Space
    - _Requirements: 15.2, 15.3_

  - [ ] 15.3 Verify no colour-only information conveyance
    - Confirm category labels and warning text are communicated via visible text alongside colour
    - _Requirements: 15.10_

- [ ] 16. Set up property-based testing framework
  - [ ] 16.1 Add a PBT library (e.g., fast-check via CDN or npm) and create `tests/` directory with a test runner file
    - Install or include fast-check; create `tests/pbt.test.js` (or equivalent) with imports for all modules under test
    - Mock `localStorage` for isolated Storage tests
    - _Requirements: (all properties 1–17)_

  - [ ]* 16.2 Implement all property-based tests from tasks 3.2, 4.2, 4.3, 4.4, 5.2, 6.2, 6.4, 7.2, 9.4, 11.2, 12.3, 13.4
    - Each property listed in the sub-tasks above (Properties 1–17) gets its own `it`/`test` block
    - Run with 100+ random samples per property
    - _Requirements: (all properties 1–17)_

- [ ] 17. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints at tasks 8, 14, and 17 ensure incremental validation
- Property tests validate universal correctness properties across random inputs
- Unit tests validate specific examples and edge cases
- The `refreshAll()` helper is the single update trigger; always call it after any mutation
- Chart.js must be loaded before `js/app.js` in the HTML `<script>` order

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "5.1"] },
    { "id": 4, "tasks": ["5.2", "6.1", "6.3"] },
    { "id": 5, "tasks": ["6.2", "6.4", "7.1"] },
    { "id": 6, "tasks": ["7.2", "9.1", "9.2"] },
    { "id": 7, "tasks": ["9.3", "10"] },
    { "id": 8, "tasks": ["9.4", "11.1"] },
    { "id": 9, "tasks": ["11.2", "12.1", "12.2"] },
    { "id": 10, "tasks": ["12.3", "13.1", "13.2", "13.3"] },
    { "id": 11, "tasks": ["13.4", "15.1", "15.2", "15.3"] },
    { "id": 12, "tasks": ["16.1"] },
    { "id": 13, "tasks": ["16.2"] }
  ]
}
```
