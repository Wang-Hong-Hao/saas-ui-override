import type { SaveStatus, UIConfig } from '@shared/types/config'

/** chrome.storage.local 持久化:配置按 host 关联(方案第 27 章) */

export interface StoredConfig {
  config: UIConfig
  status: SaveStatus
}

function keyFor(host: string): string {
  return `ui-config:${host}`
}

/** 返回错误信息字符串,null 表示成功;不向调用方抛错 */
export async function saveStoredConfig(
  host: string,
  config: UIConfig,
  status: SaveStatus,
): Promise<string | null> {
  if (!host) return null
  try {
    // 结构化克隆需要的纯数据
    const record: StoredConfig = { config: JSON.parse(JSON.stringify(config)) as UIConfig, status }
    await chrome.storage.local.set({ [keyFor(host)]: record })
    return null
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

export async function loadStoredConfig(
  host: string,
): Promise<{ data: StoredConfig | null; error: string | null }> {
  if (!host) return { data: null, error: null }
  try {
    const result = await chrome.storage.local.get(keyFor(host))
    const record = result[keyFor(host)] as StoredConfig | undefined
    return { data: record ?? null, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : String(error) }
  }
}
