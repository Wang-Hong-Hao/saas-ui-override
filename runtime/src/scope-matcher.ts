/**
 * scope.path 语义(方案第 17 章):
 * - 缺失 / 空 → 全站生效
 * - '/exam' 或 '/exam/*' → 精确匹配 /exam,或匹配其子路径(/exam/...)
 * 两种写法等价,'/*' 只是显式后缀;不会误配 /examination(边界为 / 或结尾)。
 */
export function matchScope(path: string | undefined, pathname: string): boolean {
  const pattern = path?.trim()
  if (!pattern) return true
  const base = pattern.endsWith('/*') ? pattern.slice(0, -2) : pattern
  if (!base) return true
  return pathname === base || pathname.startsWith(`${base}/`)
}

/**
 * 有效路径:支持 hash 路由的 SaaS(如 Vue Router hash 模式)。
 * hash 以 '#/' 开头时,取 hash 中 '#/' 之后、'?' 之前的部分作为路径
 * ('/wsbm/#/guidePage?vhost=2025' → '/guidePage');否则回退 location.pathname。
 */
export function effectivePathname(): string {
  const hash = location.hash
  if (hash.startsWith('#/')) {
    const body = hash.slice(1)
    const queryIndex = body.indexOf('?')
    const path = (queryIndex >= 0 ? body.slice(0, queryIndex) : body).trim()
    if (path) return path
  }
  return location.pathname
}
