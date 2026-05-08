function escapeHtml(value) {
  return String(value).replace(/[&<>"]+/g, (match) => {
    switch (match) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return match;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('vulnweb.username');
  const userGreeting = document.getElementById('userGreeting');

  if (!userGreeting) {
    return;
  }

  if (username) {
    userGreeting.innerHTML = `Welcome, ${escapeHtml(username)} | <a href="#" id="logoutLink">Logout</a>`;
    const logoutLink = document.getElementById('logoutLink');
    logoutLink?.addEventListener('click', (event) => {
      event.preventDefault();
      localStorage.removeItem('vulnweb.username');
      window.location.reload();
    });
  } else {
    userGreeting.innerHTML = '<a href="./login.html">Login</a> | <a href="./register.html">Register</a>';
  }
});
