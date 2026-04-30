export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'

export type BodyType = 'none' | 'json' | 'form-data' | 'raw' | 'multipart'

export interface KeyValue {
  key: string
  value: string
  enabled: boolean
}

export interface FormField {
  key: string
  value: string
  type: 'text' | 'file'
  enabled: boolean
  fileName?: string
  filePath?: string
  fileSize?: number
}

export interface HttpRequest {
  method: HttpMethod
  url: string
  headers: KeyValue[]
  queryParams: KeyValue[]
  body: string
  bodyType: BodyType
  files?: { key: string; filePath: string; fileName?: string }[]
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

export interface RequestRecord {
  id?: number
  name?: string
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
  created_at?: string
}

export interface Environment {
  id: number
  name: string
  host?: string | null
  is_active: number
  created_at?: string
}

export interface Variable {
  id?: number
  environment_id: number
  key: string
  value: string
}

export interface TestCase {
  method: string
  url: string
  headers?: string
  body?: string
  expected_status?: number
}

export interface TestResult extends TestCase {
  actual_status: number
  response_time: number
  passed: boolean
  error?: string
}

export interface ApiGroup {
  id?: number
  name: string
  parent_id?: number | null
  sort_order?: number
  created_at?: string
}

export interface ApiItem {
  id?: number
  uuid?: string
  group_id?: number | null
  name: string
  method: string
  url: string
  headers?: string
  query_params?: string
  body?: string
  body_type?: string
  form_data?: string
  description?: string
  sort_order?: number
  created_at?: string
  updated_at?: string
}

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

// System Settings Types
export interface SystemSettings {
  requestTimeout: number
  enableHistory: boolean
  defaultHeaders: KeyValue[]
  shortcuts: ShortcutMap
  autoFormatResponse: boolean
}

export interface ShortcutMap {
  sendRequest: string
  saveApi: string
  formatJson: string
  [key: string]: string
}

export interface SettingItem {
  key: string
  value: string
  updated_at?: string
}

// Path parameter type (e.g., :requestId in /api/result/:requestId)
export interface PathParam {
  name: string
  value: string
}

// Request tab type - each tab holds an independent request configuration
export interface RequestTab {
  id: string
  name: string
  method: HttpMethod
  url: string
  headers: KeyValue[]
  queryParams: KeyValue[]
  pathParams: PathParam[]
  body: string
  bodyType: BodyType
  formData: FormField[]
  response: HttpResponse | null
  loading: boolean
  error: string | null
  actualRequest: ActualRequest | null
  currentApiUuid: string
  isRenaming: boolean
}
