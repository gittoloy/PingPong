<template>
  <div class="api-manager">
    <div class="api-manager-header">
      <span class="title">API管理</span>
      <div class="header-actions">
        <el-dropdown trigger="click" @command="handleAddCommand">
          <el-button type="primary" size="small">
            <el-icon><Plus /></el-icon>
            Add
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="group">
                <el-icon><FolderAdd /></el-icon>
                新增分组
              </el-dropdown-item>
              <el-dropdown-item command="api" :disabled="!selectedGroupId">
                <el-icon><DocumentAdd /></el-icon>
                新增API
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    
    <div class="api-tree-container">
      <el-tree
        ref="treeRef"
        :data="apiStore.treeData"
        :props="treeProps"
        node-key="id"
        :expand-on-click-node="false"
        :default-expanded-keys="apiStore.expandedKeys"
        draggable
        :allow-drop="allowDrop"
        :allow-drag="allowDrag"
        @node-click="handleNodeClick"
        @node-expand="handleNodeExpand"
        @node-collapse="handleNodeCollapse"
        @node-drag-end="handleDragEnd"
      >
        <template #default="{ node, data }">
          <div 
            class="tree-node" 
            :class="{ 
              'is-dragging': draggingNodeId === data.id,
              'is-selected': data.type === 'api' && apiStore.selectedApiUuid === (data.data as ApiItem).uuid
            }"
          >
            <div class="node-content">
              <el-icon v-if="data.type === 'group'" class="node-icon folder">
                <Folder />
              </el-icon>
              <template v-else>
                <span :class="['method-tag', 'method-' + (data.data as ApiItem).method]">
                  {{ (data.data as ApiItem).method }}
                </span>
              </template>
              <span class="node-label">{{ node.label }}</span>
            </div>
            <div class="node-actions" @click.stop>
              <el-dropdown trigger="click" @command="(cmd: string) => handleNodeCommand(cmd, data)">
                <el-button text size="small">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <template v-if="data.type === 'group'">
                      <el-dropdown-item command="addGroup">
                        <el-icon><FolderAdd /></el-icon>
                        新增子分组
                      </el-dropdown-item>
                      <el-dropdown-item command="addApi">
                        <el-icon><DocumentAdd /></el-icon>
                        新增API
                      </el-dropdown-item>
                      <el-dropdown-item command="editGroup" divided>
                        <el-icon><Edit /></el-icon>
                        编辑分组
                      </el-dropdown-item>
                      <el-dropdown-item command="deleteGroup">
                        <el-icon><Delete /></el-icon>
                        删除分组
                      </el-dropdown-item>
                    </template>
                    <template v-else>
                      <el-dropdown-item command="editApi">
                        <el-icon><Edit /></el-icon>
                        编辑API
                      </el-dropdown-item>
                      <el-dropdown-item command="deleteApi">
                        <el-icon><Delete /></el-icon>
                        删除API
                      </el-dropdown-item>
                    </template>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </template>
      </el-tree>
      
      <div v-if="apiStore.treeData.length === 0" class="empty-state">
        <el-icon :size="32"><FolderOpened /></el-icon>
        <p>暂无API，点击上方按钮新增</p>
      </div>
    </div>
    
    <GroupEditDialog
      v-model:visible="showGroupDialog"
      :group="editingGroup"
      :parent-id="selectedGroupId"
      @save="handleGroupSave"
    />
    
    <ApiEditDialog
      v-model:visible="showApiDialog"
      :api="editingApi"
      :group-id="selectedGroupId"
      @save="handleApiSave"
      @use="handleApiUse"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, FolderAdd, DocumentAdd, Folder, FolderOpened, Edit, Delete, MoreFilled } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import type Node from 'element-plus/es/components/tree/src/model/node'
import type { DropType } from 'element-plus/es/components/tree/src/tree.type'
import { useApiStore, type ApiGroup, type ApiItem, type TreeNode } from '@/stores/api'
import GroupEditDialog from './GroupEditDialog.vue'
import ApiEditDialog from './ApiEditDialog.vue'

const emit = defineEmits<{
  'api-selected': [api: ApiItem]
}>()

const apiStore = useApiStore()

const treeRef = ref()
const treeProps = {
  children: 'children',
  label: 'label'
}

