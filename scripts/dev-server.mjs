import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const port = Number(process.argv[3] || 4173);
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'], ['.svg', 'image/svg+xml'],
]);
const deniedRoots = new Set(['.git', 'dist', 'artifacts', 'deployments', '.focus', 'scripts', 'tests', 'config', 'docs']);

const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent((request.url || '/').split('?')[0]);
  const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  if (deniedRoots.has(relative.split('/')[0])) { response.writeHead(404).end('Not found'); return; }
  const candidate = path.resolve(root, relative);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) { response.writeHead(403).end('Forbidden'); return; }
  fs.readFile(candidate, (error, data) => {
    if (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': mime.get(path.extname(candidate).toLowerCase()) || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(data);
  });
});
server.listen(port, '127.0.0.1', () => process.stdout.write(`FOCUS ARCHIVE DEV: http://127.0.0.1:${port}\n`));
