<template>
  <div class="login-container">
    <img src="https://cdn.jsdelivr.net/gh/fun4ym/LazyFirst@main/frontend/public/logo.png" alt="LazyFirst" class="page-logo" />
    <div class="login-box">
      <div class="login-header">
        <h1>{{ $t('login.title') }}</h1>
        <p>TikTok Shop Affiliate Partner</p>
      </div>

      <!-- 登录模式切换 -->
      <div class="login-mode-tabs">
        <div
          class="mode-tab"
          :class="{ active: loginMode === 'password' }"
          @click="loginMode = 'password'"
        >
          <el-icon><Lock /></el-icon>
          <span>{{ $t('login.passwordLogin') }}</span>
        </div>
        <div
          class="mode-tab"
          :class="{ active: loginMode === 'tiktok' }"
          @click="loginMode = 'tiktok'"
        >
          <svg class="tiktok-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
          </svg>
          <span>TikTok</span>
        </div>
      </div>

      <!-- 账号密码登录 -->
      <el-form
        v-if="loginMode === 'password'"
        ref="formRef"
        :model="form"
        :rules="rules"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            :placeholder="$t('login.username')"
            size="large"
            :prefix-icon="User"
            :disabled="isLocked"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            :placeholder="$t('login.password')"
            size="large"
            :prefix-icon="Lock"
            show-password
            :disabled="isLocked"
          />
        </el-form-item>

        <!-- 登录失败提示 -->
        <div v-if="failedAttempts > 0" class="failed-attempts-tip">
          <el-icon><WarningFilled /></el-icon>
          <span v-if="isLocked">{{ $t('login.accountLocked') }} ({{ lockedTimeRemaining }}{{ $t('login.minutes') }})</span>
          <span v-else>{{ $t('login.failedAttempts') }}: {{ failedAttempts }}/3</span>
        </div>

        <el-form-item>
          <el-checkbox v-model="form.agreedToTerms">{{ $t('login.terms') }}</el-checkbox>
          <a href="/terms" target="_blank" class="policy-link" @click.stop>{{ $t('login.termsOfService') }}</a>
          <span class="and-text">{{ $t('login.and') }}</span>
          <a href="/privacy" target="_blank" class="policy-link" @click.stop>{{ $t('login.privacyPolicy') }}</a>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-button"
            :loading="loading"
            :disabled="isLocked"
            @click="handleLogin"
          >
            {{ isLocked ? $t('login.login') + ' (' + lockedTimeRemaining + ')' : (loading ? $t('common.loading') : $t('login.login')) }}
          </el-button>
        </el-form-item>
      </el-form>

      <!-- TikTok登录 -->
      <div v-if="loginMode === 'tiktok'" class="login-form tiktok-login">
        <div class="tiktok-login-tip">
          <svg class="tiktok-icon-large" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
          </svg>
          <p>{{ $t('login.tiktokLoginTip') }}</p>
        </div>

        <el-form-item>
          <el-checkbox v-model="form.agreedToTerms">{{ $t('login.terms') }}</el-checkbox>
          <a href="/terms" target="_blank" class="policy-link" @click.stop>{{ $t('login.termsOfService') }}</a>
          <span class="and-text">{{ $t('login.and') }}</span>
          <a href="/privacy" target="_blank" class="policy-link" @click.stop>{{ $t('login.privacyPolicy') }}</a>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-button tiktok-btn"
            :loading="loading"
            :disabled="!form.agreedToTerms"
            @click="handleTikTokLogin"
          >
            <svg class="tiktok-btn-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
            </svg>
            {{ $t('login.loginWithTikTok') }}
          </el-button>
        </el-form-item>
      </div>

      <div class="login-footer">
        <p>Copyright © 2026 LazyFirst. All Rights Reserved.</p>
        <p>Encrypted Digital System・TAP Ecosystem Certified</p>
      </div>
    </div>

    <!-- 设备选择弹窗 -->
    <el-dialog
      v-model="showDeviceDialog"
      :title="t('login.selectDevice')"
      width="90%"
      :close-on-click-modal="false"
      :show-close="false"
    >
      <div class="device-dialog-content">
        <p class="device-dialog-title">{{ t('login.selectDeviceTip') }}</p>
        <div class="device-options">
          <div class="device-option" @click="selectDevice('mobile')">
            <el-icon :size="48" color="#4a148c"><Iphone /></el-icon>
            <span>{{ t('login.mobileVersion') }}</span>
            <p class="device-desc">{{ t('login.mobileDesc') }}</p>
          </div>
          <div class="device-option" @click="selectDevice('pc')">
            <el-icon :size="48" color="#4a148c"><Monitor /></el-icon>
            <span>{{ t('login.pcVersion') }}</span>
            <p class="device-desc">{{ t('login.pcDesc') }}</p>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { User, Lock, Iphone, Monitor, WarningFilled } from '@element-plus/icons-vue'
