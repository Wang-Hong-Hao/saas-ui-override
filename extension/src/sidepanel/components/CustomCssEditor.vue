<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { EditorView, highlightActiveLine, keymap, lineNumbers, placeholder } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { css } from '@codemirror/lang-css'
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { commitEdit, editorState, setCustomCss, snapshotRule } from '../stores/config'
import type { RuleSnapshot } from '../stores/config'

const PREVIEW_DEBOUNCE_MS = 300

const editorHost = ref<HTMLDivElement | null>(null)
let view: EditorView | null = null
/** 外部同步(undo/redo/切换元素/清除)时不回写 store,避免循环 */
let applyingExternal = false
let baseline: RuleSnapshot | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const customCss = computed(() => editorState.rule?.customCss ?? '')

/** 轻量花括号配平检查(不引入完整 CSS parser;语法错误的规则浏览器会静默忽略) */
const unbalancedBraces = computed(() => {
  let depth = 0
  for (const ch of customCss.value) {
    if (ch === '{') depth += 1
    if (ch === '}') depth -= 1
    if (depth < 0) return true
  }
  return depth !== 0
})

function docText(): string {
  return view?.state.doc.toString() ?? ''
}

function flushPreview(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  setCustomCss(docText())
}

function onDocChanged(): void {
  if (applyingExternal) return
  if (!baseline) baseline = snapshotRule()
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => setCustomCss(docText()), PREVIEW_DEBOUNCE_MS)
}

/** blur 作为落定:flush 实时更新并记 history */
function onEditorBlur(): void {
  if (!applyingExternal) flushPreview()
  commitEdit(baseline)
  baseline = null
}

onMounted(() => {
  view = new EditorView({
    state: EditorState.create({
      doc: customCss.value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        keymap.of([...defaultKeymap, indentWithTab]),
        css(),
        syntaxHighlighting(defaultHighlightStyle),
        EditorView.lineWrapping,
        placeholder('/* 全局 CSS 原样注入,不自动加 !important;selector 由自己负责 */'),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onDocChanged()
        }),
        EditorView.theme({
          '&': {
            fontSize: '12px',
            maxHeight: '220px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
          },
          '.cm-scroller': { overflow: 'auto', fontFamily: 'monospace' },
          '&.cm-focused': { outline: 'none', borderColor: '#1677ff' },
        }),
      ],
    }),
    parent: editorHost.value!,
  })
  view.dom.addEventListener('focusout', onEditorBlur)
})

onUnmounted(() => {
  view?.destroy()
  view = null
})

// 外部变更(切换元素 / undo / redo / 清除)→ 同步编辑器内容
watch(customCss, (value) => {
  if (!view || value === docText()) return
  applyingExternal = true
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
  applyingExternal = false
})

function onClear(): void {
  const snap = snapshotRule()
  flushPreview()
  setCustomCss('')
  commitEdit(snap)
  baseline = null
}
</script>

<template>
  <section class="custom-css-editor">
    <div class="editor-header">
      <span class="title">Custom CSS</span>
      <button
        type="button"
        class="clear-button"
        data-action="clear-custom-css"
        :disabled="!customCss"
        @click="onClear"
      >
        清除 Custom CSS
      </button>
    </div>
    <div ref="editorHost" class="editor-host"></div>
    <p v-if="unbalancedBraces" class="css-hint">⚠ 花括号不配对,请检查 CSS 语法</p>
  </section>
</template>

<style scoped>
.custom-css-editor {
  margin-top: 16px;
  border-top: 1px solid #e5e6eb;
  padding-top: 12px;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.title {
  font-weight: 600;
}

.clear-button {
  padding: 3px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #4e5969;
  font-size: 12px;
  cursor: pointer;
}

.clear-button:hover:not(:disabled) {
  border-color: #cb2634;
  color: #cb2634;
}

.clear-button:disabled {
  color: #c9cdd4;
  cursor: not-allowed;
}

.css-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #ff7d00;
}
</style>
