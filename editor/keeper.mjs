// 编辑器服务器守护：server.mjs 被系统回收时 2 秒内自动拉起。
// 启动：node editor/keeper.mjs  （后台常驻）
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SERVER = new URL('./server.mjs', import.meta.url);
const PORT = process.argv[2] ?? 8644;

function start() {
  const child = spawn(process.execPath, [fileURLToPath(SERVER), String(PORT)], { stdio: 'inherit' });
  console.log(`[keeper] server started pid=${child.pid} port=${PORT}`);
  child.on('exit', (code) => {
    console.log(`[keeper] server exited code=${code}, restarting in 2s`);
    setTimeout(start, 2000);
  });
}
start();
