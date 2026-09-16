/**
 * 方案第 25 章:attributes 覆盖(img 的 src / alt,a 的 href 等)。
 * 与 ClassApplier 同理:记录原值(null = 原本无此属性),写入前对比防 observer 循环。
 */
export class AttributeApplier {
  /** el → (attribute → 原值) */
  private originals = new Map<Element, Map<string, string | null>>()

  apply(el: Element, attributes: Record<string, string>): void {
    for (const [name, value] of Object.entries(attributes)) {
      if (value.trim() === '') continue
      this.set(el, name, value)
    }
  }

  restoreAll(): void {
    for (const [el, backup] of this.originals) {
      for (const [name, original] of backup) {
        if (original === null) el.removeAttribute(name)
        else el.setAttribute(name, original)
      }
    }
    this.originals.clear()
  }

  prune(): void {
    for (const el of this.originals.keys()) {
      if (!el.isConnected) this.originals.delete(el)
    }
  }

  private set(el: Element, name: string, value: string): void {
    let backup = this.originals.get(el)
    if (!backup) {
      backup = new Map()
      this.originals.set(el, backup)
    }
    if (!backup.has(name)) backup.set(name, el.getAttribute(name))
    if (el.getAttribute(name) !== value) el.setAttribute(name, value)
  }
}
