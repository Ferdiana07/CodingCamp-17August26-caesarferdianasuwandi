# Design Document

## Expense & Budget Visualizer

---

## Overview

The Expense & Budget Visualizer is a client-side, single-page application built with HTML, CSS, and vanilla JavaScript. All logic lives in a single `js/app.js` file organised using the **Module Pattern** — each concern is an immediately-invoked function or plain object that exposes a narrow public API. There is no build step, no bundler, and no framework. Chart.js is loaded via CDN. All persistence targets `window.localStorage`.

---

## Architecture

The application follows a layered module architecture inside a single JS file:

```
┌─────────────────────────────────────────────────────┐
│                     index.html                      │
│  (structure, <script> tags, accessible markup)      │
└──────────────────────┬──────────────────────────────┘
                       │ loads
┌──────────────────────▼──────────────────────────────┐
│                    js/app.js                        │
│                                                     │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Storage   │  │  Validator   │  │ Transaction │ │
│  │  Module    │  │  Module      │  │  Module     │ │
│  └──────┬─────┘  └──────┬───────┘  └──────┬──────┘ │
│         │               │                 │         │
│  ┌──────▼───────────────▼─────────────────▼──────┐  │
│  │                   UI Module                   │  │
│  │  renderList · renderTotal · renderChart       │  │
│  │  renderBudgetWarning · renderSortControls     │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────┐  ┌────────────────┐              │
│  │ ThemeCtrl     │  │  SortCtrl      │              │
│  └───────────────┘  └────────────────┘              │
│  ┌───────────────┐                                  │
│  │ BudgetCtrl    │                                  │
│  └───────────────┘                                  │
│                                                     │
│  Event listeners (wiring layer)                     │
└─────────────────────────────────────────────────────┘
```

**Data flow on every mutation:**

1. User action triggers event listener.
2. Validator checks inputs; shows inline errors if invalid.
3. Transaction Module or BudgetController updates state and writes to Storage.
4. UI Module re-renders the affected region(s) — list, total, chart, banner.

---

## File Structure

```
index.html
css/
  styles.css
js/
  app.js
```

---

## Components

### Storage Module

Thin wrapper over `localStorage`. All reads parse JSON defensively; all writes serialise to JSON. Never throws — returns safe defaults on error.

```js
const Storage = (() => {
  const KEYS = {
    TRANSACTIONS:    'transactions',
    BUDGET_CAP:      'budgetCap',
    THEME:           'theme',
    SORT_PREFERENCE: 'sortPreference',
  };

  function getTransactions() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS)) || [];
    } catch {
      console.warn('[Storage] Malformed transactions data; resetting.');
      return [];
    }
  }

  function saveTransactions(arr) {
    try {
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(arr));
    } catch (e) {
      UI.showStorageError();
    }
  }

  function getBudgetCap() {
    const raw = localStorage.getItem(KEYS.BUDGET_CAP);
    return raw !== null ? parseFloat(raw) : null;
  }

  function saveBudgetCap(value) {
    try {
      localStorage.setItem(KEYS.BUDGET_CAP, String(value));
    } catch (e) {
      UI.showStorageError();
    }
  }

  function getTheme() {
    return localStorage.getItem(KEYS.THEME) || 'light';
  }

  function saveTheme(theme) {
    localStorage.setItem(KEYS.THEME, theme);
  }

  function getSortPreference() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.SORT_PREFERENCE))
        || { criterion: 'category', order: 'ascending' };
    } catch {
      return { criterion: 'category', order: 'ascending' };
    }
  }

  function saveSortPreference(pref) {
    localStorage.setItem(KEYS.SORT_PREFERENCE, JSON.stringify(pref));
  }

  return {
    getTransactions, saveTransactions,
    getBudgetCap, saveBudgetCap,
    getTheme, saveTheme,
    getSortPreference, saveSortPreference,
  };
})();
```

---

### Validator Module

Pure validation functions. Each returns `{ valid: boolean, error?: string }`. Does not mutate DOM.

