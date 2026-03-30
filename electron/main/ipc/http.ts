import { ipcMain } from 'electron'
import axios, { AxiosRequestConfig, Method } from 'axios'
import FormData from 'form-data'

export interface HttpRequest {
  method: string
  url: string
  headers?: Record<string, string>
  queryParams?: Record<string, string>
  body?: string
  bodyType?: 'json' | 'form-data' | 'raw' | 'none'
}

export interface HttpResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  time: number
}

export function registerHttpHandlers(): void {
  ipcMain.handle('http:send', async (_event, request: HttpRequest): Promise<HttpResponse> => {
    const startTime = Date.now()
    
    try {
      // Build URL with query params
      let url = request.url
      if (request.queryParams && Object.keys(request.queryParams).length > 0) {
        const params = new URLSearchParams(request.queryParams)
        url += (url.includes('?') ? '&' : '?') + params.toString()
      }

      // Build axios config
      const config: AxiosRequestConfig = {
        method: request.method.toLowerCase() as Method,
        url,
        headers: request.headers || {},
        timeout: 30000,
        validateStatus: () => true, // Accept all status codes
      }

      // Handle body based on type
      if (request.body && request.bodyType && request.bodyType !== 'none') {
        if (request.bodyType === 'json') {
          config.data = request.body
          config.headers = {
            ...config.headers,
            'Content-Type': 'application/json'
          }
        } else if (request.bodyType === 'form-data') {
          try {
            const formData = JSON.parse(request.body)
            const form = new FormData()
            for (const [key, value] of Object.entries(formData)) {
              form.append(key, String(value))
            }
            config.data = form
          } catch {
            config.data = request.body
          }
        } else {
          config.data = request.body
        }
      }

      const response = await axios(config)
      const endTime = Date.now()

      // Convert headers to plain object
      const responseHeaders: Record<string, string> = {}
      for (const [key, value] of Object.entries(response.headers)) {
        if (typeof value === 'string') {
          responseHeaders[key] = value
        } else if (Array.isArray(value)) {
          responseHeaders[key] = value.join(', ')
        }
      }

      // Convert body to string
      let bodyString: string
      if (typeof response.data === 'object') {
        bodyString = JSON.stringify(response.data, null, 2)
      } else {
        bodyString = String(response.data)
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: bodyString,
        time: endTime - startTime
      }
    } catch (error: any) {
      const endTime = Date.now()
      return {
        status: 0,
        statusText: error.message || 'Request failed',
        headers: {},
        body: JSON.stringify({ error: error.message }, null, 2),
        time: endTime - startTime
      }
    }
  })
}
