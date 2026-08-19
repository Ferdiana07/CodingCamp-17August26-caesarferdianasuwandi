// ================================================================
// Expense & Budget Visualizer — app.js
// ================================================================
// Architecture: Module Pattern (IIFE per concern).
// Load order: Storage → Validator → Transaction → (UI in later tasks)
//
// Tasks implemented here:
//   Task 4 — Transaction data model & ID generation
//   Task 5 — Storage Module  (LocalStorage read/write)
//   Task 6 — Transaction Module (add / delete / getAll)
// ================================================================


// ----------------------------------------------------------------
// STORAGE MODULE
// Thin wrapper over window.localStorage.
// • All reads parse JSON defensively — never throws.
// • All writes wrap setItem in try/catch — calls showStorageError
//   (stubbed here; wired to UI in a later task).
// • Only four keys are ever written: transactions, budgetCap,
//   theme, sortPreference.
// ----------------------------------------------------------------
const Storage = (() => {

  // The only keys this app is allowed to touch (Requirement 9.5)
  const KEYS = {
    TRANSACTIONS:    'transactions',
    BUDGET_CAP:      'budgetCap',
    THEME:           'theme',
    SORT_PREFERENCE: 'sortPreference',
  };

  // ── transactions ─────────────────────────────────────────────

  /**
   * Read the stored transaction array.
   * Returns [] if the key is missing OR the JSON is malformed.
   * A console warning is logged on parse failure (Req 8.6, 14.3).
   *
   * @returns {Array<Object>}
   */
  function getTransactions() {
    try {
      const raw = localStorage.getItem(KEYS.TRANSACTIONS);
      if (raw === null) return [];           // key absent → empty list
      const parsed = JSON.parse(raw);
      // Guard: stored value must be an array
      if (!Array.isArray(parsed)) {
        console.warn('[Storage] transactions value is not an array; resetting.');
        return [];
      }
      return parsed;
    } catch (err) {
      console.warn('[Storage] Malformed transactions data; resetting.', err);
      return [];
    }
  }

  /**
   * Persist the full transaction array.
   * On quota overflow, notifies the user via a UI stub
   * (replaced by real UI.showStorageError in a later task).
   *
   * @param {Array<Object>} arr
   */
  function saveTransactions(arr) {
    try {
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(arr));
    } catch (err) {
      // Quota exceeded or private-browsing restriction
      _handleWriteError(err);
    }
  }

  // ── budgetCap ─────────────────────────────────────────────────

  /**
   * Read the stored budget cap.
   * @returns {number|null}  Parsed float, or null if not set.
   */
  function getBudgetCap() {
    const raw = localStorage.getItem(KEYS.BUDGET_CAP);
    if (raw === null) return null;
    const num = parseFloat(raw);
    return isFinite(num) ? num : null;
  }

  /**
   * Persist the budget cap value.
   * @param {number} value
   */
  function saveBudgetCap(value) {
    try {
      localStorage.setItem(KEYS.BUDGET_CAP, String(value));
    } catch (err) {
      _handleWriteError(err);
    }
  }

  // ── theme ─────────────────────────────────────────────────────

  /**
   * Read the stored theme preference.
   * @returns {'light'|'dark'}  Defaults to 'light'.
   */
  function getTheme() {
    const raw = localStorage.getItem(KEYS.THEME);
    return raw === 'dark' ? 'dark' : 'light';  // reject any invalid stored value
  }

  /**
   * Persist the theme preference.
   * @param {'light'|'dark'} theme
   */
  function saveTheme(theme) {
    try {
      localStorage.setItem(KEYS.THEME, theme);
    } catch (err) {
      _handleWriteError(err);
    }
  }

  // ── sortPreference ────────────────────────────────────────────

  /**
   * Read the stored sort preference.
   * @returns {{ criterion: 'amount'|'category', order: 'ascending'|'descending' }}
   */
  function getSortPreference() {
    try {
      const raw = localStorage.getItem(KEYS.SORT_PREFERENCE);
      if (raw === null) return _defaultSortPref();
      const parsed = JSON.parse(raw);
      // Validate shape — fall back to default if malformed
      if (!parsed || typeof parsed !== 'object') return _defaultSortPref();
      const validCriteria = ['amount', 'category'];
      const validOrders   = ['ascending', 'descending'];
      if (!validCriteria.includes(parsed.criterion) ||
          !validOrders.includes(parsed.order)) {
        return _defaultSortPref();
      }
      return parsed;
    } catch {
      return _defaultSortPref();
    }
  }

  /**
   * Persist the sort preference.
   * @param {{ criterion: string, order: string }} pref
   */
  function saveSortPreference(pref) {
    try {
      localStorage.setItem(KEYS.SORT_PREFERENCE, JSON.stringify(pref));
    } catch (err) {
      _handleWriteError(err);
    }
  }

  // ── private helpers ───────────────────────────────────────────

  function _defaultSortPref() {
    return { criterion: 'category', order: 'ascending' };
  }

  function _handleWriteError(err) {
    console.error('[Storage] Write failed (quota exceeded or restricted):', err);
    // Delegate to UI.showStorageError if the UI module is already initialised.
    // Storage is defined before UI so we check typeof first.
    if (typeof UI !== 'undefined' && typeof UI.showStorageError === 'function') {
      UI.showStorageError();
    } else {
      // Fallback during early boot (before UI module is defined)
      const el = document.getElementById('storage-error');
      if (el) {
        el.textContent = 'Unable to save data. Storage may be full.';
        el.hidden = false;
      }
    }
  }

  // ── public API ────────────────────────────────────────────────
  return {
    getTransactions,
    saveTransactions,
    getBudgetCap,
    saveBudgetCap,
    getTheme,
    saveTheme,
    getSortPreference,
    saveSortPreference,
  };

})(); // end Storage