const showGroupDialog = ref(false)
const showApiDialog = ref(false)
const editingGroup = ref<ApiGroup | null>(null)
const editingApi = ref<ApiItem | null>(null)
const selectedGroupId = ref<number | null>(null)
const draggingNodeId = ref<number | string | null>(null)

onMounted(async () => {
  await apiStore.loadAll()
})

const handleAddCommand = (command: string) => {
  if (command === 'group') {
    editingGroup.value = null
    showGroupDialog.value = true
  } else if (command === 'api') {
    editingApi.value = null
    showApiDialog.value = true
  }
}

const handleNodeClick = (data: TreeNode) => {
  apiStore.selectNode(data)
  if (data.type === 'api') {
    selectedGroupId.value = data.parentId ?? null
    emit('api-selected', data.data as ApiItem)
  } else {
    selectedGroupId.value = data.id.toString().replace('group-', '') as unknown as number
  }
}

const handleNodeExpand = (data: TreeNode) => {
  apiStore.toggleExpand(data.id)
}

const handleNodeCollapse = (data: TreeNode) => {
  apiStore.toggleExpand(data.id)
}

const handleNodeCommand = (command: string, data: TreeNode) => {
  const id = Number(data.id.toString().replace(/^(group|api)-/, ''))
  
  switch (command) {
    case 'addGroup':
      editingGroup.value = null
      selectedGroupId.value = id
      showGroupDialog.value = true
      break
    case 'addApi':
      editingApi.value = null
      selectedGroupId.value = id
      showApiDialog.value = true
      break
    case 'editGroup':
      editingGroup.value = data.data as ApiGroup
      showGroupDialog.value = true
      break
    case 'deleteGroup':
      confirmDeleteGroup(id)
      break
    case 'editApi':
      editingApi.value = data.data as ApiItem
      showApiDialog.value = true
      break
    case 'deleteApi':
      confirmDeleteApi(id)
      break
  }
}

const confirmDeleteGroup = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      '删除分组将同时删除该分组下的所有子分组和API，确定要删除吗？',
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await apiStore.deleteGroup(id)
    ElMessage.success('删除成功')
  } catch {
    // 用户取消
  }
}

const confirmDeleteApi = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除此API吗？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await apiStore.deleteApi(id)
    ElMessage.success('删除成功')
  } catch {
    // 用户取消
  }
}

const handleGroupSave = async (group: ApiGroup) => {
  try {
    if (group.id) {
      await apiStore.updateGroup(group.id, group.name)
      ElMessage.success('更新成功')
    } else {
      await apiStore.createGroup(group.name, group.parent_id ?? null)
      ElMessage.success('创建成功')
    }
    showGroupDialog.value = false
  } catch (err: any) {
    ElMessage.error(err.message || '操作失败')
  }
}

const handleApiSave = async (api: ApiItem) => {
  try {
    if (api.id) {
      await apiStore.updateApi(api)
      ElMessage.success('更新成功')
    } else {
      await apiStore.createApi(api)
      ElMessage.success('创建成功')
    }
    showApiDialog.value = false
  } catch (err: any) {
    ElMessage.error(err.message || '操作失败')
  }
}

const handleApiUse = (api: ApiItem) => {
  emit('api-selected', api)
  showApiDialog.value = false
  ElMessage.success('已加载API配置')
}

// Note: api-selected event emits the full ApiItem object which now includes form_data

const allowDrag = (draggingNode: Node) => {
  return true
}

const allowDrop = (draggingNode: Node, dropNode: Node, type: DropType) => {
  const draggingData = draggingNode.data as TreeNode
  const dropData = dropNode.data as TreeNode
  
  if (draggingData.type === 'group') {
    if (dropData.type === 'api') {
      return false
    }
    if (type === 'inner') {
      return true
    }
    return true
  } else {
    if (type === 'inner') {
      return dropData.type === 'group'
    }
    return true
  }
}

const handleDragEnd = async (
  draggingNode: Node,
  dropNode: Node,
  dropType: DropType,
  ev: DragEvents
) => {
  const draggingData = draggingNode.data as TreeNode
  const dropData = dropNode.data as TreeNode
  
  if (dropType === 'none') return
  
  if (draggingData.type === 'group') {
    await handleGroupDragEnd(draggingNode, dropNode, dropType)
  } else {
    await handleApiDragEnd(draggingNode, dropNode, dropType)
  }
}

