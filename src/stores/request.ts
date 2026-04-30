import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { HttpMethod, BodyType, KeyValue, FormField, HttpResponse, RequestRecord } from '@/types'
import { useEnvironmentStore } from './environment'
import { useSettingsStore } from './settings'

export interface ActualRequest {
  fullUrl: string
  method: string
  headers: Record<string, string>
  queryParams: Record<string, string>
  body: string
  bodyType: string
  timestamp: number
  files?: { key: string; filePath: string; fileName?: string }[]
  formFields?: { key: string; value: string }[]
}

export const useRequestStore = defineStore('request', () => {
  const method = ref<HttpMethod>('GET')
  const url = ref('')
  const headers = ref<KeyValue[]>([{ key: '', value: '', enabled: true }])
  const queryParams = ref<KeyValue[]>([{ key: '', value: '', enabled: true }])
  const body = ref('')
  const bodyType = ref<BodyType>('none')
  const formData = ref<FormField[]>([{ key: '', value: '', type: 'text', enabled: true }])
  
  const response = ref<HttpResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const actualRequest = ref<ActualRequest | null>(null)
  
  const history = ref<RequestRecord[]>([])
  const searchKeyword = ref('')
  const currentApiUuid = ref('')
  const historyPageSize = 10
  const historyPage = ref(1)
  const totalHistoryCount = ref(0)
  
  const filteredHistory = computed(() => {
    let result = history.value
    
    if (currentApiUuid.value) {
      result = result.filter(item => item.api_uuid === currentApiUuid.value)
    }
    
    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase()
      result = result.filter(item => 
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
  
  async function sendRequest() {
    if (!url.value) {
      error.value = 'Please enter a URL'
      return
    }
    
    loading.value = true
    error.value = null
    
    try {
      const environmentStore = useEnvironmentStore()
      const settingsStore = useSettingsStore()
      
      // Apply variable replacement to all inputs
      const processedUrl = environmentStore.getFullUrl(url.value)
      
      // Process headers with variable replacement, merge with default headers
      const headersObj: Record<string, string> = { ...settingsStore.defaultHeadersObj }
      headers.value.forEach(h => {
        if (h.enabled && h.key) {
          const processedKey = environmentStore.replaceVariables(h.key)
          const processedValue = environmentStore.replaceVariables(h.value)
          headersObj[processedKey] = processedValue
        }
      })
      
      // Process query params with variable replacement
      const paramsObj: Record<string, string> = {}
      queryParams.value.forEach(p => {
        if (p.enabled && p.key) {
          const processedKey = environmentStore.replaceVariables(p.key)
          const processedValue = environmentStore.replaceVariables(p.value)
          paramsObj[processedKey] = processedValue
        }
      })
      
      // Process body with variable replacement
      const processedBody = environmentStore.replaceVariables(body.value)
      
      // Build file entries and form fields for multipart/form-data
      const fileEntries: { key: string; filePath: string; fileName?: string }[] = []
      const formFields: { key: string; value: string }[] = []
      
      if (bodyType.value === 'multipart' || bodyType.value === 'form-data') {
        for (const field of formData.value) {
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
      
      actualRequest.value = {
        fullUrl,
        method: method.value,
        headers: { ...headersObj },
        queryParams: { ...paramsObj },
        body: processedBody,
        bodyType: bodyType.value,
        timestamp: Date.now(),
        files: fileEntries.length > 0 ? fileEntries : undefined,
        formFields: formFields.length > 0 ? formFields : undefined
      }
      
      const result = await window.electronAPI.sendRequest({
        method: method.value,
        url: processedUrl,
        headers: headersObj,
        queryParams: paramsObj,
        body: processedBody,
        bodyType: bodyType.value,
        files: fileEntries.length > 0 ? fileEntries : undefined,
        formFields: formFields.length > 0 ? formFields : undefined
      })
      
      response.value = result
      
      // Check if history is enabled before saving
      if (settingsStore.enableHistory) {
        await saveToHistory(result)
      }
    } catch (err: any) {
      error.value = err.message || 'Request failed'
      response.value = null
    } finally {
      loading.value = false
    }
  }
  
  async function saveToHistory(resp: HttpResponse) {
    // Build files info for history record
    const filesInfo = formData.value
      .filter(f => f.type === 'file' && f.enabled && f.key && f.filePath)
      .map(f => ({ key: f.key, fileName: f.fileName || '', filePath: f.filePath }))
    
    const record: RequestRecord = {
      method: method.value,
      url: url.value,
      headers: JSON.stringify(headers.value.filter(h => h.enabled && h.key)),
      query_params: JSON.stringify(queryParams.value.filter(p => p.enabled && p.key)),
      body: body.value,
      body_type: bodyType.value,
      response_status: resp.status,
      response_time: resp.time,
      response_headers: JSON.stringify(resp.headers),
      response_body: resp.body,
      api_uuid: currentApiUuid.value || undefined,
      files: filesInfo.length > 0 ? JSON.stringify(filesInfo) : undefined
    }
    
    await window.electronAPI.saveRequest(record)
    await loadHistory()
  }
  
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
  
  function loadFromHistory(record: RequestRecord) {
    method.value = record.method as HttpMethod
    url.value = record.url
    
    if (record.headers) {
      try {
        const parsed = JSON.parse(record.headers)
        headers.value = parsed.length > 0 ? parsed : [{ key: '', value: '', enabled: true }]
      } catch {
        headers.value = [{ key: '', value: '', enabled: true }]
      }
    }
    
    if (record.query_params) {
      try {
        const parsed = JSON.parse(record.query_params)
        queryParams.value = parsed.length > 0 ? parsed : [{ key: '', value: '', enabled: true }]
      } catch {
        queryParams.value = [{ key: '', value: '', enabled: true }]
      }
    }
    
    body.value = record.body || ''
    bodyType.value = (record.body_type as BodyType) || 'none'
    
    // Restore form data if present
    if (record.body_type === 'multipart' || record.body_type === 'form-data') {
      if (record.files) {
        try {
          const filesInfo = JSON.parse(record.files)
          const formFields: FormField[] = []
          
          // Add text fields from body
          if (record.body) {
            try {
              const textFields = JSON.parse(record.body)
              for (const [key, value] of Object.entries(textFields)) {
                formFields.push({ key, value: String(value), type: 'text', enabled: true })
              }
            } catch {
              // body is not JSON, ignore
            }
          }
          
          // Add file fields
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
          
          formData.value = formFields.length > 0 ? formFields : [{ key: '', value: '', type: 'text', enabled: true }]
        } catch {
          formData.value = [{ key: '', value: '', type: 'text', enabled: true }]
        }
      } else {
        formData.value = [{ key: '', value: '', type: 'text', enabled: true }]
      }
    }
    
    if (record.response_status !== undefined) {
      response.value = {
        status: record.response_status,
        statusText: '',
        headers: record.response_headers ? JSON.parse(record.response_headers) : {},
        body: record.response_body || '',
        time: record.response_time || 0
      }
    }
  }
  
  function addHeader() {
    headers.value.push({ key: '', value: '', enabled: true })
  }
  
  function removeHeader(index: number) {
    headers.value.splice(index, 1)
    if (headers.value.length === 0) {
      headers.value.push({ key: '', value: '', enabled: true })
    }
  }
  
  function addQueryParam() {
    queryParams.value.push({ key: '', value: '', enabled: true })
  }
  
  function removeQueryParam(index: number) {
    queryParams.value.splice(index, 1)
    if (queryParams.value.length === 0) {
      queryParams.value.push({ key: '', value: '', enabled: true })
    }
  }
  
  function reset() {
    method.value = 'GET'
    url.value = ''
    headers.value = [{ key: '', value: '', enabled: true }]
    queryParams.value = [{ key: '', value: '', enabled: true }]
    body.value = ''
    bodyType.value = 'none'
    formData.value = [{ key: '', value: '', type: 'text', enabled: true }]
    response.value = null
    error.value = null
    actualRequest.value = null
  }
  
  function setCurrentApiUuid(uuid: string) {
    currentApiUuid.value = uuid
    historyPage.value = 1
  }
  
  function loadMoreHistory() {
    historyPage.value++
  }
  
  function resetHistoryPage() {
    historyPage.value = 1
  }
  
  function findLatestHistoryByUuid(apiUuid: string): RequestRecord | null {
    if (!apiUuid) return null
    
    const matchingRecords = history.value.filter(item => item.api_uuid === apiUuid)
    
    if (matchingRecords.length === 0) return null
    
    return matchingRecords[0]
  }
  
  function loadApiWithHistory(api: {
    method: string
    url: string
    headers?: string
    query_params?: string
    body?: string
    body_type?: string
    uuid?: string
  }) {
    method.value = api.method as HttpMethod
    url.value = api.url
    bodyType.value = (api.body_type as BodyType) || 'none'
    body.value = api.body || ''
    
    // Set UUID for history filtering
    if (api.uuid) {
      setCurrentApiUuid(api.uuid)
    }
    
    if (api.headers) {
      try {
        const parsed = JSON.parse(api.headers)
        headers.value = parsed.length > 0 ? parsed : [{ key: '', value: '', enabled: true }]
      } catch {
        headers.value = [{ key: '', value: '', enabled: true }]
      }
    } else {
      headers.value = [{ key: '', value: '', enabled: true }]
    }
    
    if (api.query_params) {
      try {
        const parsed = JSON.parse(api.query_params)
        queryParams.value = parsed.length > 0 ? parsed : [{ key: '', value: '', enabled: true }]
      } catch {
        queryParams.value = [{ key: '', value: '', enabled: true }]
      }
    } else {
      queryParams.value = [{ key: '', value: '', enabled: true }]
    }
    
    // Load history by UUID
    const apiUuid = api.uuid || ''
    const latestHistory = findLatestHistoryByUuid(apiUuid)
    
    if (latestHistory && latestHistory.response_status !== undefined) {
      if (latestHistory.headers) {
        try {
          const parsed = JSON.parse(latestHistory.headers)
          headers.value = parsed.length > 0 ? parsed : [{ key: '', value: '', enabled: true }]
        } catch {
          // 保持当前headers
        }
      }
      
      if (latestHistory.query_params) {
        try {
          const parsed = JSON.parse(latestHistory.query_params)
          queryParams.value = parsed.length > 0 ? parsed : [{ key: '', value: '', enabled: true }]
        } catch {
          // 保持当前queryParams
        }
      }
      
      body.value = latestHistory.body || ''
      bodyType.value = (latestHistory.body_type as BodyType) || 'none'
      
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
            
            formData.value = formFields.length > 0 ? formFields : [{ key: '', value: '', type: 'text', enabled: true }]
          } catch {
            formData.value = [{ key: '', value: '', type: 'text', enabled: true }]
          }
        }
      }
      
      response.value = {
        status: latestHistory.response_status,
        statusText: getStatusText(latestHistory.response_status),
        headers: latestHistory.response_headers ? JSON.parse(latestHistory.response_headers) : {},
        body: latestHistory.response_body || '',
        time: latestHistory.response_time || 0
      }
      
      const headersObj: Record<string, string> = {}
      headers.value.forEach(h => {
        if (h.enabled && h.key) {
          headersObj[h.key] = h.value
        }
      })
      
      const paramsObj: Record<string, string> = {}
      queryParams.value.forEach(p => {
        if (p.enabled && p.key) {
          paramsObj[p.key] = p.value
        }
      })
      
      let fullUrl = url.value
      if (Object.keys(paramsObj).length > 0) {
        const searchParams = new URLSearchParams(paramsObj)
        fullUrl += (url.value.includes('?') ? '&' : '?') + searchParams.toString()
      }
      
      actualRequest.value = {
        fullUrl,
        method: method.value,
        headers: { ...headersObj },
        queryParams: { ...paramsObj },
        body: body.value,
        bodyType: bodyType.value,
        timestamp: latestHistory.created_at ? new Date(latestHistory.created_at).getTime() : Date.now()
      }
    } else {
      response.value = null
      actualRequest.value = null
    }
  }
  
  function addFormField() {
    formData.value.push({ key: '', value: '', type: 'text', enabled: true })
  }
  
  function removeFormField(index: number) {
    formData.value.splice(index, 1)
    if (formData.value.length === 0) {
      formData.value.push({ key: '', value: '', type: 'text', enabled: true })
    }
  }
  
  function addFileField() {
    formData.value.push({ key: '', value: '', type: 'file', enabled: true })
  }
  
  function removeFileField(index: number) {
    formData.value.splice(index, 1)
    if (formData.value.length === 0) {
      formData.value.push({ key: '', value: '', type: 'text', enabled: true })
    }
  }
  
  function updateFormField(index: number, field: Partial<FormField>) {
    if (formData.value[index]) {
      formData.value[index] = { ...formData.value[index], ...field }
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
  
  return {
    method,
    url,
    headers,
    queryParams,
    body,
    bodyType,
    formData,
    response,
    loading,
    error,
    actualRequest,
    history,
    searchKeyword,
    currentApiUuid,
    filteredHistory,
    displayedHistory,
    hasMoreHistory,
    
    sendRequest,
    loadHistory,
    deleteHistoryItem,
    clearHistory,
    loadFromHistory,
    addHeader,
    removeHeader,
    addQueryParam,
    removeQueryParam,
    addFormField,
    removeFormField,
    addFileField,
    removeFileField,
    updateFormField,
    reset,
    setCurrentApiUuid,
    loadMoreHistory,
    resetHistoryPage,
    findLatestHistoryByUuid,
    loadApiWithHistory
  }
})
