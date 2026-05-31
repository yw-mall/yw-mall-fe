<template>
  <view class="page">
    <view class="tabs">
      <view
        v-for="t in tabs"
        :key="t.value"
        class="tab"
        :class="{ active: activeStatus === t.value }"
        @tap="switchTab(t.value)"
      >
        {{ t.label }}
      </view>
    </view>

    <view v-if="loading && !list.length">
      <wd-skeleton :row="4" />
    </view>

    <view v-else-if="!list.length">
      <wd-status-tip status="empty" title="暂无退款记录" />
    </view>

    <template v-else>
      <view
        v-for="r in list"
        :key="r.id"
        class="card"
        @tap="goDetail(r.id)"
      >
        <view class="card-top">
          <text class="order-no">订单 {{ r.orderNo }}</text>
          <text class="status" :class="statusClass(r.status)">{{ statusText(r.status) }}</text>
        </view>
        <view class="card-mid">
          <text class="amount">¥{{ (r.amount / 100).toFixed(2) }}</text>
          <text class="reason">{{ r.reason }}</text>
        </view>
        <view class="card-bot">
          <text class="time">{{ formatTime(r.createTime) }}</text>
        </view>
      </view>

      <view v-if="hasMore" class="load-more">
        <wd-button size="small" :loading="loading" @tap="loadMore">加载更多</wd-button>
      </view>
      <view v-else class="load-more end">已显示全部</view>
    </template>
  </view>
  <shared-tab-bar />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listMyRefunds } from '@/api/refund'
import { showError } from '@/api/request'
import type { RefundRequest } from '@/types/api'

const tabs = [
  { label: '全部', value: -1 },
  { label: '处理中', value: 0 },
  { label: '已退款', value: 4 },
  { label: '已拒绝', value: 2 },
  { label: '仲裁中', value: 3 },
]

const activeStatus = ref(-1)
const list = ref<RefundRequest[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const hasMore = ref(false)

const STATUS_TEXT: Record<number, string> = {
  0: '待处理',
  1: '已同意',
  2: '已拒绝',
  3: '仲裁中',
  4: '已退款',
  5: '已驳回',
}

const STATUS_CLASS: Record<number, string> = {
  0: 'pending',
  1: 'approved',
  2: 'rejected',
  3: 'arbitrating',
  4: 'done',
  5: 'rejected',
}

function statusText(s: number) {
  return STATUS_TEXT[s] ?? '未知'
}

function statusClass(s: number) {
  return STATUS_CLASS[s] ?? ''
}

function formatTime(ts: number) {
  const d = new Date(ts * 1000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function load(reset = false) {
  loading.value = true
  try {
    if (reset) {
      list.value = []
      page.value = 1
    }
    const resp = await listMyRefunds({
      status: activeStatus.value,
      page: page.value,
      pageSize,
    })
    if (page.value === 1) list.value = resp.requests ?? []
    else list.value.push(...(resp.requests ?? []))
    total.value = resp.total ?? 0
    hasMore.value = list.value.length < total.value
  } catch (err) {
    showError(err)
  } finally {
    loading.value = false
  }
}

function switchTab(status: number) {
  if (activeStatus.value === status) return
  activeStatus.value = status
  load(true)
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value += 1
  load()
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/refund/detail?id=${id}` })
}

onMounted(() => load(true))
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: $space-md;
  background: $color-bg-page;
}

.tabs {
  display: flex;
  gap: $space-sm;
  margin-bottom: $space-md;
  overflow-x: auto;
}

.tab {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: $font-size-sm;
  color: $color-text-secondary;
  background: $color-bg-card;

  &.active {
    background: $color-primary;
    color: #fff;
  }
}

.card {
  background: $color-bg-card;
  border-radius: 12px;
  padding: $space-md;
  margin-bottom: $space-md;

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $space-sm;

    .order-no {
      font-size: $font-size-sm;
      color: $color-text-hint;
    }
    .status {
      font-size: $font-size-sm;
      padding: 2px 8px;
      border-radius: 999px;

      &.pending {
        background: rgba(255, 153, 0, 0.12);
        color: $color-warning;
      }
      &.approved,
      &.done {
        background: rgba(0, 200, 100, 0.12);
        color: $color-success;
      }
      &.rejected {
        background: rgba(0, 0, 0, 0.08);
        color: $color-text-secondary;
      }
      &.arbitrating {
        background: rgba(110, 90, 227, 0.12);
        color: #6E5AE3;
      }
    }
  }
  .card-mid {
    display: flex;
    flex-direction: column;
    gap: $space-xs;
    .amount {
      font-size: $font-size-lg;
      font-weight: bold;
      color: $color-primary;
    }
    .reason {
      font-size: $font-size-sm;
      color: $color-text-secondary;
    }
  }
  .card-bot {
    display: flex;
    justify-content: flex-end;
    margin-top: $space-sm;
    .time {
      font-size: $font-size-sm;
      color: $color-text-hint;
    }
  }
}

.load-more {
  text-align: center;
  padding: $space-md 0;
  font-size: $font-size-sm;
  color: $color-text-hint;

  &.end {
    color: $color-text-hint;
  }
}
</style>