// ----------------------------------------------------------------
// VALIDATOR MODULE
// Pure functions — read inputs, return results, never touch the DOM.
// All validation logic lives here so it can be tested in isolation.
// ----------------------------------------------------------------
const Validator = (() => {

  const MAX_AMOUNT = 999999999.99;
  const VALID_CATEGORIES = new Set(['Food', 'Transport', 'Fun']);

  // Matches positive integers or decimals with at most 2 decimal places.
  // Examples that pass:  "12"  "12.5"  "12.50"
  // Examples that fail:  "12.555"  ".5"  "abc"  ""
  const DECIMAL_RE = /^\d+(\.\d{1,2})?$/;

  /**
   * Validate all three transaction fields at once.
   *
   * @param {{ name: string, amount: string, category: string }} fields
   * @returns {{ valid: boolean, errors: Object.<string, string> }}
   *
   * errors is an object keyed by field name; only failing fields appear.
   * When valid is true, errors is an empty object {}.
   */
  function validateTransaction({ name, amount, category }) {
    const errors = {};

    // ── name ───────────────────────────────────────────────────
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (trimmedName.length === 0) {
      errors.name = 'Item name is required.';
    } else if (trimmedName.length > 100) {
      errors.name = 'Item name must be 100 characters or fewer.';
    }

    // ── amount ─────────────────────────────────────────────────
    // Work with the string representation so we can check decimal places
    const amtStr = String(amount == null ? '' : amount).trim();
    const amtNum = parseFloat(amtStr);
    if (
      amtStr.length === 0 ||
      !DECIMAL_RE.test(amtStr) ||
      !isFinite(amtNum) ||
      amtNum <= 0 ||
      amtNum > MAX_AMOUNT
    ) {
      errors.amount = 'Please enter a valid amount greater than 0.';
    }

    // ── category ───────────────────────────────────────────────
    if (!VALID_CATEGORIES.has(category)) {
      errors.category = 'Please select a category.';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate the budget cap field.
   *
   * @param {string|number} value
   * @returns {{ valid: boolean, error?: string }}
   */
  function validateBudgetCap(value) {
    const num = parseFloat(String(value == null ? '' : value).trim());
    if (!isFinite(num) || num <= 0 || num > MAX_AMOUNT) {
      return { valid: false, error: 'Please enter a valid budget greater than 0.' };
    }
    return { valid: true };
  }

  // ── public API ────────────────────────────────────────────────
  return {
    validateTransaction,
    validateBudgetCap,
  };

})(); // end Validator


// ----------------------------------------------------------------
// TRANSACTION MODULE
// Manages the transaction list.  Every mutation reads from and
// writes back to Storage so LocalStorage is always the source
// of truth.
// ----------------------------------------------------------------
const Transaction = (() => {

  // ── ID generation ─────────────────────────────────────────────
  /**
   * Generate a unique transaction ID.
   * Combines a millisecond timestamp with a random base-36 suffix
   * to avoid collisions when multiple transactions are added rapidly.
   *
   * @returns {string}
   */
  function generateId() {
    return Date.now().toString() + Math.random().toString(36).slice(2);
  }

  // ── read ──────────────────────────────────────────────────────
  /**
   * Return the full list of transactions from LocalStorage.
   * Always reads from storage so the data is fresh.
   *
   * @returns {Array<Object>}
   */
  function getAll() {
    return Storage.getTransactions();
  }

  // ── create ────────────────────────────────────────────────────
  /**
   * Create a new transaction, persist it, and return the new record.
   *
   * Caller is responsible for validating inputs with Validator
   * before calling this function.
   *
   * @param {{ name: string, amount: string|number, category: string }} fields
   * @returns {{ id: string, name: string, amount: number, category: string }}
   */
  function addTransaction({ name, amount, category }) {
    const transactions = getAll();

    const newTransaction = {
      id:       generateId(),
      name:     name.trim(),
      amount:   parseFloat(amount),   // stored as a number, not a string
      category: category,
    };

    transactions.push(newTransaction);
    Storage.saveTransactions(transactions);

    return newTransaction;
  }

  // ── delete ────────────────────────────────────────────────────
  /**
   * Remove a transaction by ID and persist the updated list.
   * Silent no-op if the ID is not found.
   *
   * @param {string} id
   */
  function deleteTransaction(id) {
    const updated = getAll().filter(tx => tx.id !== id);
    Storage.saveTransactions(updated);
  }

  // ── public API ────────────────────────────────────────────────
  return {
    getAll,
    addTransaction,
    deleteTransaction,
  };

})(); // end Transaction


// ----------------------------------------------------------------
// UI MODULE
// All DOM mutations live here. Reads state from Transaction and
// Storage; never mutates state itself. Keeps one Chart.js instance
// reference so it can destroy-then-recreate on every update.
// ----------------------------------------------------------------
const UI = (() => {

  // Currency symbol used throughout the app
  const CURRENCY = '$';

  // Pie-chart slice colours — one fixed colour per category
  const CATEGORY_COLORS = {
    Food:      '#ff6384',
    Transport: '#36a2eb',
    Fun:       '#ffce56',
  };

  // Single Chart.js instance — destroyed and recreated on every refresh
  let _chartInstance = null;

  // ── helpers ──────────────────────────────────────────────────

  /**
   * Format a number as a currency string: "$12.50"
   * @param {number} amount
   * @returns {string}
   */
  function formatAmount(amount) {
    return CURRENCY + Number(amount).toFixed(2);
  }

  /**
   * Escape user-supplied text before injecting into innerHTML.
   * Prevents XSS from item names containing < > " & characters.
   * @param {string} str
   * @returns {string}
   */
  function _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── renderTotal ───────────────────────────────────────────────

  /**
   * Sum all transaction amounts and update #total-balance.
   * Displays "$0.00" when the array is empty (Req 3.5).
   *
   * @param {Array<Object>} transactions
   */
  function renderTotal(transactions) {
    const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    document.getElementById('total-balance').textContent = formatAmount(total);
  }

  // ── renderList ────────────────────────────────────────────────

  /**
   * Re-render the full transaction list.
   * Shows an empty-state message when there are no transactions (Req 2.7).
   * Each item includes a delete button with aria-label (Req 2.10, 15.7).
   *
   * @param {Array<Object>} transactions  May already be sorted by SortController.
   */
  function renderList(transactions) {
    const ul = document.getElementById('transaction-list');

    if (transactions.length === 0) {
      ul.innerHTML =
        '<li class="empty-state">No expenses recorded yet.</li>';
      return;
    }

    ul.innerHTML = transactions.map(tx => `
      <li class="transaction-item" data-id="${_escape(tx.id)}">
        <span class="tx-name" title="${_escape(tx.name)}">${_escape(tx.name)}</span>
        <span class="tx-amount">${formatAmount(tx.amount)}</span>
        <span class="tx-category" data-category="${_escape(tx.category)}">${_escape(tx.category)}</span>
        <button
          class="btn-delete"
          type="button"
          data-id="${_escape(tx.id)}"
          aria-label="Delete ${_escape(tx.name)}"
        >Delete</button>
      </li>
    `).join('');
  }

  // ── renderChart ───────────────────────────────────────────────

  /**
   * Render (or re-render) the Chart.js pie chart.
   *
   * Lifecycle:
   *  1. If Chart.js is missing (CDN failure) → show fallback text.
   *  2. If no transactions → show "No data to display." fallback.
   *  3. Otherwise → destroy old instance, build new one.
   *
   * Req 4.1-4.9, 13.2-13.6, 14.2, 14.4
   *
   * @param {Array<Object>} transactions
   */
  function renderChart(transactions) {
    const canvas   = document.getElementById('expense-chart');
    const fallback = document.getElementById('chart-fallback');

    // ── Helper: destroy the current instance if one exists ─────
    // Always called before creating a new Chart so the canvas is
    // never claimed by two instances at once (Req 13.4).
    function _destroyChart() {
      if (_chartInstance) {
        _chartInstance.destroy();
        _chartInstance = null;
      }
    }

    // ── Helper: aggregate spending totals per category ─────────
    // Returns an object like { Food: 24.50, Transport: 8.00 }.
    // Only categories that have at least one transaction appear
    // as keys, so the chart never renders a zero-value slice.
    function _getCategoryTotals(txs) {
      return txs.reduce(function (acc, tx) {
        acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
        return acc;
      }, {});
    }

    // ── Branch 1: Chart.js CDN failed to load (Req 13.6, 14.4) ─
    if (typeof Chart === 'undefined') {
      _destroyChart();
      fallback.textContent = 'Chart unavailable. Please check your internet connection.';
      fallback.hidden      = false;
      canvas.hidden        = true;
      return;
    }

    // ── Branch 2: No transactions — show empty state (Req 4.6, 14.2) ──
    if (transactions.length === 0) {
      _destroyChart();
      fallback.textContent = 'No data to display.';
      fallback.hidden      = false;
      canvas.hidden        = true;
      return;
    }

    // ── Branch 3: Normal render ────────────────────────────────

    // Show canvas, hide fallback text
    canvas.hidden   = false;
    fallback.hidden = true;

    // 1. Calculate per-category totals from the transaction array
    const totals = _getCategoryTotals(transactions);
    const labels = Object.keys(totals);                          // e.g. ['Food', 'Transport']
    const data   = labels.map(function (l) { return totals[l]; }); // matching amounts
    const colors = labels.map(function (l) {                    // matching colours
      return CATEGORY_COLORS[l] || '#aaaaaa';
    });

    // 2. Destroy the previous instance before creating a new one.
    //    Chart.js throws "Canvas is already in use" if you skip this.
    _destroyChart();

    // 3. Create fresh Chart.js pie instance (Req 4.2, 13.2-13.5)
    _chartInstance = new Chart(canvas.getContext('2d'), {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data:            data,
          backgroundColor: colors,
          borderWidth:     2,
          borderColor:     '#ffffff',
          hoverOffset:     6,
        }],
      },
      options: {
        responsive:          true,   // scales with container (Req 4.9, 13.5)
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display:  true,          // category name + colour swatch (Req 4.8)
            position: 'bottom',
            labels: {
              padding:   16,
              boxWidth:  14,
              font: { size: 13 },
            },
          },
          tooltip: {
            callbacks: {
              // Each tooltip shows: "Food: $24.50 (62.3%)"
              label: function (context) {
                const value    = context.parsed;
                const allData  = context.dataset.data;
                const grandTotal = allData.reduce(function (a, b) { return a + b; }, 0);
                const pct      = grandTotal > 0
                  ? ((value / grandTotal) * 100).toFixed(1)
                  : '0.0';
                return ' ' + context.label + ': ' + formatAmount(value) + ' (' + pct + '%)';
              },
            },
          },
        },
      },
    });

    // 4. Keep aria-label in sync with the current data (Req 4.7, 15.6)
    //    Screen readers read this when the canvas receives focus.
    var ariaText = labels
      .map(function (l) { return l + ': ' + formatAmount(totals[l]); })
      .join(', ');
    canvas.setAttribute(
      'aria-label',
      'Pie chart showing spending by category \u2014 ' + ariaText
    );
  }

  // ── showFieldErrors / clearFieldErrors ────────────────────────

  /**
   * Show inline error messages and mark fields invalid (Req 1.6-1.8).
   * Only the fields present in the errors object are marked.
   *
   * @param {Object.<string, string>} errors  e.g. { name: "Item name is required." }
   */
  function showFieldErrors(errors) {
    ['name', 'amount', 'category'].forEach(field => {
      const input = document.getElementById('input-' + field);
      const span  = document.getElementById('error-' + field);
      if (errors[field]) {
        span.textContent = errors[field];
        span.hidden      = false;
        if (input) input.classList.add('is-invalid');
      } else {
        span.textContent = '';
        span.hidden      = true;
        if (input) input.classList.remove('is-invalid');
      }
    });
  }

  /**
   * Clear all inline error messages and invalid states (Req 1.11).
   */
  function clearFieldErrors() {
    ['name', 'amount', 'category'].forEach(field => {
      const input = document.getElementById('input-' + field);
      const span  = document.getElementById('error-' + field);
      span.textContent = '';
      span.hidden      = true;
      if (input) input.classList.remove('is-invalid');
    });
  }

  // ── showStorageError ──────────────────────────────────────────

  /**
   * Display the non-blocking storage-quota error notification (Req 14.5).
   * Auto-hides after 5 seconds.
   */
  function showStorageError() {
    const el = document.getElementById('storage-error');
    if (!el) return;
    el.textContent = 'Unable to save data. Storage may be full.';
    el.hidden = false;
    // Auto-dismiss after 5 s so it doesn't linger forever
    setTimeout(() => { el.hidden = true; }, 5000);
  }

  // ── public API ────────────────────────────────────────────────
  return {
    formatAmount,
    renderTotal,
    renderList,
    renderChart,
    showFieldErrors,
    clearFieldErrors,
    showStorageError,
  };

})(); // end UI


