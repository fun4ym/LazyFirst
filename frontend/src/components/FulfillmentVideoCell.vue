<template>
  <div class="fulfillment-video-col">
    <!-- 视频列表 - 每条视频一行 -->
    <template v-if="videos && videos.length > 0">
      <div v-for="(video, idx) in videos" :key="idx" class="video-row">
        <!-- 视频链接 -->
        <a
          v-if="video.videoLink"
          :href="video.videoLink"
          target="_blank"
          class="video-link-text"
        >{{ $t('samples.videoLink') }}</a>
        <span v-else class="video-link-empty">{{ $t('samples.noVideo') }}</span>

        <!-- 复制图标 -->
        <svg
          v-if="video.videoLink"
          class="icon copy-icon"
          viewBox="0 0 1024 1024"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          @click.stop="copyToClipboard(video.videoLink, 'videoLink')"
        >
          <path d="M 96.1 575.7 a 32.2 32.1 0 1 0 64.4 0 32.2 32.1 0 1 0 -64.4 0 Z" fill="#4D4D4D"></path>
          <path d="M 736.1 63.9 H 417 c -70.4 0 -128 57.6 -128 128 h -64.9 c -70.4 0 -128 57.6 -128 128 v 128 c -0.1 17.7 14.4 32 32.2 32 17.8 0 32.2 -14.4 32.2 -32.1 V 320 c 0 -35.2 28.8 -64 64 -64 H 289 v 447.8 c 0 70.4 57.6 128 128 128 h 255.1 c -0.1 35.2 -28.8 63.8 -64 63.8 H 224.5 c -35.2 0 -64 -28.8 -64 -64 V 703.5 c 0 -17.7 -14.4 -32.1 -32.2 -32.1 -17.8 0 -32.3 14.4 -32.3 32.1 v 128.3 c 0 70.4 57.6 128 128 128 h 384.1 c 70.4 0 128 -57.6 128 -128 h 65 c 70.4 0 128 -57.6 128 -128 V 255.9 l -193 -192 z m 0.1 63.4 l 127.7 128.3 H 800 c -35.2 0 -64 -28.8 -64 -64 v -64.3 h 0.2 z m 64 641 H 416.1 c -35.2 0 -64 -28.8 -64 -64 v -513 c 0 -35.2 28.8 -64 64 -64 H 671 V 191 c 0 70.4 57.6 128 128 128 h 65.2 v 385.3 c 0 35.2 -28.8 64 -64 64 z" fill="#4D4D4D"></path>
        </svg>
        <span v-else class="icon-placeholder"></span>

        <!-- 加热/待加热火焰图标 - 以推流码判断是否投流 -->
        <svg
          v-if="video.videoStreamCode && video.videoStreamCode.trim()"
          class="icon fire-icon heated"
          viewBox="0 0 1024 1024"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          @click.stop="copyToClipboard(video.videoStreamCode, 'streamCode')"
          style="cursor: pointer;"
        >
          <path d="M 730.289826 190.531934 c 23.222322 53.94432 26.710915 143.090263 -21.368132 185.948409 C 630.863922 61.957495 435.714498 0.58343 435.714498 0.58343 c 23.221323 159.889858 -81.547364 334.866981 -184.46386 466.756184 -3.488593 -63.20128 -7.194974 -105.946537 -40.774181 -171.090919 C 203.281483 413.396293 118.244527 506.426443 93.3888 623.573042 c -30.090615 161.83296 24.856726 275.321132 234.068418 400.011364 -65.630907 -143.090263 -30.089616 -225.035239 21.369131 -299.322693 54.946341 -85.488515 69.337288 -167.433491 69.337288 -167.433491 s 44.261776 57.601748 26.709916 148.689796 c 74.35239 -89.144944 88.743337 -232.577873 78.168664 -284.579091 C 693.223024 545.627161 769.428605 820.950291 670.219489 1019.926978 c 524.827473 -314.295071 129.189838 -781.165143 60.071336 -829.395044 z" fill="#FF6A00"></path>
        </svg>
        <svg
          v-else-if="video.videoLink"
          class="icon fire-icon unheated"
          viewBox="0 0 1024 1024"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
        >
          <path d="M 730.289826 190.531934 c 23.222322 53.94432 26.710915 143.090263 -21.368132 185.948409 C 630.863922 61.957495 435.714498 0.58343 435.714498 0.58343 c 23.221323 159.889858 -81.547364 334.866981 -184.46386 466.756184 -3.488593 -63.20128 -7.194974 -105.946537 -40.774181 -171.090919 C 203.281483 413.396293 118.244527 506.426443 93.3888 623.573042 c -30.090615 161.83296 24.856726 275.321132 234.068418 400.011364 -65.630907 -143.090263 -30.089616 -225.035239 21.369131 -299.322693 54.946341 -85.488515 69.337288 -167.433491 69.337288 -167.433491 s 44.261776 57.601748 26.709916 148.689796 c 74.35239 -89.144944 88.743337 -232.577873 78.168664 -284.579091 C 693.223024 545.627161 769.428605 820.950291 670.219489 1019.926978 c 524.827473 -314.295071 129.189838 -781.165143 60.071336 -829.395044 z" fill="#bfbfbf"></path>
        </svg>
        <span v-else class="icon-placeholder"></span>

        <!-- 复制投流码文字 -->
        <span
          v-if="video.videoStreamCode && video.videoStreamCode.trim()"
          class="stream-code-text"
          @click.stop="copyToClipboard(video.videoStreamCode, 'streamCode')"
        >复制投流码</span>

        <!-- 编辑图标 (仅可编辑模式) -->
        <el-icon v-if="editable" class="edit-icon" @click.stop="$emit('edit', video, idx)"><Edit /></el-icon>
        <!-- 删除图标 (仅可编辑模式) -->
        <el-icon v-if="editable" class="delete-icon" @click.stop="$emit('delete', video, idx)"><Delete /></el-icon>

        <!-- 投流开关 (仅只读模式) -->
        <el-switch
          v-if="!editable"
          v-model="video.isAdPromotion"
          size="small"
          style="margin-left: 8px;"
          @change="$emit('adPromotionChange', video)"
        />
      </div>
    </template>

    <!-- 新增视频按钮 (仅可编辑模式) -->
    <div v-if="editable" class="add-video-row" @click.stop="$emit('add')">
      <svg class="icon add-video-icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
        <path d="M 788 512.73 V 454 a 14.33 14.33 0 0 1 14.33 -14.33 h 74.73 A 14.33 14.33 0 0 1 891.42 454 v 74.7 a 14.38 14.38 0 0 1 -0.33 3 224.05 224.05 0 0 1 69.26 48.42 V 98.69 a 34.52 34.52 0 0 0 -34.5 -34.47 h -34.43 v 68.94 H 788 V 64.22 H 236.54 v 68.94 H 133.12 V 64.22 H 98.67 a 34.53 34.53 0 0 0 -34.46 34.47 v 631.1 a 52 52 0 0 0 51.67 46.78 h 341.88 l 0.3 1 H 64.21 v 79.36 a 34.52 34.52 0 0 0 34.46 34.46 h 34.44 v -34.44 h 103.43 v 34.46 h 402.82 A 222.82 222.82 0 0 1 576.48 736 c 0 -119.45 93.65 -217 211.52 -223.27 z m 0 -265.57 a 14.33 14.33 0 0 1 14.33 -14.33 h 74.73 a 14.33 14.33 0 0 1 14.37 14.33 v 74.74 a 14.33 14.33 0 0 1 -14.34 14.33 h -74.76 A 14.33 14.33 0 0 1 788 321.9 zM 222.2 749.8 h -74.72 a 14.33 14.33 0 0 1 -14.36 -14.32 v -74.73 a 14.33 14.33 0 0 1 14.33 -14.34 h 74.73 a 14.33 14.33 0 0 1 14.33 14.34 v 74.73 a 14.33 14.33 0 0 1 -14.31 14.32 z m 14.33 -221.12 A 14.34 14.34 0 0 1 222.2 543 h -74.72 a 14.33 14.33 0 0 1 -14.36 -14.32 V 454 a 14.33 14.33 0 0 1 14.36 -14.33 h 74.72 A 14.32 14.32 0 0 1 236.54 454 zM 232.34 332 a 14.31 14.31 0 0 1 -10.14 4.2 h -74.72 a 14.33 14.33 0 0 1 -14.36 -14.33 v -74.71 a 14.32 14.32 0 0 1 14.33 -14.33 h 74.73 a 14.33 14.33 0 0 1 14.33 14.33 v 74.73 a 14.3 14.3 0 0 1 -4.17 10.11 z m 213.93 295.4 a 26.12 26.12 0 0 1 -11.66 2.69 26.55 26.55 0 0 1 -13.61 -3.73 25.23 25.23 0 0 1 -12.21 -21.54 V 343.39 A 25.22 25.22 0 0 1 421 321.82 a 26.11 26.11 0 0 1 25.15 -1 l 224.18 130.65 a 25.09 25.09 0 0 1 0 45.22 h 0.07 z" fill="#8a8a8a"></path>
        <path d="M 640.12 703.84 m 32 0 l 256.06 0 q 32 0 32 32 l 0 0 q 0 32 -32 32 l -256.06 0 q -32 0 -32 -32 l 0 0 q 0 -32 32 -32 Z" fill="#8a8a8a"></path>
        <path d="M 832.15 576.04 m 0 32 l 0 256.06 q 0 32 -32 32 l 0 0 q -32 0 -32 -32 l 0 -256.06 q 0 -32 32 -32 l 0 0 q 32 0 32 32 Z" fill="#8a8a8a"></path>
      </svg>
      <span class="add-video-text">{{ $t('samples.addVideo') }}</span>
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  videos: {
    type: Array,
    default: () => []
  },
  editable: {
    type: Boolean,
    default: true
  }
})

