/**
 * 方案第 12 章:classes.add / classes.remove 应用到所有匹配元素。
 * 记录每个元素每个 class 的原始状态,destroy 时恢复。
 * 写入前对比当前值,只有不一致才写——runtime 自身的写入不会触发再次写入(防 observer 循环,方案第 23 章);
 * 外部(如 Vue 重渲染)把 class 冲掉时,下次 sync 会发现不一致并重新应用。
 */
export class ClassApplier {
  /** el → (className → 原本是否存在) */
  private originals = new Map<Element, Map<string, boolean>>()

  apply(el: Element, add: readonly string[], remove: readonly string[]): void {
    for (const cls of remove) this.set(el, cls, false)
    for (const cls of add) this.set(el, cls, true)
  }

  restoreAll(): void {
    for (const [el, backup] of this.originals) {
      for (const [cls, originallyPresent] of backup) {
        el.classList.toggle(cls, originallyPresent)
      }
    }
    this.originals.clear()
  }

  /** 清理已从 DOM 移除元素的备份,避免泄漏 */
  prune(): void {
    for (const el of this.originals.keys()) {
      if (!el.isConnected) this.originals.delete(el)
    }
  }

  private set(el: Element, cls: string, present: boolean): void {
    let backup = this.originals.get(el)
    if (!backup) {
      backup = new Map()
      this.originals.set(el, backup)
    }
    if (!backup.has(cls)) backup.set(cls, el.classList.contains(cls))
    if (el.classList.contains(cls) !== present) el.classList.toggle(cls, present)
  }
}
