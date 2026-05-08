/**
 * register.js
 * Submits registration form to /api/register (server-side).
 * Server calls the AI firewall. If blocked, server returns {blocked:true}.
 * Client only displays the result — never decides to block on its own.
 */

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showWafBlock(messageBox) {
  messageBox.innerHTML = `
    <div style="background:#1a0a0a;border:2px solid #e53e3e;border-radius:8px;padding:16px;color:#fc8181;font-family:sans-serif;margin-top:8px">
      <div style="font-size:1.1rem;font-weight:700;margin-bottom:6px">&#x1F6A8; Your request was blocked by the security firewall.</div>
      <div style="font-size:0.88rem;color:#fca5a5">Suspicious input was detected and logged. If this was a mistake, contact the administrator.</div>
    </div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const messageBox   = document.getElementById('messageBox');

  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username')?.value.trim();
    const email    = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;

    if (!username || !email || !password) {
      messageBox.textContent = 'All fields are required.';
      return;
    }

    messageBox.innerHTML = '<span style="color:#aaa">Registering...</span>';

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();

      // ── WAF blocked ──────────────────────────────────────────────────────
      if (data.blocked === true) {
        showWafBlock(messageBox);
        return;
      }

      if (!res.ok) {
        messageBox.textContent = data.error || 'Registration failed.';
        return;
      }

      messageBox.textContent = data.message || 'Registration successful!';
      setTimeout(() => { window.location.href = './login.html'; }, 1000);

    } catch (err) {
      messageBox.innerHTML = '<span style="color:red">&#x274C; Unable to register. Please try again.</span>';
    }
  });
});