defineEmits(['edit', 'delete', 'add', 'adPromotionChange'])

const copyToClipboard = async (text, type) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(type === 'streamCode' ? '投流码已复制' : '链接已复制')
  } catch (error) {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      ElMessage.success(type === 'streamCode' ? '投流码已复制' : '链接已复制')
    } catch (e) {
      ElMessage.error('复制失败')
    }
    document.body.removeChild(textarea)
  }
}
</script>

<style scoped>
.fulfillment-video-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.video-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
}

.icon {
  flex-shrink: 0;
  cursor: pointer;
  transition: opacity 0.2s;
}

.icon:hover {
  opacity: 0.8;
}

.icon-placeholder {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.copy-icon {
  color: #4D4D4D;
}

.copy-icon:hover {
  color: #409eff;
}

.fire-icon {
  flex-shrink: 0;
}

.stream-code-text {
  font-size: 12px;
  color: #67c23a;
  cursor: pointer;
  margin-left: 4px;
  white-space: nowrap;
}

.stream-code-text:hover {
  color: #85ce61;
}

.video-link-text {
  color: #409eff;
  text-decoration: none;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.video-link-text:hover {
  text-decoration: underline;
}

.video-link-empty {
  color: #909399;
  font-size: 13px;
}

.edit-icon {
  cursor: pointer;
  color: #409eff;
  font-size: 14px;
  padding: 2px;
  border-radius: 4px;
}

.edit-icon:hover {
  background-color: #ecf5ff;
  color: #66b1ff;
}

.delete-icon {
  cursor: pointer;
  color: #f56c6c;
  font-size: 14px;
  padding: 2px;
  border-radius: 4px;
}

.delete-icon:hover {
  background-color: #fef0f0;
  color: #f78989;
}

.add-video-row {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 2px 0;
  margin-top: 2px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.add-video-row:hover {
  background-color: #f5f7fa;
}

.add-video-icon {
  flex-shrink: 0;
}

.add-video-text {
  font-size: 12px;
  color: #8a8a8a;
}

.add-video-row:hover .add-video-text {
  color: #409eff;
}
</style>
