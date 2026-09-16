/**
 * 方案第 22 章:MutationObserver 监听动态 DOM。
 * childList 捕获新增/替换节点;attributes(class/src/href/alt)捕获外部原地改写(如框架重渲染冲掉 class)。
 * 回调用微任务合并,一次变更批次只触发一次 sync。
 */
export class DomObserver {
  private observer: MutationObserver | null = null
  private scheduled = false
  private readonly onChange: () => void

  constructor(onChange: () => void) {
    this.onChange = onChange
  }

  start(): void {
    if (this.observer) return
    this.observer = new MutationObserver(() => this.schedule())
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'src', 'href', 'alt'],
    })
  }

  stop(): void {
    this.observer?.disconnect()
    this.observer = null
    this.scheduled = false
  }

  private schedule(): void {
    if (this.scheduled) return
    this.scheduled = true
    queueMicrotask(() => {
      this.scheduled = false
      if (this.observer) this.onChange()
    })
  }
}
