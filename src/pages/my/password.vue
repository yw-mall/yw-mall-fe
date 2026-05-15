<template>
  <view class="page">
    <view class="form">
      <wd-input
        v-model="oldPassword"
        placeholder="当前密码"
        type="password"
        clearable
      />
      <wd-input
        v-model="newPassword"
        placeholder="新密码"
        type="password"
        clearable
      />
      <wd-input
        v-model="confirmPassword"
        placeholder="确认新密码"
        type="password"
        clearable
      />
      <text v-if="validationError" class="error-text">{{ validationError }}</text>
      <wd-button
        type="primary"
        block
        :loading="loading"
        :disabled="loading || !oldPassword || !newPassword || !confirmPassword"
        class="submit-btn"
        @click="handleSubmit"
      >
        修改密码
      </wd-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { changePassword } from '@/api/profile'
import { showError } from '@/api/request'
import { useUserStore } from '@/stores/user'

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)

const validationError = computed(() => {
  if (!newPassword.value) return ''
  if (newPassword.value.length < 8) return '新密码至少8位'
  if (!/[a-zA-Z]/.test(newPassword.value)) return '新密码需包含至少1个字母'
  if (!/[0-9]/.test(newPassword.value)) return '新密码需包含至少1个数字'
  if (newPassword.value === oldPassword.value) return '新密码不能与当前密码相同'
  if (confirmPassword.value && confirmPassword.value !== newPassword.value) return '两次输入的新密码不一致'
  return ''
})

async function handleSubmit() {
  if (validationError.value) return
  if (confirmPassword.value !== newPassword.value) {
    uni.showToast({ title: '两次输入的新密码不一致', icon: 'none' })
    return
  }
  loading.value = true
  try {
    await changePassword(oldPassword.value, newPassword.value)
    uni.showToast({ title: '密码已修改，请重新登录', icon: 'success' })
    setTimeout(() => {
      useUserStore().clear()
      uni.reLaunch({ url: '/pages/login/index' })
    }, 1500)
  } catch (err) {
    showError(err)
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $color-bg-page;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 $space-lg;
}

.form {
  width: 100%;
  margin-top: 48px;
  display: flex;
  flex-direction: column;
  gap: $space-md;
}

.error-text {
  font-size: $font-size-sm;
  color: #FF4B4B;
  padding: 0 4px;
}

.submit-btn {
  margin-top: $space-sm;
}
</style>
