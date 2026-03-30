<template>
  <el-dialog
    :model-value="visible"
    title="请求详情"
    width="700px"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-if="record" class="request-detail">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="请求方法">
          <span :class="['method-tag', 'method-' + record.method]">{{ record.method }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="响应状态">
          <span :class="['status-tag', getStatusClass(record.response_status)]">
            {{ record.response_status || '-' }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="请求URL" :span="2">
          <div class="url-display">{{ record.url }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="响应耗时">
          {{ record.response_time ? `${record.response_time}ms` : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="请求时间">
          {{ formatTime(record.created_at) }}
        </el-descriptions-item>
      </el-descriptions>
      
      <el-divider content-position="left">请求头</el-divider>
      <div class="headers-section">
        <el-table v-if="parsedHeaders.length > 0" :data="parsedHeaders" size="small" stripe>
          <el-table-column prop="key" label="Key" width="200" />
          <el-table-column prop="value" label="Value" />
        </el-table>
        <div v-else class="empty-text">无请求头</div>
      </div>
      
      <el-divider content-position="left">查询参数</el-divider>
      <div class="params-section">
        <el-table v-if="parsedQueryParams.length > 0" :data="parsedQueryParams" size="small" stripe>
          <el-table-column prop="key" label="Key" width="200" />
          <el-table-column prop="value" label="Value" />
        </el-table>
        <div v-else class="empty-text">无查询参数</div>
      </div>
      
      <el-divider content-position="left">请求体</el-divider>
      <div class="body-section">
        <div v-if="record.body" class="body-content">
          <pre>{{ formatBody(record.body, record.body_type) }}</pre>
        </div>
        <div v-else class="empty-text">无请求体</div>
      </div>
      
      <el-divider content-position="left">响应头</el-divider>
      <div class="headers-section">
        <el-table v-if="parsedResponseHeaders.length > 0" :data="parsedResponseHeaders" size="small" stripe>
          <el-table-column prop="key" label="Key" width="200" />
          <el-table-column prop="value" label="Value" />
        </el-table>
        <div v-else class="empty-text">无响应头</div>
      </div>
      
      <el-divider content-position="left">响应内容</el-divider>
      <div class="response-section">
        <div v-if="record.response_body" class="response-content">
          <pre>{{ formatBody(record.response_body, 'json') }}</pre>
        </div>
        <div v-else class="empty-text">无响应内容</div>
      </div>
    </div>
    
    <template #footer>
      <el-button @click="$emit('update:visible', false)">关闭</el-button>
      <el-button type="primary" @click="handleUse">使用此请求</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RequestRecord } from '@/types'

const props = defineProps<{
  visible: boolean
  record: RequestRecord | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  use: [record: RequestRecord]
}>()

const parsedHeaders = computed(() => {
  if (!props.record?.headers) return []
  try {
    return JSON.parse(props.record.headers)
  } catch {
    return []
  }
})

const parsedQueryParams = computed(() => {
  if (!props.record?.query_params) return []
  try {
    return JSON.parse(props.record.query_params)
  } catch {
    return []
  }
})

const parsedResponseHeaders = computed(() => {
  if (!props.record?.response_headers) return []
  try {
    const headers = JSON.parse(props.record.response_headers)
    return Object.entries(headers).map(([key, value]) => ({ key, value }))
  } catch {
    return []
  }
})

function getStatusClass(status: number | undefined): string {
  if (!status) return 'status-0xx'
  if (status >= 200 && status < 300) return 'status-2xx'
  if (status >= 300 && status < 400) return 'status-3xx'
  if (status >= 400 && status < 500) return 'status-4xx'
  if (status >= 500) return 'status-5xx'
  return 'status-0xx'
}

function formatTime(timestamp: string | undefined): string {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString()
}

function formatBody(body: string, bodyType: string | undefined): string {
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

function handleUse() {
  if (props.record) {
    emit('use', props.record)
    emit('update:visible', false)
  }
}
</script>

<style scoped>
.request-detail {
  max-height: 60vh;
  overflow-y: auto;
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

.status-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 3px;
}

.status-2xx { background: #e1f3d8; color: #67c23a; }
.status-3xx { background: #fdf6ec; color: #e6a23c; }
.status-4xx { background: #fef0f0; color: #f56c6c; }
.status-5xx { background: #fef0f0; color: #f56c6c; }
.status-0xx { background: #f4f4f5; color: #909399; }

.url-display {
  word-break: break-all;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.headers-section,
.params-section,
.body-section,
.response-section {
  margin: 0 16px;
}

.body-content,
.response-content {
  background: #f5f7fa;
  border-radius: 4px;
  padding: 12px;
  overflow: auto;
}

.body-content pre,
.response-content pre {
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

:deep(.el-divider__text) {
  font-weight: 600;
  font-size: 13px;
}
</style>
