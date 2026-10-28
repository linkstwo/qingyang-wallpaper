// 撤销/重做：快照式历史栈。快照 = 工程文档的 JSON 字符串（含全部图层与编辑）。
// 快照在上限内保留；超过上限丢最老的。撤销/重做返回反序列化后的文档。

export class History {
  constructor(limit = 100) { this.limit = limit; this.past = []; this.future = []; this.current = null; }
  // 初始化当前状态（不入栈）
  init(serialized) { this.past = []; this.future = []; this.current = serialized; }
  // 提交一个新状态：当前状态压入 past，future 清空。
  commit(serialized) {
    if (serialized === this.current) return false;
    this.past.push(this.current);
    if (this.past.length > this.limit) this.past.shift();
    this.current = serialized;
    this.future = [];
    return true;
  }
  canUndo() { return this.past.length > 0; }
  canRedo() { return this.future.length > 0; }
  undo() {
    if (!this.canUndo()) return null;
    this.future.push(this.current);
    this.current = this.past.pop();
    return this.current;
  }
  redo() {
    if (!this.canRedo()) return null;
    this.past.push(this.current);
    this.current = this.future.pop();
    return this.current;
  }
  stats() { return { undo: this.past.length, redo: this.future.length }; }
}
