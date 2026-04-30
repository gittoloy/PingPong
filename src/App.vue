<!--
 * @Author: zhanghongliang hongliang.zhang@medsci.cn
 * @Date: 2026-03-26 14:49:07
 * @LastEditors: zhanghongliang hongliang.zhang@medsci.cn
 * @LastEditTime: 2026-03-31 09:39:10
 * @FilePath: \pingpong\src\App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div class="app-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 style="font-size: 18px; margin-bottom: 12px;">PingPong</h1>
        <EnvironmentSelector @open-manager="showSettings = true" />
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
    <SystemSettingsDialog v-model:visible="showSettings" />
    
    <div class="fab-container">
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
import { VideoPlay } from '@element-plus/icons-vue'
import { useRequestStore } from '@/stores/request'
import { useEnvironmentStore } from '@/stores/environment'
import { useApiStore } from '@/stores/api'
import { useSettingsStore } from '@/stores/settings'
import RequestBuilder from '@/components/RequestBuilder/index.vue'
import ResponseViewer from '@/components/ResponseViewer/index.vue'
import ApiManager from '@/components/ApiManager/index.vue'
import EnvironmentSelector from '@/components/EnvironmentManager/EnvironmentSelector.vue'
import SystemSettingsDialog from '@/components/EnvironmentManager/SystemSettingsDialog.vue'
import TestRunnerDialog from '@/components/TestRunner/TestRunnerDialog.vue'
import type { ApiItem } from '@/stores/api'

const requestStore = useRequestStore()
const environmentStore = useEnvironmentStore()
const apiStore = useApiStore()
const settingsStore = useSettingsStore()

const showTestRunner = ref(false)
const showSettings = ref(false)

onMounted(async () => {
  await settingsStore.loadSettings()
  await environmentStore.loadEnvironments()
  await requestStore.loadHistory()
  await apiStore.loadAll()
})

function handleApiSelected(api: ApiItem) {
  apiStore.setSelectedApiId(api.id || null)
  apiStore.setSelectedApiUuid(api.uuid || null)
  requestStore.loadApiWithHistory({
    method: api.method,
    url: api.url,
    headers: api.headers,
    query_params: api.query_params,
    body: api.body,
    body_type: api.body_type,
    uuid: api.uuid
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
