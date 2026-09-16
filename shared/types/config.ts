// 单一数据契约:与方案第 16/26 章及 schema/ui-config.schema.json 保持一致。
// 后续所有 Phase(编辑器 / 导入导出 / Runtime)复用此文件,不得另起类型。

export const UI_CONFIG_VERSION = 1

/** 配置编辑状态(方案第 27 章):任何编辑 → Draft,保存 → Saved,导出 → Exported */
export type SaveStatus = 'draft' | 'saved' | 'exported'

/** 规则生效范围,V1 支持 location.pathname 前缀匹配 */
export interface RuleScope {
  path?: string
}

/** 可视化 CSS 属性,camelCase key,Runtime 转换为 kebab-case */
export type RuleStyles = Record<string, string>

export interface RuleClasses {
  add: string[]
  remove: string[]
}

/** 属性覆盖(如 img 的 src) */
export type RuleAttributes = Record<string, string>

export interface UIRule {
  id: string
  selector: string
  scope: RuleScope
  styles: RuleStyles
  classes: RuleClasses
  attributes: RuleAttributes
  customCss: string
  enabled: boolean
}

export interface UIConfigSite {
  host: string
}

export interface UIConfig {
  version: number
  customerId: string
  site: UIConfigSite
  rules: UIRule[]
}

export function createEmptyRule(id: string, selector = ''): UIRule {
  return {
    id,
    selector,
    scope: {},
    styles: {},
    classes: { add: [], remove: [] },
    attributes: {},
    customCss: '',
    enabled: true,
  }
}

export function createEmptyConfig(customerId = '', host = ''): UIConfig {
  return {
    version: UI_CONFIG_VERSION,
    customerId,
    site: { host },
    rules: [],
  }
}
