<template>
  <div class="header-editor">
    <div v-for="(item, index) in modelValue" :key="index" class="header-row">
      <el-checkbox v-model="item.enabled" />
      <el-select
        v-model="item.key"
        filterable
        allow-create
        default-first-option
        placeholder="Header"
        size="small"
        class="header-key-select"
        :validate-event="false"
        @change="handleKeyChange(index)"
        @blur="validateKey(index)"
      >
        <el-option-group
          v-for="group in headerGroups"
          :key="group.label"
          :label="group.label"
        >
          <el-option
            v-for="header in group.headers"
            :key="header.value"
            :label="header.label"
            :value="header.value"
          >
            <div class="header-option">
              <span class="header-name">{{ header.label }}</span>
              <span class="header-desc">{{ header.description }}</span>
            </div>
          </el-option>
        </el-option-group>
      </el-select>
      <el-select
        v-if="hasCommonValues(item.key)"
        v-model="item.value"
        filterable
        allow-create
        default-first-option
        placeholder="Value"
        size="small"
        class="header-value-select"
        :validate-event="false"
      >
        <el-option
          v-for="val in getCommonValuesForKey(item.key)"
          :key="val"
          :label="val"
          :value="val"
        />
      </el-select>
      <el-input 
        v-else
        v-model="item.value" 
        placeholder="Value" 
        size="small"
        class="header-value-input"
      />
      <el-button 
        type="danger" 
        :icon="Delete" 
        circle 
        size="small"
        @click="$emit('remove', index)"
      />
    </div>
    <div v-if="errors.length > 0" class="error-messages">
      <div v-for="(error, idx) in errors" :key="idx" class="error-item">
        <el-icon><WarningFilled /></el-icon>
        <span>{{ error }}</span>
      </div>
    </div>
    <el-button type="primary" text @click="$emit('add')">
      <el-icon><Plus /></el-icon>
      Add Header
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Delete, Plus, WarningFilled } from '@element-plus/icons-vue'
import type { KeyValue } from '@/types'

const props = defineProps<{
  modelValue: KeyValue[]
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'remove', index: number): void
}>()

const errors = ref<string[]>([])

const headerGroups = [
  {
    label: '常用请求头',
    headers: [
      { value: 'Content-Type', label: 'Content-Type', description: '资源媒体类型' },
      { value: 'Authorization', label: 'Authorization', description: '认证信息' },
      { value: 'Accept', label: 'Accept', description: '可接受的响应类型' },
      { value: 'Accept-Encoding', label: 'Accept-Encoding', description: '可接受的编码方式' },
      { value: 'Accept-Language', label: 'Accept-Language', description: '可接受的语言' },
      { value: 'Cache-Control', label: 'Cache-Control', description: '缓存控制' },
      { value: 'Connection', label: 'Connection', description: '连接控制' },
      { value: 'Cookie', label: 'Cookie', description: 'Cookie数据' },
      { value: 'Host', label: 'Host', description: '目标主机' },
      { value: 'Origin', label: 'Origin', description: '请求来源' },
      { value: 'Referer', label: 'Referer', description: '来源页面' },
      { value: 'User-Agent', label: 'User-Agent', description: '用户代理' }
    ]
  },
  {
    label: '认证相关',
    headers: [
      { value: 'WWW-Authenticate', label: 'WWW-Authenticate', description: '认证方案' },
      { value: 'Proxy-Authorization', label: 'Proxy-Authorization', description: '代理认证' },
      { value: 'Proxy-Authenticate', label: 'Proxy-Authenticate', description: '代理认证方案' }
    ]
  },
  {
    label: '内容相关',
    headers: [
      { value: 'Content-Length', label: 'Content-Length', description: '内容长度' },
      { value: 'Content-Encoding', label: 'Content-Encoding', description: '内容编码' },
      { value: 'Content-Language', label: 'Content-Language', description: '内容语言' },
      { value: 'Content-Location', label: 'Content-Location', description: '内容位置' },
      { value: 'Content-Range', label: 'Content-Range', description: '内容范围' },
      { value: 'Content-Disposition', label: 'Content-Disposition', description: '内容处置' }
    ]
  },
  {
    label: '缓存相关',
    headers: [
      { value: 'ETag', label: 'ETag', description: '资源版本标识' },
      { value: 'If-Match', label: 'If-Match', description: '条件请求-匹配' },
      { value: 'If-None-Match', label: 'If-None-Match', description: '条件请求-不匹配' },
      { value: 'If-Modified-Since', label: 'If-Modified-Since', description: '条件请求-修改时间' },
      { value: 'If-Unmodified-Since', label: 'If-Unmodified-Since', description: '条件请求-未修改' },
      { value: 'Last-Modified', label: 'Last-Modified', description: '最后修改时间' },
      { value: 'Expires', label: 'Expires', description: '过期时间' }
    ]
  },
  {
    label: 'CORS相关',
    headers: [
      { value: 'Access-Control-Request-Method', label: 'Access-Control-Request-Method', description: '预检请求方法' },
      { value: 'Access-Control-Request-Headers', label: 'Access-Control-Request-Headers', description: '预检请求头' }
    ]
  },
  {
    label: '其他',
    headers: [
      { value: 'Date', label: 'Date', description: '请求日期' },
      { value: 'Expect', label: 'Expect', description: '期望行为' },
      { value: 'From', label: 'From', description: '发送者邮箱' },
      { value: 'Max-Forwards', label: 'Max-Forwards', description: '最大转发次数' },
      { value: 'Range', label: 'Range', description: '请求范围' },
      { value: 'TE', label: 'TE', description: '传输编码' },
      { value: 'Trailer', label: 'Trailer', description: '尾部字段' },
      { value: 'Transfer-Encoding', label: 'Transfer-Encoding', description: '传输编码方式' },
      { value: 'Upgrade', label: 'Upgrade', description: '升级协议' },
      { value: 'Via', label: 'Via', description: '代理路径' },
      { value: 'Warning', label: 'Warning', description: '警告信息' },
      { value: 'X-Requested-With', label: 'X-Requested-With', description: 'AJAX标识' },
      { value: 'X-Forwarded-For', label: 'X-Forwarded-For', description: '客户端IP' },
      { value: 'X-Forwarded-Proto', label: 'X-Forwarded-Proto', description: '原始协议' },
      { value: 'X-Api-Key', label: 'X-Api-Key', description: 'API密钥' },
      { value: 'X-Auth-Token', label: 'X-Auth-Token', description: '认证令牌' }
    ]
  }
]

