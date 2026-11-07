// 商品化：本地自动保存/恢复、最近工程、帮助内容。
// 存储用 localStorage（同步、够用：工程 JSON 典型 <100KB，含缩略资产可能数 MB，超限降级仅存元数据）。

const K_AUTOSAVE = 'qingyang-autosave-v1';
const K_AUTOSAVE_TIME = 'qingyang-autosave-time-v1';
const K_RECENT = 'qingyang-recent-v1';
const K_SETTINGS = 'qingyang-settings-v1';

export function saveAutosave(projectJson) {
  try {
    localStorage.setItem(K_AUTOSAVE, projectJson);
    localStorage.setItem(K_AUTOSAVE_TIME, new Date().toISOString());
    return true;
  } catch (e) {
    // 超限：丢弃自动保存（手动保存仍可用），不打断工作
    console.warn('autosave 存储失败（可能超配额）:', e.message);
    return false;
  }
}

export function loadAutosave() {
  const json = localStorage.getItem(K_AUTOSAVE);
  const time = localStorage.getItem(K_AUTOSAVE_TIME);
  return json ? { json, time } : null;
}

export function clearAutosave() {
  localStorage.removeItem(K_AUTOSAVE);
  localStorage.removeItem(K_AUTOSAVE_TIME);
}

// 最近工程：[{name, time, json}]，最多 5 份，超出丢弃最老
export function pushRecent(name, projectJson) {
  try {
    let list = JSON.parse(localStorage.getItem(K_RECENT) ?? '[]');
    list = list.filter(item => item.json !== projectJson);
    list.unshift({ name, time: new Date().toISOString(), json: projectJson });
    list = list.slice(0, 5);
    localStorage.setItem(K_RECENT, JSON.stringify(list));
    return list;
  } catch (e) {
    console.warn('最近工程存储失败:', e.message);
    return [];
  }
}

export function listRecent() {
  try { return JSON.parse(localStorage.getItem(K_RECENT) ?? '[]'); } catch { return []; }
}

// 用户设置（UI 偏好等）
export function saveSettings(obj) {
  try { localStorage.setItem(K_SETTINGS, JSON.stringify(obj)); } catch { /* 忽略 */ }
}
export function loadSettings() {
  try { return JSON.parse(localStorage.getItem(K_SETTINGS) ?? '{}'); } catch { return {}; }
}

export const HELP_CONTENT = `
## 快速上手

1. **编辑**：左侧选图层 → 画布上拖青色控制点改形变 → 右侧面板调弹簧/区域场参数
2. **蒙版**：选"多边形"工具在画布点 3+ 下再双击闭合（目标可切"蒙版多边形"或"接触固定区"）
3. **预览**：▶ 播放演示 / 移动指针手动预览 / 单步 / 复位
4. **参考**：左下"视角参考"点击放大侧面/背面对照
5. **保存**：Ctrl+S 下载工程文件；打开工程从文件选择

## 快捷键

| 键 | 功能 |
|---|---|
| Ctrl+Z / Ctrl+Shift+Z | 撤销 / 重做 |
| Ctrl+Y | 重做 |
| Ctrl+S | 保存工程 |
| 1 / 2 / 3 / 4 | 切换 选择/多边形/画笔/擦除 工具 |
| 空格 | 播放 / 暂停演示 |
| F | 复位（视角与弹簧归零） |

## 数据安全

- **自动保存**：每次编辑约 3 秒后自动快照到浏览器（关页面不丢，恢复时提示确认）
- **手动保存**：Ctrl+S 下载 .qingyang.json 工程文件（唯一完整备份方式）
- **接触固定区**（红点）拖不动是设计行为：手/图纸/坐姿在壁纸里必须钉死

## 已知边界

- 连续视角真实范围 ±0.35（超出为同曲面滑移，不冒充侧背）
- 自动保存在浏览器"清除站点数据"后会丢失；重要工作请 Ctrl+S
`;
