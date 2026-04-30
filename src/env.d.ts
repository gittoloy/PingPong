/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  electronAPI: {
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
    getApiGroups: () => Promise<any[]>
    createApiGroup: (name: string, parentId?: number | null) => Promise<number>
    updateApiGroup: (id: number, name: string) => Promise<boolean>
    deleteApiGroup: (id: number) => Promise<boolean>
    getApiGroupChildren: (parentId: number | null) => Promise<any[]>
    getApis: () => Promise<any[]>
    getApisByGroup: (groupId: number | null) => Promise<any[]>
    getApi: (id: number) => Promise<any>
    getApiByUuid: (uuid: string) => Promise<any>
    createApi: (api: any) => Promise<number>
    updateApi: (api: any) => Promise<boolean>
    deleteApi: (id: number) => Promise<boolean>
    reorderApiGroups: (orders: { id: number; sort_order: number; parent_id: number | null }[]) => Promise<boolean>
    reorderApis: (orders: { id: number; sort_order: number; group_id: number | null }[]) => Promise<boolean>
    getSetting: (key: string) => Promise<string | null>
    getAllSettings: () => Promise<Record<string, string>>
    setSetting: (key: string, value: string) => Promise<boolean>
    resetSettings: () => Promise<boolean>
    selectFiles: () => Promise<{ filePath: string; fileName: string; fileSize: number }[]>
    saveFileAs: (sourceFilePath: string, defaultFileName: string) => Promise<{ success: boolean; filePath?: string; message?: string }>
  }
}
