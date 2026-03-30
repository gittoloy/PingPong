<template>
  <el-dialog 
    v-model="visible" 
    title="API Test Runner" 
    width="900px"
    destroy-on-close
  >
    <div class="test-runner">
      <!-- Import Section -->
      <div class="import-section">
        <el-button type="primary" @click="importFile" :disabled="testStore.running">
          <el-icon><Upload /></el-icon>
          Import Test File (Excel/CSV)
        </el-button>
        <span v-if="testStore.testCases.length > 0" class="test-count">
          {{ testStore.testCases.length }} test cases loaded
        </span>
      </div>
      
      <!-- Test Cases Preview -->
      <div v-if="testStore.testCases.length > 0" class="test-cases">
        <h4>Test Cases</h4>
        <el-table :data="testStore.testCases" size="small" max-height="200" stripe>
          <el-table-column prop="method" label="Method" width="80" />
          <el-table-column prop="url" label="URL" show-overflow-tooltip />
          <el-table-column prop="expected_status" label="Expected Status" width="120" />
        </el-table>
      </div>
      
      <!-- Run Controls -->
      <div v-if="testStore.testCases.length > 0" class="run-controls">
        <el-button 
          type="success" 
          size="large"
          @click="runTests" 
          :loading="testStore.running"
          :disabled="testStore.testCases.length === 0"
        >
          <el-icon><VideoPlay /></el-icon>
          {{ testStore.running ? 'Running...' : 'Run All Tests' }}
        </el-button>
        
        <el-progress 
          v-if="testStore.running" 
          :percentage="testStore.progress" 
          :stroke-width="10"
          style="width: 300px; margin-left: 16px;"
        />
      </div>
      
      <!-- Test Results -->
      <div v-if="testStore.testResults.length > 0" class="test-results">
        <div class="results-header">
          <h4>Test Results</h4>
          <div class="results-stats">
            <div class="stat">
              <span class="stat-value">{{ testStore.testResults.length }}</span>
              <span class="stat-label">Total</span>
            </div>
            <div class="stat success">
              <span class="stat-value">{{ passedCount }}</span>
              <span class="stat-label">Passed</span>
            </div>
            <div class="stat danger">
              <span class="stat-value">{{ failedCount }}</span>
              <span class="stat-label">Failed</span>
            </div>
            <div class="stat-rate">
              <el-progress 
                type="circle" 
                :percentage="passRate" 
                :width="60"
                :color="passRate >= 80 ? '#67c23a' : passRate >= 50 ? '#e6a23c' : '#f56c6c'"
              />
            </div>
          </div>
        </div>
        
        <el-table :data="testStore.testResults" size="small" max-height="300" stripe>
          <el-table-column label="Status" width="80">
            <template #default="{ row }">
              <el-tag :type="row.passed ? 'success' : 'danger'" size="small">
                {{ row.passed ? 'PASS' : 'FAIL' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="method" label="Method" width="80" />
          <el-table-column prop="url" label="URL" show-overflow-tooltip />
          <el-table-column label="Expected" width="100">
            <template #default="{ row }">
              {{ row.expected_status || 'Any 2xx' }}
            </template>
          </el-table-column>
          <el-table-column prop="actual_status" label="Actual" width="80" />
          <el-table-column label="Time" width="80">
            <template #default="{ row }">
              {{ row.response_time }}ms
            </template>
          </el-table-column>
          <el-table-column prop="error" label="Error" show-overflow-tooltip />
        </el-table>
        
        <div class="results-actions">
          <el-button @click="exportResults" :disabled="testStore.testResults.length === 0">
            <el-icon><Download /></el-icon>
            Export Results
          </el-button>
          <el-button @click="testStore.clearTests">
            Clear
          </el-button>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-if="testStore.testCases.length === 0" class="empty-state">
        <el-icon :size="48"><Document /></el-icon>
        <p>Import an Excel or CSV file to run batch API tests</p>
        <p class="hint">
          File should contain columns: method, url, headers (optional), body (optional), expected_status (optional)
        </p>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Upload, VideoPlay, Download, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useTestStore } from '@/stores/test'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const visible = ref(props.visible)
const testStore = useTestStore()

watch(() => props.visible, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:visible', val)
})

const passedCount = computed(() => 
  testStore.testResults.filter(r => r.passed).length
)

const failedCount = computed(() => 
  testStore.testResults.filter(r => !r.passed).length
)

const passRate = computed(() => {
  if (testStore.testResults.length === 0) return 0
  return Math.round((passedCount.value / testStore.testResults.length) * 100)
})

async function importFile() {
  try {
    const cases = await testStore.importTestFile()
    if (cases) {
      ElMessage.success(`Loaded ${cases.length} test cases`)
    }
  } catch (err: any) {
    ElMessage.error(err.message || 'Failed to import file')
  }
}

async function runTests() {
  await testStore.runTests()
  
  if (testStore.testResults.length > 0) {
    const passed = passedCount.value
    const failed = failedCount.value
    
    if (failed === 0) {
      ElMessage.success(`All ${passed} tests passed!`)
    } else {
      ElMessage.warning(`${passed} passed, ${failed} failed`)
    }
  }
}

async function exportResults() {
  try {
    const success = await testStore.exportResults()
    if (success) {
      ElMessage.success('Results exported successfully')
    }
  } catch (err: any) {
    ElMessage.error(err.message || 'Failed to export results')
  }
}
</script>

<style scoped>
.test-runner {
  min-height: 400px;
}

.import-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.test-count {
  color: var(--text-secondary);
}

.test-cases {
  margin-bottom: 20px;
}

.test-cases h4 {
  margin-bottom: 12px;
}

.run-controls {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.test-results {
  margin-top: 20px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.results-stats {
  display: flex;
  gap: 24px;
  align-items: center;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 600;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat.success .stat-value {
  color: #67c23a;
}

.stat.danger .stat-value {
  color: #f56c6c;
}

.results-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  color: var(--text-secondary);
}

.empty-state p {
  margin-top: 16px;
}

.empty-state .hint {
  font-size: 12px;
  margin-top: 8px;
}
</style>
