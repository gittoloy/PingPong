import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { HttpMethod, BodyType, KeyValue, HttpResponse, RequestRecord } from '@/types'
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
}

export const useRequestStore = defineStore('request', () => {
  const method = ref<HttpMethod>('GET')
  const url = ref('')
  const headers = ref<KeyValue[]>([{ key: '', value: '', enabled: true }])
  const queryParams = ref<KeyValue[]>([{ key: '', value: '', enabled: true }])
  const body = ref('')
  const bodyType = ref<BodyType>('none')
  
  const response = ref<HttpResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const actualRequest = ref<ActualRequest | null>(null)
  
  const history = ref<RequestRecord[]>([])
  const searchKeyword = ref('')
  const currentApiUrl = ref('')
  const historyPageSize = 10
  const historyPage = ref(1)
  const totalHistoryCount = ref(0)
  
  const filteredHistory = computed(() => {
    let result = history.value
    
    if (currentApiUrl.value) {
      result = result.filter(item => {
        const normalizedItemUrl = item.url.replace(/^https?:\/\/[^\/]+/, '')
        const normalizedCurrentUrl = currentApiUrl.value.replace(/^https?:\/\/[^\/]+/, '')
        return normalizedItemUrl === normalizedCurrentUrl || item.url === currentApiUrl.value
      })
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
        timestamp: Date.now()
      }
      
      const result = await window.electronAPI.sendRequest({
        method: method.value,
        url: processedUrl,
        headers: headersObj,
        queryParams: paramsObj,
        body: processedBody,
        bodyType: bodyType.value
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
      response_body: resp.body
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
    response.value = null
    error.value = null
    actualRequest.value = null
  }
  
  function setCurrentApiUrl(apiUrl: string) {
    currentApiUrl.value = apiUrl
    historyPage.value = 1
  }
  
  function loadMoreHistory() {
    historyPage.value++
  }
  
  function resetHistoryPage() {
    historyPage.value = 1
  }
  
  function findLatestHistoryByUrl(apiUrl: string): RequestRecord | null {
    if (!apiUrl) return null
    
    const normalizedApiUrl = apiUrl.replace(/^https?:\/\/[^\/]+/, '')
    
    const matchingRecords = history.value.filter(item => {
      const normalizedItemUrl = item.url.replace(/^https?:\/\/[^\/]+/, '')
      return normalizedItemUrl === normalizedApiUrl || item.url === apiUrl
    })
    
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
  }) {
    method.value = api.method as HttpMethod
    url.value = api.url
    bodyType.value = (api.body_type as BodyType) || 'none'
    body.value = api.body || ''
    setCurrentApiUrl(api.url)
    
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
    
    const latestHistory = findLatestHistoryByUrl(api.url)
    
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
    response,
    loading,
    error,
    actualRequest,
    history,
    searchKeyword,
    currentApiUrl,
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
    reset,
    setCurrentApiUrl,
    loadMoreHistory,
    resetHistoryPage,
    findLatestHistoryByUrl,
    loadApiWithHistory
  }
})
