<template>
  <div class="path-params-editor" v-if="pathParams.length > 0">
    <div class="path-params-header">
      <el-icon><Connection /></el-icon>
      <span>Path Parameters</span>
      <el-tag size="small" type="info">{{ pathParams.length }}</el-tag>
    </div>
    <div class="path-params-list">
      <div v-for="(param, index) in pathParams" :key="param.name" class="path-param-row">
        <el-input
          :model-value="':' + param.name"
          class="param-key"
          disabled
          size="small"
        >
          <template #prefix>
            <span class="param-prefix">:</span>
          </template>
        </el-input>
        <span class="param-arrow">=</span>
        <el-input
          v-model="pathParams[index].value"
          class="param-value"
          :placeholder="`Enter ${param.name}`"
          size="small"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Connection } from '@element-plus/icons-vue'
import type { PathParam } from '@/types'

const props = defineProps<{
  pathParams: PathParam[]
}>()
</script>

<style scoped>
.path-params-editor {
  margin-bottom: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
}

.path-params-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f0f9eb;
  font-size: 12px;
  font-weight: 500;
  color: #67c23a;
}

.path-params-list {
  padding: 8px 12px;
}

.path-param-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.path-param-row:last-child {
  margin-bottom: 0;
}

.param-key {
  width: 200px;
  flex-shrink: 0;
}

.param-key :deep(.el-input__inner) {
  color: #e6a23c;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.param-prefix {
  color: #e6a23c;
  font-weight: 600;
}

.param-arrow {
  color: var(--text-secondary);
  font-size: 14px;
  flex-shrink: 0;
}

.param-value {
  flex: 1;
}

.param-value :deep(.el-input__inner) {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}
</style>
