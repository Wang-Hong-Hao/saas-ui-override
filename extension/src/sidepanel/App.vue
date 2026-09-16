<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Toolbar from './components/Toolbar.vue'
import RuleList from './components/RuleList.vue'
import ElementInfo from './components/ElementInfo.vue'
import StyleEditor from './components/StyleEditor.vue'
import AttributesEditor from './components/AttributesEditor.vue'
import TailwindEditor from './components/TailwindEditor.vue'
import CustomCssEditor from './components/CustomCssEditor.vue'
import ConfigPanel from './components/ConfigPanel.vue'
import { getActiveTabId, sendToContent } from './messaging'
import { loadStoredConfig, saveStoredConfig } from './persistence'
import { validateUIConfig } from '@shared/validation'
import {
  canRedo,
  canUndo,
  clearEditor,
  editorState,
  markSaved,
  redo,
  resetRule,
  selectElement,
  setConfig,
  undo,
} from './stores/config'
import type { PickerEvent, PreviewRule } from '../shared/messages'

const tabId = ref<number | null>(null)
const selecting = ref(false)
const error = ref('')

const ruleEmpty = computed(() => {
  const rule = editorState.rule
  if (!rule) return true
  return (
    Object.keys(rule.styles).length === 0 &&
    rule.classes.add.length === 0 &&
    rule.classes.remove.length === 0 &&
    Object.keys(rule.attributes).length === 0 &&
    rule.customCss.trim() === ''
  )
})

async function togglePicker(): Promise<void> {
  if (tabId.value === null) {
    error.value = '未找到当前标签页'
    return
  }
  const res = await sendToContent(tabId.value, { type: selecting.value ? 'picker:stop' : 'picker:start' })
  if (!res?.ok) {
    error.value = '无法连接到当前页面,请刷新页面后重试(chrome:// 等内部页面不可用)'
    return
  }
  error.value = ''
  selecting.value = !selecting.value
}

function handlePickerEvent(message: PickerEvent, sender: chrome.runtime.MessageSender): void {
  if (tabId.value !== null && sender.tab?.id !== undefined && sender.tab.id !== tabId.value) return
  switch (message.type) {
    case 'picker:selected':
      selectElement(message.payload)
      selecting.value = false
      break
    case 'picker:cancelled':
    case 'picker:stopped':
      selecting.value = false
      break
  }
}

/** 取当前 tab 的 host 并恢复该 host 的草稿/已保存配置 */
async function loadConfigForCurrentTab(): Promise<void> {
  if (tabId.value === null) return
  const hostRes = await sendToContent(tabId.value, { type: 'page:host' })
  if (!hostRes?.ok || !hostRes.host) return
  editorState.host = hostRes.host
  const { data, error: loadError } = await loadStoredConfig(hostRes.host)
  if (loadError) {
    error.value = `读取本地配置失败:${loadError}`
    return
  }
  if (!data) return
  const result = validateUIConfig(data.config)
  if (!result.ok) {
    error.value = `本地配置已损坏,已忽略:${result.errors[0]}`
    return
  }
  setConfig(result.config, data.status)
}

function handleTabActivated(): void {
  void getActiveTabId().then((id) => {
    if (id === tabId.value) return
    // 先清掉旧标签页上的预览,再切换
    if (tabId.value !== null) {
      void sendToContent(tabId.value, { type: 'preview:clear' })
    }
    tabId.value = id
    selecting.value = false
    clearEditor()
    error.value = ''
    void loadConfigForCurrentTab()
  })
}

/** config 变化(任何 rule 的任何字段)时实时刷新页面预览:所有 enabled rules 叠加 */
watch(
  () => editorState.config,
  () => {
    void syncPreview()
    schedulePersist()
  },
  { deep: true },
)

async function syncPreview(): Promise<void> {
  if (tabId.value === null) return
  const config = editorState.config
  if (!config || config.rules.length === 0) {
    await sendToContent(tabId.value, { type: 'preview:clear' })
    return
  }
  const rules: PreviewRule[] = config.rules.map((rule) => ({
    selector: rule.selector,
    styles: { ...rule.styles },
    classes: { add: [...rule.classes.add], remove: [...rule.classes.remove] },
    attributes: { ...rule.attributes },
    customCss: rule.customCss,
    enabled: rule.enabled,
  }))
  await sendToContent(tabId.value, { type: 'preview:apply', rules })
}

let persistTimer: ReturnType<typeof setTimeout> | null = null
const PERSIST_DEBOUNCE_MS = 600

function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => void persistDraft(), PERSIST_DEBOUNCE_MS)
}

async function persistDraft(): Promise<void> {
  if (!editorState.config || !editorState.host) return
  const saveError = await saveStoredConfig(editorState.host, editorState.config, editorState.status)
  if (saveError) error.value = `保存到本地存储失败:${saveError}`
}

async function onSave(): Promise<void> {
  if (!editorState.config) return
  markSaved()
  await persistDraft()
}

onMounted(async () => {
  tabId.value = await getActiveTabId()
  chrome.runtime.onMessage.addListener(handlePickerEvent)
  chrome.tabs.onActivated.addListener(handleTabActivated)
  await loadConfigForCurrentTab()
})

onUnmounted(() => {
  chrome.runtime.onMessage.removeListener(handlePickerEvent)
  chrome.tabs.onActivated.removeListener(handleTabActivated)
})
</script>

<template>
  <div class="panel">
    <header class="panel-header">
      SaaS UI Override
      <span class="phase">Phase 5</span>
    </header>

    <Toolbar
      :selecting="selecting"
      :disabled="tabId === null"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :can-save="editorState.config !== null"
      :status="editorState.status"
      @toggle="togglePicker"
      @undo="undo"
      @redo="redo"
      @save="onSave"
    />

    <p v-if="error" class="error-banner">{{ error }}</p>

    <div class="panel-body">
      <RuleList v-if="editorState.config && editorState.config.rules.length > 0" />

      <template v-if="editorState.rule">
        <ElementInfo :tab-id="tabId" />
        <StyleEditor />
        <AttributesEditor />
        <TailwindEditor :tab-id="tabId" />
        <CustomCssEditor />
        <section class="rule-actions">
          <button
            type="button"
            class="reset-rule-button"
            data-action="reset-rule"
            :disabled="ruleEmpty"
            @click="resetRule"
          >
            重置 Rule(清空 styles / classes / attributes / customCss)
          </button>
        </section>
      </template>
      <div v-else-if="!editorState.config" class="empty-state">
        <p>点击「🎯 选择元素」,然后在页面中点击目标元素。</p>
        <p>选择中按 <kbd>ESC</kbd> 退出。</p>
      </div>

      <ConfigPanel v-if="editorState.config" :tab-id="tabId" />
    </div>
  </div>
</template>

<style scoped>
.rule-actions {
  margin-top: 16px;
  border-top: 1px solid #e5e6eb;
  padding-top: 12px;
}

.reset-rule-button {
  padding: 5px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #4e5969;
  font-size: 12px;
  cursor: pointer;
}

.reset-rule-button:hover:not(:disabled) {
  border-color: #cb2634;
  color: #cb2634;
}

.reset-rule-button:disabled {
  color: #c9cdd4;
  cursor: not-allowed;
}

.panel-body {
  padding-bottom: 24px;
}
</style>
