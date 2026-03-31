<template>
  <div class="json-viewer-wrapper">
    <div class="json-toolbar">
      <el-button-group size="small">
        <el-button @click="expandAll">
          <el-icon><Plus /></el-icon>
          展开全部
        </el-button>
        <el-button @click="collapseAll">
          <el-icon><Minus /></el-icon>
          折叠全部
        </el-button>
      </el-button-group>
      <el-button size="small" @click="copyJson">
        <el-icon><CopyDocument /></el-icon>
        复制
      </el-button>
    </div>
    <div class="json-content-container" ref="containerRef">
      <div class="line-numbers" ref="lineNumbersRef">
        <div v-for="line in lineCount" :key="line" class="line-number">{{ line }}</div>
      </div>
      <div class="json-content" ref="jsonContentRef">
        <vue-json-pretty
          ref="jsonPrettyRef"
          :data="parsedData"
          :deep="collapseLevel"
          :show-line="false"
          :show-double-quotes="true"
          :show-length="true"
          :show-icon="true"
          :collapsed-on-click-brackets="true"
          :custom-value-formatter="customValueFormatter"
          @node-click="handleNodeClick"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import { Plus, Minus, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  data: string | object
}>()

const jsonPrettyRef = ref<InstanceType<typeof VueJsonPretty> | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const lineNumbersRef = ref<HTMLElement | null>(null)
const jsonContentRef = ref<HTMLElement | null>(null)
const lineCount = ref(1)
const collapseLevel = ref(3)

const parsedData = computed(() => {
  if (typeof props.data === 'string') {
    try {
      return JSON.parse(props.data)
    } catch {
      return props.data
    }
  }
  return props.data
})

const customValueFormatter = (data: unknown, key: string, path: string) => {
  if (data === null) {
    return `<span class="json-null">null</span>`
  }
  if (typeof data === 'boolean') {
    return `<span class="json-boolean">${data}</span>`
  }
  if (typeof data === 'number') {
    return `<span class="json-number">${data}</span>`
  }
  if (typeof data === 'string') {
    if (data.length > 100) {
      return `<span class="json-string">"${data.substring(0, 100)}..."</span>`
    }
    return `<span class="json-string">"${escapeHtml(data)}"</span>`
  }
  return String(data)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function expandAll() {
  collapseLevel.value = Infinity
}

function collapseAll() {
  collapseLevel.value = 1
}

function handleNodeClick(node: unknown) {
  nextTick(() => {
    updateLineNumbers()
  })
}

async function copyJson() {
  try {
    const jsonStr = typeof props.data === 'string' ? props.data : JSON.stringify(props.data, null, 2)
    await navigator.clipboard.writeText(jsonStr)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

function updateLineNumbers() {
  if (!jsonContentRef.value) return
  
  const content = jsonContentRef.value
  const lines = content.innerText.split('\n')
  lineCount.value = lines.length
  
  nextTick(() => {
    if (lineNumbersRef.value && jsonContentRef.value) {
      const contentHeight = jsonContentRef.value.scrollHeight
      const lineHeight = parseFloat(getComputedStyle(jsonContentRef.value).lineHeight) || 18
      lineCount.value = Math.ceil(contentHeight / lineHeight)
    }
  })
}

function syncScroll() {
  if (!lineNumbersRef.value || !jsonContentRef.value) return
  lineNumbersRef.value.scrollTop = jsonContentRef.value.scrollTop
}

onMounted(() => {
  if (jsonContentRef.value) {
    jsonContentRef.value.addEventListener('scroll', syncScroll)
  }
  updateLineNumbers()
})

watch(() => props.data, () => {
  nextTick(() => {
    updateLineNumbers()
  })
}, { immediate: true })

watch(collapseLevel, () => {
  nextTick(() => {
    setTimeout(updateLineNumbers, 100)
  })
})
</script>

<style scoped>
.json-viewer-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  border-radius: 4px;
  overflow: hidden;
  min-height: 0;
}

.json-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
  flex-shrink: 0;
}

.json-content-container {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.line-numbers {
  width: 40px;
  background: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  overflow-y: hidden;
  flex-shrink: 0;
  user-select: none;
  padding-top: 8px;
}

.line-number {
  height: 18px;
  line-height: 18px;
  text-align: right;
  padding-right: 8px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  color: #909399;
}

.json-content {
  flex: 1;
  overflow: auto;
  padding: 8px 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 18px;
  min-width: 0;
}

.json-content :deep(.vjs-tree) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 18px;
}

.json-content :deep(.vjs-key) {
  color: #c678dd;
  font-weight: 500;
}

.json-content :deep(.vjs-value-string) {
  color: #98c379;
}

.json-content :deep(.vjs-value-number) {
  color: #d19a66;
}

.json-content :deep(.vjs-value-boolean) {
  color: #56b6c2;
}

.json-content :deep(.vjs-value-null) {
  color: #e06c75;
}

.json-content :deep(.json-string) {
  color: #98c379;
}

.json-content :deep(.json-number) {
  color: #d19a66;
}

.json-content :deep(.json-boolean) {
  color: #56b6c2;
}

.json-content :deep(.json-null) {
  color: #e06c75;
}

.json-content :deep(.vjs-brackets) {
  color: #abb2bf;
}

.json-content :deep(.vjs-colon) {
  color: #abb2bf;
}

.json-content :deep(.vjs-comma) {
  color: #abb2bf;
}

.json-content :deep(.vjs-tree-node) {
  padding: 1px 0;
}

.json-content :deep(.vjs-tree-node:hover) {
  background-color: #f0f2f5;
}

.json-content :deep(.vjs-indent-unit) {
  width: 1em;
}

.json-content :deep(.vjs-toggle-operator) {
  cursor: pointer;
  color: #909399;
  margin-right: 4px;
}

.json-content :deep(.vjs-toggle-operator:hover) {
  color: #409eff;
}

.json-content :deep(.vjs-length) {
  color: #909399;
  font-size: 12px;
  margin-left: 4px;
}

.json-content :deep(.vjs-icon) {
  margin-right: 4px;
}

@media screen and (max-width: 768px) {
  .line-numbers {
    width: 30px;
  }
  
  .line-number {
    font-size: 11px;
    padding-right: 4px;
  }
  
  .json-content {
    font-size: 12px;
    padding: 6px 8px;
  }
  
  .json-toolbar {
    flex-wrap: wrap;
  }
}
</style>
