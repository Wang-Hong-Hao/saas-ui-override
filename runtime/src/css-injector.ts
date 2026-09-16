/** 方案第 20 章:单个 <style id="saas-ui-override"> 汇总注入 */
const STYLE_ID = 'saas-ui-override'

export class CssInjector {
  private styleEl: HTMLStyleElement | null = null

  update(cssText: string): void {
    if (!cssText) {
      this.remove()
      return
    }
    const el = this.ensure()
    if (el.textContent !== cssText) el.textContent = cssText
  }

  remove(): void {
    this.styleEl?.remove()
    this.styleEl = null
  }

  private ensure(): HTMLStyleElement {
    if (this.styleEl?.isConnected) return this.styleEl
    const el = document.createElement('style')
    el.id = STYLE_ID
    ;(document.head ?? document.documentElement).appendChild(el)
    this.styleEl = el
    return el
  }
}
