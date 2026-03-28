import '@shopify/shopify-api/adapters/node';
import express from 'express';
import { shopifyApi, ApiVersion } from '@shopify/shopify-api';

const app = express();
app.set('view engine', 'ejs');
app.set('views', './views');

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: ['read_products', 'read_collections'],
  hostName: process.env.SHOPIFY_APP_URL?.replace('https://', '') || '',
  apiVersion: ApiVersion.January25,
  isEmbeddedApp: true,
});

// 首页路由
app.get('/', async (req, res) => {
  try {
    const shop = req.query.shop;
    if (!shop) return res.send('<h2>请从 Shopify 后台打开应用</h2>');

    let session;
    try {
      session = await shopify.sessionStorage.loadSession({ shop, isOnline: false });
    } catch (e) {
      return res.redirect(`/api/auth?shop=${shop}`);
    }
    if (!session) return res.redirect(`/api/auth?shop=${shop}`);

    const client = new shopify.clients.Rest({ session });
    let allCollections = [];
    let pageInfo = null;

    do {
      const result = await client.get({
        path: 'custom_collections',
        query: pageInfo ? { page_info: pageInfo } : { limit: 250 },
      });
      allCollections = allCollections.concat(result.body?.custom_collections || []);

      const link = result.headers?.link || '';
      const match = link.match(/page_info=([^&>]+)/);
      pageInfo = match ? match[1] : null;
    } while (pageInfo);

    res.render('index', { shop, collections: allCollections });
  } catch (err) {
    console.error(err);
    res.status(500).send('服务器错误');
  }
});

// OAuth 路由
app.get('/api/auth', async (req, res) => {
  const shop = req.query.shop;
  if (!shop) return res.status(400).send('缺少 shop');
  const route = await shopify.auth.begin({ shop, callbackPath: '/api/auth/callback', isOnline: false, rawRequest: req, rawResponse: res });
  res.redirect(route);
});

app.get('/api/auth/callback', async (req, res) => {
  try {
    const { session } = await shopify.auth.callback({ rawRequest: req, rawResponse: res });
    await shopify.sessionStorage.storeSession(session);
    res.redirect(`/?shop=${session.shop}`);
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, '0.0.0.0', () => console.log('服务已启动'));