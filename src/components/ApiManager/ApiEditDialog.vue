<template>
  <el-dialog
    :model-value="visible"
    :title="api?.id ? '编辑API' : '新增API'"
    width="650px"
    @update:model-value="$emit('update:visible', $event)"
    @close="handleClose"
    @keydown.enter="handleSave"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="API名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入API名称" />
      </el-form-item>
      
      <el-form-item label="请求方法" prop="method">
        <el-select v-model="form.method" style="width: 120px;">
          <el-option v-for="m in methods" :key="m" :label="m" :value="m" />
        </el-select>
      </el-form-item>
      
      <el-form-item label="请求URL" prop="url">
        <el-input v-model="form.url" placeholder="请输入请求URL" />
      </el-form-item>
      
      <el-form-item label="请求头">
        <HeaderEditor
          v-model="headersData"
          @add="addHeader"
          @remove="removeHeader"
        />
      </el-form-item>
      
      <el-form-item label="查询参数">
        <KeyValueEditor
          v-model="queryParamsData"
          @add="addQueryParam"
          @remove="removeQueryParam"
        />
      </el-form-item>
      
      <el-form-item label="请求体类型">
        <el-radio-group v-model="form.body_type" size="small">
          <el-radio-button label="none">None</el-radio-button>
          <el-radio-button label="json">JSON</el-radio-button>
          <el-radio-button label="form-data">Form Data</el-radio-button>
          <el-radio-button label="multipart">Multipart</el-radio-button>
          <el-radio-button label="raw">Raw</el-radio-button>
        </el-radio-group>
      </el-form-item>
      
      <el-form-item v-if="form.body_type !== 'none'" label="请求体">
        <el-input
          v-model="form.body"
          type="textarea"
          :rows="6"
          placeholder="请输入请求体内容"
        />
      </el-form-item>
      
      <el-form-item label="描述">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="2"
          placeholder="请输入API描述（可选）"
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button v-if="api?.id" type="success" @click="handleUse">使用</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import KeyValueEditor from '@/components/RequestBuilder/KeyValueEditor.vue'
import HeaderEditor from '@/components/RequestBuilder/HeaderEditor.vue'
import type { ApiItem } from '@/stores/api'
import type { KeyValue, HttpMethod, BodyType } from '@/types'

const props = defineProps<{
  visible: boolean
  api: ApiItem | null
  groupId?: number | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [api: ApiItem]
  use: [api: ApiItem]
}>()

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']

const formRef = ref<FormInstance>()
const form = ref<ApiItem>({
  name: '',
  method: 'GET',
  url: '',
  headers: '',
  query_params: '',
  body: '',
  body_type: 'none',
  description: '',
  group_id: null
})

const headersData = ref<KeyValue[]>([{ key: '', value: '', enabled: true }])
const queryParamsData = ref<KeyValue[]>([{ key: '', value: '', enabled: true }])

const rules: FormRules = {
  name: [
    { required: true, message: '请输入API名称', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  method: [
    { required: true, message: '请选择请求方法', trigger: 'change' }
  ],
  url: [
    { required: true, message: '请输入请求URL', trigger: 'blur' }
  ]
}

watch(() => props.visible, (val) => {
  if (val) {
    if (props.api) {
      form.value = { ...props.api }
      
      if (props.api.headers) {
        try {
          const parsed = JSON.parse(props.api.headers)
          headersData.value = parsed.length > 0 ? parsed : [{ key: '', value: '', enabled: true }]
        } catch {
          headersData.value = [{ key: '', value: '', enabled: true }]
        }
      }
      
      if (props.api.query_params) {
        try {
          const parsed = JSON.parse(props.api.query_params)
          queryParamsData.value = parsed.length > 0 ? parsed : [{ key: '', value: '', enabled: true }]
        } catch {
          queryParamsData.value = [{ key: '', value: '', enabled: true }]
        }
      }
    } else {
      form.value = {
        name: '',
        method: 'GET',
        url: '',
        headers: '',
        query_params: '',
        body: '',
        body_type: 'none',
        description: '',
        group_id: props.groupId ?? null
      }
      headersData.value = [{ key: '', value: '', enabled: true }]
      queryParamsData.value = [{ key: '', value: '', enabled: true }]
    }
  }
})

const handleClose = () => {
  formRef.value?.resetFields()
}

const addHeader = () => {
  headersData.value.push({ key: '', value: '', enabled: true })
}

const removeHeader = (index: number) => {
  headersData.value.splice(index, 1)
  if (headersData.value.length === 0) {
    headersData.value.push({ key: '', value: '', enabled: true })
  }
}

const addQueryParam = () => {
  queryParamsData.value.push({ key: '', value: '', enabled: true })
}

const removeQueryParam = (index: number) => {
  queryParamsData.value.splice(index, 1)
  if (queryParamsData.value.length === 0) {
    queryParamsData.value.push({ key: '', value: '', enabled: true })
  }
}

const handleSave = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate((valid) => {
    if (valid) {
      const api: ApiItem = {
        ...form.value,
        headers: JSON.stringify(headersData.value.filter(h => h.enabled && h.key)),
        query_params: JSON.stringify(queryParamsData.value.filter(p => p.enabled && p.key))
      }
      emit('save', api)
    }
  })
}

const handleUse = () => {
  const api: ApiItem = {
    ...form.value,
    headers: JSON.stringify(headersData.value.filter(h => h.enabled && h.key)),
    query_params: JSON.stringify(queryParamsData.value.filter(p => p.enabled && p.key))
  }
  emit('use', api)
}
</script>