```js
const Validator = (() => {
  const MAX_AMOUNT   = 999_999_999.99;
  const VALID_CATS   = new Set(['Food', 'Transport', 'Fun']);
  const DECIMAL_RE   = /^\d+(\.\d{1,2})?$/;

  function validateTransaction({ name, amount, category }) {
    const errors = {};

    if (!name || name.trim().length === 0) {
      errors.name = 'Item name is required.';
    } else if (name.trim().length > 100) {
      errors.name = 'Item name must be 100 characters or fewer.';
    }

    const amtStr = String(amount).trim();
    const amtNum = parseFloat(amtStr);
    if (!DECIMAL_RE.test(amtStr) || !isFinite(amtNum) || amtNum <= 0 || amtNum > MAX_AMOUNT) {
      errors.amount = 'Please enter a valid amount greater than 0.';
    }

    if (!VALID_CATS.has(category)) {
      errors.category = 'Please select a category.';
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  function validateBudgetCap(value) {
    const num = parseFloat(String(value).trim());
    if (!isFinite(num) || num <= 0 || num > 999_999_999.99) {
      return { valid: false, error: 'Please enter a valid budget greater than 0.' };
    }
    return { valid: true };
  }

  return { validateTransaction, validateBudgetCap };
})();
```

---

### Transaction Module

Manages the in-memory transaction list and exposes CRUD operations. Always syncs to Storage.

```js
const Transaction = (() => {
  function generateId() {
    return Date.now().toString() + Math.random().toString(36).slice(2);
  }

  function getAll() {
    return Storage.getTransactions();
  }

  function addTransaction({ name, amount, category }) {
    const transactions = getAll();
    const newTx = {
      id:       generateId(),
      name:     name.trim(),
      amount:   parseFloat(amount),
      category,
    };
    transactions.push(newTx);
    Storage.saveTransactions(transactions);
    return newTx;
  }

  function deleteTransaction(id) {
    const updated = getAll().filter(tx => tx.id !== id);
    Storage.saveTransactions(updated);
  }

  return { getAll, addTransaction, deleteTransaction };
})();
```

---

### UI Module

Responsible for all DOM mutations. Reads current state from Storage/Transaction/Sort modules and re-renders the relevant section. Keeps a reference to the current Chart.js instance to call `.destroy()` before each re-render.

