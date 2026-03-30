<template>
  <div class="env-selector">
    <el-select 
      v-model="selectedEnvId" 
      placeholder="Select Environment"
      size="small"
      style="width: 100%;"
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useEnvironmentStore } from '@/stores/environment'

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
}
</style>
