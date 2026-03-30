<template>
  <div class="app-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 style="font-size: 18px; margin-bottom: 12px;">PingPong</h1>
        <EnvironmentSelector />
      </div>
      <div class="sidebar-content">
        <ApiManager @api-selected="handleApiSelected" />
      </div>
    </aside>
    
    <main class="main-content">
      <div class="request-builder">
        <RequestBuilder />
      </div>
      
      <div class="response-viewer">
        <ResponseViewer />
      </div>
    </main>
    
    <TestRunnerDialog v-model:visible="showTestRunner" />
    <EnvironmentManagerDialog v-model:visible="showEnvManager" />
    
    <div class="fab-container">
      <el-tooltip content="Environment Manager" placement="left">
        <el-button circle type="primary" @click="showEnvManager = true">
          <el-icon><Setting /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="Test Runner" placement="left">
        <el-button circle type="success" @click="showTestRunner = true">
          <el-icon><VideoPlay /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Setting, VideoPlay } from '@element-plus/icons-vue'
import { useRequestStore } from '@/stores/request'
import { useEnvironmentStore } from '@/stores/environment'
import { useApiStore } from '@/stores/api'
import RequestBuilder from '@/components/RequestBuilder/index.vue'
import ResponseViewer from '@/components/ResponseViewer/index.vue'
import ApiManager from '@/components/ApiManager/index.vue'
import EnvironmentSelector from '@/components/EnvironmentManager/EnvironmentSelector.vue'
import EnvironmentManagerDialog from '@/components/EnvironmentManager/EnvironmentManagerDialog.vue'
import TestRunnerDialog from '@/components/TestRunner/TestRunnerDialog.vue'
import type { ApiItem } from '@/stores/api'

const requestStore = useRequestStore()
const environmentStore = useEnvironmentStore()
const apiStore = useApiStore()

const showTestRunner = ref(false)
const showEnvManager = ref(false)

onMounted(async () => {
  await environmentStore.loadEnvironments()
  await requestStore.loadHistory()
  await apiStore.loadAll()
})

function handleApiSelected(api: ApiItem) {
  requestStore.loadApiWithHistory({
    method: api.method,
    url: api.url,
    headers: api.headers,
    query_params: api.query_params,
    body: api.body,
    body_type: api.body_type
  })
}
</script>

<style scoped>
.fab-container {
  position: fixed;
  right: 24px;
  bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 100;
}

.sidebar-content {
  flex: 1;
  overflow: hidden;
}
</style>
