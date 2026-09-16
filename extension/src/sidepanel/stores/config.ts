import { computed, reactive } from 'vue'
import type { RuleAttributes, RuleClasses, RuleStyles, SaveStatus, UIRule, UIConfig } from '@shared/types/config'
import { createEmptyConfig, createEmptyRule } from '@shared/types/config'
import type { ElementSelectedPayload } from '../../shared/messages'

/**
 * 当前编辑状态:单一 reactive store(不引入 Pinia)。
 * 管理整个 UIConfig + 当前编辑 rule(config.rules 中的对象引用)+ 按 rule 的 history stack。
 */

/** history 快照:覆盖当前 rule 的可编辑子集 */
export interface RuleSnapshot {
  selector: string
  styles: RuleStyles
  classes: RuleClasses
  attributes: RuleAttributes
  customCss: string
}

interface EditorState {
  config: UIConfig | null
  rule: UIRule | null
  tag: string
  matchCount: number | null
  /** 选中时元素现有的 class,供 TailwindEditor 快速加入 remove 列表 */
  elementClasses: string[]
  /** 当前 tab 的 host,配置按 host 关联持久化 */
  host: string
  status: SaveStatus
}

export const editorState = reactive<EditorState>({
  config: null,
  rule: null,
  tag: '',
  matchCount: null,
  elementClasses: [],
  host: '',
  status: 'draft',
})

const undoStack = reactive<RuleSnapshot[]>([])
const redoStack = reactive<RuleSnapshot[]>([])

export const canUndo = computed(() => undoStack.length > 0)
export const canRedo = computed(() => redoStack.length > 0)

let ruleSeq = 0

export function snapshotRule(): RuleSnapshot | null {
  const rule = editorState.rule
  if (!rule) return null
  return {
    selector: rule.selector,
    styles: { ...rule.styles },
    classes: { add: [...rule.classes.add], remove: [...rule.classes.remove] },
    attributes: { ...rule.attributes },
    customCss: rule.customCss,
  }
}

/** key 排序后序列化,避免属性顺序差异产生假 history 步骤 */
function serializeSnapshot(snap: RuleSnapshot): string {
  const sortRecord = (r: Record<string, string>) =>
    Object.fromEntries(Object.keys(r).sort().map((k) => [k, r[k]]))
  return JSON.stringify({
    selector: snap.selector,
    styles: sortRecord(snap.styles),
    classes: { add: [...snap.classes.add].sort(), remove: [...snap.classes.remove].sort() },
    attributes: sortRecord(snap.attributes),
    customCss: snap.customCss,
  })
}

function applySnapshot(snap: RuleSnapshot): void {
  const rule = editorState.rule
  if (!rule) return
  rule.selector = snap.selector
  rule.styles = { ...snap.styles }
  rule.classes = { add: [...snap.classes.add], remove: [...snap.classes.remove] }
  rule.attributes = { ...snap.attributes }
  rule.customCss = snap.customCss
}

/** 任何编辑后回到 Draft(方案第 27 章) */
export function markDirty(): void {
  editorState.status = 'draft'
}

export function markSaved(): void {
  editorState.status = 'saved'
}

export function markExported(): void {
  editorState.status = 'exported'
}

/** 载入整个 config(草稿恢复 / 导入):不选中任何 rule,预览全部 enabled rules */
export function setConfig(config: UIConfig, status: SaveStatus): void {
  editorState.config = config
  editorState.rule = null
  editorState.tag = ''
  editorState.matchCount = null
  editorState.elementClasses = []
  editorState.status = status
  undoStack.length = 0
  redoStack.length = 0
}

export function setCustomerId(customerId: string): void {
  if (!editorState.config) return
  editorState.config.customerId = customerId
  markDirty()
}

/** 选中元素 = 新建 rule 并切换为当前编辑 */
export function selectElement(payload: ElementSelectedPayload): void {
  if (!editorState.config) {
    editorState.config = createEmptyConfig('', editorState.host)
  }
  ruleSeq += 1
  let id = `rule-${String(ruleSeq).padStart(3, '0')}`
  while (editorState.config.rules.some((r) => r.id === id)) {
    ruleSeq += 1
    id = `rule-${String(ruleSeq).padStart(3, '0')}`
  }
  const rule = createEmptyRule(id, payload.selector)
  editorState.config.rules.push(rule)
  editorState.rule = rule
  editorState.tag = payload.tag
  editorState.matchCount = payload.matchCount
  editorState.elementClasses = payload.classes
  undoStack.length = 0
  redoStack.length = 0
  markDirty()
}

export function selectRule(id: string): void {
  const rule = editorState.config?.rules.find((r) => r.id === id)
  if (!rule || rule === editorState.rule) return
  editorState.rule = rule
  editorState.tag = ''
  editorState.matchCount = null
  editorState.elementClasses = []
  undoStack.length = 0
  redoStack.length = 0
}

export function deleteRule(id: string): void {
  const config = editorState.config
  if (!config) return
  config.rules = config.rules.filter((r) => r.id !== id)
  if (editorState.rule?.id === id) {
    editorState.rule = null
    editorState.tag = ''
    editorState.matchCount = null
    editorState.elementClasses = []
    undoStack.length = 0
    redoStack.length = 0
  }
  markDirty()
}

