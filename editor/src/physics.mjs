// 物理：直接复用已验收样片 rig.mjs 的 Spring（半隐式欧拉、子步进、限幅+速度衰减）。
// 编辑器工程里的 spring 参数（frequency/damping/limit）在运行时注入 Spring 实例。
import { Spring as ProtoSpring, demoInput } from '../../character-prototype/preview/rig.mjs';
export { ProtoSpring as Spring, demoInput };

export function springFromConfig(cfg) {
  return new ProtoSpring({
    frequency: cfg.frequency, damping: cfg.damping, limit: cfg.limit,
  });
}

// 三组弹簧（body/chest/hair），X/Y 各一，与 app.mjs 相同的命名与激发方式。
export class SpringBank {
  constructor(layerSpring) {
    const mk = () => springFromConfig(layerSpring);
    this.bodyX = mk(); this.bodyY = mk();
    this.chestX = mk(); this.chestY = mk();
    this.hairX = mk();
  }
  reset() { for (const s of Object.values(this)) if (s instanceof ProtoSpring) s.reset(); }
  // 输入：角加速度 ax/ay（已限幅）。gains 来自图层.springGains；limits 来自图层.limits。
  // 返回可视位移 [bx,by,cx,cy,hair]（像素，已乘 limits），与 app.mjs visualValues 同义。
  step(ax, ay, gains, limits, dt) {
    const bx = this.bodyX.step(-ax * gains.body, dt);
    const by = this.bodyY.step(-ay * gains.body, dt);
    const cx = this.chestX.step(-ax * gains.chestX - bx * gains.chestCoupling, dt);
    const cy = this.chestY.step(-ay * gains.chestY - by * gains.chestCouplingY, dt);
    const hair = this.hairX.step(-ax * gains.hair, dt);
    return [bx * limits.bodyPixels, by * limits.bodyPixels, cx * limits.chestPixels, cy * limits.chestPixels, hair * limits.hairPixels];
  }
}

// 视角跟踪 + 角加速度计算（与 app.mjs physics() 相同公式，dt 显式传入以便测试）。
export class ViewTracker {
  constructor() { this.view = { x: 0, y: 0 }; this.prevV = { x: 0, y: 0 }; this.target = { x: 0, y: 0 }; }
  reset() { this.view = { x: 0, y: 0 }; this.prevV = { x: 0, y: 0 }; this.target = { x: 0, y: 0 }; }
  // 返回 [ax, ay] 角加速度（已限幅 ±180）
  update(target, dt) {
    const clampV = (v, a, b) => Math.max(a, Math.min(b, v));
    this.target = target;
    const old = { ...this.view };
    const s = 1 - Math.exp(-dt * 12);
    this.view.x += (target.x - this.view.x) * s;
    this.view.y += (target.y - this.view.y) * s;
    const vx = (this.view.x - old.x) / dt, vy = (this.view.y - old.y) / dt;
    const ax = clampV((vx - this.prevV.x) / dt, -180, 180);
    const ay = clampV((vy - this.prevV.y) / dt, -180, 180);
    this.prevV = { x: vx, y: vy };
    return [ax, ay];
  }
}
