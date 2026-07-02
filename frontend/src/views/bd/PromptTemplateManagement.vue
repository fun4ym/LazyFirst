<template>
  <div class="prompt-template-management-page">
    <div class="page-header">
      <h2>{{ $t('ai_maker.prompt_template_management') }}</h2>
      <el-button type="primary" @click="showCreateDialog">{{ $t('common.create') }}</el-button>
    </div>

    <!-- 模板列表 -->
    <el-card class="template-list-card">
      <el-table :data="templates" style="width: 100%">
        <el-table-column prop="name" :label="$t('ai_maker.template_name')" />
        <el-table-column :label="$t('ai_maker.product_type')">
          <template #default="scope">
            {{ scope.row.productType?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('ai_maker.display_mode')">
          <template #default="scope">
            {{ $t(`ai_maker.${scope.row.displayMode}`) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('ai_maker.style')">
          <template #default="scope">
            {{ $t(`ai_maker.${scope.row.style}`) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" :label="$t('common.created_at')" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.actions')" width="200">
          <template #default="scope">
            <el-button type="text" @click="editTemplate(scope.row)">{{ $t('common.edit') }}</el-button>
            <el-button type="text" @click="deleteTemplate(scope.row)">{{ $t('common.delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'create' ? $t('ai_maker.create_template') : $t('ai_maker.edit_template')"
      width="600px"
    >
      <el-form :model="templateForm" label-width="120px">
        <el-form-item :label="$t('ai_maker.template_name')">
          <el-input v-model="templateForm.name" />
        </el-form-item>

        <el-form-item :label="$t('ai_maker.product_type')">
          <el-select v-model="templateForm.productType" :placeholder="$t('ai_maker.select_product_type')">
            <el-option
              v-for="pt in productTypes"
              :key="pt._id"
              :label="pt.name"
              :value="pt._id"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('ai_maker.display_mode')">
          <el-radio-group v-model="templateForm.displayMode">
            <el-radio label="human">{{ $t('ai_maker.human') }}</el-radio>
            <el-radio label="animated_human">{{ $t('ai_maker.animated_human') }}</el-radio>
            <el-radio label="product_only">{{ $t('ai_maker.product_only') }}</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="$t('ai_maker.style')">
          <el-radio-group v-model="templateForm.style">
            <el-radio label="normal">{{ $t('ai_maker.normal') }}</el-radio>
            <el-radio label="crazy">{{ $t('ai_maker.crazy') }}</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="$t('ai_maker.template')">
          <el-input
            v-model="templateForm.template"
            type="textarea"
            :rows="6"
          />
        </el-form-item>

        <el-form-item :label="$t('ai_maker.variables')">
          <div v-for="(variable, index) in templateForm.variables" :key="index" class="variable-item">
            <el-input v-model="variable.name" :placeholder="$t('ai_maker.variable_name')" style="width: 40%; margin-right: 10px;" />
            <el-input v-model="variable.description" :placeholder="$t('ai_maker.variable_description')" style="width: 40%; margin-right: 10px;" />
            <el-button type="danger" @click="removeVariable(index)">{{ $t('common.delete') }}</el-button>
          </div>
          <el-button type="primary" @click="addVariable">{{ $t('ai_maker.add_variable') }}</el-button>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">{{ $t('common.cancel') }}</el-button>
          <el-button type="primary" @click="saveTemplate">{{ $t('common.save') }}</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from '@/utils/request';
import { ElMessage, ElMessageBox } from 'element-plus';

export default {
  name: 'PromptTemplateManagement',
  setup() {
    const { t } = useI18n();
    const templates = ref([]);
    const productTypes = ref([]);
    const dialogVisible = ref(false);
    const dialogType = ref('create'); // 'create' or 'edit'
    const currentTemplateId = ref('');
    const templateForm = reactive({
      name: '',
      productType: '',
      displayMode: 'human',
      style: 'normal',
      template: '',
      variables: []
    });

    // 获取模板列表
    const fetchTemplates = async () => {
      try {
        const response = await axios.get('/api/ai-maker/prompt-templates');
        if (response.data.success) {
          templates.value = response.data.data;
        }
      } catch (error) {
        console.error('获取模板列表失败:', error);
      }
    };

    // 获取产品类型
    const fetchProductTypes = async () => {
      try {
        const response = await axios.get('/api/base-data', {
          params: { type: 'product_type' }
        });
        if (response.data.success) {
          productTypes.value = response.data.data;
        }
      } catch (error) {
        console.error('获取产品类型失败:', error);
      }
    };

    // 显示创建对话框
    const showCreateDialog = () => {
      dialogType.value = 'create';
      currentTemplateId.value = '';
      resetForm();
      dialogVisible.value = true;
    };

    // 编辑模板
    const editTemplate = (template) => {
      dialogType.value = 'edit';
      currentTemplateId.value = template._id;
      templateForm.name = template.name;
      templateForm.productType = template.productType?._id || template.productType;
      templateForm.displayMode = template.displayMode;
      templateForm.style = template.style;
      templateForm.template = template.template;
      templateForm.variables = template.variables || [];
      dialogVisible.value = true;
    };

    // 保存模板
    const saveTemplate = async () => {
      try {
        const url = dialogType.value === 'create'
          ? '/api/ai-maker/prompt-templates'
          : `/api/ai-maker/prompt-templates/${currentTemplateId.value}`;
        const method = dialogType.value === 'create' ? 'post' : 'put';

        const response = await axios[method](url, templateForm);

        if (response.data.success) {
          ElMessage.success(t('common.save_success'));
          dialogVisible.value = false;
          fetchTemplates();
        }
      } catch (error) {
        console.error('保存模板失败:', error);
        ElMessage.error(t('common.save_failed'));
      }
    };

    // 删除模板
    const deleteTemplate = async (template) => {
      try {
        await ElMessageBox.confirm(
          t('ai_maker.confirm_delete_template'),
          t('common.warning'),
          {
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
            type: 'warning'
          }
        );

        const response = await axios.delete(`/api/ai-maker/prompt-templates/${template._id}`);

        if (response.data.success) {
          ElMessage.success(t('common.delete_success'));
          fetchTemplates();
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除模板失败:', error);
          ElMessage.error(t('common.delete_failed'));
        }
      }
    };

    // 添加变量
    const addVariable = () => {
      templateForm.variables.push({
        name: '',
        description: ''
      });
    };

    // 移除变量
    const removeVariable = (index) => {
      templateForm.variables.splice(index, 1);
    };

    // 重置表单
    const resetForm = () => {
      templateForm.name = '';
      templateForm.productType = '';
      templateForm.displayMode = 'human';
      templateForm.style = 'normal';
      templateForm.template = '';
      templateForm.variables = [];
    };

    // 格式化日期
    const formatDate = (date) => {
      if (!date) return '-';
      return new Date(date).toLocaleString();
    };

    onMounted(() => {
      fetchTemplates();
      fetchProductTypes();
    });

    return {
      templates,
      productTypes,
      dialogVisible,
      dialogType,
      templateForm,
      showCreateDialog,
      editTemplate,
      saveTemplate,
      deleteTemplate,
      addVariable,
      removeVariable,
      formatDate
    };
  }
};
</script>

<style scoped>
.prompt-template-management-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.template-list-card {
  margin-bottom: 20px;
}

.variable-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
</style>
