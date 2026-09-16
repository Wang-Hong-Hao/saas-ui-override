import type { UIRule, UIConfig } from '@shared/types/config'
import {
  absolutizeUrl,
  fetchConfig,
  readCachedConfig,
  readScriptOptions,
  resolveConfigUrl,
  writeCachedConfig,
} from './config-loader'
import { RuleEngine } from './rule-engine'
import { DomObserver } from './dom-observer'

/** 方案第 32 章:Runtime 内部 API(不代表对外 SDK) */
export interface UIOverrideRuntime {
  init(): Promise<void>
  loadConfig(url: string): Promise<UIConfig>
  applyConfig(config: UIConfig): void
  applyRule(rule: UIRule): void
  removeRule(ruleId: string): void
  destroy(): void
}

const LOG_PREFIX = '[UI Override]'

class Runtime implements UIOverrideRuntime {
  private readonly engine = new RuleEngine()
  private readonly observer = new DomObserver(() => this.engine.applyAll())
  private destroyed = false
  private debug = false

  /**
   * 初始化:解析 config-url(含 {param} 占位符)→ 同步应用 localStorage 缓存(首屏零等待)
   * → fetch 最新配置覆盖并写缓存(stale-while-revalidate)。
   * 任何失败只输出一次日志,绝不影响宿主页面(方案第 39 章)。
   */
  async init(): Promise<void> {
    const options = readScriptOptions(document.currentScript)
    if (!options) {
      console.error(`${LOG_PREFIX} 无法读取 script data 属性,已跳过`)
      return
    }
    this.debug = options.debug
    this.engine.setDebug(options.debug)
    if (!options.configUrl) {
      // 方案未定义默认 CDN 路径:无 config-url 时安全退出
      console.warn(`${LOG_PREFIX} 缺少 data-config-url(customerId: ${options.customerId || '未知'}),已跳过`)
      return
    }
    const resolved = resolveConfigUrl(options)
    if (!resolved) {
      console.warn(`${LOG_PREFIX} data-config-url 的占位符无法从当前 URL 解析,视为该页面无定制配置,已跳过`)
      return
    }

    const cached = options.cache ? readCachedConfig(resolved.baseUrl) : null
    if (cached) {
      if (!cached.customerId) cached.customerId = resolved.customerId
      this.applyConfig(cached)
    }

    try {
      const config = await fetchConfig(resolved.fetchUrl)
      if (this.destroyed) return
      // 配置 JSON 中 customerId 可省略:用 URL 解析出的租户标识回填
      if (!config.customerId) config.customerId = resolved.customerId
      // 与缓存内容相同时重复 apply 无副作用(restore-all + 重应用,幂等)
      this.applyConfig(config)
      if (options.cache) writeCachedConfig(resolved.baseUrl, config)
    } catch (error) {
      if (cached) {
        // 已有缓存:静默使用缓存,debug 模式输出提示
        if (this.debug) {
          console.warn(`${LOG_PREFIX} 拉取最新配置失败,使用本地缓存:`, error instanceof Error ? error.message : error)
        }
      } else {
        console.error(`${LOG_PREFIX} 初始化失败,UI Override 已忽略:`, error instanceof Error ? error.message : error)
      }
    }
  }

  async loadConfig(url: string): Promise<UIConfig> {
    return fetchConfig(absolutizeUrl(url))
  }

  applyConfig(config: UIConfig): void {
    if (this.destroyed) return
    this.engine.setConfig(config)
    // DOM 可能尚未就绪或由框架异步渲染(方案第 22 章):observer 接管后续变化
    this.observer.start()
  }

  applyRule(rule: UIRule): void {
    if (this.destroyed) return
    this.engine.applyRule(rule)
  }

  removeRule(ruleId: string): void {
    if (this.destroyed) return
    this.engine.removeRule(ruleId)
  }

  destroy(): void {
    this.destroyed = true
    this.observer.stop()
    this.engine.destroy()
  }
}

const runtime = new Runtime()

// 供调试 / 手动控制使用;不属于对外 SDK
;(window as unknown as Record<string, unknown>).saasUIOverride = runtime

void runtime.init()