// ----------------------------------------------------------------

// ----------------------------------------------------------------
// THEME CONTROLLER
// Manages dark/light mode.
// • Applies the theme by toggling data-theme="dark" on <body>.
//   All colour changes flow from CSS custom properties — no inline
//   styles are set here.
// • Updates the toggle button label and aria-label on every switch.
// • Persists the preference in LocalStorage so it survives reload.
// ----------------------------------------------------------------
const ThemeController = (() => {

  /**
   * Apply a theme to the document and sync the toggle button text.
   * @param {'light'|'dark'} theme
   */
  function apply(theme) {
    if (theme === 'dark') {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.removeAttribute('data-theme');
    }
    _updateButton(theme);
  }

  /**
   * Toggle between light and dark, persist the new value, and apply it.
   */
  function toggle() {
    const next = Storage.getTheme() === 'dark' ? 'light' : 'dark';
    Storage.saveTheme(next);
    apply(next);
  }

  /**
   * Read the stored preference and apply it.
   * Must be called before the first render so the correct theme
   * is in place before the user sees any content (Req 6.4).
   */
  function init() {
    apply(Storage.getTheme());
  }

  // ── private ───────────────────────────────────────────────────

  function _updateButton(current) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    if (current === 'dark') {
      btn.textContent = '\u2600 Light Mode';
      btn.setAttribute('aria-label', 'Switch to light mode');
    } else {
      btn.textContent = '\uD83C\uDF19 Dark Mode';
      btn.setAttribute('aria-label', 'Switch to dark mode');
    }
  }

  return { init, toggle, apply };

})(); // end ThemeController


