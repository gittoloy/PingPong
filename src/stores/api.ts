import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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

export interface TreeNode {
  id: number | string
  label: string
  type: 'group' | 'api'
  data: ApiGroup | ApiItem
  children?: TreeNode[]
  parentId?: number | null
}

export const useApiStore = defineStore('api', () => {
  const groups = ref<ApiGroup[]>([])
  const apis = ref<ApiItem[]>([])
  const loading = ref(false)
  const expandedKeys = ref<(number | string)[]>([])
  const selectedNode = ref<TreeNode | null>(null)

  const treeData = computed(() => {
    const buildTree = (parentId: number | null = null): TreeNode[] => {
      const nodes: TreeNode[] = []
      
      const childGroups = groups.value.filter(g => g.parent_id === parentId)
      for (const group of childGroups) {
        const node: TreeNode = {
          id: `group-${group.id}`,
          label: group.name,
          type: 'group',
          data: group,
          parentId: group.parent_id,
          children: buildTree(group.id!)
        }
        nodes.push(node)
      }
      
      const groupApis = apis.value.filter(a => a.group_id === parentId)
      for (const api of groupApis) {
        nodes.push({
          id: `api-${api.id}`,
          label: api.name,
          type: 'api',
          data: api,
          parentId: api.group_id
        })
      }
      
      return nodes
    }
    
    return buildTree(null)
  })

  async function loadGroups() {
    try {
      groups.value = await window.electronAPI.getApiGroups()
    } catch (err) {
      console.error('Failed to load groups:', err)
    }
  }

  async function loadApis() {
    try {
      apis.value = await window.electronAPI.getApis()
    } catch (err) {
      console.error('Failed to load apis:', err)
    }
  }

  async function loadAll() {
    loading.value = true
    try {
      await Promise.all([loadGroups(), loadApis()])
    } finally {
      loading.value = false
    }
  }

  async function createGroup(name: string, parentId: number | null = null) {
    try {
      const id = await window.electronAPI.createApiGroup(name, parentId)
      await loadGroups()
      return id
    } catch (err) {
      console.error('Failed to create group:', err)
      throw err
    }
  }

  async function updateGroup(id: number, name: string) {
    try {
      await window.electronAPI.updateApiGroup(id, name)
      await loadGroups()
    } catch (err) {
      console.error('Failed to update group:', err)
      throw err
    }
  }

  async function deleteGroup(id: number) {
    try {
      await window.electronAPI.deleteApiGroup(id)
      await loadGroups()
      await loadApis()
    } catch (err) {
      console.error('Failed to delete group:', err)
      throw err
    }
  }

  async function createApi(api: ApiItem) {
    try {
      const id = await window.electronAPI.createApi(api)
      await loadApis()
      return id
    } catch (err) {
      console.error('Failed to create api:', err)
      throw err
    }
  }

  async function updateApi(api: ApiItem) {
    try {
      await window.electronAPI.updateApi(api)
      await loadApis()
    } catch (err) {
      console.error('Failed to update api:', err)
      throw err
    }
  }

  async function deleteApi(id: number) {
    try {
      await window.electronAPI.deleteApi(id)
      await loadApis()
    } catch (err) {
      console.error('Failed to delete api:', err)
      throw err
    }
  }

  function toggleExpand(key: number | string) {
    const index = expandedKeys.value.indexOf(key)
    if (index > -1) {
      expandedKeys.value.splice(index, 1)
    } else {
      expandedKeys.value.push(key)
    }
  }

  function selectNode(node: TreeNode | null) {
    selectedNode.value = node
  }

  return {
    groups,
    apis,
    loading,
    treeData,
    expandedKeys,
    selectedNode,
    loadGroups,
    loadApis,
    loadAll,
    createGroup,
    updateGroup,
    deleteGroup,
    createApi,
    updateApi,
    deleteApi,
    toggleExpand,
    selectNode
  }
})