const headerNamePattern = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/

function isValidHeaderName(name: string): boolean {
  if (!name || name.trim() === '') return true
  return headerNamePattern.test(name)
}

function validateKey(index: number) {
  const item = props.modelValue[index]
  if (item && item.key && !isValidHeaderName(item.key)) {
    const existingError = errors.value.find(e => e.includes(item.key))
    if (!existingError) {
      errors.value.push(`请求头 "${item.key}" 格式不合法，只能包含字母、数字和 !#$%&'*+-.^_\`|~`)
    }
  } else {
    errors.value = errors.value.filter(e => !e.includes(item?.key || ''))
  }
}

function handleKeyChange(index: number) {
  validateKey(index)
  const item = props.modelValue[index]
  if (item && item.key) {
    const suggestions = getCommonValuesForKey(item.key)
    if (suggestions.length > 0 && !item.value) {
      item.value = suggestions[0]
    }
  }
}

const headerValueMap: Record<string, string[]> = {
  'Content-Type': [
    'application/json',
    'application/xml',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
    'text/html',
    'text/xml',
    'application/octet-stream',
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif'
  ],
  'Accept': [
    'application/json',
    'application/xml',
    'text/html',
    'text/plain',
    '*/*',
    'application/octet-stream',
    'image/*'
  ],
  'Accept-Encoding': [
    'gzip',
    'deflate',
    'br',
    'gzip, deflate',
    'gzip, deflate, br',
    'identity',
    '*'
  ],
  'Accept-Language': [
    'zh-CN,zh;q=0.9',
    'en-US,en;q=0.9',
    'zh-CN,zh;q=0.9,en;q=0.8',
    'en-GB,en;q=0.9',
    'ja,en;q=0.9',
    'ko,en;q=0.9'
  ],
  'Cache-Control': [
    'no-cache',
    'no-store',
    'max-age=0',
    'must-revalidate',
    'no-transform',
    'public',
    'private',
    'max-age=3600',
    'max-age=86400'
  ],
  'Connection': [
    'keep-alive',
    'close',
    'Upgrade'
  ],
  'Content-Encoding': [
    'gzip',
    'deflate',
    'br',
    'compress',
    'identity'
  ],
  'Transfer-Encoding': [
    'chunked',
    'gzip',
    'deflate',
    'identity'
  ],
  'X-Requested-With': [
    'XMLHttpRequest'
  ],
  'User-Agent': [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'curl/8.4.0',
    'PostmanRuntime/7.36.0'
  ],
  'Authorization': [
    'Bearer ',
    'Basic ',
    'Digest ',
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'
  ],
  'Upgrade': [
    'websocket',
    'h2c',
    'HTTP/2.0',
    'TLS/1.0'
  ]
}

function hasCommonValues(key: string): boolean {
  return key in headerValueMap
}

function getCommonValuesForKey(key: string): string[] {
  return headerValueMap[key] || []
}

watch(() => props.modelValue, () => {
  errors.value = []
  props.modelValue.forEach((item, index) => {
    if (item.key && !isValidHeaderName(item.key)) {
      const existingError = errors.value.find(e => e.includes(item.key))
      if (!existingError) {
        errors.value.push(`请求头 "${item.key}" 格式不合法，只能包含字母、数字和 !#$%&'*+-.^_\`|~`)
      }
    }
  })
}, { deep: true })
</script>

<style scoped>
.header-editor {
  width: 100%;
}

.header-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.header-row .el-checkbox {
  margin-right: 4px;
  flex-shrink: 0;
}

.header-key-select {
  flex: 1;
  min-width: 0;
}

.header-value-input {
  flex: 1;
  min-width: 0;
}

.header-value-select {
  flex: 1;
  min-width: 0;
}

.header-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-name {
  font-weight: 500;
}

.header-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-left: 12px;
}

.error-messages {
  margin-bottom: 8px;
  padding: 8px;
  background-color: var(--el-color-danger-light-9);
  border-radius: 4px;
}

.error-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--el-color-danger);
  font-size: 12px;
  margin-bottom: 4px;
}

.error-item:last-child {
  margin-bottom: 0;
}

@media screen and (max-width: 768px) {
  .header-row {
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .header-row .el-checkbox {
    order: 1;
  }
  
  .header-key-select {
    order: 2;
    flex: 1 1 calc(50% - 20px);
    min-width: 120px;
  }
  
  .header-value-input,
  .header-value-select {
    order: 3;
    flex: 1 1 calc(50% - 20px);
    min-width: 120px;
  }
  
  .header-row .el-button {
    order: 4;
  }
}

@media screen and (max-width: 480px) {
  .header-key-select,
  .header-value-input,
  .header-value-select {
    flex: 1 1 100%;
  }
}
</style>