```js
const UI = (() => {
  const CURRENCY = '$';
  const CATEGORY_COLORS = {
    Food:      '#FF6384',
    Transport: '#36A2EB',
    Fun:       '#FFCE56',
  };
  let chartInstance = null;

  function formatAmount(amount) {
    return `${CURRENCY}${Number(amount).toFixed(2)}`;
  }

  function renderTotal(transactions) {
    const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    document.getElementById('total-balance').textContent = formatAmount(total);
  }

  function renderList(transactions) {
    const ul = document.getElementById('transaction-list');
    if (transactions.length === 0) {
      ul.innerHTML = '<li class="empty-state">No expenses recorded yet.</li>';
      return;
    }
    ul.innerHTML = transactions.map(tx => `
      <li class="transaction-item" data-id="${tx.id}">
        <span class="tx-name">${tx.name}</span>
        <span class="tx-amount">${formatAmount(tx.amount)}</span>
        <span class="tx-category">${tx.category}</span>
        <button class="btn-delete" aria-label="Delete ${tx.name}" data-id="${tx.id}">Delete</button>
      </li>
    `).join('');
  }

  function renderChart(transactions) {
    const canvas = document.getElementById('expense-chart');
    const fallback = document.getElementById('chart-fallback');

    if (typeof Chart === 'undefined') {
      fallback.textContent = 'Chart unavailable. Please check your internet connection.';
      fallback.hidden = false;
      canvas.hidden = true;
      return;
    }

    if (transactions.length === 0) {
      fallback.textContent = 'No data to display.';
      fallback.hidden = false;
      canvas.hidden = true;
      if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
      return;
    }

    fallback.hidden = true;
    canvas.hidden = false;

    const totals = {};
    transactions.forEach(tx => {
      totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
    });
    const labels = Object.keys(totals);
    const data   = labels.map(l => totals[l]);
    const colors = labels.map(l => CATEGORY_COLORS[l]);

    if (chartInstance) { chartInstance.destroy(); }

    chartInstance = new Chart(canvas.getContext('2d'), {
      type: 'pie',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: true } },
      },
    });
  }

  function renderBudgetWarning(transactions) {
    const banner  = document.getElementById('budget-warning');
    const cap     = Storage.getBudgetCap();
    if (cap === null) { banner.hidden = true; return; }

    const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const ratio = total / cap;

    if (ratio >= 1) {
      banner.textContent = 'Warning: You have exceeded your budget limit.';
      banner.hidden = false;
    } else if (ratio >= 0.9) {
      banner.textContent = 'Warning: You are approaching your budget limit.';
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }
  }

  function renderSortControls(pref) {
    document.getElementById('sort-criterion').value = pref.criterion;
    document.getElementById('sort-order').value     = pref.order;
  }

  function showStorageError() {
    const msg = document.getElementById('storage-error');
    msg.textContent = 'Unable to save data. Storage may be full.';
    msg.hidden = false;
  }

  function showFieldErrors(errors) {
    ['name', 'amount', 'category'].forEach(field => {
      const el = document.getElementById(`error-${field}`);
      if (errors[field]) {
        el.textContent = errors[field];
        el.hidden = false;
      } else {
        el.textContent = '';
        el.hidden = true;
      }
    });
  }

  function clearFieldErrors() {
    ['name', 'amount', 'category'].forEach(field => {
      const el = document.getElementById(`error-${field}`);
      el.textContent = '';
      el.hidden = true;
    });
  }

  return {
    renderTotal, renderList, renderChart,
    renderBudgetWarning, renderSortControls,
    showStorageError, showFieldErrors, clearFieldErrors,
    formatAmount,
  };
})();
```

---

### ThemeController

```js
const ThemeController = (() => {
  const THEMES = { LIGHT: 'light', DARK: 'dark' };

  function apply(theme) {
    if (theme === THEMES.DARK) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.removeAttribute('data-theme');
    }
    _updateToggleLabel(theme);
  }

  function _updateToggleLabel(current) {
    const btn = document.getElementById('theme-toggle');
    btn.setAttribute(
      'aria-label',
      current === THEMES.DARK ? 'Switch to light mode' : 'Switch to dark mode'
    );
  }

  function toggle() {
    const current = Storage.getTheme();
    const next    = current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    Storage.saveTheme(next);
    apply(next);
  }

  function init() {
    apply(Storage.getTheme());
  }

  return { init, toggle, apply };
})();
```

---

### SortController

```js
const SortController = (() => {
  function getSorted(transactions, pref) {
    const copy = [...transactions];
    const dir  = pref.order === 'ascending' ? 1 : -1;

    if (pref.criterion === 'amount') {
      copy.sort((a, b) => dir * (a.amount - b.amount));
    } else {
      copy.sort((a, b) => dir * a.category.localeCompare(b.category));
    }
    return copy;
  }

  function apply() {
    const pref         = Storage.getSortPreference();
    const transactions = Transaction.getAll();
    const sorted       = getSorted(transactions, pref);
    UI.renderList(sorted);
    UI.renderSortControls(pref);
  }

  function init() {
    apply();
  }

  return { init, apply, getSorted };
})();
```

---

### BudgetController

```js
const BudgetController = (() => {
  function evaluate() {
    UI.renderBudgetWarning(Transaction.getAll());
  }

  function init() {
    const cap = Storage.getBudgetCap();
    if (cap !== null) {
      document.getElementById('budget-cap-input').value = cap;
    }
    evaluate();
  }

  return { init, evaluate };
})();
```

---

### Event Listeners (Wiring Layer)

The wiring layer is a single `init()` call after DOM load. It attaches all event handlers and triggers the initial render.

