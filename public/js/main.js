/**
 * main.js — runs on every page
 *
 * Pings /api/waf-ping on load so Render wakes up BEFORE the user
 * submits any form. By the time they type and click Search/Login,
 * Render's cold start is already done and alerts will reach the dashboard.
 */

(function () {
  // Show logged-in username in header if stored
  const username = localStorage.getItem('vulnweb.username');
  const greeting = document.getElementById('userGreeting');
  if (username && greeting) {
    greeting.innerHTML =
      'Welcome, <strong>' + username + '</strong> | ' +
      '<a href="./login.html" onclick="localStorage.removeItem(\'vulnweb.username\')">Logout</a>';
  }

  // ── Wake up the Render firewall in the background ──────────────────────
  // This ping is silent — user never sees it. It just keeps Render warm.
  fetch('/api/waf-ping').catch(() => {});
})();
