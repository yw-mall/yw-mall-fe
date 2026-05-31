<template>
  <view class="page">
    <view class="summary-card">
      <view class="row">
        <text class="label">订单号</text>
        <text class="value">#{{ orderId }}</text>
      </view>
      <view class="row">
        <text class="label">订单金额</text>
        <text class="value strong">¥{{ (origAmount / 100).toFixed(2) }}</text>
      </view>
    </view>

    <view class="form-card">
      <view class="form-row">
        <text class="form-label">退款金额（元）</text>
        <input
          v-model="amountYuan"
          class="form-input"
          type="digit"
          :placeholder="(origAmount / 100).toFixed(2)"
        />
      </view>
      <view class="form-row column">
        <text class="form-label">退款原因</text>
        <textarea
          v-model="reason"
          class="form-textarea"
          placeholder="请描述申请退款的原因（必填）"
          maxlength="500"
        />
      </view>
      <view class="form-row column">
        <text class="form-label">凭证（可选）</text>
        <view class="placeholder-evidence">
          <text>上传功能将在后续版本接入对象存储</text>
        </view>
      </view>
    </view>

    <view class="bottom-bar">
      <wd-button type="primary" block size="large" :loading="submitting" @tap="submit">
        提交申请
      </wd-button>
    </view>
  </view>
  <shared-tab-bar />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { submitRefund } from '@/api/refund'
import { showError } from '@/api/request'

const orderId = ref(0)
const origAmount = ref(0)
const amountYuan = ref('')
const reason = ref('')
const submitting = ref(false)

function readQuery(): { orderId: number; amount: number } {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1] as unknown as {
    options: { orderId?: string; amount?: string }
  }
  return {
    orderId: Number(current.options?.orderId ?? 0),
    amount: Number(current.options?.amount ?? 0),
  }
}

async function submit() {
  if (!orderId.value) {
    uni.showToast({ title: '订单参数缺失', icon: 'none' })
    return
  }
  if (!reason.value.trim()) {
    uni.showToast({ title: '请填写退款原因', icon: 'none' })
    return
  }
  const cents = Math.round(Number(amountYuan.value || (origAmount.value / 100).toString()) * 100)
  if (!Number.isFinite(cents) || cents <= 0) {
    uni.showToast({ title: '退款金额无效', icon: 'none' })
    return
  }
  if (cents > origAmount.value) {
    uni.showToast({ title: '退款金额不能超过订单金额', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const resp = await submitRefund({
      orderId: orderId.value,
      amount: cents,
      reason: reason.value.trim(),
      evidence: [],
    })
    uni.showToast({ title: '申请已提交', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: `/pages/refund/detail?id=${resp.refundId}` })
    }, 600)
  } catch (err) {
    showError(err)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  const q = readQuery()
  orderId.value = q.orderId
  origAmount.value = q.amount
  if (q.amount > 0) {
    amountYuan.value = (q.amount / 100).toFixed(2)
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: $space-md;
  padding-bottom: 120px;
  background: $color-bg-page;
}

.summary-card,
.form-card {
  background: $color-bg-card;
  border-radius: 12px;
  padding: $space-md;
  margin-bottom: $space-md;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $space-xs 0;

  .label {
    font-size: $font-size-sm;
    color: $color-text-hint;
  }
  .value {
    font-size: $font-size-base;
    color: $color-text-primary;
    &.strong {
      font-weight: bold;
      color: $color-primary;
    }
  }
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-sm 0;
  border-bottom: 1px solid $color-border;

  &:last-of-type {
    border-bottom: 0;
  }

  &.column {
    flex-direction: column;
    align-items: flex-start;
    gap: $space-sm;
  }

  .form-label {
    font-size: $font-size-sm;
    color: $color-text-secondary;
  }
  .form-input {
    flex: 1;
    text-align: right;
    font-size: $font-size-base;
  }
  .form-textarea {
    width: 100%;
    min-height: 90px;
    padding: $space-sm;
    border: 1px solid $color-border;
    border-radius: 8px;
    background: $color-bg-page;
    font-size: $font-size-base;
  }

  .placeholder-evidence {
    width: 100%;
    padding: $space-md;
    background: $color-bg-page;
    border: 1px dashed $color-border;
    border-radius: 8px;
    text-align: center;
    font-size: $font-size-sm;
    color: $color-text-hint;
  }
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 50px; // 让出 50px 给 SharedTabBar
  padding: $space-md;
  background: $color-bg-card;
  border-top: 1px solid $color-border;
}
</style>
