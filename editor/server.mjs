// 轻漾 2.5D 编辑器本机服务器：零依赖静态文件服务（node 内置 http）。
// 启动：node editor/server.mjs  [端口默认 8644]
// 仅监听 127.0.0.1；MIME 覆盖 .mjs（ES module 必须 text/javascript）。
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] ?? 8644);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webm': 'video/webm',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.bin': 'application/octet-stream', '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    let p = decodeURIComponent(url.pathname);
    if (p === '/') {
      // 必须重定向而不是替换内容：相对 import 的解析基准是浏览器地址栏 URL
      res.writeHead(302, { Location: '/editor/index.html' });
      res.end();
      return;
    }
    const file = path.normalize(path.join(ROOT, p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
    if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end('not found: ' + p); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(500); res.end(String(e.message));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`轻漾 2.5D 编辑器: http://127.0.0.1:${PORT}/  (根目录 ${ROOT})`);
});