```js
function refreshAll() {
  const sorted = SortController.getSorted(
    Transaction.getAll(),
    Storage.getSortPreference()
  );
  UI.renderList(sorted);
  UI.renderTotal(Transaction.getAll());
  UI.renderChart(Transaction.getAll());
  BudgetController.evaluate();
}

document.addEventListener('DOMContentLoaded', () => {
  ThemeController.init();
  SortController.init();
  BudgetController.init();
  refreshAll();

  // Form submit — add transaction
  document.getElementById('expense-form').addEventListener('submit', e => {
    e.preventDefault();
    const name     = document.getElementById('input-name').value;
    const amount   = document.getElementById('input-amount').value;
    const category = document.getElementById('input-category').value;

    const { valid, errors } = Validator.validateTransaction({ name, amount, category });
    if (!valid) { UI.showFieldErrors(errors); return; }

    UI.clearFieldErrors();
    Transaction.addTransaction({ name, amount, category });
    e.target.reset();
    refreshAll();
  });

  // Delete — event delegation on list
  document.getElementById('transaction-list').addEventListener('click', e => {
    const btn = e.target.closest('.btn-delete');
    if (!btn) return;
    Transaction.deleteTransaction(btn.dataset.id);
    refreshAll();
  });

  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', () => {
    ThemeController.toggle();
  });

  // Sort controls
  ['sort-criterion', 'sort-order'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      const pref = {
        criterion: document.getElementById('sort-criterion').value,
        order:     document.getElementById('sort-order').value,
      };
      Storage.saveSortPreference(pref);
      SortController.apply();
    });
  });

  // Budget cap save
  document.getElementById('btn-save-budget').addEventListener('click', () => {
    const value = document.getElementById('budget-cap-input').value;
    const { valid, error } = Validator.validateBudgetCap(value);
    const errEl = document.getElementById('error-budget');
    if (!valid) {
      errEl.textContent = error;
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;
    Storage.saveBudgetCap(parseFloat(value));
    BudgetController.evaluate();
  });
});
```

---

## Data Models

### Transaction Object

```js
{
  id:       string,   // Date.now().toString() + Math.random().toString(36).slice(2)
  name:     string,   // 1–100 chars, trimmed
  amount:   number,   // float, > 0, ≤ 999,999,999.99, ≤ 2 decimal places
  category: string,   // "Food" | "Transport" | "Fun"
}
```

### Sort Preference Object

```js
{
  criterion: "amount" | "category",
  order:     "ascending" | "descending",
}
```

### LocalStorage Schema

| Key               | Type             | Value                               |
|-------------------|------------------|-------------------------------------|
| `transactions`    | JSON string      | `Transaction[]`                     |
| `budgetCap`       | Numeric string   | e.g. `"1500"`                       |
| `theme`           | String           | `"light"` or `"dark"`              |
| `sortPreference`  | JSON string      | `{ criterion, order }`              |

---

## Interfaces

### HTML Element IDs (contract between HTML and JS)

| ID                    | Element     | Purpose                                   |
|-----------------------|-------------|-------------------------------------------|
| `expense-form`        | `<form>`    | Transaction input form                    |
| `input-name`          | `<input>`   | Item name field                           |
| `input-amount`        | `<input>`   | Amount field                              |
| `input-category`      | `<select>`  | Category dropdown                         |
| `error-name`          | `<span>`    | Inline error for name                     |
| `error-amount`        | `<span>`    | Inline error for amount                   |
| `error-category`      | `<span>`    | Inline error for category                 |
| `total-balance`       | `<span>`    | Total spending display                    |
| `transaction-list`    | `<ul>`      | Scrollable transaction list               |
| `expense-chart`       | `<canvas>`  | Chart.js render target                    |
| `chart-fallback`      | `<p>`       | Fallback text when chart unavailable      |
| `budget-warning`      | `<div>`     | Warning banner (`role="alert"`)           |
| `budget-cap-input`    | `<input>`   | Budget cap value field                    |
| `btn-save-budget`     | `<button>`  | Save budget cap                           |
| `error-budget`        | `<span>`    | Inline error for budget cap               |
| `theme-toggle`        | `<button>`  | Light/dark mode toggle                    |
| `sort-criterion`      | `<select>`  | Sort criterion dropdown                   |
| `sort-order`          | `<select>`  | Sort order dropdown                       |
| `storage-error`       | `<p>`       | Non-blocking storage quota error message  |

