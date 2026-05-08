import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import searchHandler from './api/search.js';
import loginHandler from './api/login.js';
import registerHandler from './api/register.js';
import cartHandler from './api/cart.js';
import wafHandler from './api/waf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/search', searchHandler);
app.post('/api/login', loginHandler);
app.post('/api/register', registerHandler);
app.get('/api/cart', cartHandler);
app.delete('/api/cart', cartHandler);
app.all('/api/waf', wafHandler);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
