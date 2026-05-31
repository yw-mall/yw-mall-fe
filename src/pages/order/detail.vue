<template>
  <view class="page">
    <view v-if="loading">
      <wd-skeleton :row="8" />
    </view>

    <view v-else-if="!order">
      <wd-status-tip status="empty" title="订单不存在" />
    </view>

    <template v-else>
      <view class="status-card" :class="statusClass">
        <text class="status-text">{{ statusText }}</text>
        <text v-if="order.status === 0 && payCountdown > 0" class="status-sub">
          剩 {{ formatCountdown(payCountdown) }} 自动取消
        </text>
        <text v-else-if="order.cancelReason" class="status-sub">{{ order.cancelReason }}</text>
      </view>

      <view class="timeline-card">
        <text class="card-title">订单时间线</text>
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
            </view>
          </view>
        </view>
      </view>

      <view class="items-card">
        <text class="card-title">商品明细</text>
        <view v-for="item in order.items" :key="item.productId" class="item-row">
          <view class="item-info">
            <text class="item-name">{{ item.productName }}</text>
            <text class="item-qty">×{{ item.quantity }}</text>
          </view>
          <text class="item-price">¥{{ ((item.price * item.quantity) / 100).toFixed(2) }}</text>
        </view>
        <view class="item-total">
          <text>商品合计</text>
          <text class="total-amount">¥{{ (order.totalAmount / 100).toFixed(2) }}</text>
        </view>
        <view v-if="(order.promotionDiscount || 0) > 0" class="item-total discount">
          <text>活动优惠</text>
          <text>- ¥{{ ((order.promotionDiscount || 0) / 100).toFixed(2) }}</text>
        </view>
        <view v-if="(order.couponDiscount || 0) > 0" class="item-total discount">
          <text>优惠券</text>
          <text>- ¥{{ ((order.couponDiscount || 0) / 100).toFixed(2) }}</text>
        </view>
        <view v-if="(order.promotionDiscount || 0) + (order.couponDiscount || 0) > 0" class="item-total paid">
          <text>实付金额</text>
          <text class="total-amount">¥{{ ((order.paidAmount || order.totalAmount) / 100).toFixed(2) }}</text>
        </view>
      </view>

      <view class="meta-card">
        <view class="meta-row">
          <text class="meta-label">订单号</text>
          <text class="meta-value">{{ order.orderNo }}</text>
        </view>
      </view>

      <view v-if="order.status === 0" class="bottom-bar">
        <wd-button type="primary" block size="large" @tap="goCashier">
          去支付 ¥{{ ((order.paidAmount || order.totalAmount) / 100).toFixed(2) }}
        </wd-button>
      </view>
      <view v-else-if="canRefund" class="bottom-bar">
        <wd-button block size="large" @tap="goRefund">申请退款</wd-button>
      </view>
    </template>
  </view>
  <shared-tab-bar />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getOrderDetail } from '@/api/order'
import { showError } from '@/api/request'
import type { OrderDetailResp } from '@/types/api'

const order = ref<OrderDetailResp | null>(null)
const loading = ref(true)
const now = ref(Math.floor(Date.now() / 1000))
let tickHandle: number | undefined

const PAY_TIMEOUT_SEC = 15 * 60

interface TimelineNode {
  key: string
  label: string
  time: number
}

const timeline = computed<TimelineNode[]>(() => {
  if (!order.value) return []
  const o = order.value
  // 取消分支独立显示
  if (o.status === 4) {
    return [
      { key: 'create', label: '订单创建', time: o.createTime },
      { key: 'cancel', label: '订单取消', time: o.cancelTime ?? 0 },
    ]
  }
  return [
    { key: 'create', label: '订单创建', time: o.createTime },
    { key: 'pay', label: '已支付', time: o.payTime ?? 0 },
    { key: 'ship', label: '已发货', time: o.shipTime ?? 0 },
    { key: 'complete', label: '已完成', time: o.completeTime ?? 0 },
  ]
})

const currentStep = computed(() => {
  // 高亮当前进行中的下一节点
  for (let i = 0; i < timeline.value.length; i++) {
    if (timeline.value[i].time === 0) return i
  }
  return timeline.value.length - 1
})

const statusText = computed(() => {
  if (!order.value) return ''
  const map: Record<number, string> = {
    0: '待支付',
    1: '已支付，等待发货',
    2: '已发货，待签收',
    3: '订单已完成',
    4: '订单已取消',
  }
  return map[order.value.status] ?? '未知状态'
})

const statusClass = computed(() => {
  if (!order.value) return ''
  return {
    0: 'status-pending',
    1: 'status-paid',
    2: 'status-shipping',
    3: 'status-done',
    4: 'status-cancelled',
  }[order.value.status] ?? ''
})

const payCountdown = computed(() => {
  if (!order.value || order.value.status !== 0) return 0
  return Math.max(0, order.value.createTime + PAY_TIMEOUT_SEC - now.value)
})

function formatTime(ts: number): string {
  const d = new Date(ts * 1000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function goCashier() {
  if (!order.value) return
  uni.navigateTo({ url: `/pages/payment/cashier?orderId=${order.value.id}` })
}

const canRefund = computed(() => {
  if (!order.value) return false
  return [1, 2, 3].includes(order.value.status)
})

function goRefund() {
  if (!order.value) return
  uni.navigateTo({
    url: `/pages/refund/apply?orderId=${order.value.id}&amount=${order.value.totalAmount}`,
  })
}

function getOrderIdFromRoute(): number {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1] as unknown as { options: { id?: string } }
  return Number(current.options?.id ?? 0)
}

async function load() {
  const id = getOrderIdFromRoute()
  if (!id) {
    loading.value = false
    return
  }
  try {
    order.value = await getOrderDetail(id)
  } catch (err) {
    showError(err)
  } finally {
    loading.value = false
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
.status-paid,
.status-shipping {
  background: linear-gradient(135deg, $color-primary, $color-primary-light);
}
.status-done {
  background: linear-gradient(135deg, $color-success, #4ED88B);
}
.status-cancelled {
  background: linear-gradient(135deg, $color-text-hint, $color-text-secondary);
}

.timeline-card,
.items-card,
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
  &.done .timeline-label {
    font-weight: 600;
  }
}

.item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-sm 0;
  border-bottom: 1px solid $color-border;

  &:last-of-type {
    border-bottom: 0;
  }

  .item-info {
    display: flex;
    align-items: center;
    gap: $space-sm;
  }
  .item-name {
    font-size: $font-size-base;
    color: $color-text-primary;
  }
  .item-qty {
    font-size: $font-size-sm;
    color: $color-text-hint;
  }
  .item-price {
    font-size: $font-size-base;
    color: $color-text-secondary;
  }
}

.item-total {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: $space-sm;
  padding-top: $space-md;
  margin-top: $space-md;
  border-top: 1px solid $color-border;

  .total-amount {
    font-size: $font-size-lg;
    font-weight: bold;
    color: $color-primary;
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
