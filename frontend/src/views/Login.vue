<template>
  <div class="login-container">
    <img src="https://cdn.jsdelivr.net/gh/fun4ym/LazyFirst@main/frontend/public/logo.png" alt="LazyFirst" class="page-logo" />
    <div class="login-box">
      <div class="login-header">
        <h1>{{ $t('login.title') }}</h1>
        <p>TikTok Shop Affiliate Partner</p>
      </div>

      <el-form
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
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-button"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? $t('common.loading') : $t('login.login') }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <p>Copyright © 2026 LazyFirst Digital System © Encrypted | TAP Ecosystem Certified | All Intellectual Properties Reserved</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import AuthManager from '@/utils/auth'

const { t } = useI18n()
const router = useRouter()

const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
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

const handleLogin = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      await AuthManager.login(form.username, form.password)
      ElMessage.success(t('auth.loginSuccess'))
      router.push('/dashboard')
    } catch (error) {
      ElMessage.error(error.message || t('common.error'))
    } finally {
      loading.value = false
    }
  })
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

.login-form {
  margin-bottom: 32px;
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
</style>