// ----------------------------------------------------------------
// SORT CONTROLLER
// Manages transaction list ordering.
// • getSorted() returns a SORTED COPY — the stored array is
//   never reordered or mutated.
// • Persists criterion + order in LocalStorage so the preference
//   survives a page refresh (Req 7.3, 7.4).
// ----------------------------------------------------------------
const SortController = (() => {

  /**
   * Return a sorted shallow copy of the transactions array.
   * The original array (and LocalStorage) is never modified (Req 7).
   *
   * @param {Array<Object>} transactions
   * @param {{ criterion: 'amount'|'category', order: 'ascending'|'descending' }} pref
   * @returns {Array<Object>}
   */
  function getSorted(transactions, pref) {
    const copy = transactions.slice(); // shallow copy — original untouched
    const dir  = pref.order === 'ascending' ? 1 : -1;

    copy.sort(function (a, b) {
      if (pref.criterion === 'amount') {
        // Numeric sort; ties preserve original insertion order (stable)
        return dir * (a.amount - b.amount);
      }
      // Category: locale-aware alphabetical sort (Req 7.8, 7.9)
      return dir * a.category.localeCompare(b.category);
    });

    return copy;
  }

  /**
   * Sync the sort dropdown elements to the currently stored preference.
   * Called on page load to restore the user's last selection (Req 7.4).
   */
  function syncDropdowns() {
    const pref      = Storage.getSortPreference();
    const criterion = document.getElementById('sort-criterion');
    const order     = document.getElementById('sort-order');
    if (criterion) criterion.value = pref.criterion;
    if (order)     order.value     = pref.order;
  }

  /**
   * Read the current dropdown values, persist them, and return the preference.
   * Called whenever either dropdown changes.
   *
   * @returns {{ criterion: string, order: string }}
   */
  function readAndSave() {
    const criterion = document.getElementById('sort-criterion').value;
    const order     = document.getElementById('sort-order').value;
    const pref      = { criterion: criterion, order: order };
    Storage.saveSortPreference(pref);
    return pref;
  }

  /**
   * Return the currently stored sort preference without touching the DOM.
   * @returns {{ criterion: string, order: string }}
   */
  function getCurrent() {
    return Storage.getSortPreference();
  }

  return { getSorted, syncDropdowns, readAndSave, getCurrent };

})(); // end SortController


