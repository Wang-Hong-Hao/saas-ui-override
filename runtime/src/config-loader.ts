import { validateUIConfig } from '@shared/validation'
import type { UIConfig } from '@shared/types/config'

/** script 标签 data 属性(方案第 18 章) */
export interface ScriptOptions {
  customerId: string
  configUrl: string
  /** 配置版本号(方案第 38 章):追加为 ?v=N 穿透缓存 */
  configVersion: string
  debug: boolean
}

/** 常见的租户标识字段,用于 customerId 兜底 */
const TENANT_KEYS = ['vhost', 'customerId', 'customer_id', 'tenant', 'tenantId'] as const

export function readScriptOptions(script: HTMLOrSVGScriptElement | null): ScriptOptions | null {
  if (!script || !(script instanceof HTMLScriptElement)) return null
  const { customerId = '', configUrl = '', configVersion = '', debug = '' } = script.dataset
  return { customerId, configUrl, configVersion, debug: debug === 'true' || debug === '1' }
}

/**
 * URL 参数提取:location.search 优先,location.hash 中的 query 兜底。
 * hash 形如 '#/guidePage?vhost=2025&x=1'(hash 路由 + query);
 * 也可能没有 query、或有多个 '#',只取第一个 '#' 之后、其中 '?' 之后的部分。
 */
export function extractParams(): URLSearchParams {
  const params = new URLSearchParams(location.search)
  const hash = location.hash
  const body = hash.startsWith('#') ? hash.slice(1) : hash
  const queryIndex = body.indexOf('?')
  if (queryIndex >= 0) {
    const hashQuery = new URLSearchParams(body.slice(queryIndex + 1))
    hashQuery.forEach((value, key) => {
      if (!params.has(key)) params.append(key, value)
    })
  }
  return params
}

export interface ResolvedConfig {
  /** 占位符替换后的基础 URL(localStorage 缓存 key 用,不含 ?v=N) */
  baseUrl: string
  /** 追加 ?v=N 后的最终请求 URL */
  fetchUrl: string
  customerId: string
}

/**
 * 解析 data-config-url 的 {param} 占位符(如 /ui-config/{vhost}.json)。
 * 任一占位符无法解析 → 返回 null,调用方安全退出(视为该页面/访客无定制配置)。
 * 无占位符时行为与之前完全一致;?v=N 在占位符替换之后追加。
 */
export function resolveConfigUrl(options: ScriptOptions): ResolvedConfig | null {
  const params = extractParams()
  let missing: string | null = null
  const replaced = options.configUrl.replace(/\{([\w-]+)\}/g, (match, name: string) => {
    const value = params.get(name)
    if (value === null || value === '') {
      missing = name
      return match
    }
    return encodeURIComponent(value)
  })
  if (missing !== null) return null

  const baseUrl = absolutizeUrl(replaced)
  const fetchUrl = options.configVersion
    ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(options.configVersion)}`
    : baseUrl

  let customerId = options.customerId
  if (!customerId) {
    for (const key of TENANT_KEYS) {
      const value = params.get(key)
      if (value) {
        customerId = value
        break
      }
    }
  }
  return { baseUrl, fetchUrl, customerId }
}

export function absolutizeUrl(url: string): string {
  try {
    return new URL(url, location.href).href
  } catch {
    return url
  }
}

/** 拉取并校验配置;任何失败都 throw,由调用方统一 catch(方案第 39 章) */
export async function fetchConfig(fetchUrl: string): Promise<UIConfig> {
  const response = await fetch(fetchUrl, { cache: 'no-cache' })
  if (!response.ok) {
    throw new Error(`config fetch failed: ${response.status} ${response.statusText}`)
  }
  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new Error('config is not valid JSON')
  }
  const result = validateUIConfig(data)
  if (!result.ok) {
    throw new Error(`config invalid: ${result.errors.join('; ')}`)
  }
  return result.config
}

/**
 * localStorage 缓存(stale-while-revalidate):key 为最终解析出的基础 URL。
 * 隐私模式 / 配额满都可能抛错,读写全部 try/catch;缓存内容损坏则忽略。
 */
function cacheKey(baseUrl: string): string {
  return `saas-ui-override:${baseUrl}`
}

export function readCachedConfig(baseUrl: string): UIConfig | null {
  try {
    const raw = localStorage.getItem(cacheKey(baseUrl))
    if (!raw) return null
    const result = validateUIConfig(JSON.parse(raw))
    return result.ok ? result.config : null
  } catch {
    return null
  }
}

export function writeCachedConfig(baseUrl: string, config: UIConfig): void {
  try {
    localStorage.setItem(cacheKey(baseUrl), JSON.stringify(config))
  } catch {
    // 缓存失败不影响功能
  }
}
