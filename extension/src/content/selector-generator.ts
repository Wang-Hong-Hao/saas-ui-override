import { EXTENSION_PREFIX, queryAll } from './dom-utils'

const MAX_ANCESTOR_DEPTH = 6

/** 过滤扩展自身注入的 class,避免 selector 依赖插件 */
function usableClasses(el: Element): string[] {
  return Array.from(el.classList).filter((c) => c.trim() !== '' && !c.startsWith(EXTENSION_PREFIX))
}

function tagName(el: Element): string {
  return el.tagName.toLowerCase()
}

function isUniqueFor(el: Element, selector: string): boolean {
  const matches = queryAll(selector)
  return matches.length === 1 && matches[0] === el
}

function idSelector(id: string): string {
  return `#${CSS.escape(id)}`
}

function classSelector(classes: string[]): string {
  return `.${classes.map((c) => CSS.escape(c)).join('.')}`
}

/** 路径段:优先 #id,其次 .class,最后 tag */
function segmentFor(el: Element): string {
  const id = el.id.trim()
  if (id) return idSelector(id)
  const classes = usableClasses(el)
  if (classes.length > 0) return classSelector(classes)
  return tagName(el)
}

function nthOfTypeSegment(el: Element): string {
  const tag = tagName(el)
  const parent = el.parentElement
  if (!parent) return tag
  const sameTagSiblings = Array.from(parent.children).filter((s) => tagName(s) === tag)
  const index = sameTagSiblings.indexOf(el) + 1
  return `${tag}:nth-of-type(${index})`
}

/** 逐级向上拼接祖先路径,每级验证唯一性;无法唯一时返回 null */
function buildPath(el: Element, ownSegment: string): string | null {
  let path = ownSegment
  let ancestor = el.parentElement
  let depth = 0
  while (ancestor && ancestor !== document.documentElement && depth < MAX_ANCESTOR_DEPTH) {
    path = `${segmentFor(ancestor)} ${path}`
    if (isUniqueFor(el, path)) return path
    ancestor = ancestor.parentElement
    depth += 1
  }
  return null
}

function fullNthOfTypePath(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el
  while (current && current !== document.documentElement && parts.length < MAX_ANCESTOR_DEPTH + 2) {
    parts.unshift(nthOfTypeSegment(current))
    current = current.parentElement
  }
  return parts.join(' > ')
}

/**
 * 按方案第 7.1 章优先级生成稳定短 selector:
 * 唯一 ID → 唯一 class → class 组合 → 父级 + class → 多级父级路径 → nth-of-type
 * 每个候选都用 querySelectorAll 验证唯一性(排除扩展注入元素)。
 */
export function generateSelector(el: Element): string {
  const id = el.id.trim()
  if (id) {
    const candidate = idSelector(id)
    if (isUniqueFor(el, candidate)) return candidate
  }

  const classes = usableClasses(el)
  const tag = tagName(el)

  for (const c of classes) {
    const candidate = classSelector([c])
    if (isUniqueFor(el, candidate)) return candidate
  }

  if (classes.length >= 2) {
    const candidate = classSelector(classes)
    if (isUniqueFor(el, candidate)) return candidate
  }
  for (const c of classes) {
    const candidate = `${tag}.${CSS.escape(c)}`
    if (isUniqueFor(el, candidate)) return candidate
  }

  const ownSegment = classes.length > 0 ? classSelector([classes[0]!]) : tag
  const viaAncestors = buildPath(el, ownSegment)
  if (viaAncestors) return viaAncestors

  const viaNthOfType = buildPath(el, nthOfTypeSegment(el))
  if (viaNthOfType) return viaNthOfType

  return fullNthOfTypePath(el)
}
