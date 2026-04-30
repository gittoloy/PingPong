import { ipcMain, app } from 'electron'
import axios, { AxiosRequestConfig, Method } from 'axios'
import FormData from 'form-data'
import * as fs from 'fs'
import * as path from 'path'
import { runQuery } from '../database'

// File download detection: Content-Types that indicate binary file responses
const BINARY_CONTENT_TYPES = [
  'application/pdf',
  'application/octet-stream',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-tar',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.ms-word',
  'application/vnd.ms-powerpoint'
]

const BINARY_CONTENT_PREFIXES = [
  'image/',
  'audio/',
  'video/',
  'font/'
]

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
  isFileDownload?: boolean
  fileName?: string
  filePath?: string
  fileSize?: number
}

function isBinaryContentType(contentType: string): boolean {
  if (!contentType) return false
  const ct = contentType.toLowerCase().split(';')[0].trim()
  for (const pattern of BINARY_CONTENT_TYPES) {
    if (ct === pattern) return true
  }
  for (const prefix of BINARY_CONTENT_PREFIXES) {
    if (ct.startsWith(prefix)) return true
  }
  return false
}

function extractFileName(headers: Record<string, string>, url: string): string {
  // Try Content-Disposition header first
  const contentDisposition = headers['content-disposition']
  if (contentDisposition) {
    // Try filename*= (RFC 5987)
    const utf8Match = contentDisposition.match(/filename\*=(?:UTF-8|utf-8)?''(.+?)(?:;|$)/)
    if (utf8Match) {
      return decodeURIComponent(utf8Match[1])
    }
    // Try filename="..." or filename=...
    const match = contentDisposition.match(/filename="?([^"]+)"?/)
    if (match) {
      return match[1]
    }
  }
  // Fallback: extract from URL
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1]
      if (lastSegment && lastSegment.includes('.')) {
        return decodeURIComponent(lastSegment)
      }
    }
  } catch {
    // Invalid URL
  }
  return 'download'
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

      const response = await axios({
        ...config,
        responseType: 'arraybuffer' // Always get as arraybuffer to handle both text and binary
      })
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

      const contentType = responseHeaders['content-type'] || ''
      const contentDisposition = responseHeaders['content-disposition'] || ''
      const isAttachment = contentDisposition.toLowerCase().includes('attachment')
      const isBinary = isBinaryContentType(contentType)

      // Check if this is a file download response
      if ((isBinary || isAttachment) && response.data) {
        const buffer = Buffer.from(response.data as ArrayBuffer)
        const fileName = extractFileName(responseHeaders, request.url)
        const tempDir = path.join(app.getPath('temp'), 'pingpong-downloads')
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true })
        }
        const tempFilePath = path.join(tempDir, `download-${Date.now()}-${fileName}`)
        fs.writeFileSync(tempFilePath, buffer)

        return {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: `[Binary File: ${fileName}]`,
          time: endTime - startTime,
          isFileDownload: true,
          fileName,
          filePath: tempFilePath,
          fileSize: buffer.length
        }
      }

      // Convert body to string for non-binary responses
      let bodyString: string
      if (typeof response.data === 'object') {
        // Try to decode as text first
        try {
          bodyString = new TextDecoder().decode(response.data as ArrayBuffer)
          // Try to parse as JSON for pretty printing
          try {
            const parsed = JSON.parse(bodyString)
            bodyString = JSON.stringify(parsed, null, 2)
          } catch {
            // Not JSON, keep as-is
          }
        } catch {
          bodyString = String(response.data)
        }
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
