// 临时 APK 下载服务：/qingyang.apk 直接下载活人感版候选包。仅本机监听，公网由 cloudflared 隧道暴露。
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', '轻漾-2.5D-候选包-活人感版-debug.apk');

if (!existsSync(APK)) {
  console.error('APK 不存在: ' + APK);
  process.exit(1);
}
const apkBytes = readFileSync(APK);
console.log(`[serve] APK ready: ${apkBytes.length} bytes`);

const server = http.createServer((req, res) => {
  if (req.url === '/qingyang.apk' || req.url === '/apk') {
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': apkBytes.length,
      'Content-Disposition': 'attachment; filename="qingyang-lifelike-debug.apk"',
    });
    res.end(apkBytes);
    console.log(`[serve] ${req.url} -> ${new Date().toLocaleTimeString()} 已发送`);
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('轻漾活人感版候选包下载：手机浏览器打开 /qingyang.apk\n');
});

server.listen(8800, '127.0.0.1', () => console.log('[serve] listening 127.0.0.1:8800'));
