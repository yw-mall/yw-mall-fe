<template>
  <view class="page">
    <view class="logo-area">
      <wd-icon name="shop" size="64px" :color="'#FF4B4B'" />
      <text class="app-name">注册账号</text>
    </view>

    <view class="form">
      <view class="field">
        <view class="label"><text class="req">*</text> 用户名</view>
        <wd-input v-model="username" placeholder="请输入用户名" clearable />
        <view class="hint" :class="{ 'hint-error': username && !usernameValid }">
          4-32 位，字母开头，可包含字母 / 数字 / 下划线
        </view>
      </view>

      <view class="field">
        <view class="label"><text class="req">*</text> 密码</view>
        <wd-input v-model="password" placeholder="请输入密码" type="password" show-password clearable />
        <view class="hint" :class="{ 'hint-error': password && !passwordValid }">
          至少 8 位，必须同时包含字母和数字
        </view>
      </view>

      <view class="field">
        <view class="label"><text class="req">*</text> 确认密码</view>
        <wd-input v-model="passwordConfirm" placeholder="再次输入密码" type="password" show-password clearable />
        <view
          v-if="passwordConfirm"
          class="hint"
          :class="{ 'hint-error': passwordConfirm !== password }"
        >{{ passwordConfirm === password ? '两次输入一致' : '两次密码不一致' }}</view>
      </view>

      <view class="field">
        <view class="label"><text class="req">*</text> 手机号</view>
        <wd-input v-model="phone" placeholder="11 位手机号（用于接收短信验证码）" clearable />
        <view class="hint" :class="{ 'hint-error': phone && !phoneValid }">
          11 位手机号，注册后可用手机号登录
        </view>
      </view>

      <view class="field">
        <view class="code-row">
          <view class="code-left">
            <view class="label"><text class="req">*</text> 短信验证码</view>
            <wd-input v-model="verifyCode" placeholder="6 位验证码" maxlength="6" />
          </view>
          <wd-button
            size="small"
            :disabled="cooldown > 0 || !phoneValid"
            :loading="sending"
            class="code-btn"
            @click="onSendCode"
          >{{ cooldown > 0 ? `${cooldown}s` : '发送验证码' }}</wd-button>
        </view>
      </view>

      <view class="field">
        <view class="label">邮箱<text class="opt">（选填，填写后可用邮箱登录）</text></view>
        <wd-input v-model="email" placeholder="例：user@example.com" clearable />
        <view v-if="email" class="hint" :class="{ 'hint-error': !emailValid }">
          {{ emailValid ? '邮箱格式正确' : '邮箱格式不合法' }}
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
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
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
// email 选填: 空字符串视为合法 (不提交), 填了必须 valid。
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

async function onSendCode() {
  if (cooldown.value > 0) return
  sending.value = true
  try {
    const res = await sendVerifyCode({
      channel: 1,         // sms 固定 — 短信验证码必填
      target: phone.value,
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
      phone: phone.value,
      email: email.value,    // 空串后端就不写 email_hash
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
.field { display: flex; flex-direction: column; gap: 8rpx; }
.label {
  font-size: $font-size-sm;
  color: $color-text-primary;
  padding-left: 4rpx;
}
.req { color: #ff4b4b; margin-right: 4rpx; }
.opt { color: $color-text-secondary; font-size: $font-size-sm; margin-left: 8rpx; }
.hint {
  padding-left: 20rpx;
  font-size: $font-size-sm;
  color: $color-text-secondary;
  line-height: 1.4;
}
.hint-error { color: #ff4b4b; }
.code-row { display: flex; align-items: flex-end; gap: $space-md; }
.code-left { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.code-btn { flex-shrink: 0; }
.submit-btn { margin-top: $space-sm; }
.login-link {
  text-align: center;
  color: $color-primary;
  font-size: $font-size-sm;
  margin-top: $space-md;
}
</style>
