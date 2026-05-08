let cartItems = [
  { id: 'A100', name: 'Abstract oil painting', price: '$69.99', quantity: 1 },
  { id: 'C200', name: 'Modern sculpture', price: '$89.99', quantity: 1 }
];

export default function handler(req, res) {
  // Allow this endpoint to be called from static pages hosted on a different origin.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ items: cartItems });
  }

  if (req.method === 'DELETE') {
    cartItems = [];
    return res.status(200).json({ items: cartItems, message: 'Cart cleared.' });
  }

  return res.status(405).json({ error: 'Only GET and DELETE are allowed for cart.' });
}
