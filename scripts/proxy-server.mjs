import http from 'http';
import https from 'https';
import { URL } from 'url';

const PROXY_PORT = 9999;
// 激活服务的目标API地址
const ACTIVATION_API_BASE = 'http://localhost:15000';

console.log('🔒 Obsidian插件CORS代理服务器');
console.log('='.repeat(50));

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access, X-Signature, x-signature');

  if (req.method === 'OPTIONS') {
    console.log('[Proxy] 📋 OPTIONS 预检请求');
    console.log('[Proxy]    请求Headers:', JSON.stringify(req.headers));
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access, X-Signature, x-signature',
      'Access-Control-Max-Age': '3600'
    });
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('[Proxy] 📥 收到请求:', req.method, req.url);
      console.log('───────────────────────────────────────────────────────');

      const reqUrl = new URL(req.url, `http://localhost:${PROXY_PORT}`);
      let targetUrl = '';

      // 支持两种格式：
      // 1. /proxy?url=<目标URL> (原格式)
      // 2. /pays/api/<path> (激活服务格式)
      if (reqUrl.searchParams.get('url')) {
        targetUrl = decodeURIComponent(reqUrl.searchParams.get('url'));
        console.log('[Proxy] 🎯 目标URL:', targetUrl);
      } else if (req.url.startsWith('/pays/api/')) {
        // 激活服务路径，转发到激活API服务器
        const apiPath = req.url.replace('/pays', '');
        targetUrl = ACTIVATION_API_BASE + apiPath;
        console.log('[Proxy] 🎯 激活服务路径，转发到:', targetUrl);
      }

      if (!targetUrl) {
        console.log('[Proxy] ❌ 错误: 缺少目标URL');
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing target URL' }));
        return;
      }

      const parsedTarget = new URL(targetUrl);
      const isHttps = parsedTarget.protocol === 'https:';
      const hostname = parsedTarget.hostname;
      const port = parsedTarget.port || (isHttps ? 443 : 80);
      const path = parsedTarget.pathname + parsedTarget.search;

      console.log('[Proxy] 🔗 协议:', isHttps ? 'HTTPS' : 'HTTP');
      console.log('[Proxy] 🌐 主机:', hostname);
      console.log('[Proxy] 📍 端口:', port);
      console.log('[Proxy] 📜 路径:', path);

      const headers = {};
      Object.keys(req.headers).forEach(key => {
        const lowerKey = key.toLowerCase();
        // 过滤掉不需要转发的headers，但保留x-signature和x-api-key
        if (!['host', 'origin', 'referer', 'x-target-url'].includes(lowerKey)) {
          headers[key] = req.headers[key];
        }
      });

      console.log('[Proxy] 📋 请求Headers:');
      Object.keys(headers).forEach(key => {
        console.log(`       ${key}: ${headers[key]}`);
      });

      if (body) {
        console.log('[Proxy] 📤 请求Body:', body.substring(0, 500) + (body.length > 500 ? '...' : ''));
      }

      console.log('[Proxy] ⏳ 正在转发请求到目标服务器...');

      const proxyReq = (isHttps ? https : http).request({
        hostname,
        port,
        path,
        method: req.method,
        headers
      }, (proxyRes) => {
        console.log('[Proxy] 📥 收到目标响应:');
        console.log('[Proxy]    状态码:', proxyRes.statusCode);
        console.log('[Proxy]    状态文本:', proxyRes.statusMessage);

        const responseHeaders = {
          ...Object.fromEntries(Object.entries(proxyRes.headers).filter(([k]) =>
            !['access-control-allow-origin'].includes(k.toLowerCase())
          )),
          'Access-Control-Allow-Origin': '*'
        };

        res.writeHead(proxyRes.statusCode, responseHeaders);

        let proxyBody = '';
        proxyRes.on('data', chunk => {
          proxyBody += chunk;
          res.write(chunk);
        });

        proxyRes.on('end', () => {
          console.log('[Proxy] 📦 响应Body:', proxyBody.substring(0, 1000) + (proxyBody.length > 1000 ? '...' : ''));
          if (proxyRes.statusCode >= 400) {
            console.log('[Proxy] ⚠️ 错误响应 (状态码 >= 400)');
          }
          console.log('[Proxy] ✅ 请求完成');
          console.log('═══════════════════════════════════════════════════════');
          res.end();
        });
      });

      proxyReq.on('error', (e) => {
        console.error('[Proxy] ❌ 代理错误:', e.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy error', message: e.message }));
      });

      if (body) {
        proxyReq.write(body);
      }
      proxyReq.end();

    } catch (error) {
      console.error('[Proxy] ❌ 处理错误:', error.message);
      console.error('[Proxy]    堆栈:', error.stack);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
    }
  });
});

server.listen(PROXY_PORT, () => {
  console.log(`✅ 代理服务器已启动: http://localhost:${PROXY_PORT}`);
  console.log('');
  console.log('📝 使用方法：');
  console.log(`  请求格式: http://localhost:${PROXY_PORT}/proxy?url=<编码后的目标URL>`);
  console.log(`  激活服务: http://localhost:${PROXY_PORT}/pays/api/<path>`);
  console.log('');
  console.log('='.repeat(50));
  console.log('🚀 现在可以使用第三方API了！');
});