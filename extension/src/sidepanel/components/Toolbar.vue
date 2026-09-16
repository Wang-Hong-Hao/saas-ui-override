<script setup lang="ts">
import type { SaveStatus } from '@shared/types/config'

defineProps<{
  selecting: boolean
  disabled: boolean
  canUndo: boolean
  canRedo: boolean
  canSave: boolean
  status: SaveStatus
}>()
const emit = defineEmits<{ toggle: []; undo: []; redo: []; save: [] }>()

const STATUS_LABEL: Record<SaveStatus, string> = {
  draft: 'Draft',
  saved: 'Saved',
  exported: 'Exported',
}
</script>

<template>
  <div class="toolbar">
    <button
      type="button"
      class="pick-button"
      :class="{ active: selecting }"
      :disabled="disabled"
      @click="emit('toggle')"
    >
      {{ selecting ? '✕ 取消选择' : '🎯 选择元素' }}
    </button>
    <button
      type="button"
      class="tool-button"
      data-action="undo"
      :disabled="!canUndo"
      title="Undo"
      @click="emit('undo')"
    >
      ↩ Undo
    </button>
    <button
      type="button"
      class="tool-button"
      data-action="redo"
      :disabled="!canRedo"
      title="Redo"
      @click="emit('redo')"
    >
      ↪ Redo
    </button>
    <span class="spacer"></span>
    <span class="status-badge" :class="status" data-config="status">{{ STATUS_LABEL[status] }}</span>
    <button
      type="button"
      class="tool-button save"
      data-action="save"
      :disabled="!canSave"
      @click="emit('save')"
    >
      保存
    </button>
    <span v-if="selecting" class="toolbar-hint">移动鼠标高亮,点击锁定,ESC 退出</span>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e6eb;
}

.pick-button {
  padding: 6px 14px;
  border: 1px solid #1677ff;
  border-radius: 4px;
  background: #fff;
  color: #1677ff;
  font-size: 13px;
  cursor: pointer;
}

.pick-button:hover:not(:disabled) {
  background: #e8f1ff;
}

.pick-button.active {
  background: #1677ff;
  color: #fff;
}

.pick-button:disabled {
  border-color: #d9d9d9;
  color: #c9cdd4;
  cursor: not-allowed;
}

.tool-button {
  padding: 6px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #4e5969;
  font-size: 12px;
  cursor: pointer;
}

.tool-button:hover:not(:disabled) {
  border-color: #1677ff;
  color: #1677ff;
}

.tool-button:disabled {
  color: #c9cdd4;
  cursor: not-allowed;
}

.tool-button.save:not(:disabled) {
  border-color: #1677ff;
  color: #1677ff;
}

.spacer {
  flex: 1;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
}

.status-badge.draft {
  background: #fff7e8;
  color: #ff7d00;
}

.status-badge.saved {
  background: #e8ffea;
  color: #00b42a;
}

.status-badge.exported {
  background: #e8f1ff;
  color: #1677ff;
}

.toolbar-hint {
  font-size: 12px;
  color: #86909c;
}
</style>
