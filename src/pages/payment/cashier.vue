<template>
  <view class="page">
    <view v-if="loading">
      <wd-skeleton :row="6" />
    </view>

    <view v-else-if="!cashier">
      <wd-status-tip status="empty" title="订单不存在" />
    </view>

    <template v-else>
      <view class="amount-card">
        <text class="amount-label">应付金额</text>
        <text class="amount-value">¥{{ (cashier.amount / 100).toFixed(2) }}</text>
        <text class="order-no">订单号 {{ cashier.orderNo }}</text>
        <text v-if="remaining > 0" class="countdown">支付剩余 {{ formatCountdown(remaining) }}</text>
        <text v-else class="expired">订单已超时，请重新下单</text>
      </view>

      <view class="channel-card">
        <text class="card-title">选择支付方式</text>

        <view
          v-for="ch in displayChannels"
          :key="ch.code"
          class="channel-row"
          :class="{ active: selected === ch.code }"
          @tap="selected = ch.code"
        >
          <view class="channel-left">
            <text class="channel-icon">{{ ch.icon }}</text>
            <view class="channel-text">
              <text class="channel-name">{{ ch.name }}</text>
              <text v-if="ch.tag" class="channel-tag">{{ ch.tag }}</text>
            </view>
          </view>
          <text class="channel-radio">{{ selected === ch.code ? '●' : '○' }}</text>
        </view>
      </view>

      <view v-if="cashier.mockEnabled" class="dev-hint">
        ⚠️ 开发模式：选择「Mock 一键确认」即视为支付成功（生产环境不显示）
      </view>

      <view class="bottom-bar">
        <wd-button
          type="primary"
          block
          size="large"
          :disabled="!canPay"
          :loading="paying"
          @tap="onPay"
        >
          {{ paying ? '支付中...' : `确认支付 ¥${(cashier.amount / 100).toFixed(2)}` }}
        </wd-button>
      </view>
    </template>
  </view>
  <shared-tab-bar />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getCashier, confirmMockPay } from '@/api/payment'
import { showError } from '@/api/request'
import type { CashierInfo } from '@/types/api'

const cashier = ref<CashierInfo | null>(null)
const loading = ref(true)
const paying = ref(false)
const selected = ref<string>('mock')
const now = ref(Math.floor(Date.now() / 1000))
let tickHandle: number | undefined

interface ChannelMeta {
  code: string
  name: string
  icon: string
  tag?: string
}

const allChannels: Record<string, ChannelMeta> = {
  mock: { code: 'mock', name: 'Mock 一键确认', icon: '🧪', tag: '开发模式' },
  wechat: { code: 'wechat', name: '微信支付', icon: '💚' },
  alipay: { code: 'alipay', name: '支付宝', icon: '🔵' },
  unionpay: { code: 'unionpay', name: '银联快捷', icon: '🔴' },
}

const displayChannels = computed<ChannelMeta[]>(() => {
  if (!cashier.value) return []
  return cashier.value.channels
    .map((code) => allChannels[code])
    .filter((c): c is ChannelMeta => !!c)
})

const remaining = computed(() => {
  if (!cashier.value) return 0
  return Math.max(0, cashier.value.expireAt - now.value)
})

const canPay = computed(() => !!cashier.value && remaining.value > 0 && !!selected.value)

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getOrderIdFromRoute(): number {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1] as unknown as { options: { orderId?: string } }
  return Number(current.options?.orderId ?? 0)
}

async function load() {
  const orderId = getOrderIdFromRoute()
  if (!orderId) {
    loading.value = false
    return
  }
  try {
    cashier.value = await getCashier(orderId)
    if (cashier.value.channels.length > 0) {
      selected.value = cashier.value.channels[0]
    }
  } catch (err) {
    showError(err)
  } finally {
    loading.value = false
  }
}

async function onPay() {
  if (!cashier.value || !canPay.value) return
  if (selected.value === 'mock') {
    paying.value = true
    try {
      await confirmMockPay(cashier.value.orderId)
      uni.showToast({ title: '支付成功', icon: 'success', duration: 1500 })
      setTimeout(() => {
        uni.redirectTo({ url: `/pages/order/detail?id=${cashier.value!.orderId}` })
      }, 1200)
    } catch (err) {
      showError(err)
    } finally {
      paying.value = false
    }
  } else {
    uni.showToast({
      title: '该支付渠道将在 Sprint 11 上线',
      icon: 'none',
      duration: 2000,
    })
  }
}

onMounted(() => {
  load()
  tickHandle = setInterval(() => {
    now.value = Math.floor(Date.now() / 1000)
  }, 1000) as unknown as number
})

onUnmounted(() => {
  if (tickHandle) clearInterval(tickHandle)
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: $space-md;
  padding-bottom: 120px;
  background: $color-bg-page;
}

.amount-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-xl $space-md;
  margin-bottom: $space-md;
  background: $color-bg-card;
  border-radius: 12px;

  .amount-label {
    font-size: $font-size-sm;
    color: $color-text-secondary;
    margin-bottom: $space-sm;
  }
  .amount-value {
    font-size: 36px;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: $space-md;
  }
  .order-no {
    font-size: $font-size-sm;
    color: $color-text-hint;
    margin-bottom: $space-sm;
  }
  .countdown {
    font-size: $font-size-base;
    color: $color-warning;
  }
  .expired {
    font-size: $font-size-base;
    color: $color-error;
  }
}

.channel-card {
  background: $color-bg-card;
  border-radius: 12px;
  padding: $space-md;
  margin-bottom: $space-md;

  .card-title {
    display: block;
    font-size: $font-size-md;
    font-weight: 600;
    margin-bottom: $space-md;
    color: $color-text-primary;
  }
}

.channel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-md 0;
  border-bottom: 1px solid $color-border;

  &:last-child {
    border-bottom: 0;
  }

  &.active {
    .channel-name {
      color: $color-primary;
      font-weight: 600;
    }
  }

  .channel-left {
    display: flex;
    align-items: center;
    gap: $space-md;
  }
  .channel-icon {
    font-size: 28px;
  }
  .channel-text {
    display: flex;
    flex-direction: column;
  }
  .channel-name {
    font-size: $font-size-base;
    color: $color-text-primary;
  }
  .channel-tag {
    font-size: 11px;
    color: $color-warning;
    margin-top: 2px;
  }
  .channel-radio {
    font-size: 20px;
    color: $color-primary;
  }
}

.dev-hint {
  background: #FFF5E6;
  color: $color-warning;
  padding: $space-md;
  border-radius: 8px;
  font-size: $font-size-sm;
  margin-bottom: $space-md;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 50px; // 让出 50px 给 SharedTabBar, 不互相遮挡
  padding: $space-md;
  background: $color-bg-card;
  border-top: 1px solid $color-border;
}
</style>
