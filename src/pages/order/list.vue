<template>
  <view class="page">
    <wd-tabs v-model="activeTab" sticky @change="onTabChange">
      <wd-tab :title="tab.title" v-for="tab in tabs" :key="tab.value" :name="tab.value" />
    </wd-tabs>

    <view class="list">
      <view v-if="loading && orders.length === 0">
        <wd-skeleton :row="6" />
      </view>

      <wd-status-tip
        v-else-if="!loading && orders.length === 0"
        status="empty"
        title="还没有订单"
        sub-title="去逛逛吧"
      />

      <view
        v-for="o in orders"
        :key="o.id"
        class="order-card"
        @tap="goDetail(o.id)"
      >
        <view class="card-head">
          <text class="order-no">{{ o.orderNo }}</text>
          <text class="status" :class="statusClass(o.status)">{{ statusText(o.status) }}</text>
        </view>

        <view class="card-body">
          <view v-for="item in o.items" :key="item.productId" class="row">
            <text class="row-name">{{ item.productName }}</text>
            <text class="row-qty">×{{ item.quantity }}</text>
          </view>
        </view>

        <view class="card-foot">
          <text class="time">{{ formatTime(o.createTime) }}</text>
          <text class="amount">¥{{ (o.totalAmount / 100).toFixed(2) }}</text>
        </view>

        <view v-if="o.status === 0" class="card-action">
          <wd-button size="small" type="primary" plain @tap.stop="goCashier(o.id)">
            去支付
          </wd-button>
        </view>
      </view>
    </view>
  </view>
  <shared-tab-bar />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listMyOrders } from '@/api/order'
import { showError } from '@/api/request'
import type { OrderDetailResp } from '@/types/api'

const tabs = [
  { title: '全部', value: -1 },
  { title: '待支付', value: 0 },
  { title: '待发货', value: 1 },
  { title: '已发货', value: 2 },
  { title: '已完成', value: 3 },
]

const activeTab = ref<number>(-1)
const orders = ref<OrderDetailResp[]>([])
const loading = ref(true)

function statusText(s: number): string {
  return ({
    0: '待支付',
    1: '待发货',
    2: '已发货',
    3: '已完成',
    4: '已取消',
  } as Record<number, string>)[s] ?? '未知'
}

function statusClass(s: number): string {
  return ({
    0: 'tag-pending',
    1: 'tag-paid',
    2: 'tag-shipping',
    3: 'tag-done',
    4: 'tag-cancelled',
  } as Record<number, string>)[s] ?? ''
}

function formatTime(ts: number): string {
  const d = new Date(ts * 1000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/order/detail?id=${id}` })
}

function goCashier(id: number) {
  uni.navigateTo({ url: `/pages/payment/cashier?orderId=${id}` })
}

async function load() {
  loading.value = true
  try {
    const resp = await listMyOrders({
      status: activeTab.value < 0 ? undefined : activeTab.value,
      page: 1,
      pageSize: 20,
    })
    orders.value = resp.orders ?? []
  } catch (err) {
    showError(err)
  } finally {
    loading.value = false
  }
}

function onTabChange() {
  load()
}

onMounted(() => {
  load()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $color-bg-page;
}

.list {
  padding: $space-md;
}

.order-card {
  background: $color-bg-card;
  border-radius: 12px;
  padding: $space-md;
  margin-bottom: $space-md;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: $space-sm;
  border-bottom: 1px solid $color-border;

  .order-no {
    font-size: $font-size-sm;
    color: $color-text-hint;
  }
  .status {
    font-size: $font-size-sm;
    padding: 2px 8px;
    border-radius: 4px;
  }
}

.tag-pending {
  background: rgba(250, 140, 22, 0.1);
  color: $color-warning;
}
.tag-paid,
.tag-shipping {
  background: rgba(255, 75, 75, 0.1);
  color: $color-primary;
}
.tag-done {
  background: rgba(7, 193, 96, 0.1);
  color: $color-success;
}
.tag-cancelled {
  background: rgba(153, 153, 153, 0.1);
  color: $color-text-hint;
}

.card-body {
  padding: $space-sm 0;

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 0;
  }
  .row-name {
    font-size: $font-size-base;
    color: $color-text-primary;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row-qty {
    font-size: $font-size-sm;
    color: $color-text-hint;
    margin-left: $space-sm;
  }
}

.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: $space-sm;
  border-top: 1px solid $color-border;

  .time {
    font-size: $font-size-sm;
    color: $color-text-hint;
  }
  .amount {
    font-size: $font-size-md;
    font-weight: bold;
    color: $color-primary;
  }
}

.card-action {
  display: flex;
  justify-content: flex-end;
  margin-top: $space-sm;
  padding-top: $space-sm;
  border-top: 1px solid $color-border;
}
</style>
