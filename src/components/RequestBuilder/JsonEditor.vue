<template>
  <div class="json-editor-container" :class="{ 'is-fullscreen': isFullscreen }">
    <div class="json-editor-toolbar">
      <el-button size="small" @click="formatJson" :disabled="!modelValue">
        <el-icon><Document /></el-icon>
        格式化
      </el-button>
      <el-button size="small" @click="compressJson" :disabled="!modelValue">
        <el-icon><Minus /></el-icon>
        压缩
      </el-button>
      <el-button size="small" @click="clearContent">
        <el-icon><Delete /></el-icon>
        清空
      </el-button>
      <div class="validation-status">
        <el-tag v-if="isValid" type="success" size="small">
          <el-icon><CircleCheck /></el-icon>
          JSON有效
        </el-tag>
        <el-tooltip v-else-if="errorMessage" :content="errorMessage" placement="top">
          <el-tag type="danger" size="small">
            <el-icon><CircleClose /></el-icon>
            语法错误
          </el-tag>
        </el-tooltip>
      </div>
      <el-tooltip :content="isFullscreen ? '退出全屏 (Esc)' : '全屏 (F11)'" placement="top">
        <el-button size="small" @click="toggleFullscreen">
          <el-icon><FullScreen v-if="!isFullscreen" /><Close v-else /></el-icon>
          {{ isFullscreen ? '退出' : '全屏' }}
        </el-button>
      </el-tooltip>
    </div>
    
    <div class="json-editor-wrapper" :class="{ 'has-error': !isValid && modelValue }">
      <div class="line-numbers" ref="lineNumbersRef">
        <div v-for="line in lineCount" :key="line" class="line-number">{{ line }}</div>
      </div>
      
      <div class="editor-area">
        <pre class="highlight-layer" ref="highlightRef"><code :class="highlightClass" v-html="highlightedCode"></code></pre>
        <textarea
          ref="textareaRef"
          class="editor-textarea"
          :value="modelValue"
          @input="handleInput"
          @scroll="syncScroll"
          @keydown="handleKeydown"
          :placeholder="placeholder"
          spellcheck="false"
        ></textarea>
      </div>
    </div>
    
    <div v-if="errorMessage && modelValue" class="error-message">
      <el-icon><WarningFilled /></el-icon>
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Document, Minus, Delete, CircleCheck, CircleClose, WarningFilled, FullScreen, Close } from '@element-plus/icons-vue'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'

hljs.registerLanguage('json', json)

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const highlightRef = ref<HTMLElement | null>(null)
const lineNumbersRef = ref<HTMLElement | null>(null)

const isValid = ref(true)
const errorMessage = ref('')
const highlightClass = 'language-json'
const isFullscreen = ref(false)

const lineCount = computed(() => {
  if (!props.modelValue) return 1
  return props.modelValue.split('\n').length
})

const highlightedCode = computed(() => {
  if (!props.modelValue) return ''
  
  try {
    const result = hljs.highlight(props.modelValue, { language: 'json' })
    isValid.value = true
    errorMessage.value = ''
    return result.value
  } catch (e) {
    return escapeHtml(props.modelValue)
  }
})

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function validateJson(value: string): boolean {
  if (!value || value.trim() === '') {
    isValid.value = true
    errorMessage.value = ''
    return true
  }
  
  try {
    JSON.parse(value)
    isValid.value = true
    errorMessage.value = ''
    return true
  } catch (e: any) {
    isValid.value = false
    errorMessage.value = formatJsonError(e)
    return false
  }
}

function formatJsonError(error: any): string {
  const message = error.message || 'Unknown error'
  const match = message.match(/position (\d+)/)
  if (match) {
    const position = parseInt(match[1])
    const lines = props.modelValue.substring(0, position).split('\n')
    const line = lines.length
    const column = lines[lines.length - 1].length + 1
    return `第 ${line} 行，第 ${column} 列: ${message}`
  }
  return message
}

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  const value = target.value
  emit('update:modelValue', value)
  validateJson(value)
}

function syncScroll() {
  if (!textareaRef.value || !highlightRef.value || !lineNumbersRef.value) return
  
  const scrollTop = textareaRef.value.scrollTop
  const scrollLeft = textareaRef.value.scrollLeft
  
  highlightRef.value.scrollTop = scrollTop
  highlightRef.value.scrollLeft = scrollLeft
  lineNumbersRef.value.scrollTop = scrollTop
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Tab') {
    event.preventDefault()
    const textarea = textareaRef.value
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value
    
    const newValue = value.substring(0, start) + '  ' + value.substring(end)
    emit('update:modelValue', newValue)
    
    nextTick(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2
    })
  }
}