import AuthManager from '@/utils/auth'

const { t } = useI18n()
const router = useRouter()

const formRef = ref(null)
const loading = ref(false)
const showDeviceDialog = ref(false)
const isMobileDevice = ref(false)
const loginMode = ref('password')

// 登录失败次数和锁定
const failedAttempts = ref(0)
const lockEndTime = ref(0)
const lockTimer = ref(null)
const countdownTimer = ref(null)
const lockedTimeRemaining = ref(0)

const LOCK_DURATION = 5 * 60 * 1000 // 5分钟
const MAX_FAILED_ATTEMPTS = 3

const isLocked = computed(() => {
  return Date.now() < lockEndTime.value
})

const form = reactive({
  username: '',
  password: '',
  agreedToTerms: false
})

const rules = {
  username: [
    { required: true, message: t('login.username'), trigger: 'blur' }
  ],
  password: [
    { required: true, message: t('login.password'), trigger: 'blur' },
    { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' }
  ]
}

// 从localStorage恢复失败次数和锁定状态
onMounted(() => {
  const savedFailedAttempts = localStorage.getItem('loginFailedAttempts')
  const savedLockEndTime = localStorage.getItem('loginLockEndTime')

  if (savedFailedAttempts) {
    failedAttempts.value = parseInt(savedFailedAttempts)
  }

  if (savedLockEndTime) {
    lockEndTime.value = parseInt(savedLockEndTime)
    if (isLocked.value) {
      startCountdown()
    }
  }
})

onUnmounted(() => {
  if (lockTimer.value) clearInterval(lockTimer.value)
  if (countdownTimer.value) clearInterval(countdownTimer.value)
})

const startCountdown = () => {
  updateLockedTimeRemaining()
  countdownTimer.value = setInterval(() => {
    updateLockedTimeRemaining()
    if (!isLocked.value) {
      clearInterval(countdownTimer.value)
      failedAttempts.value = 0
      localStorage.removeItem('loginFailedAttempts')
      localStorage.removeItem('loginLockEndTime')
    }
  }, 1000)
}

const updateLockedTimeRemaining = () => {
  const remaining = Math.max(0, Math.ceil((lockEndTime.value - Date.now()) / 1000))
  lockedTimeRemaining.value = Math.ceil(remaining / 60) || 1
}

const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

const selectDevice = (device) => {
  if (device === 'mobile') {
    router.push('/mobile/profile')
  } else {
    router.push('/dashboard')
  }
}

const handleLogin = async () => {
  if (!formRef.value) return

  // 检查是否被锁定
  if (isLocked.value) {
    ElMessage.warning(t('login.accountLocked') + ' (' + lockedTimeRemaining.value + ' ' + t('login.minutes') + ')')
    return
  }

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    if (!form.agreedToTerms) {
      ElMessage.warning(t('login.agreeToTermsFirst'))
      return
    }

    loading.value = true
    try {
      await AuthManager.login(form.username, form.password)
      ElMessage.success(t('auth.loginSuccess'))

      // 登录成功，重置失败次数
      failedAttempts.value = 0
      localStorage.removeItem('loginFailedAttempts')
      localStorage.removeItem('loginLockEndTime')

      // 判断是否移动端设备
      if (isMobile()) {
        showDeviceDialog.value = true
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      // 登录失败，增加失败次数
      failedAttempts.value++
      localStorage.setItem('loginFailedAttempts', failedAttempts.value.toString())

      if (failedAttempts.value >= MAX_FAILED_ATTEMPTS) {
        // 锁定账号
        lockEndTime.value = Date.now() + LOCK_DURATION
        localStorage.setItem('loginLockEndTime', lockEndTime.value.toString())
        startCountdown()
        ElMessage.error(t('login.accountLocked') + ' (' + lockedTimeRemaining.value + ' ' + t('login.minutes') + ')')
      } else {
        ElMessage.error(error.message || t('common.error'))
      }
    } finally {
      loading.value = false
    }
  })
}

