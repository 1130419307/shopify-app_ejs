// 1. 必须先导入 Node.js 适配器
import '@shopify/shopify-api/adapters/node';

import express from 'express';
import { shopifyApi } from '@shopify/shopify-api';

const app = express();
app.set('view engine', 'ejs');
app.set('views', './views');

// 2. 初始化 Shopify（保持你原来的代码不变）
const shopifyAppUrl = process.env.SHOPIFY_APP_URL || '';
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: ['read_products'],
  hostName: shopifyAppUrl.replace('https://', ''),
  apiVersion: '2025-01',
  isEmbeddedApp: true,
});

// 3. 后面的路由和启动代码保持不变
app.get('/', async (req, res) => {
  const shop = req.query.shop;
  if (!shop) {
    return res.send('<h3>请从 Shopify 后台打开应用</h3><p>错误：缺少 shop 参数</p>');
  }
  res.render('index', { shop, appUrl: process.env.SHOPIFY_APP_URL });
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on port', PORT);
});