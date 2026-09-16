/** 扩展注入页面的所有元素 / class 统一前缀,避免污染宿主页面 */
export const EXTENSION_PREFIX = 'saas-ui-override-'

/** 扩展注入的浮层容器标识,选择器生成与匹配统计时必须排除 */
export const OVERLAY_ATTRIBUTE = 'data-saas-ui-override-overlay'

export function isExtensionElement(el: Element): boolean {
  return el.closest(`[${OVERLAY_ATTRIBUTE}]`) !== null
}

/** 查询匹配元素,排除扩展自身注入的浮层;selector 语法错误返回空数组 */
export function queryAll(selector: string): Element[] {
  try {
    return Array.from(document.querySelectorAll(selector)).filter((el) => !isExtensionElement(el))
  } catch {
    return []
  }
}

/** 匹配数统计:0 = 未匹配,1 = 理想,>1 = 不够精确,null = 无效 selector */
export function countMatches(selector: string): number | null {
  const trimmed = selector.trim()
  if (!trimmed) return null
  try {
    document.querySelectorAll(trimmed)
  } catch {
    return null
  }
  return queryAll(trimmed).length
}

/** selector 语法有效性 */
export function isValidSelector(selector: string): boolean {
  if (!selector.trim()) return false
  try {
    document.querySelectorAll(selector)
    return true
  } catch {
    return false
  }
}

/**
 * 检测 class 对应的 CSS 是否存在于页面样式表(方案第 14 章)。
 * 跨域 stylesheet 访问 cssRules 会抛 SecurityError,捕获后跳过,绝不向页面抛错。
 */
export function classCssExists(className: string): boolean {
  const needle = `.${CSS.escape(className)}`
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    if (rulesContainSelector(rules, needle)) return true
  }
  return false
}

function rulesContainSelector(rules: CSSRuleList, needle: string): boolean {
  for (const rule of rules) {
    if (rule instanceof CSSStyleRule && rule.selectorText.includes(needle)) return true
    if (rule instanceof CSSGroupingRule && rulesContainSelector(rule.cssRules, needle)) return true
  }
  return false
}
