<template>
  <el-dialog 
    v-model="visible" 
    title="System Settings" 
    width="800px"
    destroy-on-close
    draggable
  >
    <el-tabs v-model="activeTab" class="settings-tabs">
      <!-- Environment Tab -->
      <el-tab-pane label="Environment" name="environment">
        <div class="env-manager">
          <div class="env-sidebar">
            <div class="env-list-header">
              <span>Environments</span>
              <el-button type="primary" text size="small" @click="addEnvironment">
                <el-icon><Plus /></el-icon>
              </el-button>
            </div>
            <div class="env-list" ref="envListRef">
              <div 
                v-for="(env, index) in environmentStore.environments" 
                :key="env.id"
                :class="['env-item', { active: selectedEnv?.id === env.id, dragging: dragIndex === index }]"
                :draggable="true"
                @click="selectEnvironment(env)"
                @dragstart="handleDragStart($event, index)"
                @dragover="handleDragOver($event, index)"
                @dragend="handleDragEnd"
                @drop="handleDrop($event, index)"
              >
                <div class="env-item-left">
                  <el-icon class="drag-handle"><Rank /></el-icon>
                  <span>{{ env.name }}</span>
                </div>
                <el-tag v-if="env.is_active" size="small" type="success">Active</el-tag>
              </div>
            </div>
          </div>
          
          <div class="env-content">
            <template v-if="selectedEnv">
              <div class="env-content-header">
                <div class="env-name-row">
                  <el-input 
                    v-model="editName" 
                    size="small" 
                    style="width: 200px;"
                    @blur="updateEnvName"
                    @keyup.enter="updateEnvName"
                  />
                  <div class="env-actions">
                    <el-button 
                      v-if="!selectedEnv.is_active"
                      type="primary" 
                      size="small" 
                      @click="setActive"
                    >
                      Set Active
                    </el-button>
                    <el-button 
                      type="danger" 
                      size="small"
                      :disabled="environmentStore.environments.length <= 1 || selectedEnv.is_active === 1"
                      @click="deleteEnv"
                    >
                      Delete
                    </el-button>
                  </div>
                </div>
              </div>
              
              <div class="host-section">
                <div class="host-label">
                  <span>Request Host (Base URL)</span>
                  <el-tooltip content="Set the base URL for all API requests. When you switch environments, the host will be automatically prepended to relative URLs." placement="top">
                    <el-icon class="info-icon"><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
                <div class="host-input-row">
                  <el-input 
                    v-model="editHost" 
                    size="small" 
                    placeholder="e.g., https://api.example.com"
                    @keyup.enter="updateEnvHost"
                  >
                    <template #prepend>
                      <el-icon><Link /></el-icon>
                    </template>
                  </el-input>
                  <el-button 
                    type="primary" 
                    size="small"
                    :disabled="!isHostChanged"
                    @click="updateEnvHost"
                  >
                    Save
                  </el-button>
                </div>
              </div>
              
              <div class="variables-section">
                <div class="variables-header">
                  <span>Variables</span>
                  <el-tooltip placement="top">
                    <template #content>
                      <div class="variable-tooltip">
                        <p><strong>Usage:</strong> Use <code v-pre>{{variableName}}</code> in URLs, headers, params or body</p>
                        <p><strong>Example:</strong></p>
                        <p>Variable: <code>token = abc123</code></p>
                        <p>URL: <code v-pre>/api/users?token={{token}}</code></p>
                        <p>Result: <code>/api/users?token=abc123</code></p>
                      </div>
                    </template>
                    <el-icon class="info-icon"><InfoFilled /></el-icon>
                  </el-tooltip>
                  <el-button type="primary" text size="small" @click="addVariable">
                    <el-icon><Plus /></el-icon>
                    Add Variable
                  </el-button>
                </div>
                
                <el-table :data="variables" size="small" stripe max-height="200">
                  <el-table-column label="Key" width="180">
                    <template #default="{ row }">
                      <el-input 
                        v-model="row.key" 
                        size="small" 
                        placeholder="Variable name"
                        @blur="saveVariable(row)"
                      />
                    </template>
                  </el-table-column>
                  <el-table-column label="Value">
                    <template #default="{ row }">
                      <el-input 
                        v-model="row.value" 
                        size="small" 
                        placeholder="Variable value"
                        @blur="saveVariable(row)"
                      />
                    </template>
                  </el-table-column>
                  <el-table-column width="60">
                    <template #default="{ row }">
                      <el-button 
                        type="danger" 
                        :icon="Delete" 
                        circle 
                        size="small"
                        @click="deleteVariable(row)"
                      />
                    </template>
                  </el-table-column>
                </el-table>
                
                <div v-if="variables.length === 0" class="empty-variables">
                  <p>No variables defined. Click "Add Variable" to create one.</p>
                </div>
              </div>
            </template>
            
            <template v-else>
              <div class="empty-state">
                <p>Select an environment to manage its variables</p>
              </div>
            </template>
          </div>
        </div>
      </el-tab-pane>
      
      <!-- Request Settings Tab -->
      <el-tab-pane label="Request" name="request">
        <div class="settings-section">
          <h4>Request Timeout</h4>
          <div class="setting-item">
            <label>Timeout (milliseconds)</label>
            <div class="setting-input-row">
              <el-input-number 
                v-model="localTimeout" 
                :min="5000" 
                :max="300000" 
                :step="1000"
                controls-position="right"
              />
              <span class="hint">Default: 30000ms (30 seconds)</span>
            </div>
            <el-button type="primary" size="small" @click="saveTimeoutSetting" :disabled="localTimeout === settingsStore.requestTimeout">
              Save
            </el-button>
          </div>
        </div>
      </el-tab-pane>
      
      <!-- Default Headers Tab -->
      <el-tab-pane label="Defaults" name="defaults">
        <div class="settings-section">
          <h4>Default Request Headers</h4>
          <p class="section-desc">These headers will be automatically applied to all new requests.</p>
          
          <el-table :data="localDefaultHeaders" size="small" stripe>
            <el-table-column label="Enabled" width="80">
              <template #default="{ row }">
                <el-checkbox v-model="row.enabled" />
              </template>
            </el-table-column>
            <el-table-column label="Key" min-width="150">
              <template #default="{ row }">
                <el-input v-model="row.key" size="small" placeholder="Header name" />
              </template>
            </el-table-column>
            <el-table-column label="Value" min-width="200">
              <template #default="{ row }">
                <el-input v-model="row.value" size="small" placeholder="Header value" />
              </template>
            </el-table-column>
            <el-table-column width="60">
              <template #default="{ $index }">
                <el-button type="danger" :icon="Delete" circle size="small" @click="removeDefaultHeader($index)" />
              </template>
            </el-table-column>
          </el-table>
          
          <div class="table-actions">
            <el-button type="primary" text size="small" @click="addDefaultHeader">
              <el-icon><Plus /></el-icon>
              Add Header
            </el-button>
            <el-button type="primary" size="small" @click="saveDefaultHeadersSetting">
              Save Default Headers
            </el-button>
          </div>
        </div>
      </el-tab-pane>
      
      <!-- Shortcuts Tab -->
      <el-tab-pane label="Shortcuts" name="shortcuts">
        <div class="settings-section">
          <h4>Keyboard Shortcuts</h4>
          <p class="section-desc">View and customize keyboard shortcuts.</p>
          
          <el-table :data="shortcutsList" size="small" stripe>
            <el-table-column label="Action" prop="label" width="200" />
            <el-table-column label="Shortcut" prop="key">
              <template #default="{ row }">
                <el-tag type="info">{{ row.key }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Description" prop="description" />
          </el-table>
        </div>
      </el-tab-pane>
      
      <!-- Other Settings Tab -->
      <el-tab-pane label="Other" name="other">
        <div class="settings-section">
          <h4>History Settings</h4>
          <div class="setting-item">
            <el-checkbox v-model="localEnableHistory" @change="saveEnableHistorySetting">
              Enable Request History
            </el-checkbox>
            <span class="hint">Save request history for quick access to previous requests.</span>
          </div>
          
          <h4>Response Settings</h4>
          <div class="setting-item">
            <el-checkbox v-model="localAutoFormatResponse" @change="saveAutoFormatSetting">
              Auto-format JSON Response
            </el-checkbox>
            <span class="hint">Automatically format and beautify JSON responses.</span>
          </div>
          
          <el-divider />
          
          <div class="reset-section">
            <el-button type="warning" @click="resetAllSettings">
              Reset All Settings to Default
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { Plus, Delete, Link, InfoFilled, Rank } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useEnvironmentStore } from '@/stores/environment'
import { useSettingsStore } from '@/stores/settings'
import type { Environment, Variable, KeyValue } from '@/types'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const visible = ref(props.visible)
const environmentStore = useEnvironmentStore()
const settingsStore = useSettingsStore()

