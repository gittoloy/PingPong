import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { HttpMethod, BodyType, KeyValue, FormField, PathParam, RequestTab, HttpResponse, ActualRequest } from '@/types'
import { useEnvironmentStore } from './environment'
import { useSettingsStore } from './settings'

function generateTabId(): string {
  return 'tab-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8)
}

function createDefaultTab(name?: string): RequestTab {
  return {
    id: generateTabId(),
    name: name || 'New Request',
    method: 'GET',
    url: '',
    headers: [{ key: '', value: '', enabled: true }],
    queryParams: [{ key: '', value: '', enabled: true }],
    pathParams: [],
    body: '',
    bodyType: 'none',
    formData: [{ key: '', value: '', type: 'text', enabled: true }],
    response: null,
    loading: false,
    error: null,
    actualRequest: null,
    currentApiUuid: '',
    isRenaming: false
  }
}

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<RequestTab[]>([createDefaultTab()])
  const activeTabId = ref(tabs.value[0].id)

  const activeTab = computed(() => {
    return tabs.value.find(t => t.id === activeTabId.value) || tabs.value[0]
  })

  const activeTabIndex = computed(() => {
    return tabs.value.findIndex(t => t.id === activeTabId.value)
  })

  function addTab(name?: string, activate = true): RequestTab {
    const tab = createDefaultTab(name)
    tabs.value.push(tab)
    if (activate) {
      activeTabId.value = tab.id
    }
    return tab
  }

  function closeTab(tabId: string) {
    const index = tabs.value.findIndex(t => t.id === tabId)
    if (index === -1) return
    if (tabs.value.length <= 1) return // Don't close the last tab

    tabs.value.splice(index, 1)

    // If closing the active tab, switch to adjacent tab
    if (activeTabId.value === tabId) {
      const newIndex = Math.min(index, tabs.value.length - 1)
      activeTabId.value = tabs.value[newIndex].id
    }
  }

  function switchTab(tabId: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      activeTabId.value = tabId
    }
  }

  function renameTab(tabId: string, name: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.name = name
      tab.isRenaming = false
    }
  }

  function startRenaming(tabId: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.isRenaming = true
    }
  }

  function stopRenaming(tabId: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.isRenaming = false
    }
  }

  // Load an API into a specific tab or the active tab
  function loadApiIntoTab(api: {
    method: string
    url: string
    headers?: string
    query_params?: string
    body?: string
    body_type?: string
    form_data?: string
    uuid?: string
    name?: string
  }, tabId?: string) {
    const tab = tabId ? tabs.value.find(t => t.id === tabId) : activeTab.value
    if (!tab) return

    tab.method = api.method as HttpMethod
    tab.url = api.url
    tab.bodyType = (api.body_type as BodyType) || 'none'
    tab.body = api.body || ''
    tab.currentApiUuid = api.uuid || ''
    tab.name = api.name || extractTabName(api.url)
    tab.pathParams = extractPathParams(api.url)

    if (api.headers) {
      try {
        const parsed = JSON.parse(api.headers)
        tab.headers = parsed.length > 0 ? parsed : [{ key: '', value: '', enabled: true }]
      } catch {
        tab.headers = [{ key: '', value: '', enabled: true }]
      }
    } else {
      tab.headers = [{ key: '', value: '', enabled: true }]
    }

    if (api.query_params) {
      try {
        const parsed = JSON.parse(api.query_params)
        tab.queryParams = parsed.length > 0 ? parsed : [{ key: '', value: '', enabled: true }]
      } catch {
        tab.queryParams = [{ key: '', value: '', enabled: true }]
      }
    } else {
      tab.queryParams = [{ key: '', value: '', enabled: true }]
    }

    // Restore form data if present
    if (api.form_data) {
      try {
        const parsed = JSON.parse(api.form_data)
        tab.formData = parsed.length > 0 ? parsed : [{ key: '', value: '', type: 'text', enabled: true }]
      } catch {
        tab.formData = [{ key: '', value: '', type: 'text', enabled: true }]
      }
    } else {
      tab.formData = [{ key: '', value: '', type: 'text', enabled: true }]
    }

    tab.response = null
    tab.actualRequest = null
    tab.error = null
  }

  // Open API in a new tab
  function openApiInNewTab(api: {
    method: string
    url: string
    headers?: string
    query_params?: string
    body?: string
    body_type?: string
    form_data?: string
    uuid?: string
    name?: string
  }) {
    // Check if API is already open in a tab
    if (api.uuid) {
      const existingTab = tabs.value.find(t => t.currentApiUuid === api.uuid)
      if (existingTab) {
        activeTabId.value = existingTab.id
        return existingTab
      }
    }

    const tab = addTab(api.name || extractTabName(api.url), true)
    loadApiWithHistoryIntoTab(api, tab.id)
    return tab
  }

  // Load API with latest history response into a tab
  function loadApiWithHistoryIntoTab(api: {
    method: string
    url: string
    headers?: string
    query_params?: string
    body?: string
    body_type?: string
    form_data?: string
    uuid?: string
    name?: string
  }, tabId: string) {
    loadApiIntoTab(api, tabId)

    const tab = tabs.value.find(t => t.id === tabId)
    if (!tab || !api.uuid) return

    // Find latest history record by UUID
    const matchingRecords = history.value.filter((item: any) => item.api_uuid === api.uuid)
    if (matchingRecords.length === 0) return

    const latestHistory = matchingRecords[0]

    if (latestHistory && latestHistory.response_status !== undefined) {
      // Override with history headers/params/body if available
      if (latestHistory.headers) {
        try {
          const parsed = JSON.parse(latestHistory.headers)
          tab.headers = parsed.length > 0 ? parsed : [{ key: '', value: '', enabled: true }]
        } catch {
          // keep current
        }
      }

      if (latestHistory.query_params) {
        try {
          const parsed = JSON.parse(latestHistory.query_params)
          tab.queryParams = parsed.length > 0 ? parsed : [{ key: '', value: '', enabled: true }]
        } catch {
          // keep current
        }
      }

      tab.body = latestHistory.body || ''
      tab.bodyType = (latestHistory.body_type as BodyType) || 'none'

      // Restore form data if present
      if (latestHistory.body_type === 'multipart' || latestHistory.body_type === 'form-data') {
        if (latestHistory.files) {
          try {
            const filesInfo = JSON.parse(latestHistory.files)
            const formFields: FormField[] = []

            if (latestHistory.body) {
              try {
                const textFields = JSON.parse(latestHistory.body)
                for (const [key, value] of Object.entries(textFields)) {
                  formFields.push({ key, value: String(value), type: 'text', enabled: true })
                }
              } catch {
                // body is not JSON
              }
            }

            for (const f of filesInfo) {
              formFields.push({
                key: f.key,
                value: '',
                type: 'file',
                enabled: true,
                fileName: f.fileName,
                filePath: f.filePath
              })
            }

            tab.formData = formFields.length > 0 ? formFields : [{ key: '', value: '', type: 'text', enabled: true }]
          } catch {
            tab.formData = [{ key: '', value: '', type: 'text', enabled: true }]
          }
        }
      }

      tab.response = {
        status: latestHistory.response_status,
        statusText: getStatusText(latestHistory.response_status),
        headers: latestHistory.response_headers ? JSON.parse(latestHistory.response_headers) : {},
        body: latestHistory.response_body || '',
        time: latestHistory.response_time || 0
      }

      // Build actualRequest for display
      const headersObj: Record<string, string> = {}
      tab.headers.forEach(h => {
        if (h.enabled && h.key) {
          headersObj[h.key] = h.value
        }
      })

      const paramsObj: Record<string, string> = {}
      tab.queryParams.forEach(p => {
        if (p.enabled && p.key) {
          paramsObj[p.key] = p.value
        }
      })

      let fullUrl = tab.url
      if (Object.keys(paramsObj).length > 0) {
        const searchParams = new URLSearchParams(paramsObj)
        fullUrl += (tab.url.includes('?') ? '&' : '?') + searchParams.toString()
      }

      tab.actualRequest = {
        fullUrl,
        method: tab.method,
        headers: { ...headersObj },
        queryParams: { ...paramsObj },
        body: tab.body,
        bodyType: tab.bodyType,
        timestamp: latestHistory.created_at ? new Date(latestHistory.created_at).getTime() : Date.now()
      }
    }
  }

  // Load from history into the active tab
  function loadFromHistoryIntoTab(record: {
    method: string
    url: string
    headers?: string
    query_params?: string
    body?: string
    body_type?: string
    response_status?: number
    response_time?: number
    response_headers?: string
    response_body?: string
    api_uuid?: string
    files?: string
  }) {
    const tab = activeTab.value

    tab.method = record.method as HttpMethod
    tab.url = record.url
    tab.currentApiUuid = record.api_uuid || ''

    if (record.headers) {
      try {
        const parsed = JSON.parse(record.headers)
        tab.headers = parsed.length > 0 ? parsed : [{ key: '', value: '', enabled: true }]
      } catch {
        tab.headers = [{ key: '', value: '', enabled: true }]
      }
    }

    if (record.query_params) {
      try {
        const parsed = JSON.parse(record.query_params)
        tab.queryParams = parsed.length > 0 ? parsed : [{ key: '', value: '', enabled: true }]
      } catch {
        tab.queryParams = [{ key: '', value: '', enabled: true }]
      }
    }

    tab.body = record.body || ''
    tab.bodyType = (record.body_type as BodyType) || 'none'
    tab.pathParams = extractPathParams(record.url)

    // Restore form data if present
    if (record.body_type === 'multipart' || record.body_type === 'form-data') {
      if (record.files) {
        try {
          const filesInfo = JSON.parse(record.files)
          const formFields: FormField[] = []

          if (record.body) {
            try {
              const textFields = JSON.parse(record.body)
              for (const [key, value] of Object.entries(textFields)) {
                formFields.push({ key, value: String(value), type: 'text', enabled: true })
              }
            } catch {
              // body is not JSON
            }
          }

          for (const f of filesInfo) {
            formFields.push({
              key: f.key,
              value: '',
              type: 'file',
              enabled: true,
              fileName: f.fileName,
              filePath: f.filePath
            })
          }

          tab.formData = formFields.length > 0 ? formFields : [{ key: '', value: '', type: 'text', enabled: true }]
        } catch {
          tab.formData = [{ key: '', value: '', type: 'text', enabled: true }]
        }
      }
    }

    if (record.response_status !== undefined) {
      tab.response = {
        status: record.response_status,
        statusText: getStatusText(record.response_status),
        headers: record.response_headers ? JSON.parse(record.response_headers) : {},
        body: record.response_body || '',
        time: record.response_time || 0
      }
    }

    tab.name = extractTabName(record.url)
  }

  // Update path params when URL changes
  function updatePathParamsFromUrl(tabId: string, url: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (!tab) return

    const newPathParams = extractPathParams(url)

    // Preserve existing values for matching param names
    tab.pathParams = newPathParams.map(newParam => {
      const existing = tab.pathParams.find(p => p.name === newParam.name)
      return {
        name: newParam.name,
        value: existing ? existing.value : ''
      }
    })
  }

  // Replace path parameters in URL with user-provided values
  function resolvePathParams(url: string, pathParams: PathParam[]): string {
    let resolvedUrl = url
    for (const param of pathParams) {
      if (param.value) {
        resolvedUrl = resolvedUrl.replace(`:${param.name}`, encodeURIComponent(param.value))
      }
    }
    return resolvedUrl
  }

  // Send request for the active tab
  async function sendRequest() {
    const tab = activeTab.value
    if (!tab.url) {
      tab.error = 'Please enter a URL'
      return
    }

    tab.loading = true
    tab.error = null

    try {
      const environmentStore = useEnvironmentStore()
      const settingsStore = useSettingsStore()

      // Resolve path parameters first
      const resolvedUrl = resolvePathParams(tab.url, tab.pathParams)

      // Apply variable replacement to all inputs
      const processedUrl = environmentStore.getFullUrl(resolvedUrl)

      // Process headers with variable replacement, merge with default headers
      const headersObj: Record<string, string> = { ...settingsStore.defaultHeadersObj }
      tab.headers.forEach(h => {
        if (h.enabled && h.key) {
          const processedKey = environmentStore.replaceVariables(h.key)
          const processedValue = environmentStore.replaceVariables(h.value)
          headersObj[processedKey] = processedValue
        }
      })

      // Process query params with variable replacement
      const paramsObj: Record<string, string> = {}
      tab.queryParams.forEach(p => {
        if (p.enabled && p.key) {
          const processedKey = environmentStore.replaceVariables(p.key)
          const processedValue = environmentStore.replaceVariables(p.value)
          paramsObj[processedKey] = processedValue
        }
      })

      // Process body with variable replacement
      const processedBody = environmentStore.replaceVariables(tab.body)

      // Build file entries and form fields for multipart/form-data
      const fileEntries: { key: string; filePath: string; fileName?: string }[] = []
      const formFields: { key: string; value: string }[] = []

      if (tab.bodyType === 'multipart' || tab.bodyType === 'form-data') {
        for (const field of tab.formData) {
          if (!field.enabled || !field.key) continue
          if (field.type === 'file' && field.filePath) {
            fileEntries.push({
              key: field.key,
              filePath: field.filePath,
              fileName: field.fileName
            })
          } else if (field.type === 'text') {
            const processedFieldKey = environmentStore.replaceVariables(field.key)
            const processedFieldValue = environmentStore.replaceVariables(field.value)
            formFields.push({ key: processedFieldKey, value: processedFieldValue })
          }
        }
      }

      let fullUrl = processedUrl
      if (Object.keys(paramsObj).length > 0) {
        const searchParams = new URLSearchParams(paramsObj)
        fullUrl += (processedUrl.includes('?') ? '&' : '?') + searchParams.toString()
      }

      tab.actualRequest = {
        fullUrl,
        method: tab.method,
        headers: { ...headersObj },
        queryParams: { ...paramsObj },
        body: processedBody,
        bodyType: tab.bodyType,
        timestamp: Date.now(),
        files: fileEntries.length > 0 ? fileEntries : undefined,
        formFields: formFields.length > 0 ? formFields : undefined
      }

      const result = await window.electronAPI.sendRequest({
        method: tab.method,
        url: processedUrl,
        headers: headersObj,
        queryParams: paramsObj,
        body: processedBody,
        bodyType: tab.bodyType,
        files: fileEntries.length > 0 ? fileEntries : undefined,
        formFields: formFields.length > 0 ? formFields : undefined
      })

      tab.response = result

      // Check if history is enabled before saving
      if (settingsStore.enableHistory) {
        await saveToHistory(tab, result)
      }
    } catch (err: any) {
      tab.error = err.message || 'Request failed'
      tab.response = null
    } finally {
      tab.loading = false
    }
  }

  async function saveToHistory(tab: RequestTab, resp: HttpResponse) {
    const filesInfo = tab.formData
      .filter(f => f.type === 'file' && f.enabled && f.key && f.filePath)
      .map(f => ({ key: f.key, fileName: f.fileName || '', filePath: f.filePath }))

    const record = {
      method: tab.method,
      url: tab.url,
      headers: JSON.stringify(tab.headers.filter(h => h.enabled && h.key)),
      query_params: JSON.stringify(tab.queryParams.filter(p => p.enabled && p.key)),
      body: tab.body,
      body_type: tab.bodyType,
      response_status: resp.status,
      response_time: resp.time,
      response_headers: JSON.stringify(resp.headers),
      response_body: resp.body,
      api_uuid: tab.currentApiUuid || undefined,
      files: filesInfo.length > 0 ? JSON.stringify(filesInfo) : undefined
    }

    await window.electronAPI.saveRequest(record)
  }

  function resetTab(tabId?: string) {
    const tab = tabId ? tabs.value.find(t => t.id === tabId) : activeTab.value
    if (!tab) return

    tab.method = 'GET'
    tab.url = ''
    tab.headers = [{ key: '', value: '', enabled: true }]
    tab.queryParams = [{ key: '', value: '', enabled: true }]
    tab.pathParams = []
    tab.body = ''
    tab.bodyType = 'none'
    tab.formData = [{ key: '', value: '', type: 'text', enabled: true }]
    tab.response = null
    tab.error = null
    tab.actualRequest = null
    tab.currentApiUuid = ''
    tab.name = 'New Request'
  }

  // Extract path parameters from URL (e.g., :requestId from /api/result/:requestId)
  function extractPathParams(url: string): PathParam[] {
    const params: PathParam[] = []
    const regex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g
    let match
    while ((match = regex.exec(url)) !== null) {
      const paramName = match[1]
      if (!params.find(p => p.name === paramName)) {
        params.push({ name: paramName, value: '' })
      }
    }
    return params
  }

  function extractTabName(url: string): string {
    try {
      let cleanUrl = url.trim()
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'http://placeholder' + (cleanUrl.startsWith('/') ? '' : '/') + cleanUrl
      }
      const urlObj = new URL(cleanUrl)
      const pathParts = urlObj.pathname.split('/').filter(Boolean)

      // Remove path params from name
      const cleanParts = pathParts.filter(p => !p.startsWith(':'))
      if (cleanParts.length > 0) {
        const lastPart = cleanParts[cleanParts.length - 1]
        return lastPart.substring(0, 30)
      }

      const host = urlObj.host.replace(/^www\./, '')
      return host.substring(0, 30)
    } catch {
      return url.trim().substring(0, 30) || 'New Request'
    }
  }

  function getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      301: 'Moved Permanently',
      302: 'Found',
      304: 'Not Modified',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    }
    return statusTexts[status] || ''
  }

  // History-related methods (shared across tabs)
  const history = ref<any[]>([])
  const searchKeyword = ref('')
  const historyPageSize = 10
  const historyPage = ref(1)
  const totalHistoryCount = ref(0)

  const filteredHistory = computed(() => {
    let result = history.value

    if (activeTab.value.currentApiUuid) {
      result = result.filter((item: any) => item.api_uuid === activeTab.value.currentApiUuid)
    }

    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase()
      result = result.filter((item: any) =>
        item.url.toLowerCase().includes(keyword) ||
        item.name?.toLowerCase().includes(keyword) ||
        item.method.toLowerCase().includes(keyword)
      )
    }

    return result
  })

  const displayedHistory = computed(() => {
    return filteredHistory.value.slice(0, historyPage.value * historyPageSize)
  })

  const hasMoreHistory = computed(() => {
    return displayedHistory.value.length < filteredHistory.value.length
  })

  async function loadHistory() {
    try {
      history.value = await window.electronAPI.getRequests()
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  async function deleteHistoryItem(id: number) {
    await window.electronAPI.deleteRequest(id)
    await loadHistory()
  }

  async function clearHistory() {
    await window.electronAPI.clearRequests()
    await loadHistory()
  }

  function loadMoreHistory() {
    historyPage.value++
  }

  function resetHistoryPage() {
    historyPage.value = 1
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    activeTabIndex,
    addTab,
    closeTab,
    switchTab,
    renameTab,
    startRenaming,
    stopRenaming,
    loadApiIntoTab,
    openApiInNewTab,
    loadApiWithHistoryIntoTab,
    loadFromHistoryIntoTab,
    updatePathParamsFromUrl,
    resolvePathParams,
    sendRequest,
    saveToHistory,
    resetTab,
    extractPathParams,
    extractTabName,
    // History
    history,
    searchKeyword,
    filteredHistory,
    displayedHistory,
    hasMoreHistory,
    loadHistory,
    deleteHistoryItem,
    clearHistory,
    loadMoreHistory,
    resetHistoryPage
  }
})