---

## UI Layout

### HTML Skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Expense & Budget Visualizer</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <header>
    <h1>Expense & Budget Visualizer</h1>
    <button id="theme-toggle" aria-label="Switch to dark mode">Toggle Theme</button>
  </header>

  <main>
    <!-- Total Balance -->
    <section aria-labelledby="balance-heading">
      <h2 id="balance-heading">Total Spending</h2>
      <p><span id="total-balance">$0.00</span></p>
    </section>

    <!-- Warning Banner -->
    <div id="budget-warning" role="alert" hidden></div>

    <!-- Budget Cap -->
    <section aria-labelledby="budget-heading">
      <h2 id="budget-heading">Budget Cap</h2>
      <label for="budget-cap-input">Set budget limit</label>
      <input id="budget-cap-input" type="number" min="0.01" step="0.01">
      <button id="btn-save-budget">Save Budget</button>
      <span id="error-budget" hidden></span>
    </section>

    <!-- Two-column grid starts here on wide viewports -->
    <div class="grid-container">
      <!-- Input Form -->
      <section aria-labelledby="form-heading">
        <h2 id="form-heading">Add Expense</h2>
        <form id="expense-form" novalidate>
          <label for="input-name">Item name</label>
          <input id="input-name" type="text" maxlength="100" autocomplete="off">
          <span id="error-name" hidden></span>

          <label for="input-amount">Amount</label>
          <input id="input-amount" type="number" min="0.01" step="0.01">
          <span id="error-amount" hidden></span>

          <label for="input-category">Category</label>
          <select id="input-category">
            <option value="">Select a category</option>
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Fun">Fun</option>
          </select>
          <span id="error-category" hidden></span>

          <button type="submit" aria-label="Add expense">Add Expense</button>
        </form>
      </section>

      <!-- Chart -->
      <section aria-labelledby="chart-heading">
        <h2 id="chart-heading">Spending by Category</h2>
        <canvas id="expense-chart"
                role="img"
                aria-label="Pie chart showing spending by category">
        </canvas>
        <p id="chart-fallback" hidden></p>
      </section>
    </div>

    <!-- Sort Controls -->
    <section aria-labelledby="sort-heading">
      <h2 id="sort-heading">Sort Transactions</h2>
      <label for="sort-criterion">Sort by</label>
      <select id="sort-criterion">
        <option value="category">Category</option>
        <option value="amount">Amount</option>
      </select>
      <label for="sort-order">Order</label>
      <select id="sort-order">
        <option value="ascending">Ascending</option>
        <option value="descending">Descending</option>
      </select>
    </section>

    <!-- Transaction List -->
    <section aria-labelledby="list-heading">
      <h2 id="list-heading">Transactions</h2>
      <ul id="transaction-list"></ul>
    </section>

    <!-- Storage error -->
    <p id="storage-error" role="status" hidden></p>
  </main>

  <footer>
    <p>&copy; Expense &amp; Budget Visualizer</p>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

---

## Responsive Layout (CSS)

CSS custom properties carry theme tokens. A single media query at 600 px switches the form+chart area to a two-column grid.

