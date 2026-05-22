<template>
  <view class="page">
    <view class="header">
      <text class="title">欢迎回来</text>
      <text class="subtitle">登录后享受更多服务</text>
    </view>

    <view class="form">
      <view class="input-block">
        <wd-input
          v-model="username"
          placeholder="用户名 / 手机号 / 邮箱"
          prefix-icon="user"
          clearable
          no-border
          custom-class="jd-input"
        />
      </view>

      <view class="input-block">
        <wd-input
          v-model="password"
          placeholder="密码"
          prefix-icon="lock-on"
          show-password
          clearable
          no-border
          custom-class="jd-input"
        />
      </view>

      <view class="aux-row">
        <text class="aux-link" @click="goReset">忘记密码？</text>
      </view>
    </view>

    <wd-button
      type="primary"
      block
      :loading="loading"
      :disabled="loading || !username || !password"
      class="submit-btn"
      @click="handleLogin"
    >登录</wd-button>

    <view class="register-link" @click="goRegister">还没账号？<text class="register-link__action">立即注册</text></view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { login } from '@/api/user'
import { showError } from '@/api/request'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const username = ref('')
const password = ref('')
const loading = ref(false)

function goRegister() {
  uni.navigateTo({ url: '/pages/login/register' })
}
function goReset() {
  uni.navigateTo({ url: '/pages/login/reset-password' })
}

async function handleLogin() {
  loading.value = true
  try {
    const res = await login(username.value.trim(), password.value)
    userStore.setSession({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      csrfToken: res.csrfToken,
      expiresIn: res.expiresIn,
      uid: res.uid,
    })
    if (res.passwordExpired) {
      uni.showToast({ title: '密码已过期，请立即修改', icon: 'none', duration: 2000 })
      uni.reLaunch({ url: '/pages/my/password' })
      return
    }
    const pages = getCurrentPages()
    if (pages.length > 1) {
      const prevPage = pages[pages.length - 2] as any
      const prevRoute: string = prevPage?.route ?? ''
      const tabRoutes = ['pages/index/index', 'pages/my/index', 'pages/cart/index']
      if (tabRoutes.includes(prevRoute)) {
        uni.switchTab({ url: `/${prevRoute}` })
      } else {
        uni.navigateBack()
      }
    } else {
      uni.reLaunch({ url: '/pages/index/index' })
    }
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
  background: #fff;
  padding: 96rpx 56rpx $space-xl;
  box-sizing: border-box;
}

.header {
  margin-bottom: 64rpx;
  .title {
    display: block;
    font-size: 52rpx;
    font-weight: $font-weight-bold;
    color: #1a1a1a;
    line-height: 1.3;
    margin-bottom: 16rpx;
  }
  .subtitle {
    font-size: $font-size-sm;
    color: #999;
  }
}

.form {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.input-block {
  background: #f5f5f7;
  border-radius: 16rpx;
  padding: 4rpx 24rpx;
}

:deep(.jd-input) { background: transparent !important; padding: 0 !important; flex: 1; }
:deep(.jd-input .wd-input__inner) {
  padding: 0 !important;
  font-size: 30rpx;
  color: #1a1a1a;
  line-height: 80rpx;
  height: 80rpx;
}
:deep(.jd-input .wd-input__prefix) {
  margin-right: 16rpx;
  color: #999;
  font-size: 36rpx;
}
:deep(.jd-input .wd-input__placeholder) { color: #b0b0b0; }

.aux-row {
  display: flex;
  justify-content: flex-end;
  padding: 0 8rpx;
}
.aux-link {
  color: #999;
  font-size: $font-size-sm;
}

.submit-btn {
  margin-top: 64rpx;
  height: 92rpx;
  font-size: 32rpx;
  border-radius: 46rpx !important;
  background: linear-gradient(90deg, #ff4b4b 0%, #e1251b 100%) !important;
}

.register-link {
  text-align: center;
  margin-top: 40rpx;
  color: #999;
  font-size: $font-size-sm;
  &__action { color: #e1251b; font-weight: $font-weight-medium; }
}
</style>
