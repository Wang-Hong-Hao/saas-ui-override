<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { sendToContent } from '../messaging'
import { commitEdit, editorState, setMatchCount, setSelector, snapshotRule } from '../stores/config'
import type { RuleSnapshot } from '../stores/config'

const props = defineProps<{ tabId: number | null }>()

const RECHECK_DEBOUNCE_MS = 300

const selectorDraft = ref(editorState.rule?.selector ?? '')
const matchCount = computed(() => editorState.matchCount)
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let requestSeq = 0
/** 用户手动编辑的 history 基线(防抖期间只记一次);外部变更(undo/redo/新元素)为 null */
let pendingBaseline: RuleSnapshot | null = null

watch(
  () => editorState.rule?.selector,
  (selector) => {
    // 外部变更(选中新元素 / undo / redo):同步输入框并重新检测匹配数
    if (selector === undefined || selector === selectorDraft.value) return
    selectorDraft.value = selector
    void recheck(selector)
  },
)

watch(selectorDraft, (value) => {
  if (value === editorState.rule?.selector) return
  if (!pendingBaseline) pendingBaseline = snapshotRule()
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => void recheck(value), RECHECK_DEBOUNCE_MS)
})

async function recheck(selector: string): Promise<void> {
  const trimmed = selector.trim()
  const baseline = pendingBaseline
  pendingBaseline = null
  if (!trimmed) {
    if (baseline) {
      setSelector('', null)
      commitEdit(baseline)
    } else {
      setMatchCount(null)
    }
    return
  }
  if (props.tabId === null) return
  const seq = ++requestSeq
  const res = await sendToContent(props.tabId, { type: 'selector:count', selector: trimmed })
  if (seq !== requestSeq) return // 已有更新的请求,丢弃过期结果
  if (!res?.ok) return
  const count = res.matchCount ?? null
  if (baseline) {
    // 用户手动编辑落定:同步进 rule 并记 history,预览随之刷新
    setSelector(trimmed, count)
    commitEdit(baseline)
  } else {
    // 外部变更触发的重检:只更新匹配数
    setMatchCount(count)
  }
}
</script>

<template>
  <section class="element-info">
    <div class="field">
      <span class="label">Tag</span>
      <code class="tag">{{ editorState.tag }}</code>
    </div>

    <div class="field">
      <label class="label" for="selector-input">Selector</label>
      <textarea
        id="selector-input"
        v-model="selectorDraft"
        class="selector-input"
        rows="2"
        spellcheck="false"
        placeholder=".exam-page .start-button"
      ></textarea>
    </div>

    <div class="field">
      <span class="label">匹配</span>
      <span v-if="matchCount === null" class="match invalid">⚠ 无效的 Selector</span>
      <span v-else-if="matchCount === 0" class="match none">⚠ 当前 Selector 未匹配到元素</span>
      <span v-else-if="matchCount === 1" class="match unique">✓ 匹配 1 个元素</span>
      <span v-else class="match multiple">⚠ 当前 Selector 匹配 {{ matchCount }} 个元素</span>
    </div>
  </section>
</template>

<style scoped>
.element-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.label {
  flex: 0 0 52px;
  padding-top: 2px;
  color: #86909c;
  font-size: 12px;
}

.tag {
  padding: 2px 8px;
  border-radius: 4px;
  background: #f2f3f5;
  font-family: monospace;
  font-size: 12px;
}

.selector-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
  resize: vertical;
}

.selector-input:focus {
  border-color: #1677ff;
  outline: none;
}

.match {
  font-size: 12px;
}

.match.unique {
  color: #00b42a;
}

.match.multiple {
  color: #ff7d00;
}

.match.none,
.match.invalid {
  color: #cb2634;
}
</style>