const activeTab = ref('environment')

// Environment state
const selectedEnv = ref<Environment | null>(null)
const editName = ref('')
const editHost = ref('')
const originalHost = ref('')
const variables = ref<Variable[]>([])

// Drag state
const dragIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)
const envListRef = ref<HTMLElement | null>(null)

// Settings state
const localTimeout = ref(30000)
const localEnableHistory = ref(true)
const localAutoFormatResponse = ref(true)
const localDefaultHeaders = ref<KeyValue[]>([])

const isHostChanged = computed(() => {
  return editHost.value !== originalHost.value
})

const shortcutsList = computed(() => [
  { id: 'sendRequest', label: 'Send Request', key: settingsStore.shortcuts.sendRequest || 'Enter', description: 'Send the current HTTP request' },
  { id: 'saveApi', label: 'Save API', key: settingsStore.shortcuts.saveApi || 'Ctrl+S', description: 'Save current request as API' },
  { id: 'formatJson', label: 'Toggle Fullscreen', key: settingsStore.shortcuts.formatJson || 'F11', description: 'Toggle JSON editor fullscreen mode' }
])

watch(() => props.visible, async (val: boolean) => {
  visible.value = val
  if (val) {
    await settingsStore.loadSettings()
    localTimeout.value = settingsStore.requestTimeout
    localEnableHistory.value = settingsStore.enableHistory
    localAutoFormatResponse.value = settingsStore.autoFormatResponse
    localDefaultHeaders.value = [...settingsStore.defaultHeaders]
    if (localDefaultHeaders.value.length === 0) {
      localDefaultHeaders.value = [{ key: '', value: '', enabled: true }]
    }
    
    if (environmentStore.activeEnvironment) {
      selectEnvironment(environmentStore.activeEnvironment)
    } else if (environmentStore.environments.length > 0) {
      selectEnvironment(environmentStore.environments[0])
    }
  }
})

