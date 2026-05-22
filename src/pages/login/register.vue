<template>
  <view class="page">
    <view class="header">
      <text class="title">欢迎注册</text>
      <text class="subtitle">填写下方信息，开启购物之旅</text>
    </view>

    <view class="form">
      <view class="input-block">
        <wd-input
          v-model="username"
          placeholder="用户名"
          prefix-icon="user"
          clearable
          no-border
          custom-class="jd-input"
        />
        <view class="hint" :class="{ 'hint-error': username && !usernameValid }">
          4-32 位，字母开头，可包含字母 / 数字 / 下划线
        </view>
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
        <view class="hint" :class="{ 'hint-error': password && !passwordValid }">
          至少 8 位，必须同时包含字母和数字
        </view>
      </view>

      <view class="input-block">
        <wd-input
          v-model="passwordConfirm"
          placeholder="再次输入密码"
          prefix-icon="lock-on"
          show-password
          clearable
          no-border
          custom-class="jd-input"
        />
        <view v-if="passwordConfirm" class="hint" :class="{ 'hint-error': passwordConfirm !== password }">
          {{ passwordConfirm === password ? '两次输入一致' : '两次密码不一致' }}
        </view>
      </view>

      <view class="input-block">
        <wd-input
          v-model="phone"
          placeholder="手机号"
          prefix-icon="phone"
          clearable
          no-border
          custom-class="jd-input"
        />
        <view class="hint" :class="{ 'hint-error': phone && !phoneValid }">
          11 位手机号，注册后可用手机号登录
        </view>
      </view>

      <view class="input-block input-block--code">
        <wd-input
          v-model="verifyCode"
          placeholder="短信验证码"
          prefix-icon="secured"
          maxlength="6"
          no-border
          custom-class="jd-input"
        />
        <text
          class="code-action"
          :class="{ 'code-action--disabled': cooldown > 0 || !phoneValid || sending }"
          @click="onSendCode"
        >{{ cooldown > 0 ? `${cooldown}s 后重发` : (sending ? '发送中...' : '获取验证码') }}</text>
      </view>

      <view class="input-block">
        <wd-input
          v-model="email"
          placeholder="邮箱（选填，填后可用邮箱登录）"
          prefix-icon="mail"
          clearable
          no-border
          custom-class="jd-input"
        />
        <view v-if="email" class="hint" :class="{ 'hint-error': !emailValid }">
          {{ emailValid ? '邮箱格式正确' : '邮箱格式不合法' }}
        </view>
      </view>
    </view>

    <wd-button
      type="primary"
      block
      :loading="submitting"
      :disabled="!canSubmit"
      class="submit-btn"
      @click="onSubmit"
    >立即注册</wd-button>

    <view class="login-link" @click="goLogin">已有账号？<text class="login-link__action">立即登录</text></view>
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
  if (cooldown.value > 0 || sending.value) return
  if (!phoneValid.value) return
  sending.value = true
  try {
    const res = await sendVerifyCode({
      channel: 1,
      target: phone.value.trim(),
      scene: 1,
    })
    challengeToken.value = res.challengeToken
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
  background: #fff;
  padding: 64rpx 56rpx $space-xl;
  box-sizing: border-box;
}

.header {
  margin-bottom: 56rpx;
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
  position: relative;

  &.input-block--code {
    display: flex;
    align-items: center;
  }
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

.code-action {
  flex-shrink: 0;
  padding-left: 24rpx;
  font-size: $font-size-base;
  color: #e1251b;
  font-weight: $font-weight-medium;
  border-left: 1rpx solid #e5e5e7;

  &--disabled { color: #b0b0b0; }
}

.hint {
  padding: 12rpx 8rpx 0;
  font-size: $font-size-sm;
  color: #999;
  line-height: 1.5;
}
.hint-error { color: #e1251b; }

.submit-btn {
  margin-top: 64rpx;
  height: 92rpx;
  font-size: 32rpx;
  border-radius: 46rpx !important;
  background: linear-gradient(90deg, #ff4b4b 0%, #e1251b 100%) !important;
}

.login-link {
  text-align: center;
  margin-top: 40rpx;
  color: #999;
  font-size: $font-size-sm;
  &__action { color: #e1251b; font-weight: $font-weight-medium; }
}
</style>