const isDescendant = (draggingId: number, targetParentId: number | null): boolean => {
  if (targetParentId === null) return false
  if (draggingId === targetParentId) return true
  
  const targetGroup = apiStore.groups.find(g => g.id === targetParentId)
  if (targetGroup && targetGroup.parent_id) {
    return isDescendant(draggingId, targetGroup.parent_id)
  }
  return false
}

const handleGroupDragEnd = async (
  draggingNode: Node,
  dropNode: Node,
  dropType: DropType
) => {
  const draggingData = draggingNode.data as TreeNode
  const dropData = dropNode.data as TreeNode
  const draggingId = Number(draggingData.id.toString().replace('group-', ''))
  
  let newParentId: number | null = null
  
  if (dropType === 'inner') {
    newParentId = Number(dropData.id.toString().replace('group-', ''))
  } else {
    newParentId = dropData.parentId ?? null
  }
  
  if (isDescendant(draggingId, newParentId)) {
    ElMessage.warning('不能将分组移动到其子分组内')
    return
  }
  
  const draggingGroup = apiStore.groups.find(g => g.id === draggingId)
  if (!draggingGroup) {
    ElMessage.error('找不到拖拽的分组')
    return
  }
  
  const orders: { id: number; sort_order: number; parent_id: number | null }[] = []
  
  const groupsByParent = new Map<number | null, typeof apiStore.groups>()
  apiStore.groups.forEach(g => {
    const pid = g.parent_id ?? null
    if (!groupsByParent.has(pid)) {
      groupsByParent.set(pid, [])
    }
    groupsByParent.get(pid)!.push({ ...g })
  })
  
  if (!groupsByParent.has(newParentId)) {
    groupsByParent.set(newParentId, [])
  }
  
  let targetList = groupsByParent.get(newParentId)!
  
  const oldParentId = draggingGroup.parent_id ?? null
  if (oldParentId !== newParentId) {
    const oldList = groupsByParent.get(oldParentId)
    if (oldList) {
      const idx = oldList.findIndex(g => g.id === draggingId)
      if (idx > -1) {
        oldList.splice(idx, 1)
      }
    }
  } else {
    const idx = targetList.findIndex(g => g.id === draggingId)
    if (idx > -1) {
      targetList.splice(idx, 1)
    }
  }
  
  targetList = targetList.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  
  let dropIndex = -1
  if (dropType !== 'inner') {
    const dropGroupId = Number(dropData.id.toString().replace('group-', ''))
    dropIndex = targetList.findIndex(g => g.id === dropGroupId)
  }
  
  const updatedDraggingGroup = { ...draggingGroup, parent_id: newParentId }
  
  if (dropType === 'inner') {
    targetList.push(updatedDraggingGroup)
  } else if (dropIndex > -1) {
    const insertIndex = dropType === 'before' ? dropIndex : dropIndex + 1
    targetList.splice(insertIndex, 0, updatedDraggingGroup)
  } else {
    targetList.push(updatedDraggingGroup)
  }
  
  groupsByParent.forEach((groupList, parentId) => {
    groupList.forEach((group, index) => {
      orders.push({
        id: group.id!,
        sort_order: index,
        parent_id: parentId
      })
    })
  })
  
  if (orders.length === 0) {
    return
  }
  
  try {
    await apiStore.reorderGroups(orders)
    ElMessage.success('排序已保存')
  } catch (err: any) {
    console.error('Reorder groups error:', err)
    ElMessage.error('保存排序失败: ' + (err.message || '未知错误'))
    await apiStore.loadGroups()
  }
}

