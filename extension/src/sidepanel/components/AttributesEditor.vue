<script setup lang="ts">
import { computed, ref } from 'vue'
import { commitEdit, editorState, setRuleAttribute, snapshotRule } from '../stores/config'
import type { RuleSnapshot } from '../stores/config'

/** 方案第 25 章:attributes 覆盖(img 的 src / alt,a 的 href);空值表示不覆盖 */

const FIELDS_BY_TAG: Record<string, string[]> = {
  img: ['src', 'alt'],
  a: ['href'],
}

const fields = computed(() => FIELDS_BY_TAG[editorState.tag] ?? [])
const attributes = computed(() => editorState.rule?.attributes ?? {})

const baseline = ref<RuleSnapshot | null>(null)

function fieldValue(name: string): string {
  return attributes.value[name] ?? ''
}

function onFocus(): void {
  baseline.value = snapshotRule()
}

function onInput(name: string, event: Event): void {
  if (!baseline.value) baseline.value = snapshotRule()
  setRuleAttribute(name, (event.target as HTMLInputElement).value)
}

function onChange(): void {
  commitEdit(baseline.value)
  baseline.value = null
}
</script>

<template>
  <section v-if="fields.length > 0" class="attributes-editor">
    <div class="editor-header">
      <span class="title">Attributes({{ editorState.tag }})</span>
    </div>
    <div v-for="name in fields" :key="name" class="attr-field">
      <label :for="`attr-${name}`">{{ name }}</label>
      <input
        :id="`attr-${name}`"
        type="text"
        class="control"
        :data-attr="name"
        :value="fieldValue(name)"
        spellcheck="false"
        @focus="onFocus"
        @input="onInput(name, $event)"
        @change="onChange"
      />
    </div>
  </section>
</template>

<style scoped>
.attributes-editor {
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

.attr-field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.attr-field label {
  flex: 0 0 40px;
  font-family: monospace;
  font-size: 11px;
  color: #4e5969;
}

.control {
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
}

.control:focus {
  border-color: #1677ff;
  outline: none;
}
</style>
