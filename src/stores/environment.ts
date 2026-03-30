import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Environment, Variable } from '@/types'

export const useEnvironmentStore = defineStore('environment', () => {
  const environments = ref<Environment[]>([])
  const activeEnvironment = ref<Environment | null>(null)
  const variables = ref<Variable[]>([])
  
  const variablesMap = computed(() => {
    const map: Record<string, string> = {}
    variables.value.forEach(v => {
      map[v.key] = v.value
    })
    return map
  })
  
  const activeHost = computed(() => {
    return activeEnvironment.value?.host || ''
  })
  
  async function loadEnvironments() {
    try {
      environments.value = await window.electronAPI.getEnvironments()
      const active = await window.electronAPI.getActiveEnvironment()
      if (active) {
        activeEnvironment.value = active
        await loadVariables(active.id)
      }
    } catch (err) {
      console.error('Failed to load environments:', err)
    }
  }
  
  async function createEnvironment(name: string, host: string | null = null) {
    try {
      await window.electronAPI.createEnvironment(name, host)
      await loadEnvironments()
    } catch (err) {
      console.error('Failed to create environment:', err)
      throw err
    }
  }
  
  async function updateEnvironment(id: number, name: string, host: string | null = null) {
    try {
      await window.electronAPI.updateEnvironment(id, name, host)
      await loadEnvironments()
    } catch (err) {
      console.error('Failed to update environment:', err)
      throw err
    }
  }
  
  async function deleteEnvironment(id: number) {
    try {
      await window.electronAPI.deleteEnvironment(id)
      await loadEnvironments()
    } catch (err) {
      console.error('Failed to delete environment:', err)
      throw err
    }
  }
  
  async function setActiveEnvironment(id: number) {
    try {
      await window.electronAPI.setActiveEnvironment(id)
      const env = environments.value.find(e => e.id === id)
      if (env) {
        activeEnvironment.value = env
        await loadVariables(id)
      }
    } catch (err) {
      console.error('Failed to set active environment:', err)
      throw err
    }
  }
  
  async function loadVariables(environmentId: number) {
    try {
      variables.value = await window.electronAPI.getVariables(environmentId)
    } catch (err) {
      console.error('Failed to load variables:', err)
    }
  }
  
  async function saveVariable(variable: Variable) {
    try {
      await window.electronAPI.saveVariable(variable)
      if (activeEnvironment.value) {
        await loadVariables(activeEnvironment.value.id)
      }
    } catch (err) {
      console.error('Failed to save variable:', err)
      throw err
    }
  }
  
  async function deleteVariable(id: number) {
    try {
      await window.electronAPI.deleteVariable(id)
      if (activeEnvironment.value) {
        await loadVariables(activeEnvironment.value.id)
      }
    } catch (err) {
      console.error('Failed to delete variable:', err)
      throw err
    }
  }
  
  function replaceVariables(text: string): string {
    if (!text) return text
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variablesMap.value[key] !== undefined ? variablesMap.value[key] : match
    })
  }
  
  function getFullUrl(path: string): string {
    if (!path) return path
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return replaceVariables(path)
    }
    const host = activeHost.value
    if (host) {
      const cleanHost = host.replace(/\/$/, '')
      const cleanPath = path.startsWith('/') ? path : '/' + path
      return replaceVariables(cleanHost + cleanPath)
    }
    return replaceVariables(path)
  }
  
  return {
    environments,
    activeEnvironment,
    variables,
    variablesMap,
    activeHost,
    loadEnvironments,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setActiveEnvironment,
    loadVariables,
    saveVariable,
    deleteVariable,
    replaceVariables,
    getFullUrl
  }
})