watch(visible, (val: boolean) => {
  emit('update:visible', val)
})

// Environment functions
async function selectEnvironment(env: Environment) {
  selectedEnv.value = env
  editName.value = env.name
  editHost.value = env.host || ''
  originalHost.value = env.host || ''
  variables.value = await window.electronAPI.getVariables(env.id)
}

async function addEnvironment() {
  try {
    const { value } = await ElMessageBox.prompt('Enter environment name', 'New Environment', {
      confirmButtonText: 'Create',
      cancelButtonText: 'Cancel',
      inputPattern: /\S+/,
      inputErrorMessage: 'Name cannot be empty'
    })
    
    await environmentStore.createEnvironment(value)
    ElMessage.success('Environment created')
    
    const newEnv = environmentStore.environments.find((e: Environment) => e.name === value)
    if (newEnv) {
      selectEnvironment(newEnv)
    }
  } catch {
    // Cancelled
  }
}

async function updateEnvName() {
  if (!selectedEnv.value || editName.value === selectedEnv.value.name) return
  
  try {
    await environmentStore.updateEnvironment(selectedEnv.value.id, editName.value, editHost.value || null)
    selectedEnv.value.name = editName.value
    ElMessage.success('Name updated')
  } catch (err: any) {
    ElMessage.error(err.message || 'Failed to update name')
    editName.value = selectedEnv.value.name
  }
}

