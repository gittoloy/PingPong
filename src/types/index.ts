export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'

export type BodyType = 'none' | 'json' | 'form-data' | 'raw'

export interface KeyValue {
  key: string
  value: string
  enabled: boolean
}

export interface HttpRequest {
  method: HttpMethod
  url: string
  headers: KeyValue[]
  queryParams: KeyValue[]
  body: string
  bodyType: BodyType
}

export interface HttpResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  time: number
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
  group_id?: number | null
  name: string
  method: string
  url: string
  headers?: string
  query_params?: string
  body?: string
  body_type?: string
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
