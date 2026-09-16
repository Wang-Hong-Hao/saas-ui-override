<script setup lang="ts">
import { computed, ref } from 'vue'
import { sendToContent } from '../messaging'
import { editorState, markExported, setConfig, setCustomerId } from '../stores/config'
import { validateUIConfig } from '@shared/validation'
import type { UIConfig } from '@shared/types/config'

const props = defineProps<{ tabId: number | null }>()

const emit = defineEmits<{ error: [message: string]; imported: [] }>()

const fileInput = ref<HTMLInputElement | null>(null)
const importErrors = ref<string[]>([])

const config = computed(() => editorState.config)
const customerId = computed(() => editorState.config?.customerId ?? '')

function onCustomerIdChange(event: Event): void {
  setCustomerId((event.target as HTMLInputElement).value.trim())
}

/** 导出前检查(方案第 24/40 章):无效 / 未匹配 / 多匹配 rule 汇总警告,允许仍导出 */
async function collectWarnings(): Promise<string[]> {
  const rules = config.value?.rules ?? []
  if (rules.length === 0 || props.tabId === null) return []
  const res = await sendToContent(props.tabId, {
    type: 'rules:check',
    selectors: rules.map((r) => r.selector),
  })
  if (!res?.ok || !res.matchCounts) return []
  const warnings: string[] = []
  rules.forEach((rule, index) => {
    if (!rule.enabled) return
    const count = res.matchCounts![index]
    if (count === null || count === undefined) {
      warnings.push(`${rule.id}: selector 无效「${rule.selector}」`)
    } else if (count === 0) {
      warnings.push(`${rule.id}: selector 未匹配到元素「${rule.selector}」`)
    } else if (count > 1) {
      warnings.push(`${rule.id}: 当前 Selector 匹配 ${count} 个元素,保存后将同时修改这 ${count} 个元素「${rule.selector}」`)
    }
  })
  return warnings
}

async function onExport(): Promise<void> {
  const current = config.value
  if (!current) return
  importErrors.value = []
  const warnings = await collectWarnings()
  if (warnings.length > 0) {
    const proceed = window.confirm(`导出前检查:\n\n${warnings.join('\n')}\n\n仍要导出吗?`)
    if (!proceed) return
  }
  // version 固定为 1(缓存版本号由开发人员手动管理,见方案第 38 章)
  const data: UIConfig = JSON.parse(JSON.stringify(current)) as UIConfig
  data.version = 1
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ui-config-${current.site.host || 'export'}.json`
  a.click()
  URL.revokeObjectURL(url)
  markExported()
}

function onImportClick(): void {
  fileInput.value?.click()
}

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  importErrors.value = []
  if (!file) return
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    importErrors.value = ['导入失败:不是合法的 JSON 文件']
    return
  }
  const result = validateUIConfig(parsed)
  if (!result.ok) {
    importErrors.value = result.errors
    return
  }
  // 导入的 host 以文件内容为准;关联存储仍按当前 tab host
  setConfig(result.config, 'draft')
  emit('imported')
}
</script>

<template>
  <section v-if="config" class="config-panel">
    <div class="editor-header">
      <span class="title">Config</span>
    </div>

    <div class="config-field">
      <label for="customer-id">customerId</label>
      <input
        id="customer-id"
        type="text"
        class="control"
        data-config="customerId"
        :value="customerId"
        placeholder="customer-001"
        spellcheck="false"
        @change="onCustomerIdChange"
      />
    </div>
    <div class="config-field">
      <label>site.host</label>
      <code class="host">{{ config.site.host || editorState.host }}</code>
    </div>

    <div class="config-actions">
      <button type="button" class="action" data-action="export" @click="onExport">导出 JSON</button>
      <button type="button" class="action" data-action="import" @click="onImportClick">导入 JSON</button>
      <input
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        class="file-input"
        data-config="import-file"
        @change="onFileChange"
      />
    </div>

    <ul v-if="importErrors.length > 0" class="import-errors" data-config="import-errors">
      <li v-for="err in importErrors" :key="err">{{ err }}</li>
    </ul>
  </section>
</template>

<style scoped>
.config-panel {
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

.config-field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.config-field label {
  flex: 0 0 76px;
  font-size: 12px;
  color: #86909c;
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

.host {
  padding: 2px 8px;
  border-radius: 4px;
  background: #f2f3f5;
  font-family: monospace;
  font-size: 11px;
}

.config-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.action {
  padding: 5px 12px;
  border: 1px solid #1677ff;
  border-radius: 4px;
  background: #fff;
  color: #1677ff;
  font-size: 12px;
  cursor: pointer;
}

.action:hover {
  background: #e8f1ff;
}

.file-input {
  display: none;
}

.import-errors {
  margin: 8px 0 0;
  padding: 8px 10px 8px 26px;
  border-radius: 4px;
  background: #ffece8;
  color: #cb2634;
  font-size: 12px;
  line-height: 1.6;
}
</style>