async function updateEnvHost() {
  if (!selectedEnv.value) return
  
  const newHost = editHost.value.trim() || null
  if (newHost === selectedEnv.value.host) return
  
  try {
    await environmentStore.updateEnvironment(selectedEnv.value.id, editName.value, newHost)
    selectedEnv.value.host = newHost
    originalHost.value = editHost.value
    ElMessage.success('Host updated')
  } catch (err: any) {
    ElMessage.error(err.message || 'Failed to update host')
    editHost.value = selectedEnv.value.host || ''
  }
}

// Drag handlers
function handleDragStart(event: DragEvent, index: number) {
  dragIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function handleDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dropIndex.value = index
}

function handleDragEnd() {
  dragIndex.value = null
  dropIndex.value = null
}

async function handleDrop(event: DragEvent, targetIndex: number) {
  event.preventDefault()
  const sourceIndex = dragIndex.value
  
  if (sourceIndex === null || sourceIndex === targetIndex) {
    handleDragEnd()
    return
  }
  
  const envList = [...environmentStore.environments]
  const [removed] = envList.splice(sourceIndex, 1)
  envList.splice(targetIndex, 0, removed)
  
  const orders = envList.map((env, index) => ({
    id: env.id,
    sort_order: index
  }))
  
  try {
    await environmentStore.reorderEnvironments(orders)
  } catch (err: any) {
    ElMessage.error(err.message || 'Failed to reorder environments')
  }
  
  handleDragEnd()
}

async function setActive() {
  if (!selectedEnv.value) return
  
  try {
    await environmentStore.setActiveEnvironment(selectedEnv.value.id)
    ElMessage.success('Environment activated')
  } catch (err: any) {
    ElMessage.error(err.message || 'Failed to activate environment')
  }
}

async function deleteEnv() {
  if (!selectedEnv.value) return
  
  try {
    await ElMessageBox.confirm('Delete this environment?', 'Confirm', {
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      type: 'warning'
    })
    
    await environmentStore.deleteEnvironment(selectedEnv.value.id)
    ElMessage.success('Environment deleted')
    
    if (environmentStore.environments.length > 0) {
      selectEnvironment(environmentStore.environments[0])
    } else {
      selectedEnv.value = null
    }
  } catch {
    // Cancelled
  }
}

function addVariable() {
  if (!selectedEnv.value) return
  
  variables.value.push({
    environment_id: selectedEnv.value.id,
    key: '',
    value: ''
  })
}

async function saveVariable(variable: Variable) {
  if (!variable.key) return
  
  try {
    const plainVariable = {
      id: variable.id,
      environment_id: variable.environment_id,
      key: variable.key,
      value: variable.value
    }
    const result = await environmentStore.saveVariable(plainVariable)
    if (!variable.id && typeof result === 'number') {
      variable.id = result
    }
  } catch (err: any) {
    ElMessage.error(err.message || 'Failed to save variable')
  }
}

async function deleteVariable(variable: Variable) {
  if (variable.id) {
    try {
      await environmentStore.deleteVariable(variable.id)
    } catch (err: any) {
      ElMessage.error(err.message || 'Failed to delete variable')
      return
    }
  }
  
  const index = variables.value.indexOf(variable)
  if (index > -1) {
    variables.value.splice(index, 1)
  }
}

// Settings functions
async function saveTimeoutSetting() {
  try {
    await settingsStore.saveTimeout(localTimeout.value)
    ElMessage.success('Timeout setting saved')
  } catch (err: any) {
    ElMessage.error(err.message || 'Failed to save timeout')
  }
}

async function saveEnableHistorySetting() {
  try {
    await settingsStore.saveEnableHistory(localEnableHistory.value)
    ElMessage.success('History setting saved')
  } catch (err: any) {
    ElMessage.error(err.message || 'Failed to save setting')
  }
}

