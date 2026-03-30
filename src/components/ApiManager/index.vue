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
        @node-click="handleNodeClick"
        @node-expand="handleNodeExpand"
        @node-collapse="handleNodeCollapse"
      >
        <template #default="{ node, data }">
          <div class="tree-node">
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
</style>
