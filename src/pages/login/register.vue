<template>
  <view class="page">
    <view class="logo-area">
      <wd-icon name="shop" size="64px" :color="'#FF4B4B'" />
      <text class="app-name">注册账号</text>
    </view>

    <view class="form">
      <wd-input v-model="username" placeholder="用户名（4-32 位字母开头）" clearable />
      <wd-input v-model="password" placeholder="密码（8 位以上 + 字母+数字）" type="password" clearable />
      <wd-input v-model="passwordConfirm" placeholder="确认密码" type="password" clearable />

      <wd-radio-group v-model="channel" inline shape="dot">
        <wd-radio :value="1">手机号</wd-radio>
        <wd-radio :value="2">邮箱</wd-radio>
      </wd-radio-group>

      <wd-input v-model="target" :placeholder="channel === 1 ? '手机号 11 位' : '邮箱地址'" clearable />

      <view class="code-row">
        <wd-input v-model="verifyCode" placeholder="6 位验证码" maxlength="6" class="code-input" />
        <wd-button
          size="small"
          :disabled="cooldown > 0 || !target"
          :loading="sending"
          class="code-btn"
          @click="onSendCode"
        >{{ cooldown > 0 ? `${cooldown}s` : '发送验证码' }}</wd-button>
      </view>

      <wd-button
        type="primary"
        block
        :loading="submitting"
        :disabled="!canSubmit"
        class="submit-btn"
        @click="onSubmit"
      >注册</wd-button>

      <view class="login-link" @click="goLogin">已有账号？立即登录</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { sendVerifyCode, registerV2 } from '@/api/auth'
import { showError } from '@/api/request'

const username = ref('')
const password = ref('')
const passwordConfirm = ref('')
const channel = ref<1 | 2>(1)
const target = ref('')
const verifyCode = ref('')
const challengeToken = ref('')

const cooldown = ref(0)
const sending = ref(false)
const submitting = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const canSubmit = computed(() =>
  !!username.value && !!password.value &&
  password.value === passwordConfirm.value &&
  !!target.value && !!verifyCode.value && !!challengeToken.value,
)

async function onSendCode() {
  if (cooldown.value > 0) return
  sending.value = true
  try {
    const res = await sendVerifyCode({
      channel: channel.value,
      target: target.value,
      scene: 1,
    })
    challengeToken.value = res.challengeToken
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    cooldown.value = 60
    timer = setInterval(() => {
      cooldown.value -= 1
      if (cooldown.value <= 0 && timer) { clearInterval(timer); timer = null }
    }, 1000)
  } catch (err) {
    showError(err)
  } finally {
    sending.value = false
  }
}

async function onSubmit() {
  if (password.value !== passwordConfirm.value) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await registerV2({
      username: username.value,
      password: password.value,
      phone: channel.value === 1 ? target.value : '',
      email: channel.value === 2 ? target.value : '',
      verifyCode: verifyCode.value,
      challengeToken: challengeToken.value,
    })
    uni.showToast({ title: '注册成功，请登录', icon: 'success' })
    setTimeout(() => uni.reLaunch({ url: '/pages/login/index' }), 1200)
  } catch (err) {
    showError(err)
  } finally {
    submitting.value = false
  }
}

function goLogin() {
  uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/login/index' }) })
}

onUnmounted(() => { if (timer) clearInterval(timer) })
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
.logo-area {
  margin-top: 60px;
  margin-bottom: $space-xl;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-sm;
}
.app-name { font-size: $font-size-xl; font-weight: $font-weight-bold; }
.form { width: 100%; display: flex; flex-direction: column; gap: $space-md; }
.code-row { display: flex; align-items: center; gap: $space-md; }
.code-input { flex: 1; }
.code-btn { flex-shrink: 0; }
.submit-btn { margin-top: $space-sm; }
.login-link {
  text-align: center;
  color: $color-primary;
  font-size: $font-size-sm;
  margin-top: $space-md;
}
</style>
