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
    createEnvironment: (name: string) => Promise<number>
    updateEnvironment: (id: number, name: string) => Promise<any>
    deleteEnvironment: (id: number) => Promise<any>
    setActiveEnvironment: (id: number) => Promise<boolean>
    getActiveEnvironment: () => Promise<any>
    getVariables: (environmentId: number) => Promise<any[]>
    saveVariable: (variable: any) => Promise<any>
    deleteVariable: (id: number) => Promise<any>
    getAllVariables: () => Promise<any[]>
    importTestFile: () => Promise<any[] | null>
    exportTestResults: (results: any[]) => Promise<boolean>
  }
}
