import express from 'express';
import { shopifyApi } from '@shopify/shopify-api';

const app = express();

app.set('view engine', 'ejs');
app.set('views', './views');

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: ['read_products'],
  hostName: process.env.SHOPIFY_APP_URL.replace('https://', ''),
  apiVersion: '2025-01',
  isEmbeddedApp: true,
});

app.get('/', async (req, res) => {
  const shop = req.query.shop;

  if (!shop) {
    return res.send(`
      <h3>请从 Shopify 后台打开应用</h3>
      <p>错误：缺少 shop 参数</p>
    `);
  }

  res.render('index', {
    shop: shop,
    appUrl: process.env.SHOPIFY_APP_URL
  });
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on port', PORT);
});