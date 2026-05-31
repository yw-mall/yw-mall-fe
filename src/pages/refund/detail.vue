<template>
  <view class="page">
    <view v-if="loading">
      <wd-skeleton :row="6" />
    </view>

    <view v-else-if="!refund">
      <wd-status-tip status="empty" title="退款记录不存在" />
    </view>

    <template v-else>
      <view class="status-card" :class="statusClass">
        <text class="status-text">{{ statusText }}</text>
        <text v-if="refund.refundNo" class="status-sub">退款单号 {{ refund.refundNo }}</text>
      </view>

      <view class="timeline-card">
        <text class="card-title">退款进度</text>
        <view class="timeline">
          <view
            v-for="(node, idx) in timeline"
            :key="node.key"
            class="timeline-row"
            :class="{ done: node.time > 0, current: idx === currentStep }"
          >
            <view class="timeline-dot" />
            <view class="timeline-content">
              <text class="timeline-label">{{ node.label }}</text>
              <text class="timeline-time">{{ node.time > 0 ? formatTime(node.time) : '—' }}</text>
              <text v-if="node.remark" class="timeline-remark">{{ node.remark }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="meta-card">
        <view class="meta-row">
          <text class="meta-label">订单号</text>
          <text class="meta-value">#{{ refund.orderId }} / {{ refund.orderNo }}</text>
        </view>
        <view class="meta-row">
          <text class="meta-label">退款金额</text>
          <text class="meta-value strong">¥{{ (refund.amount / 100).toFixed(2) }}</text>
        </view>
        <view class="meta-row">
          <text class="meta-label">退款原因</text>
          <text class="meta-value">{{ refund.reason }}</text>
        </view>
      </view>

      <view v-if="canAppeal" class="bottom-bar">
        <wd-button type="primary" block size="large" @tap="onAppeal">申请平台介入</wd-button>
      </view>
    </template>

    <wd-message-box />
  </view>
  <shared-tab-bar />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getRefund, appealRefund } from '@/api/refund'
import { showError } from '@/api/request'
import type { RefundRequest } from '@/types/api'

const refund = ref<RefundRequest | null>(null)
const loading = ref(true)

const STATUS_TEXT: Record<number, string> = {
  0: '待商家处理',
  1: '商家已同意',
  2: '商家已拒绝',
  3: '平台仲裁中',
  4: '退款已完成',
  5: '平台最终驳回',
}

const STATUS_CLASS: Record<number, string> = {
  0: 'status-pending',
  1: 'status-paid',
  2: 'status-rejected',
  3: 'status-arbitrating',
  4: 'status-done',
  5: 'status-rejected',
}

interface TimelineNode {
  key: string
  label: string
  time: number
  remark?: string
}

const statusText = computed(() => {
  if (!refund.value) return ''
  return STATUS_TEXT[refund.value.status] ?? '未知状态'
})

const statusClass = computed(() => {
  if (!refund.value) return ''
  return STATUS_CLASS[refund.value.status] ?? ''
})

const timeline = computed<TimelineNode[]>(() => {
  if (!refund.value) return []
  const r = refund.value
  const nodes: TimelineNode[] = [{ key: 'create', label: '提交申请', time: r.createTime }]
  if (r.merchantHandleTime && r.merchantHandleTime > 0) {
    nodes.push({
      key: 'merchant',
      label: r.status === 2 ? '商家已拒绝' : '商家已处理',
      time: r.merchantHandleTime,
      remark: r.merchantRemark,
    })
  }
  if (r.appealTime && r.appealTime > 0) {
    nodes.push({ key: 'appeal', label: '已申请平台介入', time: r.appealTime, remark: r.appealReason })
  }
  if (r.adminHandleTime && r.adminHandleTime > 0) {
    nodes.push({
      key: 'admin',
      label: r.status === 5 ? '平台最终驳回' : '平台仲裁通过',
      time: r.adminHandleTime,
      remark: r.adminRemark,
    })
  }
  if (r.refundCompleteTime && r.refundCompleteTime > 0) {
    nodes.push({ key: 'done', label: '退款到账', time: r.refundCompleteTime })
  }
  return nodes
})

