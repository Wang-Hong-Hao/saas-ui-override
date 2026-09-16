<script setup lang="ts">
import { computed, ref } from 'vue'
import { commitEdit, editorState, resetStyles, setStyle, snapshotRule } from '../stores/config'
import type { RuleSnapshot } from '../stores/config'
import type { RuleStyles } from '@shared/types/config'

type FieldType = 'text' | 'color' | 'select'

interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: string[]
  placeholder?: string
}

interface GroupDef {
  name: string
  fields: FieldDef[]
}

function text(key: string, placeholder = ''): FieldDef {
  return { key, label: key, type: 'text', placeholder }
}

function select(key: string, options: string[]): FieldDef {
  return { key, label: key, type: 'select', options }
}

function color(key: string): FieldDef {
  return { key, label: key, type: 'color' }
}

// 方案第 8 章高频 CSS 属性清单,只实现清单内属性
const GROUPS: GroupDef[] = [
  {
    name: 'Typography',
    fields: [
      text('fontFamily', 'Arial, sans-serif'),
      text('fontSize', '16px'),
      select('fontWeight', ['normal', 'bold', 'lighter', 'bolder', '100', '200', '300', '400', '500', '600', '700', '800', '900']),
      select('fontStyle', ['normal', 'italic', 'oblique']),
      text('lineHeight', '1.5'),
      text('letterSpacing', '0.5px'),
      select('textAlign', ['left', 'right', 'center', 'justify', 'start', 'end']),
      select('textDecoration', ['none', 'underline', 'line-through', 'overline']),
      color('color'),
    ],
  },
  {
    name: 'Box Model',
    fields: [
      text('width', '100px / 50%'),
      text('height'),
      text('minWidth'),
      text('maxWidth'),
      text('minHeight'),
      text('maxHeight'),
      text('marginTop'),
      text('marginRight'),
      text('marginBottom'),
      text('marginLeft'),
      text('paddingTop'),
      text('paddingRight'),
      text('paddingBottom'),
      text('paddingLeft'),
    ],
  },
  {
    name: 'Background',
    fields: [
      text('background'),
      color('backgroundColor'),
      text('backgroundImage', 'url(...)'),
      select('backgroundSize', ['auto', 'cover', 'contain']),
      text('backgroundPosition', 'center'),
      select('backgroundRepeat', ['repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'space', 'round']),
    ],
  },
  {
    name: 'Border',
    fields: [
      text('border', '1px solid #000'),
      text('borderWidth'),
      select('borderStyle', ['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset']),
      color('borderColor'),
      text('borderRadius', '8px'),
    ],
  },
  {
    name: 'Layout',
    fields: [
      select('display', ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'none', 'contents']),
      select('visibility', ['visible', 'hidden', 'collapse']),
      text('opacity', '0 ~ 1'),
      select('overflow', ['visible', 'hidden', 'scroll', 'auto', 'clip']),
    ],
  },
  {
    name: 'Position',
    fields: [
      select('position', ['static', 'relative', 'absolute', 'fixed', 'sticky']),
      text('top'),
      text('right'),
      text('bottom'),
      text('left'),
      text('zIndex'),
    ],
  },
  {
    name: 'Flex',
    fields: [
      text('flex', '1'),
      select('flexDirection', ['row', 'row-reverse', 'column', 'column-reverse']),
      select('justifyContent', ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly']),
      select('alignItems', ['stretch', 'flex-start', 'flex-end', 'center', 'baseline']),
      select('alignSelf', ['auto', 'stretch', 'flex-start', 'flex-end', 'center', 'baseline']),
      text('gap', '8px'),
    ],
  },
]

const styles = computed<RuleStyles>(() => editorState.rule?.styles ?? {})
const hasStyles = computed(() => Object.keys(styles.value).length > 0)

/** 文本/颜色输入的编辑基线:focus 时快照(整个 rule 可编辑子集),change 时对比记 history */
const baseline = ref<RuleSnapshot | null>(null)

function fieldValue(key: string): string {
  return styles.value[key] ?? ''
}

function pickerValue(key: string): string {
  const value = fieldValue(key)
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'
}

function onFocus(): void {
  baseline.value = snapshotRule()
}

function ensureBaseline(): void {
  if (!baseline.value) baseline.value = snapshotRule()
}

function onTextInput(key: string, event: Event): void {
  ensureBaseline()
  setStyle(key, (event.target as HTMLInputElement).value)
}

function onTextChange(): void {
  commitEdit(baseline.value)
  baseline.value = null
}

function onColorInput(key: string, event: Event): void {
  ensureBaseline()
  setStyle(key, (event.target as HTMLInputElement).value)
}

function onColorChange(): void {
  commitEdit(baseline.value)
  baseline.value = null
}

function onSelect(key: string, event: Event): void {
  // select 变化即落定:当前 rule 快照就是 baseline
  const snapshot = snapshotRule()
  setStyle(key, (event.target as HTMLSelectElement).value)
  commitEdit(snapshot)
}

function onReset(): void {
  resetStyles()
}
</script>

<template>
  <section class="style-editor">
    <div class="style-editor-header">
      <span class="title">样式</span>
      <button
        type="button"
        class="reset-button"
        data-action="reset"
        :disabled="!hasStyles"
        @click="onReset"
      >
        重置样式
      </button>
    </div>

    <details v-for="(group, index) in GROUPS" :key="group.name" class="style-group" :open="index === 0">
      <summary>{{ group.name }}</summary>

      <div v-for="field in group.fields" :key="field.key" class="style-field">
        <label :for="`sf-${field.key}`">{{ field.label }}</label>

        <input
          v-if="field.type === 'text'"
          :id="`sf-${field.key}`"
          type="text"
          class="control"
          :data-field="field.key"
          :value="fieldValue(field.key)"
          :placeholder="field.placeholder"
          spellcheck="false"
          @focus="onFocus"
          @input="onTextInput(field.key, $event)"
          @change="onTextChange"
        />

        <div v-else-if="field.type === 'color'" class="color-field">
          <input
            type="color"
            class="color-picker"
            :data-field="field.key"
            :value="pickerValue(field.key)"
            @focus="onFocus"
            @input="onColorInput(field.key, $event)"
            @change="onColorChange"
          />
          <input
            :id="`sf-${field.key}`"
            type="text"
            class="control"
            :data-field="`${field.key}-text`"
            :value="fieldValue(field.key)"
            placeholder="#1677ff / rgb(...)"
            spellcheck="false"
            @focus="onFocus"
            @input="onTextInput(field.key, $event)"
            @change="onTextChange"
          />
        </div>

        <select
          v-else
          :id="`sf-${field.key}`"
          class="control"
          :data-field="field.key"
          :value="fieldValue(field.key)"
          @change="onSelect(field.key, $event)"
        >
          <option value="">(不覆盖)</option>
          <option v-for="option in field.options" :key="option" :value="option">{{ option }}</option>
        </select>
      </div>
    </details>
  </section>
</template>

<style scoped>
.style-editor {
  margin-top: 16px;
  border-top: 1px solid #e5e6eb;
  padding-top: 12px;
}

.style-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.title {
  font-weight: 600;
}

.reset-button {
  padding: 3px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #4e5969;
  font-size: 12px;
  cursor: pointer;
}

.reset-button:hover:not(:disabled) {
  border-color: #cb2634;
  color: #cb2634;
}

.reset-button:disabled {
  color: #c9cdd4;
  cursor: not-allowed;
}

.style-group {
  margin-bottom: 6px;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
}

.style-group summary {
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #4e5969;
  cursor: pointer;
  user-select: none;
}

.style-field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 10px;
}

.style-field label {
  flex: 0 0 128px;
  font-family: monospace;
  font-size: 11px;
  color: #4e5969;
}

.control {
  flex: 1;
  min-width: 0;
  padding: 3px 6px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
}

.control:focus {
  border-color: #1677ff;
  outline: none;
}

.color-field {
  display: flex;
  flex: 1;
  gap: 6px;
  min-width: 0;
}

.color-picker {
  width: 28px;
  height: 24px;
  padding: 0;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
</style>
