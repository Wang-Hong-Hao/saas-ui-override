import type { UIConfig } from './types/config'
import { UI_CONFIG_VERSION } from './types/config'

/**
 * UIConfig 手写校验器(与 schema/ui-config.schema.json 对齐,不引入 ajv)。
 * 导入与 Runtime 加载时使用;错误信息定位到具体 rule 的具体字段。
 */

export interface ValidationSuccess {
  ok: true
  config: UIConfig
  errors: []
}

export interface ValidationFailure {
  ok: false
  errors: string[]
}

export type ValidationResult = ValidationSuccess | ValidationFailure

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function isStringRecord(value: unknown): boolean {
  return isPlainObject(value) && Object.values(value).every((v) => typeof v === 'string')
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((v) => isNonEmptyString(v))
}

function validateRule(rule: unknown, index: number, errors: string[]): void {
  const at = `rules[${index}]`
  if (!isPlainObject(rule)) {
    errors.push(`${at}: 必须是对象`)
    return
  }
  const label = isNonEmptyString(rule.id) ? `${at}(${rule.id})` : at
  if (!isNonEmptyString(rule.id)) errors.push(`${at}.id: 必须是非空字符串`)
  if (!isNonEmptyString(rule.selector)) errors.push(`${label}.selector: 必须是非空字符串`)
  if (!isPlainObject(rule.scope)) {
    errors.push(`${label}.scope: 必须是对象`)
  } else if (rule.scope.path !== undefined && typeof rule.scope.path !== 'string') {
    errors.push(`${label}.scope.path: 必须是字符串`)
  }
  if (!isStringRecord(rule.styles)) errors.push(`${label}.styles: 必须是 { 属性: 字符串 } 对象`)
  if (!isPlainObject(rule.classes)) {
    errors.push(`${label}.classes: 必须是对象`)
  } else {
    if (!isStringArray(rule.classes.add)) errors.push(`${label}.classes.add: 必须是非空字符串数组`)
    if (!isStringArray(rule.classes.remove)) errors.push(`${label}.classes.remove: 必须是非空字符串数组`)
  }
  if (!isStringRecord(rule.attributes)) errors.push(`${label}.attributes: 必须是 { 属性: 字符串 } 对象`)
  if (typeof rule.customCss !== 'string') errors.push(`${label}.customCss: 必须是字符串`)
  if (typeof rule.enabled !== 'boolean') errors.push(`${label}.enabled: 必须是布尔值`)
}

export function validateUIConfig(data: unknown): ValidationResult {
  const errors: string[] = []
  if (!isPlainObject(data)) {
    return { ok: false, errors: ['配置必须是 JSON 对象'] }
  }
  if (data.version !== UI_CONFIG_VERSION) {
    errors.push(`version: 必须是 ${UI_CONFIG_VERSION}(当前: ${JSON.stringify(data.version)})`)
  }
  if (!isNonEmptyString(data.customerId)) errors.push('customerId: 必须是非空字符串')
  if (!isPlainObject(data.site)) {
    errors.push('site: 必须是对象')
  } else if (!isNonEmptyString(data.site.host)) {
    errors.push('site.host: 必须是非空字符串')
  }
  if (!Array.isArray(data.rules)) {
    errors.push('rules: 必须是数组')
  } else {
    data.rules.forEach((rule, index) => validateRule(rule, index, errors))
  }
  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, config: data as unknown as UIConfig, errors: [] }
}
