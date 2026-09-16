import { buildCssRule } from '@shared/css/style-builder'
import type { UIRule, UIConfig } from '@shared/types/config'
import { matchScope, effectivePathname } from './scope-matcher'
import { CssInjector } from './css-injector'
import { ClassApplier } from './class-applier'
import { AttributeApplier } from './attribute-applier'

const LOG_PREFIX = '[UI Override]'

function isValidSelector(selector: string): boolean {
  if (!selector.trim()) return false
  try {
    document.querySelectorAll(selector)
    return true
  } catch {
    return false
  }
}

/**
 * 方案第 31 章 rule-engine:遍历 enabled + scope 匹配的 rule,应用 styles/classes/attributes/customCss。
 * 方案第 24 章:一个 selector 匹配多个元素时全部应用。
 */
export class RuleEngine {
  private config: UIConfig | null = null
  private readonly injector = new CssInjector()
  private readonly classApplier = new ClassApplier()
  private readonly attributeApplier = new AttributeApplier()
  /** 已警告过的 rule(0 匹配 / 无效 selector):状态变化时才重复警告,debug 模式也不刷屏 */
  private readonly warnedRules = new Set<string>()
  private debug = false

  setDebug(debug: boolean): void {
    this.debug = debug
  }

  setConfig(config: UIConfig): void {
    this.config = config
    this.sync()
  }

  applyRule(rule: UIRule): void {
    if (!this.config) return
    const index = this.config.rules.findIndex((r) => r.id === rule.id)
    if (index >= 0) this.config.rules[index] = rule
    else this.config.rules.push(rule)
    this.sync()
  }

  removeRule(ruleId: string): void {
    if (!this.config) return
    this.config.rules = this.config.rules.filter((r) => r.id !== ruleId)
    this.sync()
  }

  /** rule 集合可能变化:先恢复原始状态再整体重应用,避免残留 */
  private sync(): void {
    this.classApplier.restoreAll()
    this.attributeApplier.restoreAll()
    this.applyAll()
  }

  /** 增量应用:只写与预期不一致的 DOM(observer 回调安全,不会循环) */
  applyAll(): void {
    const active = this.activeRules()

    const cssParts: string[] = []
    for (const rule of active) {
      if (isValidSelector(rule.selector)) {
        const css = buildCssRule(rule.selector, rule.styles)
        if (css) cssParts.push(css)
      }
      // Custom CSS 作为全局 CSS 原样注入(方案第 11 章),不自动加 !important
      if (rule.customCss.trim()) cssParts.push(rule.customCss)
    }
    this.injector.update(cssParts.join('\n\n'))

    for (const rule of active) {
      if (!isValidSelector(rule.selector)) {
        this.warnOnce(rule.id, `rule ${rule.id}: selector 无效「${rule.selector}」`)
        continue
      }
      const needsDom =
        rule.classes.add.length > 0 ||
        rule.classes.remove.length > 0 ||
        Object.values(rule.attributes).some((v) => v.trim() !== '')
      if (!needsDom && !this.debug) continue
      const elements = document.querySelectorAll(rule.selector)
      if (elements.length === 0) {
        // 方案第 40 章:仅 debug 模式输出
        this.warnOnce(rule.id, `rule ${rule.id}: selector「${rule.selector}」matched 0 elements`)
        continue
      }
      // 元素恢复匹配后清除警告记录,再次失配时可重新提示
      this.warnedRules.delete(rule.id)
      if (!needsDom) continue
      for (const el of elements) {
        this.classApplier.apply(el, rule.classes.add, rule.classes.remove)
        this.attributeApplier.apply(el, rule.attributes)
      }
    }

    this.classApplier.prune()
    this.attributeApplier.prune()
  }

  destroy(): void {
    this.injector.remove()
    this.classApplier.restoreAll()
    this.attributeApplier.restoreAll()
    this.config = null
  }

  private activeRules(): UIRule[] {
    if (!this.config) return []
    const pathname = effectivePathname()
    return this.config.rules.filter((rule) => rule.enabled && matchScope(rule.scope?.path, pathname))
  }

  private warnOnce(ruleId: string, message: string): void {
    if (!this.debug || this.warnedRules.has(ruleId)) return
    this.warnedRules.add(ruleId)
    console.warn(`${LOG_PREFIX} ${message}`)
  }
}