async function saveAutoFormatSetting() {
  try {
    await settingsStore.saveAutoFormatResponse(localAutoFormatResponse.value)
    ElMessage.success('Format setting saved')
  } catch (err: any) {
    ElMessage.error(err.message || 'Failed to save setting')
  }
}

function addDefaultHeader() {
  localDefaultHeaders.value.push({ key: '', value: '', enabled: true })
}

function removeDefaultHeader(index: number) {
  localDefaultHeaders.value.splice(index, 1)
  if (localDefaultHeaders.value.length === 0) {
    localDefaultHeaders.value.push({ key: '', value: '', enabled: true })
  }
}

async function saveDefaultHeadersSetting() {
  try {
    const filteredHeaders = localDefaultHeaders.value.filter((h: KeyValue) => h.key.trim() !== '')
    await settingsStore.saveDefaultHeaders(filteredHeaders)
    ElMessage.success('Default headers saved')
  } catch (err: any) {
    ElMessage.error(err.message || 'Failed to save headers')
  }
}

async function resetAllSettings() {
  try {
    await ElMessageBox.confirm('Reset all settings to default values?', 'Confirm Reset', {
      confirmButtonText: 'Reset',
      cancelButtonText: 'Cancel',
      type: 'warning'
    })
    
    await settingsStore.resetToDefaults()
    localTimeout.value = settingsStore.requestTimeout
    localEnableHistory.value = settingsStore.enableHistory
    localAutoFormatResponse.value = settingsStore.autoFormatResponse
    localDefaultHeaders.value = [...settingsStore.defaultHeaders]
    if (localDefaultHeaders.value.length === 0) {
      localDefaultHeaders.value = [{ key: '', value: '', enabled: true }]
    }
    ElMessage.success('Settings reset to defaults')
  } catch {
    // Cancelled
  }
}
</script>

<style scoped>
.settings-tabs {
  min-height: 450px;
}

.settings-tabs :deep(.el-tabs__content) {
  padding: 16px 0;
}

/* Environment Tab Styles */
.env-manager {
  display: flex;
  height: 400px;
}

.env-sidebar {
  width: 200px;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.env-list-header {
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
}

.env-list {
  flex: 1;
  overflow-y: auto;
}

.env-item {
  padding: 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.2s;
}

.env-item:hover {
  background: var(--bg-color);
}

.env-item.active {
  background: #ecf5ff;
  border-left: 3px solid var(--primary-color);
}

.env-item.dragging {
  opacity: 0.5;
  background: #e6f7ff;
}

.env-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drag-handle {
  cursor: grab;
  color: var(--text-secondary);
  font-size: 14px;
}

.drag-handle:active {
  cursor: grabbing;
}

.env-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.env-content-header {
  margin-bottom: 16px;
}

.env-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.env-actions {
  display: flex;
  gap: 8px;
}

.host-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.host-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 13px;
}

.host-input-row {
  display: flex;
  gap: 8px;
}

.host-input-row .el-input {
  flex: 1;
}

.info-icon {
  color: var(--text-secondary);
  cursor: help;
}

.variables-section {
  margin-top: 16px;
}

.variables-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
}

.variables-header .info-icon {
  margin-left: 6px;
  margin-right: auto;
}

.variable-tooltip {
  font-size: 12px;
  line-height: 1.6;
}

.variable-tooltip p {
  margin: 4px 0;
}

.variable-tooltip code {
  background: rgba(255, 255, 255, 0.2);
  padding: 1px 4px;
  border-radius: 3px;
}

.empty-variables {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

/* Settings Tabs Styles */
.settings-section {
  padding: 0 16px;
}

.settings-section h4 {
  margin: 0 0 16px 0;
  font-size: 15px;
  color: var(--text-primary);
}

.section-desc {
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 16px;
}

.setting-item {
  margin-bottom: 20px;
}

.setting-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.setting-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.hint {
  color: var(--text-secondary);
  font-size: 12px;
  margin-left: 8px;
}

.table-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
}

.reset-section {
  padding: 16px 0;
}
</style>
