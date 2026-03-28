// 1. 必须先导入适配器
import '@shopify/shopify-api/adapters/node';

import express from 'express';
import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';

const app = express();
app.set('view engine', 'ejs');
app.set('views', './views');

// 2. 初始化 Shopify（修复版）
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: ['read_products', 'read_collections'],
  hostName: process.env.SHOPIFY_APP_URL?.replace('https://', '') || '',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  restResources: {},
});

// 3. 首页：安全获取所有系列
app.get('/', async (req, res) => {
  try {
    const shop = req.query.shop;
    if (!shop) {
      return res.send('<h2>请从 Shopify 后台打开应用</h2>');
    }

    // 加载 session（安全版）
    let session;
    try {
      session = await shopify.sessionStorage.loadSession({
        shop,
        isOnline: false,
      });
    } catch (e) {
      return res.redirect(`/api/auth?shop=${shop}`);
    }

    if (!session) {
      return res.redirect(`/api/auth?shop=${shop}`);
    }

    // 获取所有自定义系列
    const client = new shopify.clients.Rest({ session });
    let allCollections = [];
    let pageInfo = null;

    do {
      const result = await client.get({
        path: 'custom_collections',
        query: pageInfo ? { page_info: pageInfo } : { limit: 250 },
      });

      const collections = result.body?.custom_collections || [];
      allCollections = allCollections.concat(collections);

      // 安全解析下一页
      const link = result.headers?.link || '';
      const match = link.match(/page_info=([^&>]+)/);
      pageInfo = match ? match[1] : null;
    } while (pageInfo);

    // 渲染页面
    res.render('index', {
      shop: shop,
      collections: allCollections,
    });

  } catch (error) {
    console.error('页面错误：', error);
    res.status(500).send('服务器错误，请检查应用权限或重新安装');
  }
});

// 4. OAuth 授权（必须！否则永远报错）
app.get('/api/auth', async (req, res) => {
  const shop = req.query.shop;
  if (!shop) return res.status(400).send('缺少 shop');

  const route = await shopify.auth.begin({
    shop,
    callbackPath: '/api/auth/callback',
    isOnline: false,
    rawRequest: req,
    rawResponse: res,
  });

  res.redirect(route);
});

app.get('/api/auth/callback', async (req, res) => {
  try {
    const { session } = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    await shopify.sessionStorage.storeSession(session);
    res.redirect(`/?shop=${session.shop}`);
  } catch (err) {
    console.error('授权失败', err);
    res.redirect('/');
  }
});

// 启动服务
const PORT = process.env.PORT || 8081;
app.listen(PORT, '0.0.0.0', () => {
  console.log('服务已启动：', PORT);
});