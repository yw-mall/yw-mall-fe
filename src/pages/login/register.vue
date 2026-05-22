<template>
  <view class="page">
    <view class="header">
      <text class="title">注册账号</text>
      <text class="subtitle">填写以下信息完成注册</text>
    </view>

    <view class="group-title">账号信息</view>
    <view class="card">
      <view class="field">
        <view class="row">
          <view class="label"><text class="req">*</text>用户名</view>
          <wd-input v-model="username" placeholder="请输入" clearable no-border custom-class="input-flat" />
        </view>
        <view class="hint" :class="{ 'hint-error': username && !usernameValid }">
          4-32 位，字母开头，可包含字母 / 数字 / 下划线
        </view>
      </view>

      <view class="field">
        <view class="row">
          <view class="label"><text class="req">*</text>密码</view>
          <wd-input v-model="password" placeholder="至少 8 位" show-password clearable no-border custom-class="input-flat" />
        </view>
        <view class="hint" :class="{ 'hint-error': password && !passwordValid }">
          至少 8 位，必须同时包含字母和数字
        </view>
      </view>

      <view class="field">
        <view class="row">
          <view class="label"><text class="req">*</text>确认密码</view>
          <wd-input v-model="passwordConfirm" placeholder="再次输入" show-password clearable no-border custom-class="input-flat" />
        </view>
        <view
          v-if="passwordConfirm"
          class="hint"
          :class="{ 'hint-error': passwordConfirm !== password }"
        >{{ passwordConfirm === password ? '两次输入一致' : '两次密码不一致' }}</view>
      </view>
    </view>

    <view class="group-title">联系方式</view>
    <view class="card">
      <view class="field">
        <view class="row">
          <view class="label"><text class="req">*</text>手机号</view>
          <wd-input v-model="phone" placeholder="11 位手机号" clearable no-border custom-class="input-flat" />
        </view>
        <view class="hint" :class="{ 'hint-error': phone && !phoneValid }">
          注册后可用手机号登录
        </view>
      </view>

      <view class="field">
        <view class="row">
          <view class="label"><text class="req">*</text>验证码</view>
          <wd-input v-model="verifyCode" placeholder="6 位" maxlength="6" no-border custom-class="input-flat" />
          <wd-button
            size="small"
            :disabled="cooldown > 0 || !phoneValid"
            :loading="sending"
            class="code-btn"
            @click="onSendCode"
          >{{ cooldown > 0 ? `${cooldown}s` : '发送' }}</wd-button>
        </view>
      </view>

      <view class="field">
        <view class="row">
          <view class="label">邮箱</view>
          <wd-input v-model="email" placeholder="选填" clearable no-border custom-class="input-flat" />
        </view>
        <view v-if="email" class="hint" :class="{ 'hint-error': !emailValid }">
          {{ emailValid ? '邮箱格式正确' : '邮箱格式不合法' }}
        </view>
        <view v-else class="hint hint-muted">填写后可用邮箱登录</view>
      </view>
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
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { sendVerifyCode, registerV2 } from '@/api/auth'
import { showError } from '@/api/request'

const username = ref('')
const password = ref('')
const passwordConfirm = ref('')
const phone = ref('')
const email = ref('')
const verifyCode = ref('')
const challengeToken = ref('')

const cooldown = ref(0)
const sending = ref(false)
const submitting = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

// Client-side rules mirror user-rpc regex (see registerv2logic.go).
const usernameRE = /^[a-zA-Z][a-zA-Z0-9_]{3,31}$/
const phoneRE = /^\d{11}$/
const emailRE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

const usernameValid = computed(() => usernameRE.test(username.value))
const passwordValid = computed(() =>
  password.value.length >= 8 && /[a-zA-Z]/.test(password.value) && /\d/.test(password.value),
)
const phoneValid = computed(() => phoneRE.test(phone.value))
const emailValid = computed(() => email.value === '' || emailRE.test(email.value))

const canSubmit = computed(() =>
  usernameValid.value &&
  passwordValid.value &&
  password.value === passwordConfirm.value &&
  phoneValid.value &&
  verifyCode.value.length === 6 &&
  !!challengeToken.value &&
  emailValid.value,
)

// phone 改 → 旧 token/code 失效，清掉避免下面提交报 "验证码不正确"
watch(phone, () => {
  challengeToken.value = ''
  verifyCode.value = ''
  cooldown.value = 0
  if (timer) { clearInterval(timer); timer = null }
})

async function onSendCode() {
  if (cooldown.value > 0) return
  sending.value = true
  try {
    const res = await sendVerifyCode({
      channel: 1,
      target: phone.value.trim(),
      scene: 1,
    })
    challengeToken.value = res.challengeToken
    // 开发态后端回显验证码，FE 直接填进框 + toast 显示，省得用户翻日志。
    // 接真 SMS 时后端 devCode 返空，这段就自然 noop。
    if (res.devCode) {
      verifyCode.value = res.devCode
      uni.showToast({ title: `开发态验证码：${res.devCode}`, icon: 'none', duration: 4000 })
    } else {
      uni.showToast({ title: '验证码已发送', icon: 'success' })
    }
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
      username: username.value.trim(),
      password: password.value,
      phone: phone.value.trim(),
      email: email.value.trim(),
      verifyCode: verifyCode.value.trim(),
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
  padding: 48rpx $space-lg $space-xl;
  box-sizing: border-box;
}

.header {
  text-align: center;
  margin-bottom: $space-lg;
  .title {
    display: block;
    font-size: 44rpx;
    font-weight: $font-weight-bold;
    color: $color-text-primary;
    margin-bottom: 12rpx;
  }
  .subtitle {
    font-size: $font-size-sm;
    color: $color-text-secondary;
  }
}

.group-title {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  padding: 0 8rpx 12rpx;
  margin-top: $space-md;
  &:first-of-type { margin-top: 0; }
}

.card {
  background: #fff;
  border-radius: 24rpx;
  padding: $space-md $space-lg;
  margin-bottom: $space-md;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f2f2f5;

  &:last-child { border-bottom: none; }
}

.row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-height: 80rpx;
}

.label {
  width: 150rpx;
  flex-shrink: 0;
  font-size: $font-size-base;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}
.req { color: #ff4b4b; margin-right: 4rpx; font-weight: $font-weight-bold; }

/* wd-input 根去 padding/边框, 文字右对齐 (iOS 设置风) */
:deep(.input-flat) { background: transparent !important; padding: 0 !important; flex: 1; }
:deep(.input-flat .wd-input__inner) {
  padding: 0 !important;
  font-size: $font-size-base;
  text-align: right;
}
:deep(.input-flat .wd-input__placeholder) { text-align: right; }

.hint {
  padding-left: 166rpx;
  font-size: $font-size-sm;
  color: $color-text-secondary;
  line-height: 1.5;
  margin-top: 2rpx;
  text-align: right;
}
.hint-error { color: #ff4b4b; }
.hint-muted { color: #c8c9cc; }

.code-btn { flex-shrink: 0; min-width: 160rpx; margin-left: 8rpx; }

.submit-btn {
  margin-top: $space-xl;
  height: 88rpx;
  font-size: $font-size-md;
}

.login-link {
  text-align: center;
  color: $color-primary;
  font-size: $font-size-sm;
  margin-top: $space-lg;
}
</style>