// ----------------------------------------------------------------
// BUDGET CONTROLLER
// Manages the spending-limit warning banner.
// • Compares the running total against the stored budget cap.
// • Shows "approaching" at >= 90 % of cap (Req 5.5).
// • Shows "exceeded"    at >= 100 % of cap (Req 5.6).
// • Hidden when no cap is set or total is under 90 % (Req 5.7, 5.8).
// • The <div id="budget-warning"> already has role="alert" in HTML
//   so screen readers announce it automatically when it appears.
// ----------------------------------------------------------------
const BudgetController = (() => {

  const APPROACH_RATIO = 0.9; // 90 % threshold

  /**
   * Evaluate the current total against the stored cap and
   * show/hide/update the warning banner.
   *
   * Call this inside refreshAll() so the banner is always current.
   *
   * @param {Array<Object>} transactions  The unsorted master list.
   */
  function evaluate(transactions) {
    const banner = document.getElementById('budget-warning');
    if (!banner) return;

    const cap = Storage.getBudgetCap();

    // No budget cap set — keep banner hidden (Req 5.8)
    if (cap === null) {
      banner.hidden = true;
      return;
    }

    const total = transactions.reduce(function (sum, tx) {
      return sum + tx.amount;
    }, 0);

    const ratio = total / cap;

    if (ratio >= 1) {
      // Total has reached or passed the cap (Req 5.6)
      banner.textContent = 'Warning: You have exceeded your budget limit.';
      banner.hidden      = false;
    } else if (ratio >= APPROACH_RATIO) {
      // Within the 90-100 % warning zone (Req 5.5)
      banner.textContent = 'Warning: You are approaching your budget limit.';
      banner.hidden      = false;
    } else {
      // Safely under 90 % — no warning needed (Req 5.7)
      banner.hidden = true;
    }
  }

  /**
   * Restore the stored budget cap value into the input field on page load.
   */
  function init() {
    const cap   = Storage.getBudgetCap();
    const input = document.getElementById('budget-cap-input');
    if (cap !== null && input) {
      input.value = cap;
    }
  }

  return { evaluate, init };

})(); // end BudgetController


