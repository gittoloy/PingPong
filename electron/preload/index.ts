import { contextBridge, ipcRenderer } from 'electron'

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

export interface FileSelectResult {
  filePath: string
  fileName: string
  fileSize: number
}

export interface ElectronAPI {
  sendRequest: (request: any) => Promise<any>
  
  getRequests: (limit?: number, offset?: number) => Promise<any[]>
  searchRequests: (keyword: string) => Promise<any[]>
  saveRequest: (request: any) => Promise<number>
  deleteRequest: (id: number) => Promise<any>
  clearRequests: () => Promise<any>
  
  getEnvironments: () => Promise<any[]>
  createEnvironment: (name: string, host?: string | null) => Promise<number>
  updateEnvironment: (id: number, name: string, host?: string | null) => Promise<any>
  deleteEnvironment: (id: number) => Promise<any>
  setActiveEnvironment: (id: number) => Promise<boolean>
  getActiveEnvironment: () => Promise<any>
  reorderEnvironments: (orders: { id: number; sort_order: number }[]) => Promise<boolean>
  
  getVariables: (environmentId: number) => Promise<any[]>
  saveVariable: (variable: any) => Promise<any>
  deleteVariable: (id: number) => Promise<any>
  getAllVariables: () => Promise<any[]>
  
  importTestFile: () => Promise<any[] | null>
  exportTestResults: (results: any[]) => Promise<boolean>
  
  getApiGroups: () => Promise<ApiGroup[]>
  createApiGroup: (name: string, parentId?: number | null) => Promise<number>
  updateApiGroup: (id: number, name: string) => Promise<boolean>
  deleteApiGroup: (id: number) => Promise<boolean>
  getApiGroupChildren: (parentId: number | null) => Promise<ApiGroup[]>
  
  getApis: () => Promise<ApiItem[]>
  getApisByGroup: (groupId: number | null) => Promise<ApiItem[]>
  getApi: (id: number) => Promise<ApiItem | null>
  getApiByUuid: (uuid: string) => Promise<ApiItem | null>
  createApi: (api: ApiItem) => Promise<number>
  updateApi: (api: ApiItem) => Promise<boolean>
  deleteApi: (id: number) => Promise<boolean>
  
  reorderApiGroups: (orders: { id: number; sort_order: number; parent_id: number | null }[]) => Promise<boolean>
  reorderApis: (orders: { id: number; sort_order: number; group_id: number | null }[]) => Promise<boolean>
  
  // Settings
  getSetting: (key: string) => Promise<string | null>
  getAllSettings: () => Promise<Record<string, string>>
  setSetting: (key: string, value: string) => Promise<boolean>
  resetSettings: () => Promise<boolean>

  // File operations
  selectFiles: () => Promise<FileSelectResult[]>
}

const api: ElectronAPI = {
  sendRequest: (request) => ipcRenderer.invoke('http:send', request),
  
  getRequests: (limit, offset) => ipcRenderer.invoke('db:request:list', limit, offset),
  searchRequests: (keyword) => ipcRenderer.invoke('db:request:search', keyword),
  saveRequest: (request) => ipcRenderer.invoke('db:request:save', request),
  deleteRequest: (id) => ipcRenderer.invoke('db:request:delete', id),
  clearRequests: () => ipcRenderer.invoke('db:request:clear'),
  
  getEnvironments: () => ipcRenderer.invoke('env:list'),
  createEnvironment: (name, host) => ipcRenderer.invoke('env:create', name, host),
  updateEnvironment: (id, name, host) => ipcRenderer.invoke('env:update', id, name, host),
  deleteEnvironment: (id) => ipcRenderer.invoke('env:delete', id),
  setActiveEnvironment: (id) => ipcRenderer.invoke('env:setActive', id),
  getActiveEnvironment: () => ipcRenderer.invoke('env:getActive'),
  reorderEnvironments: (orders) => ipcRenderer.invoke('env:reorder', orders),
  
  getVariables: (environmentId) => ipcRenderer.invoke('var:list', environmentId),
  saveVariable: (variable) => ipcRenderer.invoke('var:save', variable),
  deleteVariable: (id) => ipcRenderer.invoke('var:delete', id),
  getAllVariables: () => ipcRenderer.invoke('var:getAll'),
  
  importTestFile: () => ipcRenderer.invoke('file:import'),
  exportTestResults: (results) => ipcRenderer.invoke('file:export', results),
  
  getApiGroups: () => ipcRenderer.invoke('apiGroup:list'),
  createApiGroup: (name, parentId) => ipcRenderer.invoke('apiGroup:create', name, parentId),
  updateApiGroup: (id, name) => ipcRenderer.invoke('apiGroup:update', id, name),
  deleteApiGroup: (id) => ipcRenderer.invoke('apiGroup:delete', id),
  getApiGroupChildren: (parentId) => ipcRenderer.invoke('apiGroup:getChildren', parentId),
  
  getApis: () => ipcRenderer.invoke('api:list'),
  getApisByGroup: (groupId) => ipcRenderer.invoke('api:listByGroup', groupId),
  getApi: (id) => ipcRenderer.invoke('api:get', id),
  getApiByUuid: (uuid) => ipcRenderer.invoke('api:getByUuid', uuid),
  createApi: (api) => ipcRenderer.invoke('api:create', api),
  updateApi: (api) => ipcRenderer.invoke('api:update', api),
  deleteApi: (id) => ipcRenderer.invoke('api:delete', id),
  
  reorderApiGroups: (orders) => ipcRenderer.invoke('apiGroup:reorder', orders),
  reorderApis: (orders) => ipcRenderer.invoke('api:reorder', orders),
  
  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),

  // File operations
  selectFiles: () => ipcRenderer.invoke('file:selectFiles')
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