```css
/* css/styles.css */
:root {
  --bg:         #ffffff;
  --surface:    #f5f5f5;
  --text:       #1a1a1a;
  --text-muted: #555555;
  --border:     #cccccc;
  --warning-bg: #fff3cd;
  --warning-fg: #664d03;
  --accent:     #0056b3;
}

[data-theme="dark"] {
  --bg:         #1a1a1a;
  --surface:    #2c2c2c;
  --text:       #f0f0f0;
  --text-muted: #aaaaaa;
  --border:     #444444;
  --warning-bg: #3d2f00;
  --warning-fg: #ffe082;
  --accent:     #64b5f6;
}

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: system-ui, sans-serif;
  margin: 0;
  padding: 1rem;
}

/* Two-column grid for form + chart */
.grid-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 601px) {
  .grid-container {
    grid-template-columns: 1fr 1fr;
  }
}

/* Transaction list */
#transaction-list {
  max-height: 400px;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin: 0;
}

/* Warning banner */
#budget-warning {
  background-color: var(--warning-bg);
  color: var(--warning-fg);
  padding: 0.75rem 1rem;
  border-radius: 4px;
  font-weight: 600;
}

/* Focus indicator */
:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Empty / whitespace name | Inline error below name field; form not submitted |
| Invalid / zero / negative amount | Inline error below amount field; form not submitted |
| No category selected | Inline error below category field; form not submitted |
| Invalid budget cap | Inline error below budget cap field; not saved |
| `localStorage.setItem` throws (quota) | Non-blocking status message: "Unable to save data. Storage may be full." |
| `transactions` JSON malformed | Silent reset to `[]`; console warning logged |
| Chart.js CDN fails to load | Static fallback text: "Chart unavailable. Please check your internet connection." |
| No transactions | Empty-state message in list; "No data to display." in chart area |
| No budget cap set | Warning banner hidden |

---

## Accessibility Notes

- All form fields have associated `<label>` elements via `for`/`id`.
- Submit button has `aria-label="Add expense"`.
- Each delete button has `aria-label="Delete {item name}"`.
- Warning banner has `role="alert"` for live-region announcement.
- Chart `<canvas>` has `role="img"` and descriptive `aria-label`.
- Theme toggle button `aria-label` is updated dynamically on every toggle.
- `role="status"` on storage error message for polite announcements.
- Focus outline uses `:focus-visible` for keyboard-only visibility.
- Colour is never the sole carrier of information; text labels always accompany colour-coded categories.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Name Validation Rejects Blank Inputs

*For any* string passed as an item name to `Validator.validateTransaction`, the validator SHALL return `valid: false` when the string is empty or composed entirely of whitespace characters, and `valid: true` when the string contains at least one non-whitespace character and does not exceed 100 characters.

**Validates: Requirements 1.3, 10.1**

---

### Property 2: Amount Validation Accepts Only Positive Finite Decimals

*For any* value passed as the amount field to `Validator.validateTransaction`, the validator SHALL return `valid: false` when the value is non-numeric, zero, negative, greater than 999,999,999.99, or has more than two decimal places, and `valid: true` otherwise.

**Validates: Requirements 1.4, 10.2**

---

### Property 3: Category Validation Accepts Only Defined Labels

*For any* string passed as the category field to `Validator.validateTransaction`, the validator SHALL return `valid: false` for any value not exactly equal to `"Food"`, `"Transport"`, or `"Fun"`, and `valid: true` for those three exact values.

**Validates: Requirements 1.5, 10.3**

---

### Property 4: Transaction Persistence Round-Trip

*For any* valid transaction object `{ name, amount, category }`, after calling `Transaction.addTransaction`, a subsequent call to `Transaction.getAll()` SHALL include a record whose `name`, `amount`, and `category` match the input values, and whose `id` is a non-empty string.

**Validates: Requirements 1.9, 8.1, 8.2**

---

### Property 5: Transaction List Renders All Stored Items

*For any* array of transactions stored in localStorage, calling `UI.renderList` SHALL produce a `<ul>` containing exactly one `<li>` per transaction, with each `<li>` displaying the item's `name`, `amount` (formatted to two decimal places with a currency prefix), and `category`.

**Validates: Requirements 2.1, 2.2**

---

### Property 6: Delete Removes Transaction and Reduces Total

*For any* transaction `T` present in the stored transactions array, after calling `Transaction.deleteTransaction(T.id)`, a subsequent call to `Transaction.getAll()` SHALL NOT contain `T`, and the sum of all remaining `amount` values SHALL equal the previous total minus `T.amount`.

**Validates: Requirements 2.5, 2.6**

---

### Property 7: Delete Button Aria-Label Contains Item Name

*For any* transaction in the rendered list, its delete button's `aria-label` attribute SHALL contain the transaction's `name` as a substring.

**Validates: Requirements 2.10, 15.7**

---

### Property 8: Total Balance Equals the Arithmetic Sum

*For any* array of transaction objects, `UI.renderTotal` SHALL display a value equal to the sum of all `amount` fields rounded to two decimal places, prefixed with the currency symbol, and SHALL display `$0.00` when the array is empty.

**Validates: Requirements 3.1, 3.2, 3.5**

---

### Property 9: Chart Data Aggregates Correctly per Category

*For any* non-empty array of transactions, `UI.renderChart` SHALL produce a Chart.js dataset whose `labels` contain exactly the set of distinct categories present in the array, whose `data` values equal the sum of amounts for each corresponding category, and whose `backgroundColor` entries match the defined category colours (`Food=#FF6384`, `Transport=#36A2EB`, `Fun=#FFCE56`).