// ----------------------------------------------------------------
// PAGE INITIALISATION
// Boot order:
//   1. Apply stored theme immediately — before any paint
//   2. Set footer year
//   3. Restore budget cap input value and sort dropdown values
//   4. Initial render (list / total / chart / warning banner)
//   5. Wire all event listeners:
//        a. Form submit (add transaction)
//        b. List click (delete — event delegation)
//        c. Theme toggle button
//        d. Sort criterion + order dropdowns
//        e. Save budget cap button
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {

  // ── 1. Theme — must run before any render (Req 6.4) ──────────
  ThemeController.init();

  // ── 2. Footer year ────────────────────────────────────────────
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── 3. Restore UI state from LocalStorage ─────────────────────
  BudgetController.init();      // fill budget cap input
  SortController.syncDropdowns(); // set sort dropdowns to stored values

  // ── refreshAll ────────────────────────────────────────────────
  /**
   * Single update trigger — call after every state change.
   *
   * • Sorts a copy of the transaction array for display.
   * • Passes the unsorted master list to renderTotal, renderChart,
   *   and BudgetController so totals are always accurate.
   * • Never reorders or modifies what is stored in LocalStorage.
   */
  function refreshAll() {
    const raw    = Transaction.getAll();                    // master list (unsorted)
    const pref   = SortController.getCurrent();             // stored sort preference
    const sorted = SortController.getSorted(raw, pref);     // sorted display copy

    UI.renderList(sorted);             // list shown in selected order
    UI.renderTotal(raw);               // total is order-independent
    UI.renderChart(raw);               // chart is order-independent
    BudgetController.evaluate(raw);    // warning uses master total
  }

  // ── 4. Initial render ─────────────────────────────────────────
  refreshAll();
  console.info(
    '[App] Initialised. ' + Transaction.getAll().length +
    ' transaction(s) loaded from LocalStorage.'
  );

  // ── 5a. Form submit — add transaction ─────────────────────────
  const form = document.getElementById('expense-form');
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const name     = document.getElementById('input-name').value;
    const amount   = document.getElementById('input-amount').value;
    const category = document.getElementById('input-category').value;

    const { valid, errors } = Validator.validateTransaction({ name, amount, category });
    if (!valid) {
      UI.showFieldErrors(errors);
      return;
    }

    UI.clearFieldErrors();
    Transaction.addTransaction({ name, amount, category });
    form.reset();
    refreshAll();
  });

  // ── 5b. Delete — event delegation on the list ─────────────────
  const list = document.getElementById('transaction-list');
  list.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn-delete');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;
    Transaction.deleteTransaction(id);
    refreshAll();
  });

  // ── 5c. Theme toggle ──────────────────────────────────────────
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      ThemeController.toggle();
    });
  }

  // ── 5d. Sort dropdowns ────────────────────────────────────────
  // Both dropdowns share a single handler.
  // Any change persists the preference and re-renders the list.
  ['sort-criterion', 'sort-order'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function () {
      SortController.readAndSave();
      refreshAll();
    });
  });

  // ── 5e. Budget cap save ───────────────────────────────────────
  const saveBudgetBtn = document.getElementById('btn-save-budget');
  if (saveBudgetBtn) {
    saveBudgetBtn.addEventListener('click', function () {
      const input = document.getElementById('budget-cap-input');
      const errEl = document.getElementById('error-budget');
      const value = input ? input.value : '';

      const { valid, error } = Validator.validateBudgetCap(value);

      if (!valid) {
        if (errEl) { errEl.textContent = error; errEl.hidden = false; }
        if (input) input.classList.add('is-invalid');
        return;
      }

      // Valid — clear error, persist, re-evaluate banner immediately
      if (errEl) { errEl.textContent = ''; errEl.hidden = true; }
      if (input) input.classList.remove('is-invalid');
      Storage.saveBudgetCap(parseFloat(value));
      BudgetController.evaluate(Transaction.getAll());
    });
  }

});