const handleApiDragEnd = async (
  draggingNode: Node,
  dropNode: Node,
  dropType: DropType
) => {
  const draggingData = draggingNode.data as TreeNode
  const dropData = dropNode.data as TreeNode
  const draggingId = Number(draggingData.id.toString().replace('api-', ''))
  
  let newGroupId: number | null = null
  
  if (dropType === 'inner') {
    newGroupId = Number(dropData.id.toString().replace('group-', ''))
  } else if (dropData.type === 'group') {
    if (dropType === 'after') {
      newGroupId = Number(dropData.id.toString().replace('group-', ''))
    } else {
      newGroupId = dropData.parentId ?? null
    }
  } else {
    newGroupId = dropData.parentId ?? null
  }
  
  const draggingApi = apiStore.apis.find(a => a.id === draggingId)
  if (!draggingApi) {
    ElMessage.error('找不到拖拽的API')
    return
  }
  
  const orders: { id: number; sort_order: number; group_id: number | null }[] = []
  
  const apisByGroup = new Map<number | null, typeof apiStore.apis>()
  apiStore.apis.forEach(a => {
    const gid = a.group_id ?? null
    if (!apisByGroup.has(gid)) {
      apisByGroup.set(gid, [])
    }
    apisByGroup.get(gid)!.push({ ...a })
  })
  
  if (!apisByGroup.has(newGroupId)) {
    apisByGroup.set(newGroupId, [])
  }
  
  let targetList = apisByGroup.get(newGroupId)!
  
  const oldGroupId = draggingApi.group_id ?? null
  if (oldGroupId !== newGroupId) {
    const oldList = apisByGroup.get(oldGroupId)
    if (oldList) {
      const idx = oldList.findIndex(a => a.id === draggingId)
      if (idx > -1) {
        oldList.splice(idx, 1)
      }
    }
  } else {
    const idx = targetList.findIndex(a => a.id === draggingId)
    if (idx > -1) {
      targetList.splice(idx, 1)
    }
  }
  
  targetList = targetList.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  
  let dropIndex = -1
  if (dropData.type === 'api' && dropType !== 'inner') {
    const dropApiId = Number(dropData.id.toString().replace('api-', ''))
    dropIndex = targetList.findIndex(a => a.id === dropApiId)
  }
  
  const updatedDraggingApi = { ...draggingApi, group_id: newGroupId }
  
  if (dropType === 'inner') {
    targetList.push(updatedDraggingApi)
  } else if (dropIndex > -1) {
    const insertIndex = dropType === 'before' ? dropIndex : dropIndex + 1
    targetList.splice(insertIndex, 0, updatedDraggingApi)
  } else {
    targetList.push(updatedDraggingApi)
  }
  
  apisByGroup.forEach((apiList, groupId) => {
    apiList.forEach((api, index) => {
      orders.push({
        id: api.id!,
        sort_order: index,
        group_id: groupId
      })
    })
  })
  
  if (orders.length === 0) {
    return
  }
  
  try {
    await apiStore.reorderApis(orders)
    ElMessage.success('排序已保存')
  } catch (err: any) {
    console.error('Reorder apis error:', err)
    ElMessage.error('保存排序失败: ' + (err.message || '未知错误'))
    await apiStore.loadApis()
  }
}

interface DragEvents {
  dragend: (event: DragEvent) => void
  dragenter: (event: DragEvent) => void
  dragleave: (event: DragEvent) => void
  dragover: (event: DragEvent) => void
  dragstart: (event: DragEvent) => void
  drop: (event: DragEvent) => void
}
</script>

<style scoped>
.api-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.api-manager-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-weight: 600;
  font-size: 14px;
}

.api-tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px;
  transition: background-color 0.2s, transform 0.2s;
  border-radius: 4px;
}

.tree-node.is-dragging {
  opacity: 0.5;
  background-color: var(--el-color-primary-light-9);
}

.tree-node.is-selected {
  background-color: var(--el-color-primary-light-8);
  border-left: 3px solid var(--el-color-primary);
  margin-left: -3px;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-icon {
  font-size: 16px;
}

.node-icon.folder {
  color: #e6a23c;
}

.node-label {
  font-size: 13px;
}

.method-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 2px;
  text-transform: uppercase;
}

.method-GET { background: #e1f3d8; color: #67c23a; }
.method-POST { background: #fdf6ec; color: #e6a23c; }
.method-PUT { background: #d9ecff; color: #409eff; }
.method-PATCH { background: #e9e9eb; color: #909399; }
.method-DELETE { background: #fef0f0; color: #f56c6c; }

.node-actions {
  visibility: hidden;
}

.tree-node:hover .node-actions {
  visibility: visible;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.empty-state p {
  margin-top: 12px;
  font-size: 13px;
}

:deep(.el-tree-node__content) {
  height: 32px;
  padding: 0 8px;
}

:deep(.el-tree-node__content:hover) {
  background-color: var(--el-fill-color-light);
}

:deep(.el-tree-node.is-drop-inner > .el-tree-node__content) {
  background-color: var(--el-color-primary-light-9);
  border: 1px dashed var(--el-color-primary);
}

:deep(.el-tree-node.is-dragging) {
  opacity: 0.5;
}

:deep(.el-tree__drop-indicator) {
  height: 2px;
  background-color: var(--el-color-primary);
}
</style>