**Validates: Requirements 4.3, 4.4**

---

### Property 10: Budget Cap Persistence Round-Trip

*For any* numeric value `v` where `0 < v ≤ 999,999,999.99`, calling `Storage.saveBudgetCap(v)` followed by `Storage.getBudgetCap()` SHALL return a number equal to `v`.

**Validates: Requirements 5.2**

---

### Property 11: Budget Warning State is a Function of Total and Cap

*For any* numeric budget cap `C > 0` and any total spending `T ≥ 0`, `UI.renderBudgetWarning` SHALL:
- hide the banner when `T < 0.9 × C`,
- show the "approaching" message when `0.9 × C ≤ T < C`,
- show the "exceeded" message when `T ≥ C`.

**Validates: Requirements 5.5, 5.6, 5.7**

---

### Property 12: Theme Persistence Round-Trip

*For any* theme value `"light"` or `"dark"`, calling `Storage.saveTheme(v)` followed by `Storage.getTheme()` SHALL return `v`. On subsequent `ThemeController.init()`, the `<body>` element SHALL reflect that theme: `data-theme="dark"` present for dark, absent for light.

**Validates: Requirements 6.3, 6.4**

---

### Property 13: Theme Toggle Button Aria-Label Reflects Available Action

*For any* active theme state, the `aria-label` of the theme toggle button SHALL equal `"Switch to dark mode"` when the current theme is `"light"`, and `"Switch to light mode"` when the current theme is `"dark"`.

**Validates: Requirements 6.8, 6.9**

---

### Property 14: Sort Produces a Correctly Ordered List

*For any* non-empty array of transactions and any sort preference `{ criterion, order }`, `SortController.getSorted` SHALL return an array where:
- When `criterion = "amount"` and `order = "ascending"`: every consecutive pair `(a, b)` satisfies `a.amount ≤ b.amount`.
- When `criterion = "amount"` and `order = "descending"`: every consecutive pair satisfies `a.amount ≥ b.amount`.
- When `criterion = "category"` and `order = "ascending"`: every consecutive pair satisfies `a.category.localeCompare(b.category) ≤ 0`.
- When `criterion = "category"` and `order = "descending"`: every consecutive pair satisfies `a.category.localeCompare(b.category) ≥ 0`.

**Validates: Requirements 7.2, 7.6, 7.7, 7.8, 7.9**

---

### Property 15: Sort Preference Persistence Round-Trip

*For any* sort preference object `{ criterion, order }`, calling `Storage.saveSortPreference(pref)` followed by `Storage.getSortPreference()` SHALL return an object with the same `criterion` and `order` values.

**Validates: Requirements 7.3, 7.4**

---

### Property 16: Transaction IDs Are Unique Across a Batch

*For any* sequence of `n ≥ 2` calls to `Transaction.addTransaction`, all generated `id` values SHALL be distinct strings with no two entries sharing the same value.

**Validates: Requirements 8.3**

---

### Property 17: Field Values Preserved on Validation Failure

*For any* form submission where `Validator.validateTransaction` returns `valid: false`, the values of the name, amount, and category fields in the DOM SHALL remain unchanged after the submission attempt, and the form SHALL NOT be reset.

**Validates: Requirements 10.6**