const currentStep = computed(() => timeline.value.length - 1)

const canAppeal = computed(() => {
  if (!refund.value) return false
  return refund.value.status === 2 && !refund.value.appealTime
})

function formatTime(ts: number): string {
  const d = new Date(ts * 1000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getRefundIdFromRoute(): number {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1] as unknown as { options: { id?: string } }
  return Number(current.options?.id ?? 0)
}

async function load() {
  const id = getRefundIdFromRoute()
  if (!id) {
    loading.value = false
    return
  }
  try {
    refund.value = await getRefund(id)
  } catch (err) {
    showError(err)
  } finally {
    loading.value = false
  }
}

function onAppeal() {
  if (!refund.value) return
  const id = refund.value.id
  uni.showModal({
    title: '申请平台介入',
    content: '请填写您的申诉理由（确认后将进入平台仲裁）',
    editable: true,
    placeholderText: '申诉理由',
    success: async (res) => {
      if (!res.confirm) return
      const reason = (res.content ?? '').trim()
      if (!reason) {
        uni.showToast({ title: '请填写申诉理由', icon: 'none' })
        return
      }
      try {
        await appealRefund(id, reason)
        uni.showToast({ title: '已提交仲裁申请', icon: 'success' })
        load()
      } catch (err) {
        showError(err)
      }
    },
  })
}

onMounted(load)
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: $space-md;
  padding-bottom: 120px;
  background: $color-bg-page;
}

.status-card {
  padding: $space-xl $space-md;
  margin-bottom: $space-md;
  border-radius: 12px;
  text-align: center;
  color: #fff;

  .status-text {
    display: block;
    font-size: $font-size-xl;
    font-weight: bold;
    margin-bottom: $space-sm;
  }
  .status-sub {
    font-size: $font-size-sm;
    opacity: 0.9;
  }
}

.status-pending {
  background: linear-gradient(135deg, $color-warning, #FFB55A);
}
.status-paid {
  background: linear-gradient(135deg, $color-primary, $color-primary-light);
}
.status-arbitrating {
  background: linear-gradient(135deg, #6E5AE3, #9A89F2);
}
.status-done {
  background: linear-gradient(135deg, $color-success, #4ED88B);
}
.status-rejected {
  background: linear-gradient(135deg, $color-text-hint, $color-text-secondary);
}

.timeline-card,
.meta-card {
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

.timeline {
  position: relative;
  padding-left: $space-md;
}

.timeline-row {
  position: relative;
  display: flex;
  align-items: flex-start;
  padding: $space-sm 0 $space-md $space-lg;
  border-left: 2px solid $color-border;

  &:last-child {
    border-left-color: transparent;
  }

  .timeline-dot {
    position: absolute;
    left: -7px;
    top: 12px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: $color-border;
    border: 2px solid $color-bg-card;
    box-sizing: border-box;
  }

  &.done .timeline-dot {
    background: $color-primary;
  }

  &.current .timeline-dot {
    background: $color-primary;
    box-shadow: 0 0 0 4px rgba(255, 75, 75, 0.2);
  }

  .timeline-content {
    display: flex;
    flex-direction: column;
  }
  .timeline-label {
    font-size: $font-size-base;
    color: $color-text-primary;
  }
  .timeline-time {
    font-size: $font-size-sm;
    color: $color-text-hint;
    margin-top: 2px;
  }
  .timeline-remark {
    font-size: $font-size-sm;
    color: $color-text-secondary;
    margin-top: 4px;
  }
  &.done .timeline-label {
    font-weight: 600;
  }
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $space-sm 0;

  .meta-label {
    font-size: $font-size-sm;
    color: $color-text-hint;
  }
  .meta-value {
    font-size: $font-size-sm;
    color: $color-text-primary;
    max-width: 65%;
    text-align: right;
    word-break: break-all;
    &.strong {
      font-weight: bold;
      color: $color-primary;
    }
  }
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: $space-md;
  background: $color-bg-card;
  border-top: 1px solid $color-border;
}
</style>