export function toggleRuleEnabled(id: string): void {
  const rule = editorState.config?.rules.find((r) => r.id === id)
  if (!rule) return
  rule.enabled = !rule.enabled
  markDirty()
}

/** 编辑落定(blur/change/防抖停顿/点击操作):与 baseline 不同则记一步 history */
export function commitEdit(baseline: RuleSnapshot | null): void {
  const rule = editorState.rule
  if (!rule || !baseline) return
  const current = snapshotRule()
  if (!current || serializeSnapshot(current) === serializeSnapshot(baseline)) return
  undoStack.push(baseline)
  redoStack.length = 0
  markDirty()
}

/** 只更新 selector / 匹配数,不记 history(history 由编辑落点处通过 commitEdit 记录) */
export function setSelector(selector: string, matchCount: number | null): void {
  if (!editorState.rule) return
  editorState.rule.selector = selector
  editorState.matchCount = matchCount
  markDirty()
}

export function setMatchCount(matchCount: number | null): void {
  editorState.matchCount = matchCount
}

/** 实时编辑(每次 input):直接生效,不记 history */
export function setStyle(prop: string, value: string): void {
  const rule = editorState.rule
  if (!rule) return
  const trimmed = value.trim()
  if (trimmed === '') {
    delete rule.styles[prop]
  } else {
    rule.styles[prop] = trimmed
  }
  markDirty()
}

export function setCustomCss(value: string): void {
  const rule = editorState.rule
  if (!rule) return
  rule.customCss = value
  markDirty()
}

/** attributes 编辑(方案第 25 章:img 的 src / alt,a 的 href 等);空值表示不覆盖 */
export function setRuleAttribute(name: string, value: string): void {
  const rule = editorState.rule
  if (!rule) return
  const trimmed = value.trim()
  if (trimmed === '') {
    delete rule.attributes[name]
  } else {
    rule.attributes[name] = trimmed
  }
  markDirty()
}

/** classes.add 增加一个 class;若在 remove 列表中则移出(净效果:保留元素原有 class) */
export function addClass(className: string): void {
  const rule = editorState.rule
  const cls = className.trim()
  if (!rule || !cls || rule.classes.add.includes(cls)) return
  const baseline = snapshotRule()
  if (rule.classes.remove.includes(cls)) {
    rule.classes.remove = rule.classes.remove.filter((c) => c !== cls)
  } else {
    rule.classes.add.push(cls)
  }
  commitEdit(baseline)
}

export function removeAddedClass(className: string): void {
  const rule = editorState.rule
  if (!rule || !rule.classes.add.includes(className)) return
  const baseline = snapshotRule()
  rule.classes.add = rule.classes.add.filter((c) => c !== className)
  commitEdit(baseline)
}

/** classes.remove 增加一个 class;若在 add 列表中则移出(净效果:不加) */
export function addRemovedClass(className: string): void {
  const rule = editorState.rule
  const cls = className.trim()
  if (!rule || !cls || rule.classes.remove.includes(cls)) return
  const baseline = snapshotRule()
  if (rule.classes.add.includes(cls)) {
    rule.classes.add = rule.classes.add.filter((c) => c !== cls)
  } else {
    rule.classes.remove.push(cls)
  }
  commitEdit(baseline)
}

export function removeRemovedClass(className: string): void {
  const rule = editorState.rule
  if (!rule || !rule.classes.remove.includes(className)) return
  const baseline = snapshotRule()
  rule.classes.remove = rule.classes.remove.filter((c) => c !== className)
  commitEdit(baseline)
}

/** 只清 styles(「重置样式」) */
export function resetStyles(): void {
  const rule = editorState.rule
  if (!rule || Object.keys(rule.styles).length === 0) return
  const baseline = snapshotRule()
  rule.styles = {}
  commitEdit(baseline)
}

/** 整 rule 级 Reset:清空 styles + classes + attributes + customCss(保留 selector / id) */
export function resetRule(): void {
  const rule = editorState.rule
  if (!rule) return
  const empty =
    Object.keys(rule.styles).length === 0 &&
    rule.classes.add.length === 0 &&
    rule.classes.remove.length === 0 &&
    Object.keys(rule.attributes).length === 0 &&
    rule.customCss.trim() === ''
  if (empty) return
  const baseline = snapshotRule()
  rule.styles = {}
  rule.classes = { add: [], remove: [] }
  rule.attributes = {}
  rule.customCss = ''
  commitEdit(baseline)
}

export function undo(): void {
  const snap = undoStack.pop()
  if (!editorState.rule || !snap) return
  const current = snapshotRule()
  if (current) redoStack.push(current)
  applySnapshot(snap)
  markDirty()
}

export function redo(): void {
  const snap = redoStack.pop()
  if (!editorState.rule || !snap) return
  const current = snapshotRule()
  if (current) undoStack.push(current)
  applySnapshot(snap)
  markDirty()
}

/** 切换标签页:清空编辑态(预览由调用方清除) */
export function clearEditor(): void {
  editorState.config = null
  editorState.rule = null
  editorState.tag = ''
  editorState.matchCount = null
  editorState.elementClasses = []
  editorState.status = 'draft'
  undoStack.length = 0
  redoStack.length = 0
}
