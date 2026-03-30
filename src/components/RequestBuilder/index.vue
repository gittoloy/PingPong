<template>
  <div class="request-builder-container">
    <div class="url-bar">
      <el-select v-model="requestStore.method" class="method-select" :class="'method-' + requestStore.method">
        <el-option v-for="method in methods" :key="method" :label="method" :value="method" />
      </el-select>
      <el-input 
        v-model="requestStore.url" 
        class="url-input" 
        :placeholder="urlPlaceholder"
        @keyup.enter="sendRequest"
      >
        <template #prefix>
          <el-icon><Link /></el-icon>
        </template>
        <template #prepend v-if="environmentStore.activeHost">
          <el-tooltip :content="environmentStore.activeHost" placement="top">
            <span class="host-prefix">{{ getHostDisplay }}</span>
          </el-tooltip>
        </template>
      </el-input>
      <el-button 
        type="primary" 
        :loading="requestStore.loading" 
        @click="sendRequest"
        size="large"
      >
        Send
      </el-button>
    </div>
    
    <el-tabs v-model="activeTab" class="request-tabs">
      <el-tab-pane label="Params" name="params">
        <KeyValueEditor 
          v-model="requestStore.queryParams" 
          @add="requestStore.addQueryParam"
          @remove="requestStore.removeQueryParam"
        />
      </el-tab-pane>
      
      <el-tab-pane label="Headers" name="headers">
        <HeaderEditor 
          v-model="requestStore.headers"
          @add="requestStore.addHeader"
          @remove="requestStore.removeHeader"
        />
      </el-tab-pane>
      
      <el-tab-pane label="Body" name="body">
        <div class="body-type-selector">
          <el-radio-group v-model="requestStore.bodyType" size="small">
            <el-radio-button label="none">None</el-radio-button>
            <el-radio-button label="json">JSON</el-radio-button>
            <el-radio-button label="form-data">Form Data</el-radio-button>
            <el-radio-button label="raw">Raw</el-radio-button>
          </el-radio-group>
        </div>
        <div v-if="requestStore.bodyType !== 'none'" class="body-editor">
          <el-input
            v-model="requestStore.body"
            type="textarea"
            :rows="8"
            :placeholder="bodyPlaceholder"
            resize="none"
          />
          <el-button 
            v-if="requestStore.bodyType === 'json'" 
            size="small" 
            @click="formatJson"
            style="margin-top: 8px;"
          >
            Format JSON
          </el-button>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="History" name="history">
        <div class="history-tab">
          <el-table :data="requestStore.displayedHistory" size="small" stripe max-height="300">
            <el-table-column prop="method" label="方法" width="80">
              <template #default="{ row }">
                <span :class="['method-tag', 'method-' + row.method]">{{ row.method }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="url" label="URL" show-overflow-tooltip>
              <template #default="{ row }">
                <span :title="row.url">{{ getDisplayUrl(row.url) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="response_status" label="状态" width="70">
              <template #default="{ row }">
                <span v-if="row.response_status" :class="['status-tag', getStatusClass(row.response_status)]">
                  {{ row.response_status }}
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="response_time" label="耗时" width="80">
              <template #default="{ row }">
                {{ row.response_time ? `${row.response_time}ms` : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="时间" width="140">
              <template #default="{ row }">
                {{ formatTime(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" text size="small" @click="viewDetail(row)">
                  查看
                </el-button>
                <el-button type="success" text size="small" @click="useHistory(row)">
                  使用
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <div v-if="requestStore.displayedHistory.length === 0" class="empty-history">
            <el-icon :size="32"><Document /></el-icon>
            <p>暂无历史请求记录</p>
          </div>
          
          <div v-if="requestStore.hasMoreHistory" class="load-more">
            <el-button type="primary" text @click="loadMore">
              查看更多
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <RequestDetailDialog
      v-model:visible="showDetailDialog"
      :record="selectedRecord"
      @use="handleUseFromDetail"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Link, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRequestStore } from '@/stores/request'
import { useEnvironmentStore } from '@/stores/environment'
import KeyValueEditor from './KeyValueEditor.vue'
import HeaderEditor from './HeaderEditor.vue'
import RequestDetailDialog from './RequestDetailDialog.vue'
import type { HttpMethod, RequestRecord } from '@/types'

const requestStore = useRequestStore()
const environmentStore = useEnvironmentStore()

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']
const activeTab = ref('params')
const showDetailDialog = ref(false)
const selectedRecord = ref<RequestRecord | null>(null)

const bodyPlaceholder = computed(() => {
  switch (requestStore.bodyType) {
    case 'json':
      return '{\n  "key": "value"\n}'
    case 'form-data':
      return '{\n  "field1": "value1",\n  "field2": "value2"\n}'
    case 'raw':
      return 'Enter raw text...'
    default:
      return ''
  }
})

const urlPlaceholder = computed(() => {
  if (environmentStore.activeHost) {
    return 'Enter API path (e.g., /api/users)'
  }
  return 'Enter request URL (e.g., https://api.example.com/users)'
})

const getHostDisplay = computed(() => {
  const host = environmentStore.activeHost || ''
  if (host.length > 30) {
    return host.substring(0, 30) + '...'
  }
  return host
})

async function sendRequest() {
  if (!requestStore.url) {
    ElMessage.warning('Please enter a URL')
    return
  }
  
  const originalUrl = requestStore.url
  const fullUrl = environmentStore.getFullUrl(requestStore.url)
  requestStore.url = fullUrl
  
  await requestStore.sendRequest()
  
  requestStore.url = originalUrl
  
  if (requestStore.error) {
    ElMessage.error(requestStore.error)
  }
}

function formatJson() {
  try {
    const parsed = JSON.parse(requestStore.body)
    requestStore.body = JSON.stringify(parsed, null, 2)
  } catch {
    ElMessage.error('Invalid JSON format')
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
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString().slice(0, 5)
}

function viewDetail(record: RequestRecord) {
  selectedRecord.value = record
  showDetailDialog.value = true
}

function useHistory(record: RequestRecord) {
  requestStore.loadFromHistory(record)
  activeTab.value = 'params'
  ElMessage.success('已加载历史请求')
}

function handleUseFromDetail(record: RequestRecord) {
  requestStore.loadFromHistory(record)
  activeTab.value = 'params'
  ElMessage.success('已加载历史请求')
}

function getDisplayUrl(url: string): string {
  if (!url) return ''
  if (environmentStore.activeHost) {
    return url.replace(environmentStore.activeHost, '').replace(/^https?:\/\/[^\/]+/, '') || '/'
  }
  return url.replace(/^https?:\/\/[^\/]+/, '') || url
}

function loadMore() {
  requestStore.loadMoreHistory()
}
</script>

<style scoped>
.request-builder-container {
  height: 100%;
}

.url-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.method-select {
  width: 120px;
}

.method-select :deep(.el-input__inner) {
  font-weight: 600;
}

.method-GET :deep(.el-input__inner) { color: #67c23a; }
.method-POST :deep(.el-input__inner) { color: #e6a23c; }
.method-PUT :deep(.el-input__inner) { color: #409eff; }
.method-PATCH :deep(.el-input__inner) { color: #909399; }
.method-DELETE :deep(.el-input__inner) { color: #f56c6c; }

.url-input {
  flex: 1;
}

.host-prefix {
  font-size: 12px;
  color: var(--text-secondary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.body-type-selector {
  margin-bottom: 12px;
}

.body-editor {
  margin-top: 8px;
}

.body-editor :deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.history-tab {
  height: 100%;
}

.method-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 3px;
  text-transform: uppercase;
}

.method-GET { background: #e1f3d8; color: #67c23a; }
.method-POST { background: #fdf6ec; color: #e6a23c; }
.method-PUT { background: #d9ecff; color: #409eff; }
.method-PATCH { background: #e9e9eb; color: #909399; }
.method-DELETE { background: #fef0f0; color: #f56c6c; }

.status-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
}

.status-2xx { background: #e1f3d8; color: #67c23a; }
.status-3xx { background: #fdf6ec; color: #e6a23c; }
.status-4xx { background: #fef0f0; color: #f56c6c; }
.status-5xx { background: #fef0f0; color: #f56c6c; }
.status-0xx { background: #f4f4f5; color: #909399; }

.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-secondary);
}

.empty-history p {
  margin-top: 12px;
  font-size: 13px;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 12px 0;
  border-top: 1px solid var(--border-color);
}
</style>
