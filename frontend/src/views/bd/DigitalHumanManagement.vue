<template>
  <div class="digital-human-management-page">
    <div class="page-header">
      <h2>{{ $t('ai_maker.digital_human_management') }}</h2>
    </div>

    <!-- 选择达人 -->
    <el-card class="select-influencer-card">
      <template #header>
        <div class="card-header">
          <span>{{ $t('ai_maker.select_influencer') }}</span>
        </div>
      </template>
      
      <el-form :inline="true" :model="searchForm">
        <el-form-item :label="$t('ai_maker.influencer_name')">
          <el-input v-model="searchForm.name" :placeholder="$t('ai_maker.search_influencer')" />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="searchInfluencers">{{ $t('common.search') }}</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="influencers" style="width: 100%">
        <el-table-column prop="tiktokName" :label="$t('ai_maker.tiktok_name')" />
        <el-table-column prop="tiktokId" :label="$t('ai_maker.tiktok_id')" />
        <el-table-column :label="$t('common.actions')" width="120">
          <template #default="scope">
            <el-button type="text" @click="selectInfluencer(scope.row)">{{ $t('common.select') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 上传照片 -->
    <el-card v-if="selectedInfluencer" class="upload-photo-card">
      <template #header>
        <div class="card-header">
          <span>{{ $t('ai_maker.upload_photo') }} - {{ selectedInfluencer.tiktokName }}</span>
        </div>
      </template>
      
      <el-upload
        class="photo-uploader"
        action="/api/upload"
        :show-file-list="false"
        :on-success="handlePhotoUploadSuccess"
        :before-upload="beforePhotoUpload"
      >
        <img v-if="photoUrl" :src="photoUrl" class="photo-preview" />
        <el-icon v-else class="photo-uploader-icon"><Plus /></el-icon>
      </el-upload>

      <div class="generate-views-button">
        <el-button type="primary" @click="generateViews" :loading="generating">
          {{ $t('ai_maker.generate_views') }}
        </el-button>
      </div>
    </el-card>

    <!-- 三视图预览 -->
    <el-card v-if="views.length > 0" class="views-preview-card">
      <template #header>
        <div class="card-header">
          <span>{{ $t('ai_maker.views_preview') }}</span>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :span="8" v-for="view in views" :key="view.viewType">
          <el-card class="view-card">
            <img :src="view.url" class="view-image" />
            <div class="view-type">{{ $t(`ai_maker.${view.viewType}_view`) }}</div>
          </el-card>
        </el-col>
      </el-row>

      <div class="confirm-actions">
        <el-button @click="regenerateViews">{{ $t('ai_maker.regenerate') }}</el-button>
        <el-button type="primary" @click="confirmViews">{{ $t('ai_maker.confirm') }}</el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from '@/utils/request';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';

export default {
  name: 'DigitalHumanManagement',
  components: {
    Plus
  },
  setup() {
    const { t } = useI18n();
    const searchForm = reactive({
      name: ''
    });
    const influencers = ref([]);
    const selectedInfluencer = ref(null);
    const photoUrl = ref('');
    const views = ref([]);
    const generating = ref(false);

    // 搜索达人
    const searchInfluencers = async () => {
      try {
        const response = await axios.get('/api/influencer-managements', {
          params: {
            page: 1,
            limit: 10,
            search: searchForm.name
          }
        });
        
        if (response.data.success) {
          influencers.value = response.data.data;
        }
      } catch (error) {
        console.error('搜索达人失败:', error);
      }
    };

    // 选择达人
    const selectInfluencer = (influencer) => {
      selectedInfluencer.value = influencer;
      photoUrl.value = '';
      views.value = [];
    };

    // 上传照片成功
    const handlePhotoUploadSuccess = (response) => {
      if (response.success) {
        photoUrl.value = response.url;
        ElMessage.success(t('ai_maker.photo_upload_success'));
      }
    };

    // 上传照片前验证
    const beforePhotoUpload = (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        ElMessage.error(t('ai_maker.photo_must_be_image'));
      }
      return isImage;
    };

    // 生成三视图
    const generateViews = async () => {
      if (!photoUrl.value) {
        ElMessage.warning(t('ai_maker.please_upload_photo'));
        return;
      }

      generating.value = true;
      try {
        const response = await axios.post('/api/ai-maker/generate-views', {
          influencerId: selectedInfluencer.value._id,
          photoUrl: photoUrl.value
        });
        
        if (response.data.success) {
          views.value = response.data.data.views;
          ElMessage.success(t('ai_maker.generate_views_success'));
        }
      } catch (error) {
        console.error('生成三视图失败:', error);
        ElMessage.error(t('ai_maker.generate_views_failed'));
      } finally {
        generating.value = false;
      }
    };

    // 重新生成
    const regenerateViews = () => {
      views.value = [];
      generateViews();
    };

    // 确认保存
    const confirmViews = async () => {
      try {
        // TODO: 保存数字人信息
        ElMessage.success(t('ai_maker.digital_human_saved'));
      } catch (error) {
        console.error('保存数字人失败:', error);
      }
    };

    onMounted(() => {
      // 可以在这里加载初始数据
    });

    return {
      searchForm,
      influencers,
      selectedInfluencer,
      photoUrl,
      views,
      generating,
      searchInfluencers,
      selectInfluencer,
      handlePhotoUploadSuccess,
      beforePhotoUpload,
      generateViews,
      regenerateViews,
      confirmViews
    };
  }
};
</script>

<style scoped>
.digital-human-management-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.select-influencer-card,
.upload-photo-card,
.views-preview-card {
  margin-bottom: 20px;
}

.photo-uploader {
  text-align: center;
  margin-bottom: 20px;
}

.photo-uploader .el-upload {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.photo-uploader .el-upload:hover {
  border-color: #409eff;
}

.photo-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  text-align: center;
  line-height: 178px;
}

.photo-preview {
  width: 178px;
  height: 178px;
  display: block;
}

.generate-views-button {
  text-align: center;
}

.view-card {
  text-align: center;
}

.view-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.view-type {
  margin-top: 10px;
  font-weight: bold;
}

.confirm-actions {
  margin-top: 20px;
  text-align: center;
}
</style>
