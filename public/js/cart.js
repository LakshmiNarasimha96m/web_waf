async function loadCart() {
  const cartSummary = document.getElementById('cartSummary');
  const messageBox = document.getElementById('messageBox');

  if (!cartSummary || !messageBox) {
    return;
  }

  cartSummary.textContent = 'Loading cart...';
  messageBox.textContent = '';

  try {
    const response = await fetch('/api/cart');
    const data = await response.json();
    if (!response.ok) {
      cartSummary.textContent = '';
      messageBox.textContent = data.error || 'Unable to load cart.';
      return;
    }

    if (!data.items || !data.items.length) {
      cartSummary.innerHTML = '<p>Your cart is empty.</p>';
      return;
    }

    const list = document.createElement('ul');
    data.items.forEach((item) => {
      const entry = document.createElement('li');
      entry.innerHTML = `<strong>${item.name}</strong> (${item.quantity}) - ${item.price}`;
      list.appendChild(entry);
    });

    cartSummary.innerHTML = '';
    cartSummary.appendChild(list);
  } catch (error) {
    cartSummary.textContent = '';
    messageBox.textContent = 'Unable to load cart at this time.';
  }
}

async function clearCart() {
  const messageBox = document.getElementById('messageBox');
  if (!messageBox) return;
  try {
    const response = await fetch('/api/cart', { method: 'DELETE' });
    const data = await response.json();
    messageBox.textContent = data.message || 'Cart cleared.';
    await loadCart();
  } catch (error) {
    messageBox.textContent = 'Unable to clear cart right now.';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  const clearButton = document.getElementById('clearCart');
  clearButton?.addEventListener('click', (event) => {
    event.preventDefault();
    clearCart();
  });
});
