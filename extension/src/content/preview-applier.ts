import { isValidSelector, OVERLAY_ATTRIBUTE, queryAll } from './dom-utils'
import { buildCssRule } from '@shared/css/style-builder'
import type { PreviewRule } from '../shared/messages'

// 用 class 而非 id,与将来 runtime 注入的 <style id="saas-ui-override"> 区分
const PREVIEW_CLASS = 'saas-ui-override-preview'

let styleEl: HTMLStyleElement | null = null

/**
 * 预览改动的原始状态记录:恢复时把页面改回改动前。
 * class:记录每个元素每个 class 原本是否存在;attribute:记录原值(null = 原本无此属性)。
 */
const classBackups = new Map<Element, Map<string, boolean>>()
const attrBackups = new Map<Element, Map<string, string | null>>()

/** 应用整个 config 的预览:所有 enabled rule 叠加(方案第 24 章:作用于全部匹配元素) */
export function applyPreview(rules: PreviewRule[]): void {
  const enabled = rules.filter((rule) => rule.enabled)

  const cssParts: string[] = []
  for (const rule of enabled) {
    if (isValidSelector(rule.selector)) {
      const css = buildCssRule(rule.selector, rule.styles)
      if (css) cssParts.push(css)
    }
    // Custom CSS 作为全局 CSS 原样注入,不改写、不加 !important
    if (rule.customCss.trim()) cssParts.push(rule.customCss)
  }
  const cssText = cssParts.join('\n\n')
  if (!cssText) {
    removeStyleEl()
  } else if (ensureStyleEl().textContent !== cssText) {
    styleEl!.textContent = cssText
  }

  revertDomChanges()
  for (const rule of enabled) {
    if (!isValidSelector(rule.selector)) continue
    const hasClasses = rule.classes.add.length > 0 || rule.classes.remove.length > 0
    const attrEntries = Object.entries(rule.attributes).filter(([, value]) => value.trim() !== '')
    if (!hasClasses && attrEntries.length === 0) continue
    for (const el of queryAll(rule.selector)) {
      for (const cls of rule.classes.remove) setClassPreview(el, cls, false)
      for (const cls of rule.classes.add) setClassPreview(el, cls, true)
      for (const [name, value] of attrEntries) setAttrPreview(el, name, value)
    }
  }
}

export function clearPreview(): void {
  removeStyleEl()
  revertDomChanges()
}

function removeStyleEl(): void {
  styleEl?.remove()
  styleEl = null
}

function ensureStyleEl(): HTMLStyleElement {
  if (styleEl?.isConnected) return styleEl
  const el = document.createElement('style')
  el.className = PREVIEW_CLASS
  el.setAttribute(OVERLAY_ATTRIBUTE, '')
  ;(document.head ?? document.documentElement).appendChild(el)
  styleEl = el
  return el
}

function setClassPreview(el: Element, cls: string, present: boolean): void {
  let backup = classBackups.get(el)
  if (!backup) {
    backup = new Map()
    classBackups.set(el, backup)
  }
  if (!backup.has(cls)) backup.set(cls, el.classList.contains(cls))
  el.classList.toggle(cls, present)
}

function setAttrPreview(el: Element, name: string, value: string): void {
  let backup = attrBackups.get(el)
  if (!backup) {
    backup = new Map()
    attrBackups.set(el, backup)
  }
  if (!backup.has(name)) backup.set(name, el.getAttribute(name))
  el.setAttribute(name, value)
}

function revertDomChanges(): void {
  for (const [el, backup] of classBackups) {
    for (const [cls, originallyPresent] of backup) el.classList.toggle(cls, originallyPresent)
  }
  classBackups.clear()
  for (const [el, backup] of attrBackups) {
    for (const [name, original] of backup) {
      if (original === null) el.removeAttribute(name)
      else el.setAttribute(name, original)
    }
  }
  attrBackups.clear()
}
