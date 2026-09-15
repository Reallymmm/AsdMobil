/**
 * Статический сервер веб-сборки LUCID.
 *
 *   npx expo export --platform web
 *   node tools/serve.mjs [порт=8080] [каталог=dist]
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] ?? 8080);
const root = path.resolve(process.argv[3] ?? path.join(here, '..', 'dist'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  } catch {
    urlPath = '/';
  }
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.join(root, urlPath);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404');
    return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`LUCID (web) → http://0.0.0.0:${port}  (каталог: ${root})`);
});
