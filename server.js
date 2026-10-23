/**
 * server.js — Minimal Node.js HTTP server
 * Serves static files and exposes /api/sync endpoint (store-and-forward simulation)
 */
const http = require('node:http');
const fs   = require('node:fs/promises');
const path = require('node:path');

const root        = __dirname;
const port        = Number(process.env.PORT || 4173);
const recordsFile = path.join(root, 'clinic-records.json');

const MIME = {
  '.html':        'text/html; charset=utf-8',
  '.js':          'text/javascript; charset=utf-8',
  '.css':         'text/css; charset=utf-8',
  '.svg':         'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.json':        'application/json',
  '.webp':        'image/webp',
  '.png':         'image/png',
};

/** Read request body as JSON */
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8 * 1024 * 1024) throw new Error('payload too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** Append a sync record to the local clinic-records.json */
async function appendRecord(payload) {
  let records = [];
  try { records = JSON.parse(await fs.readFile(recordsFile, 'utf8')); } catch { /* first time */ }
  records.push({ receivedAt: new Date().toISOString(), payload });
  await fs.writeFile(recordsFile, JSON.stringify(records, null, 2));
}

const server = http.createServer(async (req, res) => {
  // ── POST /api/sync ─────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/sync') {
    try {
      const data = await readBody(req);
      await appendRecord(data);
      res.writeHead(202, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ accepted: true, receivedAt: new Date().toISOString() }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ accepted: false, message: err.message }));
    }
  }

  // ── Static file serving ────────────────────────────────────────────
  const urlPath = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
  const filePath = path.resolve(root, '.' + urlPath);

  // Path traversal guard
  if (!filePath.startsWith(root + path.sep) && filePath !== root) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    const content  = await fs.readFile(filePath);
    const ext      = path.extname(filePath);
    const mimeType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type':  mimeType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(content);
  } catch {
    // SPA fallback
    try {
      const html = await fs.readFile(path.join(root, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(html);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
});

server.listen(port, () => {
  console.log(`\n  🌿 Noor rodando em  http://localhost:${port}\n`);
});
