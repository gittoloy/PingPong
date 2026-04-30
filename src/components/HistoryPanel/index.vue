<template>
  <div class="history-panel">
    <div class="history-header">
      <el-input 
        v-model="tabsStore.searchKeyword"
        placeholder="Search history..."
        size="small"
        clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button 
        type="danger" 
        text 
        size="small" 
        @click="confirmClear"
        :disabled="tabsStore.history.length === 0"
      >
        Clear All
      </el-button>
    </div>
    
    <div class="history-list">
      <template v-if="tabsStore.filteredHistory.length > 0">
        <div 
          v-for="item in tabsStore.filteredHistory"
          :key="item.id"
          class="history-item"
          @click="loadRequest(item)"
        >
          <div class="history-item-header">
            <span :class="['method', 'method-' + item.method]">{{ item.method }}</span>
            <span v-if="item.response_status" :class="['status', getStatusClass(item.response_status)]">
              {{ item.response_status }}
            </span>
          </div>
          <div class="url">{{ item.url }}</div>
          <div class="history-item-footer">
            <span class="time">{{ formatTime(item.created_at) }}</span>
            <el-button 
              type="danger" 
              text 
              size="small" 
              @click.stop="deleteItem(item.id)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="empty-state">
          <el-icon :size="32"><Document /></el-icon>
          <p>No history yet</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search, Delete, Document } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useTabsStore } from '@/stores/tabs'
import type { RequestRecord } from '@/types'

const tabsStore = useTabsStore()

function loadRequest(item: RequestRecord) {
  tabsStore.loadFromHistoryIntoTab(item)
}

async function deleteItem(id: number | undefined) {
  if (!id) return
  
  try {
    await ElMessageBox.confirm('Delete this request?', 'Confirm', {
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      type: 'warning'
    })
    await tabsStore.deleteHistoryItem(id)
    ElMessage.success('Deleted')
  } catch {
    // Cancelled
  }
}

async function confirmClear() {
  try {
    await ElMessageBox.confirm('Clear all history?', 'Confirm', {
      confirmButtonText: 'Clear All',
      cancelButtonText: 'Cancel',
      type: 'warning'
    })
    await tabsStore.clearHistory()
    ElMessage.success('History cleared')
  } catch {
    // Cancelled
  }
}

function getStatusClass(status: number): string {
  if (status >= 200 && status < 300) return 'status-2xx'
  if (status >= 300 && status < 400) return 'status-3xx'
  if (status >= 400 && status < 500) return 'status-4xx'
  if (status >= 500) return 'status-5xx'
  return 'status-0xx'
}

function formatTime(timestamp: string | undefined): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  
  return date.toLocaleDateString()
}
</script>

<style scoped>
.history-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.history-header {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-list {
  flex: 1;
  overflow-y: auto;
}

.history-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background 0.2s;
}

.history-item:hover {
  background: var(--bg-color);
}

.history-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.method {
  font-weight: 600;
  font-size: 12px;
}

.status {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
}

.status-2xx { background: #e1f3d8; color: #67c23a; }
.status-3xx { background: #fdf6ec; color: #e6a23c; }
.status-4xx { background: #fef0f0; color: #f56c6c; }
.status-5xx { background: #fef0f0; color: #f56c6c; }
.status-0xx { background: #f4f4f5; color: #909399; }

.url {
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.time {
  font-size: 12px;
  color: var(--info-color);
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-state p {
  margin-top: 8px;
}
</style>
