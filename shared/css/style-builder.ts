import type { RuleStyles } from '../types/config'

/** camelCase → kebab-case(fontSize → font-size),content 预览与将来 runtime 复用 */
export function camelToKebab(prop: string): string {
  return prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
}

/**
 * 把可视化 styles 编译为一条 CSS 规则。
 * 按方案第 21 章,可视化 styles 默认加 !important;空值属性不输出(表示不覆盖)。
 * customCss 不经过此函数:按方案第 11 章作为全局 CSS 原样拼接,不改写、不加 !important。
 */
export function buildCssRule(selector: string, styles: RuleStyles): string {
  const trimmedSelector = selector.trim()
  if (!trimmedSelector) return ''
  const declarations = Object.entries(styles)
    .filter(([, value]) => value.trim() !== '')
    .map(([prop, value]) => `  ${camelToKebab(prop)}: ${value.trim()} !important;`)
  if (declarations.length === 0) return ''
  return `${trimmedSelector} {\n${declarations.join('\n')}\n}`
}
