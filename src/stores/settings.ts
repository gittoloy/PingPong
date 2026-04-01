import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { KeyValue, ShortcutMap } from '@/types'

export const useSettingsStore = defineStore('settings', () => {
  // Settings state
  const requestTimeout = ref(30000)
  const enableHistory = ref(true)
  const defaultHeaders = ref<KeyValue[]>([])
  const autoFormatResponse = ref(true)
  const shortcuts = ref<ShortcutMap>({
    sendRequest: 'Enter',
    saveApi: 'Ctrl+S',
    formatJson: 'F11'
  })
  
  // Loading state
  const isLoaded = ref(false)
  
  // Computed - default headers as object for merging
  const defaultHeadersObj = computed(() => {
    const obj: Record<string, string> = {}
    defaultHeaders.value.forEach(h => {
      if (h.enabled && h.key) {
        obj[h.key] = h.value
      }
    })
    return obj
  })
  
  async function loadSettings() {
    try {
      const settings = await window.electronAPI.getAllSettings()
      
      if (settings.request_timeout) {
        requestTimeout.value = parseInt(settings.request_timeout) || 30000
      }
      
      if (settings.enable_history) {
        enableHistory.value = settings.enable_history === 'true'
      }
      
      if (settings.default_headers) {
        try {
          defaultHeaders.value = JSON.parse(settings.default_headers)
        } catch {
          defaultHeaders.value = []
        }
      }
      
      if (settings.auto_format_response) {
        autoFormatResponse.value = settings.auto_format_response === 'true'
      }
      
      if (settings.shortcuts) {
        try {
          shortcuts.value = JSON.parse(settings.shortcuts)
        } catch {
          shortcuts.value = {
            sendRequest: 'Enter',
            saveApi: 'Ctrl+S',
            formatJson: 'F11'
          }
        }
      }
      
      isLoaded.value = true
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }
  
  async function saveTimeout(value: number) {
    try {
      requestTimeout.value = value
      await window.electronAPI.setSetting('request_timeout', String(value))
    } catch (err) {
      console.error('Failed to save timeout:', err)
      throw err
    }
  }
  
  async function saveEnableHistory(value: boolean) {
    try {
      enableHistory.value = value
      await window.electronAPI.setSetting('enable_history', String(value))
    } catch (err) {
      console.error('Failed to save enable history:', err)
      throw err
    }
  }
  
  async function saveDefaultHeaders(headers: KeyValue[]) {
    try {
      defaultHeaders.value = headers
      await window.electronAPI.setSetting('default_headers', JSON.stringify(headers))
    } catch (err) {
      console.error('Failed to save default headers:', err)
      throw err
    }
  }
  
  async function saveAutoFormatResponse(value: boolean) {
    try {
      autoFormatResponse.value = value
      await window.electronAPI.setSetting('auto_format_response', String(value))
    } catch (err) {
      console.error('Failed to save auto format response:', err)
      throw err
    }
  }
  
  async function saveShortcuts(newShortcuts: ShortcutMap) {
    try {
      shortcuts.value = newShortcuts
      await window.electronAPI.setSetting('shortcuts', JSON.stringify(newShortcuts))
    } catch (err) {
      console.error('Failed to save shortcuts:', err)
      throw err
    }
  }
  
  async function resetToDefaults() {
    try {
      await window.electronAPI.resetSettings()
      await loadSettings()
    } catch (err) {
      console.error('Failed to reset settings:', err)
      throw err
    }
  }
  
  // Helper to add default header
  function addDefaultHeader() {
    defaultHeaders.value.push({ key: '', value: '', enabled: true })
  }
  
  // Helper to remove default header
  function removeDefaultHeader(index: number) {
    defaultHeaders.value.splice(index, 1)
  }
  
  return {
    // State
    requestTimeout,
    enableHistory,
    defaultHeaders,
    autoFormatResponse,
    shortcuts,
    isLoaded,
    
    // Computed
    defaultHeadersObj,
    
    // Actions
    loadSettings,
    saveTimeout,
    saveEnableHistory,
    saveDefaultHeaders,
    saveAutoFormatResponse,
    saveShortcuts,
    resetToDefaults,
    addDefaultHeader,
    removeDefaultHeader
  }
})
