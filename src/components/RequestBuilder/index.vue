<template>
  <div class="request-builder-container">
    <div class="url-bar">
      <el-select v-model="tabsStore.activeTab.method" class="method-select" :class="'method-' + tabsStore.activeTab.method">
        <el-option v-for="method in methods" :key="method" :label="method" :value="method" />
      </el-select>
      <el-input 
        v-model="tabsStore.activeTab.url" 
        class="url-input" 
        :placeholder="urlPlaceholder"
        @keyup.enter="sendRequest"
        @input="handleUrlChange"
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
        :loading="tabsStore.activeTab.loading" 
        @click="sendRequest"
        size="large"
      >
        Send
      </el-button>
    </div>

    <!-- Path Params Editor - shown when URL contains path params -->
    <PathParamsEditor :path-params="tabsStore.activeTab.pathParams" />
    
    <el-tabs v-model="activeTab" class="request-tabs">
      <el-tab-pane label="Params" name="params">
        <div class="tab-content">
          <KeyValueEditor 
            v-model="tabsStore.activeTab.queryParams" 
            @add="addQueryParam"
            @remove="removeQueryParam"
          />
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="Headers" name="headers">
        <div class="tab-content">
          <HeaderEditor 
            v-model="tabsStore.activeTab.headers"
            @add="addHeader"
            @remove="removeHeader"
          />
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="Body" name="body">
        <div class="tab-content">
          <div class="body-type-selector">
            <el-radio-group v-model="tabsStore.activeTab.bodyType" size="small">
              <el-radio-button label="none">None</el-radio-button>
              <el-radio-button label="json">JSON</el-radio-button>
              <el-radio-button label="form-data">Form Data</el-radio-button>
              <el-radio-button label="multipart">Multipart</el-radio-button>
              <el-radio-button label="raw">Raw</el-radio-button>
            </el-radio-group>
          </div>
          <div v-if="tabsStore.activeTab.bodyType !== 'none'" class="body-editor">
            <FormDataEditor
              v-if="tabsStore.activeTab.bodyType === 'multipart'"
              v-model="tabsStore.activeTab.formData"
              @add-text="addFormField"
              @add-file="addFileField"
              @remove="removeFormField"
              @select-file="handleSelectFile"
              @clear-file="handleClearFile"
              @change-type="handleFieldTypeChange"
            />
            <JsonEditor
              v-else-if="tabsStore.activeTab.bodyType === 'json'"
              v-model="tabsStore.activeTab.body"
              :placeholder="bodyPlaceholder"
            />
            <el-input
              v-else
              v-model="tabsStore.activeTab.body"
              type="textarea"
              :rows="8"
              :placeholder="bodyPlaceholder"
              resize="none"
            />
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="History" name="history">
        <div class="tab-content history-tab">
          <el-table :data="tabsStore.displayedHistory" size="small" stripe max-height="300">
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
          
          <div v-if="tabsStore.displayedHistory.length === 0" class="empty-history">
            <el-icon :size="32"><Document /></el-icon>
            <p>暂无历史请求记录</p>
          </div>
          
          <div v-if="tabsStore.hasMoreHistory" class="load-more">
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Link, Document, FolderAdd } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTabsStore } from '@/stores/tabs'
import { useEnvironmentStore } from '@/stores/environment'
import { useApiStore, type ApiItem } from '@/stores/api'
import KeyValueEditor from './KeyValueEditor.vue'
import HeaderEditor from './HeaderEditor.vue'
import RequestDetailDialog from './RequestDetailDialog.vue'
import JsonEditor from './JsonEditor.vue'
import FormDataEditor from './FormDataEditor.vue'
import PathParamsEditor from './PathParamsEditor.vue'
import type { HttpMethod, RequestRecord, FormField } from '@/types'

const tabsStore = useTabsStore()
const environmentStore = useEnvironmentStore()
const apiStore = useApiStore()

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']
const activeTab = ref('params')
const showDetailDialog = ref(false)
const selectedRecord = ref<RequestRecord | null>(null)

