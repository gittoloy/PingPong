<template>
  <div class="form-data-editor">
    <div v-for="(item, index) in modelValue" :key="index" class="form-row">
      <el-checkbox v-model="item.enabled" />
      <el-input 
        v-model="item.key" 
        placeholder="Key" 
        size="small"
        class="form-key-input"
      />
      <template v-if="item.type === 'file'">
        <el-input
          :model-value="item.fileName || ''"
          placeholder="No file selected"
          size="small"
          readonly
          class="form-value-input"
        >
          <template #append>
            <el-button @click="selectFile(index)" size="small">Browse</el-button>
          </template>
        </el-input>
        <el-button
          v-if="item.filePath"
          type="info"
          text
          size="small"
          @click="clearFile(index)"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </template>
      <template v-else>
        <el-input 
          v-model="item.value" 
          placeholder="Value" 
          size="small"
          class="form-value-input"
        />
      </template>
      <el-dropdown trigger="click" @command="handleDropdownCommand(index, $event)">
        <el-button size="small" class="type-toggle">
          {{ item.type === 'file' ? 'File' : 'Text' }}
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="text">Text</el-dropdown-item>
            <el-dropdown-item command="file">File</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-button 
        type="danger" 
        :icon="Delete" 
        circle 
        size="small"
        @click="$emit('remove', index)"
      />
    </div>
    <div class="form-actions">
      <el-button type="primary" text @click="$emit('addText')">
        <el-icon><Plus /></el-icon>
        Add Text
      </el-button>
      <el-button type="primary" text @click="$emit('addFile')">
        <el-icon><Plus /></el-icon>
        Add File
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Delete, Plus, Close, ArrowDown } from '@element-plus/icons-vue'
import type { FormField } from '@/types'

defineProps<{
  modelValue: FormField[]
}>()

const emit = defineEmits<{
  (e: 'addText'): void
  (e: 'addFile'): void
  (e: 'remove', index: number): void
  (e: 'update:modelValue', value: FormField[]): void
  (e: 'selectFile', index: number): void
  (e: 'clearFile', index: number): void
  (e: 'changeType', index: number, type: 'text' | 'file'): void
}>()

function handleTypeChange(index: number, type: string) {
  emit('changeType', index, type as 'text' | 'file')
}

function handleDropdownCommand(index: number, cmd: string) {
  handleTypeChange(index, cmd)
}

function selectFile(index: number) {
  emit('selectFile', index)
}

function clearFile(index: number) {
  emit('clearFile', index)
}
</script>

<style scoped>
.form-data-editor {
  width: 100%;
}

.form-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  align-items: center;
}

.form-row .el-checkbox {
  margin-right: 4px;
  flex-shrink: 0;
}

.form-key-input {
  flex: 1;
  min-width: 100px;
}

.form-value-input {
  flex: 1;
  min-width: 100px;
}

.type-toggle {
  flex-shrink: 0;
  min-width: 70px;
}

.form-actions {
  display: flex;
  gap: 8px;
}
</style>
