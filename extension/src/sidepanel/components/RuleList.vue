<script setup lang="ts">
import { computed } from 'vue'
import { deleteRule, editorState, selectRule, toggleRuleEnabled } from '../stores/config'

const rules = computed(() => editorState.config?.rules ?? [])
const currentId = computed(() => editorState.rule?.id ?? null)
</script>

<template>
  <section class="rule-list">
    <div class="list-header">Rules({{ rules.length }})</div>
    <div
      v-for="rule in rules"
      :key="rule.id"
      class="rule-item"
      :class="{ active: rule.id === currentId, disabled: !rule.enabled }"
      :data-rule-id="rule.id"
      @click="selectRule(rule.id)"
    >
      <input
        type="checkbox"
        class="enabled-toggle"
        :checked="rule.enabled"
        :title="rule.enabled ? '点击禁用' : '点击启用'"
        @click.stop
        @change="toggleRuleEnabled(rule.id)"
      />
      <div class="rule-text">
        <span class="rule-id">{{ rule.id }}</span>
        <span class="rule-selector" :title="rule.selector">{{ rule.selector }}</span>
      </div>
      <button
        type="button"
        class="delete"
        title="删除 rule"
        :data-delete-rule="rule.id"
        @click.stop="deleteRule(rule.id)"
      >
        ×
      </button>
    </div>
  </section>
</template>

<style scoped>
.rule-list {
  margin-bottom: 14px;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
}

.list-header {
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #4e5969;
  border-bottom: 1px solid #f2f3f5;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  cursor: pointer;
  border-bottom: 1px solid #f7f8fa;
}

.rule-item:last-child {
  border-bottom: none;
}

.rule-item:hover {
  background: #f7f8fa;
}

.rule-item.active {
  background: #e8f1ff;
}

.rule-item.disabled .rule-text {
  opacity: 0.45;
}

.enabled-toggle {
  margin: 0;
  cursor: pointer;
}

.rule-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.rule-id {
  font-size: 11px;
  color: #86909c;
}

.rule-selector {
  font-family: monospace;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete {
  border: none;
  background: none;
  padding: 0 2px;
  font-size: 13px;
  color: #c9cdd4;
  cursor: pointer;
}

.delete:hover {
  color: #cb2634;
}
</style>
