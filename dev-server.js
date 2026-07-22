// Local dev server (pure Node, no Azure Functions tooling required).
// Serves the static frontend and runs the api/*/index.js handlers as HTTP
// endpoints — a drop-in for `swa start` when the Functions Core Tools don't
// support the installed Node version. Production still uses real Azure Functions.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 4280;

// Load api/local.settings.json Values into process.env (same as Functions does).
try {
  const settings = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'local.settings.json'), 'utf8'));
  Object.assign(process.env, settings.Values || {});
  console.log('Loaded local.settings.json env values.');
} catch { console.warn('No api/local.settings.json found — AI calls will fail until configured.'); }

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webp': 'image/webp',
};

function sendStatic(req, res) {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { // SPA fallback
      fs.readFile(path.join(ROOT, 'index.html'), (e2, idx) => {
        if (e2) { res.writeHead(404).end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' }).end(idx);
      });
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate', // always serve the latest during dev
    }).end(data);
  });
}

async function handleApi(req, res, name, body) {
  const handlerPath = path.join(ROOT, 'api', name, 'index.js');
  if (!fs.existsSync(handlerPath)) { res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: `No function: ${name}` })); return; }
  const handler = require(handlerPath);
  const query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
  const context = {
    log: Object.assign((...a) => console.log(`[${name}]`, ...a), {
      error: (...a) => console.error(`[${name}]`, ...a),
      warn: (...a) => console.warn(`[${name}]`, ...a),
      info: (...a) => console.log(`[${name}]`, ...a),
    }),
    res: undefined,
  };
  const azReq = { method: req.method, url: req.url, headers: req.headers, query, body };
  try {
    await handler(context, azReq);
    const r = context.res || { status: 204, body: '' };
    const payload = typeof r.body === 'string' ? r.body : JSON.stringify(r.body ?? '');
    res.writeHead(r.status || 200, { 'Content-Type': 'application/json', ...(r.headers || {}) }).end(payload);
  } catch (e) {
    console.error(`[${name}] unhandled`, e);
    res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: e.message }));
  }
}

const server = http.createServer((req, res) => {
  const pathname = req.url.split('?')[0];
  if (pathname.startsWith('/api/')) {
    const name = pathname.split('/')[2];
    if (req.method === 'GET') return handleApi(req, res, name, undefined);
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      let body = {};
      try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
      handleApi(req, res, name, body);
    });
    return;
  }
  sendStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`\n  VisionOne Career Hub running at  http://localhost:${PORT}\n`);
});
