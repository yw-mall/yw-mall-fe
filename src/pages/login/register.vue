<template>
  <view class="page">
    <view class="logo-area">
      <wd-icon name="shop" size="64px" :color="'#FF4B4B'" />
      <text class="app-name">注册账号</text>
    </view>

    <view class="form">
      <view class="field">
        <wd-input v-model="username" placeholder="用户名" clearable />
        <view class="hint" :class="{ 'hint-error': username && !usernameValid }">
          4-32 位，字母开头，可包含字母 / 数字 / 下划线
        </view>
      </view>

      <view class="field">
        <wd-input v-model="password" placeholder="密码" type="password" show-password clearable />
        <view class="hint" :class="{ 'hint-error': password && !passwordValid }">
          至少 8 位，必须同时包含字母和数字
        </view>
      </view>

      <view class="field">
        <wd-input v-model="passwordConfirm" placeholder="再次输入密码" type="password" show-password clearable />
        <view
          v-if="passwordConfirm"
          class="hint"
          :class="{ 'hint-error': passwordConfirm !== password }"
        >{{ passwordConfirm === password ? '两次输入一致' : '两次密码不一致' }}</view>
      </view>

      <wd-radio-group v-model="channel" inline shape="dot">
        <wd-radio :value="1">手机号</wd-radio>
        <wd-radio :value="2">邮箱</wd-radio>
      </wd-radio-group>

      <view class="field">
        <wd-input v-model="target" :placeholder="channel === 1 ? '手机号' : '邮箱地址'" clearable />
        <view class="hint" :class="{ 'hint-error': target && !targetValid }">
          {{ channel === 1 ? '11 位手机号' : '例：user@example.com' }}
        </view>
      </view>

      <view class="code-row">
        <wd-input v-model="verifyCode" placeholder="6 位验证码" maxlength="6" class="code-input" />
        <wd-button
          size="small"
          :disabled="cooldown > 0 || !targetValid"
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

// Client-side rules mirror user-rpc regex (see registerv2logic.go).
// 服务端是真理源，这里只做即时反馈避免一来回 toast 才看到错。
const usernameRE = /^[a-zA-Z][a-zA-Z0-9_]{3,31}$/
const phoneRE = /^\d{11}$/
const emailRE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

const usernameValid = computed(() => usernameRE.test(username.value))
const passwordValid = computed(() =>
  password.value.length >= 8 && /[a-zA-Z]/.test(password.value) && /\d/.test(password.value),
)
const targetValid = computed(() =>
  channel.value === 1 ? phoneRE.test(target.value) : emailRE.test(target.value),
)

const canSubmit = computed(() =>
  usernameValid.value &&
  passwordValid.value &&
  password.value === passwordConfirm.value &&
  targetValid.value &&
  verifyCode.value.length === 6 &&
  !!challengeToken.value,
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
.field { display: flex; flex-direction: column; gap: 6rpx; }
.hint {
  padding-left: 20rpx;
  font-size: $font-size-sm;
  color: $color-text-secondary;
  line-height: 1.4;
}
.hint-error { color: #ff4b4b; }
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
