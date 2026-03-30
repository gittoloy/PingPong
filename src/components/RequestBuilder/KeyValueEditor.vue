<template>
  <div class="kv-editor">
    <div v-for="(item, index) in modelValue" :key="index" class="kv-row">
      <el-checkbox v-model="item.enabled" />
      <el-input v-model="item.key" placeholder="Key" size="small" />
      <el-input v-model="item.value" placeholder="Value" size="small" />
      <el-button 
        type="danger" 
        :icon="Delete" 
        circle 
        size="small"
        @click="$emit('remove', index)"
      />
    </div>
    <el-button type="primary" text @click="$emit('add')">
      <el-icon><Plus /></el-icon>
      Add
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { Delete, Plus } from '@element-plus/icons-vue'
import type { KeyValue } from '@/types'

defineProps<{
  modelValue: KeyValue[]
}>()

defineEmits<{
  (e: 'add'): void
  (e: 'remove', index: number): void
}>()
</script>

<style scoped>
.kv-editor {
  width: 100%;
}

.kv-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.kv-row .el-input {
  flex: 1;
}

.kv-row .el-checkbox {
  margin-right: 4px;
}
</style>
