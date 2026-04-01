<template>
  <div class="env-selector">
    <el-select 
      v-model="selectedEnvId" 
      placeholder="Select Environment"
      size="small"
      class="env-select"
      @change="onEnvChange"
    >
      <el-option 
        v-for="env in environmentStore.environments" 
        :key="env.id" 
        :label="env.name" 
        :value="env.id"
      >
        <span>{{ env.name }}</span>
        <el-tag v-if="env.is_active" size="small" type="success" style="margin-left: 8px;">Active</el-tag>
      </el-option>
    </el-select>
    <el-tooltip content="环境管理" placement="bottom">
      <el-button 
        size="small" 
        circle 
        class="env-setting-btn"
        @click="$emit('open-manager')"
      >
        <el-icon><Setting /></el-icon>
      </el-button>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Setting } from '@element-plus/icons-vue'
import { useEnvironmentStore } from '@/stores/environment'

defineEmits<{
  (e: 'open-manager'): void
}>()

const environmentStore = useEnvironmentStore()
const selectedEnvId = ref<number | null>(null)

watch(() => environmentStore.activeEnvironment, (env) => {
  if (env) {
    selectedEnvId.value = env.id
  }
}, { immediate: true })

async function onEnvChange(id: number) {
  await environmentStore.setActiveEnvironment(id)
}
</script>

<style scoped>
.env-selector {
  width: 100%;
  display: flex;
  gap: 8px;
  align-items: center;
}

.env-select {
  flex: 1;
}

.env-setting-btn {
  flex-shrink: 0;
}
</style>