const handleTikTokLogin = async () => {
  if (!form.agreedToTerms) {
    ElMessage.warning(t('login.agreeToTermsFirst'))
    return
  }

  // TikTok登录逻辑（预留）
  ElMessage.info(t('login.tiktokComingSoon'))
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4a148c 0%, #7b1fa2 50%, #9c4dcc 100%);
  padding: 20px;
  position: relative;
}

.page-logo {
  position: absolute;
  top: 30px;
  left: 30px;
  width: 150px;
  height: auto;
  z-index: 10;
}

.login-box {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 12px;
  padding: 48px 40px;
  box-shadow: 0 12px 40px rgba(74, 20, 140, 0.25);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-logo {
  width: 200px;
  height: auto;
  margin-bottom: 20px;
}

.login-header h1 {
  font-size: 32px;
  color: #4a148c;
  margin-bottom: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.login-header p {
  font-size: 14px;
  color: #8c8c8c;
  margin: 0;
}

.login-mode-tabs {
  display: flex;
  margin-bottom: 24px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
}

.mode-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  cursor: pointer;
  background: #f5f7fa;
  color: #8c8c8c;
  font-size: 14px;
  transition: all 0.3s;
  border-right: 1px solid #e4e7ed;
}

.mode-tab:last-child {
  border-right: none;
}

.mode-tab.active {
  background: #4a148c;
  color: white;
}

.mode-tab:hover:not(.active) {
  background: #f0e6f5;
}

.tiktok-icon {
  width: 16px;
  height: 16px;
}

.tiktok-icon-large {
  width: 64px;
  height: 64px;
  color: #4a148c;
}

.failed-attempts-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fef0f0;
  border-radius: 6px;
  color: #f56c6c;
  font-size: 13px;
  margin-bottom: 16px;
}

.login-form {
  margin-bottom: 32px;
}

.tiktok-login {
  padding-top: 20px;
}

.tiktok-login-tip {
  text-align: center;
  padding: 20px;
  margin-bottom: 20px;
}

.tiktok-login-tip p {
  color: #666;
  margin-top: 12px;
  font-size: 14px;
}

.tiktok-btn {
  background: #000 !important;
  border-color: #000 !important;
}

.tiktok-btn:hover {
  background: #333 !important;
  border-color: #333 !important;
}

.tiktok-btn-icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
}

.policy-link {
  color: #4a148c;
  text-decoration: none;
  font-size: 14px;
  margin: 0 4px;
}

.policy-link:hover {
  text-decoration: underline;
}

.and-text {
  color: #8c8c8c;
  font-size: 14px;
  margin: 0 4px;
}

.login-button {
  width: 100%;
  margin-top: 20px;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.login-footer {
  text-align: center;
  color: #8c8c8c;
  font-size: 12px;
}

.device-dialog-content {
  text-align: center;
  padding: 20px 0;
}

.device-dialog-title {
  font-size: 18px;
  color: #333;
  margin-bottom: 30px;
}

.device-options {
  display: flex;
  justify-content: center;
  gap: 40px;
}

.device-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 20px 30px;
  border-radius: 12px;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.device-option:hover {
  background: #f5f0fa;
  border-color: #9c4dcc;
}

.device-option span {
  font-size: 18px;
  font-weight: 500;
  color: #4a148c;
  margin-top: 12px;
}

.device-desc {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}
</style>
