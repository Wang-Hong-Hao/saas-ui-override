<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { sendToContent } from '../messaging'
import {
  addClass,
  addRemovedClass,
  editorState,
  removeAddedClass,
  removeRemovedClass,
} from '../stores/config'
import { searchTailwindClasses } from '../tailwind-classes'

const props = defineProps<{ tabId: number | null }>()

const query = ref('')

/** class CSS 存在性检测结果缓存:true 存在,false 未检测到(显示 ⚠),undefined 检测中/未检测 */
const existence = reactive<Record<string, boolean | undefined>>({})

const suggestions = computed(() => {
  const list = searchTailwindClasses(query.value)
  const added = editorState.rule?.classes.add ?? []
  return list.filter((cls) => !added.includes(cls))
})

const manualClass = computed(() => {
  const q = query.value.trim()
  if (!q || !/^[\w-/.%[\]:]+$/.test(q)) return ''
  return q
})

const addedClasses = computed(() => editorState.rule?.classes.add ?? [])
const removedClasses = computed(() => editorState.rule?.classes.remove ?? [])

/** 元素现有 class 中尚未加入 remove 列表的,供快速移除 */
const elementClasses = computed(() => {
  const removed = editorState.rule?.classes.remove ?? []
  return editorState.elementClasses.filter((cls) => !removed.includes(cls))
})

async function detect(className: string): Promise<void> {
  if (props.tabId === null || existence[className] !== undefined) return
  const res = await sendToContent(props.tabId, { type: 'class:exists', className })
  if (res?.ok) existence[className] = res.exists ?? false
}

function onAdd(className: string): void {
  addClass(className)
  void detect(className)
}

function onManualAdd(): void {
  if (!manualClass.value) return
  onAdd(manualClass.value)
  query.value = ''
}

function warnText(className: string): string {
  return `页面中没有检测到 ${className} 对应的 CSS。可能原因:Tailwind 构建产物没有包含该 Utility。(class 仍会添加)`
}
</script>

<template>
  <section class="tailwind-editor">
    <div class="editor-header">
      <span class="title">Tailwind CSS</span>
    </div>

    <input
      v-model="query"
      type="text"
      class="search-input"
      data-tw="search"
      placeholder="搜索 Class(如:圆角 / 字体 / 颜色 / 背景 / 间距 / 阴影)"
      spellcheck="false"
    />

    <div v-if="query.trim()" class="suggestions">
      <button
        v-for="cls in suggestions"
        :key="cls"
        type="button"
        class="chip suggestion"
        :data-tw-suggest="cls"
        @click="onAdd(cls)"
      >
        {{ cls }}
      </button>
      <button
        v-if="manualClass && !suggestions.includes(manualClass) && !addedClasses.includes(manualClass)"
        type="button"
        class="chip manual-add"
        data-tw="manual-add"
        @click="onManualAdd"
      >
        + 添加「{{ manualClass }}」
      </button>
      <p v-if="suggestions.length === 0 && !manualClass" class="empty-hint">无匹配候选</p>
    </div>

    <div class="class-section">
      <span class="section-label">已添加</span>
      <div class="chip-list">
        <span v-for="cls in addedClasses" :key="cls" class="chip added" :data-tw-added="cls">
          {{ cls }}
          <span
            v-if="existence[cls] === false"
            class="warn"
            :data-tw-warn="cls"
            :title="warnText(cls)"
            >⚠</span
          >
          <button type="button" class="remove" @click="removeAddedClass(cls)">×</button>
        </span>
        <span v-if="addedClasses.length === 0" class="empty-hint">无</span>
      </div>
    </div>

    <div class="class-section">
      <span class="section-label">已删除</span>
      <div class="chip-list">
        <span v-for="cls in removedClasses" :key="cls" class="chip removed" :data-tw-removed="cls">
          {{ cls }}
          <button type="button" class="remove" @click="removeRemovedClass(cls)">×</button>
        </span>
        <span v-if="removedClasses.length === 0" class="empty-hint">无</span>
      </div>
    </div>

    <div v-if="elementClasses.length > 0" class="class-section">
      <span class="section-label">元素现有 Class</span>
      <div class="chip-list">
        <button
          v-for="cls in elementClasses"
          :key="cls"
          type="button"
          class="chip suggestion"
          :data-tw-elclass="cls"
          title="点击加入「已删除」列表"
          @click="addRemovedClass(cls)"
        >
          {{ cls }} −
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tailwind-editor {
  margin-top: 16px;
  border-top: 1px solid #e5e6eb;
  padding-top: 12px;
}

.editor-header {
  margin-bottom: 8px;
}

.title {
  font-weight: 600;
}

.search-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 12px;
}

.search-input:focus {
  border-color: #1677ff;
  outline: none;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
  max-height: 120px;
  overflow-y: auto;
}

.class-section {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
}

.section-label {
  flex: 0 0 84px;
  padding-top: 2px;
  color: #86909c;
  font-size: 12px;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 10px;
  background: #f7f8fa;
  font-family: monospace;
  font-size: 11px;
  color: #1f2329;
}

button.chip {
  cursor: pointer;
}

button.chip:hover {
  border-color: #1677ff;
  color: #1677ff;
}

.chip.added {
  background: #e8f1ff;
  border-color: #94bfff;
}

.chip.removed {
  background: #ffece8;
  border-color: #fdcdc5;
  text-decoration: line-through;
}

.chip .warn {
  color: #ff7d00;
  cursor: help;
}

.chip .remove {
  border: none;
  background: none;
  padding: 0;
  font-size: 12px;
  color: #86909c;
  cursor: pointer;
}

.chip .remove:hover {
  color: #cb2634;
}

.manual-add {
  border-style: dashed;
}

.empty-hint {
  color: #c9cdd4;
  font-size: 12px;
}
</style>
