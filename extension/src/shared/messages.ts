import type { RuleAttributes, RuleClasses, RuleStyles } from '@shared/types/config'

/**
 * 消息协议:
 * - sidepanel → background → content script:ContentRequest(携带 tabId 路由)
 * - content script → sidepanel(广播):PickerEvent
 */

export interface ElementSelectedPayload {
  tag: string
  selector: string
  /** null 表示 selector 无效(语法错误) */
  matchCount: number | null
  /** 选中时元素现有的 class(已过滤扩展前缀) */
  classes: string[]
}

/** 预览用的 rule 子集:整个 config 中所有 enabled rule 一起预览(叠加效果所见即所得) */
export interface PreviewRule {
  selector: string
  styles: RuleStyles
  classes: RuleClasses
  attributes: RuleAttributes
  customCss: string
  enabled: boolean
}

export type ContentCommand =
  | { type: 'picker:start' }
  | { type: 'picker:stop' }
  | { type: 'selector:count'; selector: string }
  | { type: 'preview:apply'; rules: PreviewRule[] }
  | { type: 'preview:clear' }
  | { type: 'class:exists'; className: string }
  | { type: 'page:host' }
  | { type: 'rules:check'; selectors: string[] }

export type PickerEvent =
  | { type: 'picker:selected'; payload: ElementSelectedPayload }
  | { type: 'picker:cancelled' }
  | { type: 'picker:stopped' }

export interface ContentRequest {
  target: 'content'
  tabId: number
  message: ContentCommand
}

export interface CommandResult {
  ok: boolean
  matchCount?: number | null
  matchCounts?: (number | null)[]
  exists?: boolean
  host?: string
  error?: string
}