function formatJson() {
  if (!props.modelValue) return
  
  try {
    const parsed = JSON.parse(props.modelValue)
    const formatted = JSON.stringify(parsed, null, 2)
    emit('update:modelValue', formatted)
    isValid.value = true
    errorMessage.value = ''
  } catch (e: any) {
    isValid.value = false
    errorMessage.value = formatJsonError(e)
  }
}

function compressJson() {
  if (!props.modelValue) return
  
  try {
    const parsed = JSON.parse(props.modelValue)
    const compressed = JSON.stringify(parsed)
    emit('update:modelValue', compressed)
    isValid.value = true
    errorMessage.value = ''
  } catch (e: any) {
    isValid.value = false
    errorMessage.value = formatJsonError(e)
  }
}

function clearContent() {
  emit('update:modelValue', '')
  isValid.value = true
  errorMessage.value = ''
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'F11') {
    event.preventDefault()
    toggleFullscreen()
  } else if (event.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false
  }
}

watch(() => props.modelValue, (newValue) => {
  validateJson(newValue)
}, { immediate: true })

onMounted(() => {
  if (props.modelValue) {
    validateJson(props.modelValue)
  }
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
.json-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  background: #fafafa;
  border-radius: 4px;
  overflow: hidden;
}

.json-editor-container.is-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  border-radius: 0;
  max-height: none;
}

.json-editor-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
  flex-shrink: 0;
}

.validation-status {
  margin-left: auto;
}

.json-editor-wrapper {
  display: flex;
  flex: 1;
  min-height: 0;
  background: #fafafa;
  overflow: hidden;
}

.json-editor-wrapper.has-error {
  border-top: 2px solid var(--el-color-danger);
}

.line-numbers {
  width: 40px;
  background: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  color: #909399;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 18px;
  padding-top: 8px;
  text-align: right;
  user-select: none;
  overflow: hidden;
  flex-shrink: 0;
}

.line-number {
  height: 18px;
  line-height: 18px;
  padding-right: 8px;
}

.editor-area {
  flex: 1;
  position: relative;
  min-width: 0;
  min-height: 0;
}

.highlight-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  padding: 8px 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 18px;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-y: auto;
  overflow-x: auto;
  pointer-events: none;
  color: #606266;
  background: transparent;
}

.highlight-layer code {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  background: transparent !important;
  padding: 0 !important;
}

.editor-textarea {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 8px 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 18px;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: transparent;
  caret-color: #606266;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-y: auto;
  overflow-x: auto;
}

.editor-textarea::placeholder {
  color: #c0c4cc;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  font-size: 12px;
  border-top: 1px solid var(--el-color-danger-light-7);
}

.json-editor-wrapper::-webkit-scrollbar,
.editor-textarea::-webkit-scrollbar,
.highlight-layer::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.json-editor-wrapper::-webkit-scrollbar-track,
.editor-textarea::-webkit-scrollbar-track,
.highlight-layer::-webkit-scrollbar-track {
  background: #f5f7fa;
  border-radius: 3px;
}

.json-editor-wrapper::-webkit-scrollbar-thumb,
.editor-textarea::-webkit-scrollbar-thumb,
.highlight-layer::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
}

.json-editor-wrapper::-webkit-scrollbar-thumb:hover,
.editor-textarea::-webkit-scrollbar-thumb:hover,
.highlight-layer::-webkit-scrollbar-thumb:hover {
  background: #909399;
}

:deep(.hljs-attr) {
  color: #c678dd;
  font-weight: 500;
}

:deep(.hljs-string) {
  color: #98c379;
}

:deep(.hljs-number) {
  color: #d19a66;
}

:deep(.hljs-literal) {
  color: #56b6c2;
}

:deep(.hljs-punctuation) {
  color: #abb2bf;
}

:deep(.hljs-keyword) {
  color: #56b6c2;
}

:deep(.hljs-name) {
  color: #c678dd;
  font-weight: 500;
}

:deep(.hljs-title) {
  color: #c678dd;
}

@media screen and (max-width: 768px) {
  .line-numbers {
    width: 30px;
  }
  
  .line-number {
    font-size: 11px;
    padding-right: 4px;
  }
  
  .highlight-layer,
  .editor-textarea {
    font-size: 12px;
    padding: 6px 8px;
  }
  
  .json-editor-toolbar {
    flex-wrap: wrap;
  }
}
</style>
