<template>
  <el-dialog
    :model-value="visible"
    :title="group?.id ? '编辑分组' : '新增分组'"
    width="450px"
    @update:model-value="$emit('update:visible', $event)"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="分组名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入分组名称" />
      </el-form-item>
      
      <el-form-item label="所属分组">
        <el-tree-select
          v-model="form.parent_id"
          :data="groupTreeData"
          :props="treeSelectProps"
          placeholder="选择父分组（可选）"
          clearable
          check-strictly
          :render-after-expand="false"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useApiStore, type ApiGroup } from '@/stores/api'

const props = defineProps<{
  visible: boolean
  group: ApiGroup | null
  parentId?: number | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [group: ApiGroup]
}>()

const apiStore = useApiStore()

const formRef = ref<FormInstance>()
const form = ref<ApiGroup>({
  name: '',
  parent_id: null
})

const treeSelectProps = {
  value: 'id',
  label: 'name',
  children: 'children'
}

const rules: FormRules = {
  name: [
    { required: true, message: '请输入分组名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
  ]
}

interface GroupTreeNode {
  id: number
  name: string
  children?: GroupTreeNode[]
}

function buildGroupTree(parentId: number | null = null, excludeId?: number): GroupTreeNode[] {
  const nodes: GroupTreeNode[] = []
  const childGroups = apiStore.groups.filter(g => g.parent_id === parentId)
  
  for (const group of childGroups) {
    if (group.id === excludeId) continue
    const node: GroupTreeNode = {
      id: group.id!,
      name: group.name,
      children: buildGroupTree(group.id!, excludeId)
    }
    nodes.push(node)
  }
  
  return nodes
}

const groupTreeData = computed(() => {
  return buildGroupTree(null, props.group?.id)
})

watch(() => props.visible, async (val) => {
  if (val) {
    await apiStore.loadGroups()
    if (props.group) {
      form.value = { ...props.group }
    } else {
      form.value = {
        name: '',
        parent_id: props.parentId ?? null
      }
    }
  }
})

const handleClose = () => {
  formRef.value?.resetFields()
}

const handleSave = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate((valid) => {
    if (valid) {
      emit('save', { ...form.value })
    }
  })
}
</script>
