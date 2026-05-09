/**
 * search.js
 * Handles the search form. Sends input to /api/search (server-side).
 * The server calls the AI firewall — ALL blocks are logged to the admin dashboard.
 * Client-side NEVER blocks on its own; it only displays what the server returns.
 */

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showWafBlock(messageBox) {
  messageBox.innerHTML = `
    <div style="background:#1a0a0a;border:2px solid #e53e3e;border-radius:8px;padding:16px;color:#fc8181;font-family:sans-serif;margin-top:8px">
      <div style="font-size:1.1rem;font-weight:700;margin-bottom:6px">&#x1F6A8; Your request was blocked by the security firewall.</div>
      <div style="font-size:0.88rem;color:#fca5a5">Suspicious input was detected and logged. If this was a mistake, contact the administrator.</div>
    </div>`;
}

async function performSearch(query) {
  const messageBox     = document.getElementById('messageBox');
  const resultsContainer = document.getElementById('searchResults');
  if (!messageBox || !resultsContainer) return;

  messageBox.innerHTML     = '<span style="color:#aaa">Searching...</span>';
  resultsContainer.innerHTML = '';

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchFor: query })
    });

    const data = await res.json();

    // ── WAF blocked (server already notified the firewall dashboard) ──────
    if (data.blocked === true) {
      showWafBlock(messageBox);
      return;
    }

    messageBox.innerHTML = '';

    // ── Show results ──────────────────────────────────────────────────────
    if (data.results && data.results.length) {
      const heading = document.createElement('h2');
      heading.textContent = 'Search Results for: ' + data.searchTerm;
      resultsContainer.appendChild(heading);

      data.results.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'story';
        div.innerHTML = '<b>' + escHtml(item.title) + '</b><br>' + escHtml(item.description) + '<br><br>';
        resultsContainer.appendChild(div);
      });
    } else {
      messageBox.innerHTML = '<span style="color:#aaa">No results found.</span>';
    }

  } catch (err) {
    messageBox.innerHTML = '<span style="color:red">&#x274C; Error connecting to server. Please try again.</span>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const searchForm  = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchFor');

  // Support ?q= in URL (sidebar "go" button)
  const params = new URLSearchParams(window.location.search);
  const urlQuery = params.get('q');
  if (urlQuery && searchInput) {
    searchInput.value = urlQuery;
    performSearch(urlQuery);
  }

  searchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = searchInput?.value.trim();
    if (value) performSearch(value);
  });
});