const bodyPlaceholder = computed(() => {
  switch (tabsStore.activeTab.bodyType) {
    case 'json':
      return '{\n  "key": "value"\n}'
    case 'form-data':
      return '{\n  "field1": "value1",\n  "field2": "value2"\n}'
    case 'multipart':
      return ''
    case 'raw':
      return 'Enter raw text...'
    default:
      return ''
  }
})

const urlPlaceholder = computed(() => {
  if (environmentStore.activeHost) {
    return 'Enter API path (e.g., /api/users/:id)'
  }
  return 'Enter request URL (e.g., https://api.example.com/users/:id)'
})

const getHostDisplay = computed(() => {
  const host = environmentStore.activeHost || ''
  if (host.length > 30) {
    return host.substring(0, 30) + '...'
  }
  return host
})

function handleUrlChange() {
  tabsStore.updatePathParamsFromUrl(tabsStore.activeTabId, tabsStore.activeTab.url)
}

async function sendRequest() {
  if (!tabsStore.activeTab.url) {
    ElMessage.warning('Please enter a URL')
    return
  }
  
  await tabsStore.sendRequest()
  
  if (tabsStore.activeTab.error) {
    ElMessage.error(tabsStore.activeTab.error)
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
  tabsStore.loadFromHistoryIntoTab(record)
  activeTab.value = 'params'
  ElMessage.success('已加载历史请求')
}

function handleUseFromDetail(record: RequestRecord) {
  tabsStore.loadFromHistoryIntoTab(record)
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
  tabsStore.loadMoreHistory()
}

function addHeader() {
  tabsStore.activeTab.headers.push({ key: '', value: '', enabled: true })
}

function removeHeader(index: number) {
  tabsStore.activeTab.headers.splice(index, 1)
  if (tabsStore.activeTab.headers.length === 0) {
    tabsStore.activeTab.headers.push({ key: '', value: '', enabled: true })
  }
}

function addQueryParam() {
  tabsStore.activeTab.queryParams.push({ key: '', value: '', enabled: true })
}

function removeQueryParam(index: number) {
  tabsStore.activeTab.queryParams.splice(index, 1)
  if (tabsStore.activeTab.queryParams.length === 0) {
    tabsStore.activeTab.queryParams.push({ key: '', value: '', enabled: true })
  }
}

function addFormField() {
  tabsStore.activeTab.formData.push({ key: '', value: '', type: 'text', enabled: true })
}

function removeFormField(index: number) {
  tabsStore.activeTab.formData.splice(index, 1)
  if (tabsStore.activeTab.formData.length === 0) {
    tabsStore.activeTab.formData.push({ key: '', value: '', type: 'text', enabled: true })
  }
}

function addFileField() {
  tabsStore.activeTab.formData.push({ key: '', value: '', type: 'file', enabled: true })
}

async function handleSelectFile(index: number) {
  try {
    const files = await window.electronAPI.selectFiles()
    if (files && files.length > 0) {
      const file = files[0]
      const field = tabsStore.activeTab.formData[index]
      if (field) {
        field.type = 'file'
        field.filePath = file.filePath
        field.fileName = file.fileName
        field.fileSize = file.fileSize
      }
    }
  } catch (err) {
    console.error('Failed to select file:', err)
  }
}

function handleClearFile(index: number) {
  const field = tabsStore.activeTab.formData[index]
  if (field) {
    field.type = 'file'
    field.filePath = ''
    field.fileName = ''
    field.fileSize = 0
  }
}

function handleFieldTypeChange(index: number, type: 'text' | 'file') {
  const field = tabsStore.activeTab.formData[index]
  if (!field) return
  if (type === 'file') {
    field.type = 'file'
    field.value = ''
    field.filePath = ''
    field.fileName = ''
    field.fileSize = 0
  } else {
    field.type = 'text'
    field.filePath = undefined
    field.fileName = undefined
    field.fileSize = undefined
  }
}

function validateApiData(data: ApiItem): { valid: boolean; message: string } {
  if (!data.url || data.url.trim() === '') {
    return { valid: false, message: 'URL不能为空' }
  }
  
  if (!data.method) {
    return { valid: false, message: '请求方法不能为空' }
  }
  
  if (data.headers) {
    try {
      const parsed = JSON.parse(data.headers)
      if (!Array.isArray(parsed)) {
        return { valid: false, message: '请求头数据格式错误' }
      }
    } catch {
      return { valid: false, message: '请求头JSON解析失败' }
    }
  }
  
  if (data.query_params) {
    try {
      const parsed = JSON.parse(data.query_params)
      if (!Array.isArray(parsed)) {
        return { valid: false, message: '查询参数数据格式错误' }
      }
    } catch {
      return { valid: false, message: '查询参数JSON解析失败' }
    }
  }
  
  if (data.body_type === 'json' && data.body) {
    try {
      JSON.parse(data.body)
    } catch {
      return { valid: false, message: '请求体JSON格式错误' }
    }
  }
  
  return { valid: true, message: '' }
}

async function saveApi() {
  const tab = tabsStore.activeTab
  if (!tab.url) {
    ElMessage.warning('请输入URL')
    return
  }
  
  const currentUrl = tab.url.trim()
  const selectedApi = apiStore.getSelectedApi()
  
  const filteredHeaders = tab.headers.filter((h: any) => h.key && h.key.trim() !== '')
  const filteredParams = tab.queryParams.filter((p: any) => p.key && p.key.trim() !== '')
  
  // Serialize form data for multipart body type
  let bodyValue = tab.body
  if (tab.bodyType === 'multipart') {
    const textFields: Record<string, string> = {}
    tab.formData.forEach((f: any) => {
      if (f.type === 'text' && f.enabled && f.key) {
        textFields[f.key] = f.value
      }
    })
    bodyValue = Object.keys(textFields).length > 0 ? JSON.stringify(textFields) : ''
  }
  
  const apiData: ApiItem = {
    name: '',
    method: tab.method,
    url: currentUrl,
    headers: JSON.stringify(filteredHeaders),
    query_params: JSON.stringify(filteredParams),
    body: bodyValue,
    body_type: tab.bodyType,
    group_id: null
  }
  
  if (selectedApi && selectedApi.name && selectedApi.name.trim() !== '') {
    apiData.name = selectedApi.name
  } else {
    apiData.name = extractApiName(currentUrl)
  }
  
  const validation = validateApiData(apiData)
  if (!validation.valid) {
    ElMessage.error(validation.message)
    return
  }
  
  // Use UUID to determine if we should update an existing API
  if (selectedApi && selectedApi.id) {
    try {
      apiData.id = selectedApi.id
      apiData.uuid = selectedApi.uuid
      apiData.group_id = selectedApi.group_id
      apiData.description = selectedApi.description
      await apiStore.updateApi(apiData)
      ElMessage.success('API配置已更新')
    } catch (err: any) {
      console.error('Save API error:', err)
      ElMessage.error('保存失败: ' + (err.message || '未知错误'))
    }
  } else {
    try {
      const newApiId = await apiStore.createApi(apiData)
      apiStore.setSelectedApiId(newApiId)
      ElMessage.success('已保存为新的API')
    } catch (err: any) {
      console.error('Create API error:', err)
      ElMessage.error('保存失败: ' + (err.message || '未知错误'))
    }
  }
}

function extractApiName(url: string): string {
  try {
    let cleanUrl = url.trim()
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'http://placeholder' + (cleanUrl.startsWith('/') ? '' : '/') + cleanUrl
    }
    
    const urlObj = new URL(cleanUrl)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1]
      return lastPart.substring(0, 50)
    }
    
    const host = urlObj.host.replace(/^www\./, '')
    return host.substring(0, 50)
  } catch {
    return url.trim().substring(0, 50) || 'Untitled API'
  }
}

// Ctrl+S 快捷键保存
function handleKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    saveApi()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.request-builder-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.url-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-shrink: 0;
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

.request-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.request-tabs :deep(.el-tabs__header) {
  flex-shrink: 0;
  margin-bottom: 0;
}

.request-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  padding: 0;
}

.request-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.tab-content {
  height: 100%;
  overflow: hidden;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
}

.body-type-selector {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.body-editor {
  margin-top: 8px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.body-editor :deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.json-editor-wrapper {
  flex: 1;
  min-height: 200px;
  max-height: 100%;
  overflow: hidden;
}

.history-tab {
  padding: 12px 0;
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
