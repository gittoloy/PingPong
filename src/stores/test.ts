import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TestCase, TestResult } from '@/types'

export const useTestStore = defineStore('test', () => {
  const testCases = ref<TestCase[]>([])
  const testResults = ref<TestResult[]>([])
  const running = ref(false)
  const progress = ref(0)
  
  async function importTestFile() {
    try {
      const cases = await window.electronAPI.importTestFile()
      if (cases) {
        testCases.value = cases
        testResults.value = []
        progress.value = 0
      }
      return cases
    } catch (err) {
      console.error('Failed to import test file:', err)
      throw err
    }
  }
  
  async function runTests() {
    if (testCases.value.length === 0) return
    
    running.value = true
    testResults.value = []
    progress.value = 0
    
    try {
      for (let i = 0; i < testCases.value.length; i++) {
        const testCase = testCases.value[i]
        
        try {
          // Parse headers if provided
          let headers: Record<string, string> = {}
          if (testCase.headers) {
            try {
              headers = JSON.parse(testCase.headers)
            } catch {
              // Treat as key: value format
              testCase.headers.split('\n').forEach(line => {
                const [key, ...valueParts] = line.split(':')
                if (key && valueParts.length) {
                  headers[key.trim()] = valueParts.join(':').trim()
                }
              })
            }
          }
          
          const response = await window.electronAPI.sendRequest({
            method: testCase.method,
            url: testCase.url,
            headers,
            body: testCase.body,
            bodyType: testCase.body ? 'json' : 'none'
          })
          
          const passed = testCase.expected_status 
            ? response.status === testCase.expected_status 
            : response.status >= 200 && response.status < 300
          
          testResults.value.push({
            ...testCase,
            actual_status: response.status,
            response_time: response.time,
            passed
          })
        } catch (err: any) {
          testResults.value.push({
            ...testCase,
            actual_status: 0,
            response_time: 0,
            passed: false,
            error: err.message
          })
        }
        
        progress.value = Math.round(((i + 1) / testCases.value.length) * 100)
      }
    } finally {
      running.value = false
    }
  }
  
  async function exportResults() {
    if (testResults.value.length === 0) return false
    
    try {
      const exportData = testResults.value.map(r => ({
        method: r.method,
        url: r.url,
        expected_status: r.expected_status || '',
        actual_status: r.actual_status,
        response_time: r.response_time,
        passed: r.passed ? 'PASS' : 'FAIL',
        error: r.error || ''
      }))
      
      return await window.electronAPI.exportTestResults(exportData)
    } catch (err) {
      console.error('Failed to export results:', err)
      throw err
    }
  }
  
  function clearTests() {
    testCases.value = []
    testResults.value = []
    progress.value = 0
  }
  
  return {
    testCases,
    testResults,
    running,
    progress,
    importTestFile,
    runTests,
    exportResults,
    clearTests
  }
})
