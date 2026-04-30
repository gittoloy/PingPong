import { ipcMain } from 'electron'
import axios, { AxiosRequestConfig, Method } from 'axios'
import FormData from 'form-data'
import * as fs from 'fs'
import * as path from 'path'
import { runQuery } from '../database'

export interface FileEntry {
  key: string
  filePath: string
  fileName?: string
}

export interface HttpRequest {
  method: string
  url: string
  headers?: Record<string, string>
  queryParams?: Record<string, string>
  body?: string
  bodyType?: 'json' | 'form-data' | 'raw' | 'none' | 'multipart'
  files?: FileEntry[]
  formFields?: { key: string; value: string }[]
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
      // Get timeout setting from database
      let timeout = 30000
      try {
        const timeoutSetting = runQuery("SELECT value FROM settings WHERE key = 'request_timeout'")
        if (timeoutSetting[0]?.value) {
          timeout = parseInt(timeoutSetting[0].value) || 30000
        }
      } catch {
        // Use default timeout if database query fails
      }
      
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
        timeout,
        validateStatus: () => true, // Accept all status codes
      }

      // Handle body based on type
      if (request.bodyType === 'multipart' || request.bodyType === 'form-data') {
        const form = new FormData()

        // Add text fields
        if (request.formFields && request.formFields.length > 0) {
          for (const field of request.formFields) {
            if (field.key) {
              form.append(field.key, field.value)
            }
          }
        }

        // Add file fields
        if (request.files && request.files.length > 0) {
          for (const file of request.files) {
            if (file.key && file.filePath && fs.existsSync(file.filePath)) {
              const fileName = file.fileName || path.basename(file.filePath)
              const fileStream = fs.createReadStream(file.filePath)
              form.append(file.key, fileStream, { filename: fileName })
            }
          }
        }

        // If no form fields or files but body is provided, fall back to JSON parsing
        if ((!request.formFields || request.formFields.length === 0) && 
            (!request.files || request.files.length === 0) && request.body) {
          try {
            const formData = JSON.parse(request.body)
            for (const [key, value] of Object.entries(formData)) {
              form.append(key, String(value))
            }
          } catch {
            form.append('data', request.body)
          }
        }

        config.data = form
        // Let FormData set the correct Content-Type with boundary
        const formHeaders = form.getHeaders()
        config.headers = {
          ...config.headers,
          ...formHeaders
        }
      } else if (request.body && request.bodyType && request.bodyType !== 'none') {
        if (request.bodyType === 'json') {
          config.data = request.body
          config.headers = {
            ...config.headers,
            'Content-Type': 'application/json'
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
