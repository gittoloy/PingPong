<template>
  <div class="response-viewer-container">
    <template v-if="requestStore.response">
      <div class="response-header">
        <span :class="['status-badge', statusClass]">
          {{ requestStore.response.status }} {{ requestStore.response.statusText }}
        </span>
        <span class="response-time">
          <el-icon><Timer /></el-icon>
          {{ requestStore.response.time }}ms
        </span>
        <el-button-group style="margin-left: auto;">
          <el-button size="small" @click="copyResponse">
            <el-icon><CopyDocument /></el-icon>
            Copy
          </el-button>
        </el-button-group>
      </div>
      
      <el-tabs v-model="activeTab" class="response-tabs">
        <el-tab-pane label="Body" name="body">
          <div class="response-body">
            <template v-if="isJsonResponse">
              <JsonViewer :data="requestStore.response.body" />
            </template>
            <template v-else-if="isXmlResponse">
              <div class="xml-viewer">
                <div class="xml-toolbar">
                  <el-button size="small" @click="formatXml">
                    <el-icon><Document /></el-icon>
                    格式化
                  </el-button>
                  <el-button size="small" @click="copyResponse">
                    <el-icon><CopyDocument /></el-icon>
                    复制
                  </el-button>
                </div>
                <div class="xml-content">
                  <pre v-html="formattedXml"></pre>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="plain-text-viewer">
                <div class="plain-toolbar">
                  <el-button size="small" @click="copyResponse">
                    <el-icon><CopyDocument /></el-icon>
                    复制
                  </el-button>
                </div>
                <div class="plain-content">
                  <pre>{{ requestStore.response.body }}</pre>
                </div>
              </div>
            </template>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="Headers" name="headers">
          <div class="response-headers">
            <div class="headers-toolbar">
              <el-button size="small" @click="copyHeaders">
                <el-icon><CopyDocument /></el-icon>
                复制全部
              </el-button>
            </div>
            <el-table :data="headersList" size="small" stripe>
              <el-table-column prop="key" label="Key" min-width="180">
                <template #default="{ row }">
                  <span class="header-key">{{ row.key }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="value" label="Value" min-width="200">
                <template #default="{ row }">
                  <span class="header-value" :title="row.value">{{ row.value }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="Actual" name="actualRequest">
          <div class="actual-request-content">
            <template v-if="requestStore.actualRequest">
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="请求方法">
                  <span :class="['method-tag', 'method-' + requestStore.actualRequest.method]">
                    {{ requestStore.actualRequest.method }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="完整URL">
                  <div class="url-display">{{ requestStore.actualRequest.fullUrl }}</div>
                </el-descriptions-item>
                <el-descriptions-item label="请求时间">
                  {{ formatTimestamp(requestStore.actualRequest.timestamp) }}
                </el-descriptions-item>
              </el-descriptions>
              
              <el-divider content-position="left">请求头</el-divider>
              <div class="headers-section">
                <el-table 
                  v-if="Object.keys(requestStore.actualRequest.headers).length > 0" 
                  :data="actualHeadersList" 
                  size="small" 
                  stripe
                >
                  <el-table-column prop="key" label="Key" width="200" />
                  <el-table-column prop="value" label="Value" />
                </el-table>
                <div v-else class="empty-text">无请求头</div>
              </div>
              
              <el-divider content-position="left">查询参数</el-divider>
              <div class="params-section">
                <el-table 
                  v-if="Object.keys(requestStore.actualRequest.queryParams).length > 0" 
                  :data="actualQueryParamsList" 
                  size="small" 
                  stripe
                >
                  <el-table-column prop="key" label="Key" width="200" />
                  <el-table-column prop="value" label="Value" />
                </el-table>
                <div v-else class="empty-text">无查询参数</div>
              </div>
              
              <el-divider content-position="left">请求体</el-divider>
              <div class="body-section">
                <template v-if="requestStore.actualRequest.bodyType !== 'none' && requestStore.actualRequest.body">
                  <div class="body-info">
                    <span class="body-type">类型: {{ requestStore.actualRequest.bodyType }}</span>
                  </div>
                  <div class="body-content">
                    <pre>{{ formatBody(requestStore.actualRequest.body, requestStore.actualRequest.bodyType) }}</pre>
                  </div>
                </template>
                <div v-else class="empty-text">无请求体</div>
              </div>
            </template>
            <div v-else class="empty-text">
              暂无实际请求信息
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>
    
    <template v-else-if="requestStore.loading">
      <div class="empty-state">
        <el-icon class="is-loading" :size="48"><Loading /></el-icon>
        <p>Sending request...</p>
      </div>
    </template>
    
    <template v-else>
      <div class="empty-state">
        <el-icon :size="48"><Promotion /></el-icon>
        <p>Enter a URL and click Send to make a request</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Timer, CopyDocument, Loading, Promotion, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRequestStore } from '@/stores/request'
import JsonViewer from './JsonViewer.vue'
import hljs from 'highlight.js/lib/core'
import xml from 'highlight.js/lib/languages/xml'
import 'highlight.js/styles/github.css'

hljs.registerLanguage('xml', xml)

const requestStore = useRequestStore()
const activeTab = ref('body')

const statusClass = computed(() => {
  const status = requestStore.response?.status || 0
  if (status >= 200 && status < 300) return 'status-2xx'
  if (status >= 300 && status < 400) return 'status-3xx'
  if (status >= 400 && status < 500) return 'status-4xx'
  if (status >= 500) return 'status-5xx'
  return 'status-0xx'
})

const isJsonResponse = computed(() => {
  const body = requestStore.response?.body || ''
  if (!body) return false
  try {
    JSON.parse(body)
    return true
  } catch {
    return false
  }
})

const isXmlResponse = computed(() => {
  const body = requestStore.response?.body || ''
  if (!body) return false
  const trimmed = body.trim()
  return trimmed.startsWith('<') && !trimmed.startsWith('<!DOCTYPE html')
})

const formattedXml = computed(() => {
  const body = requestStore.response?.body || ''
  if (!body) return ''
  try {
    const highlighted = hljs.highlight(body, { language: 'xml' })
    return highlighted.value
  } catch {
    return escapeHtml(body)
  }
})

const headersList = computed(() => {
  if (!requestStore.response?.headers) return []
  return Object.entries(requestStore.response.headers).map(([key, value]) => ({
    key,
    value
  }))
})

const actualHeadersList = computed(() => {
  if (!requestStore.actualRequest?.headers) return []
  return Object.entries(requestStore.actualRequest.headers).map(([key, value]) => ({
    key,
    value
  }))
})

const actualQueryParamsList = computed(() => {
  if (!requestStore.actualRequest?.queryParams) return []
  return Object.entries(requestStore.actualRequest.queryParams).map(([key, value]) => ({
    key,
    value
  }))
})

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

async function copyResponse() {
  const body = requestStore.response?.body || ''
  try {
    await navigator.clipboard.writeText(body)
    ElMessage.success('Copied to clipboard')
  } catch {
    ElMessage.error('Failed to copy')
  }
}

async function copyHeaders() {
  if (!requestStore.response?.headers) {
    ElMessage.warning('没有响应头可复制')
    return
  }
  const headerText = Object.entries(requestStore.response.headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')
  try {
    await navigator.clipboard.writeText(headerText)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

function formatBody(body: string, bodyType: string): string {
  if (!body) return ''
  if (bodyType === 'json') {
    try {
      return JSON.stringify(JSON.parse(body), null, 2)
    } catch {
      return body
    }
  }
  return body
}

function formatXml() {
  ElMessage.info('XML已格式化显示')
}
</script>

<style scoped>
.response-viewer-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.response-header {
  padding: 12px 16px;
  display: flex;
  gap: 16px;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  background: #fafafa;
}

.response-time {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 13px;
}

.response-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 16px;
}

.response-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

.response-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.response-body {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.xml-viewer,
.plain-text-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  border-radius: 4px;
  overflow: hidden;
}

.xml-toolbar,
.plain-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
  flex-shrink: 0;
}

.xml-content,
.plain-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.xml-content pre,
.plain-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.response-headers {
  padding: 16px;
  height: 100%;
  overflow: auto;
}

.headers-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.header-key {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.header-value {
  word-break: break-all;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.actual-request-content {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}

.url-display {
  word-break: break-all;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.method-tag {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 3px;
  text-transform: uppercase;
}

.method-GET { background: #e1f3d8; color: #67c23a; }
.method-POST { background: #fdf6ec; color: #e6a23c; }
.method-PUT { background: #d9ecff; color: #409eff; }
.method-PATCH { background: #e9e9eb; color: #909399; }
.method-DELETE { background: #fef0f0; color: #f56c6c; }

.headers-section,
.params-section,
.body-section {
  margin: 0 0 16px 0;
}

.body-info {
  margin-bottom: 8px;
}

.body-type {
  font-size: 12px;
  color: var(--text-secondary);
}

.body-content {
  background: #f5f7fa;
  border-radius: 4px;
  padding: 12px;
  overflow: auto;
}

.body-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.empty-text {
  color: var(--text-secondary);
  font-size: 13px;
  text-align: center;
  padding: 20px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.empty-state p {
  margin-top: 16px;
}

:deep(.el-divider__text) {
  font-weight: 600;
  font-size: 13px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.status-2xx {
  background: #e1f3d8;
  color: #67c23a;
}

.status-3xx {
  background: #fdf6ec;
  color: #e6a23c;
}

.status-4xx {
  background: #fef0f0;
  color: #f56c6c;
}

.status-5xx {
  background: #fde2e2;
  color: #f56c6c;
}

.status-0xx {
  background: #e9e9eb;
  color: #909399;
}

@media screen and (max-width: 768px) {
  .response-header {
    flex-wrap: wrap;
    padding: 8px 12px;
    gap: 8px;
  }
  
  .response-tabs {
    padding: 0 8px;
  }
  
  .response-headers {
    padding: 12px 8px;
  }
  
  .headers-toolbar {
    flex-wrap: wrap;
  }
  
  .xml-content,
  .plain-content {
    padding: 8px;
  }
  
  .xml-content pre,
  .plain-content pre {
    font-size: 12px;
  }
  
  .header-value {
    font-size: 11px;
  }
}

@media screen and (max-width: 480px) {
  .response-header {
    padding: 6px 8px;
  }
  
  .status-badge {
    font-size: 11px;
    padding: 3px 8px;
  }
  
  .response-time {
    font-size: 11px;
  }
  
  .headers-toolbar {
    margin-bottom: 8px;
    padding-bottom: 8px;
  }
}
</style>
