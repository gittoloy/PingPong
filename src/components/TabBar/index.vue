<template>
  <div class="tab-bar">
    <div class="tabs-container" ref="tabsContainer">
      <div
        v-for="tab in tabsStore.tabs"
        :key="tab.id"
        class="tab-item"
        :class="{ 'is-active': tab.id === tabsStore.activeTabId }"
        @click="tabsStore.switchTab(tab.id)"
        @dblclick="tabsStore.startRenaming(tab.id)"
      >
        <span :class="['tab-method', 'method-' + tab.method]">{{ tab.method }}</span>
        
        <template v-if="tab.isRenaming">
          <input
            class="tab-name-input"
            v-model="renamingValue"
            @blur="handleRenameConfirm(tab.id)"
            @keyup.enter="handleRenameConfirm(tab.id)"
            @keyup.escape="tabsStore.stopRenaming(tab.id)"
            ref="renameInput"
          />
        </template>
        <template v-else>
          <span class="tab-name" :title="tab.name">{{ tab.name }}</span>
        </template>
        
        <span
          v-if="tabsStore.tabs.length > 1"
          class="tab-close"
          @click.stop="handleClose(tab.id)"
        >
          <el-icon :size="12"><Close /></el-icon>
        </span>
      </div>
    </div>
    <div class="tab-actions">
      <el-button text size="small" @click="tabsStore.addTab()" class="add-tab-btn">
        <el-icon><Plus /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { Close, Plus } from '@element-plus/icons-vue'
import { useTabsStore } from '@/stores/tabs'
import type { RequestTab } from '@/types'

const tabsStore = useTabsStore()
const renamingValue = ref('')
const renameInput = ref<HTMLInputElement[]>()
const tabsContainer = ref<HTMLElement>()

watch(() => tabsStore.tabs.map((t: RequestTab) => t.isRenaming), async () => {
  const renamingTab = tabsStore.tabs.find((t: RequestTab) => t.isRenaming)
  if (renamingTab) {
    renamingValue.value = renamingTab.name
    await nextTick()
    if (renameInput.value && renameInput.value.length > 0) {
      const input = renameInput.value[0]
      input.focus()
      input.select()
    }
  }
}, { deep: true })

function handleRenameConfirm(tabId: string) {
  if (renamingValue.value.trim()) {
    tabsStore.renameTab(tabId, renamingValue.value.trim())
  } else {
    tabsStore.stopRenaming(tabId)
  }
}

function handleClose(tabId: string) {
  tabsStore.closeTab(tabId)
}
</script>

<style scoped>
.tab-bar {
  display: flex;
  align-items: center;
  background: #f5f7fa;
  border-bottom: 1px solid var(--border-color);
  padding: 0 8px;
  height: 36px;
  flex-shrink: 0;
}

.tabs-container {
  display: flex;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  gap: 2px;
  height: 100%;
  align-items: flex-end;
}

.tabs-container::-webkit-scrollbar {
  height: 0;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  height: 30px;
  background: #e9e9eb;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  white-space: nowrap;
  max-width: 180px;
  min-width: 80px;
  transition: background 0.2s, color 0.2s;
  user-select: none;
  font-size: 12px;
}

.tab-item:hover {
  background: #e4e7ed;
}

.tab-item.is-active {
  background: #fff;
  border-bottom: 2px solid #fff;
  margin-bottom: -1px;
  color: var(--el-color-primary);
}

.tab-method {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 2px;
  flex-shrink: 0;
}

.method-GET { background: #e1f3d8; color: #67c23a; }
.method-POST { background: #fdf6ec; color: #e6a23c; }
.method-PUT { background: #d9ecff; color: #409eff; }
.method-PATCH { background: #e9e9eb; color: #909399; }
.method-DELETE { background: #fef0f0; color: #f56c6c; }
.method-OPTIONS { background: #e9e9eb; color: #909399; }
.method-HEAD { background: #e9e9eb; color: #909399; }

.tab-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  font-size: 12px;
}

.tab-name-input {
  border: none;
  outline: none;
  background: #fff;
  font-size: 12px;
  width: 100%;
  padding: 0;
  border-bottom: 1px solid var(--el-color-primary);
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;
}

.tab-item:hover .tab-close,
.tab-item.is-active .tab-close {
  opacity: 0.6;
}

.tab-close:hover {
  opacity: 1 !important;
  background: rgba(0, 0, 0, 0.1);
}

.tab-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 4px;
}

.add-tab-btn {
  padding: 4px;
}
</style>
