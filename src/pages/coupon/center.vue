<template>
  <view class="page">
    <wd-tabs v-model="activeTab" sticky>
      <wd-tab title="可领券" name="available" />
      <wd-tab title="我的券包" name="my" />
    </wd-tabs>

    <!-- 可领券列表 -->
    <view v-if="activeTab === 'available'" class="list">
      <view v-if="availableLoading" class="loading">加载中...</view>
      <view v-else-if="available.length === 0" class="empty">
        <wd-status-tip status="empty" title="暂无可领券" />
      </view>
      <view v-for="t in available" :key="t.templateId" class="card">
        <view class="value-block">
          <view class="value">
            <text class="amount">{{ fmtValue(t) }}</text>
          </view>
          <view class="cond">{{ t.minAmount > 0 ? '满 ¥' + (t.minAmount / 100).toFixed(0) + ' 可用' : '无门槛' }}</view>
        </view>
        <view class="info">
          <view class="name">{{ t.name }}</view>
          <view class="meta">{{ fmtValidity(t) }}</view>
          <view class="meta muted">剩余 {{ t.totalCount - t.receivedCount }} / {{ t.totalCount }}</view>
        </view>
        <view class="action">
          <wd-button type="primary" size="small" @click="handleReceive(t)">领取</wd-button>
        </view>
      </view>
    </view>

    <!-- 我的券包 -->
    <view v-if="activeTab === 'my'" class="list">
      <wd-tabs v-model="myStatus" @change="reloadMy">
        <wd-tab title="未使用" :name="0" />
        <wd-tab title="已使用" :name="2" />
        <wd-tab title="已过期" :name="3" />
      </wd-tabs>
      <view v-if="myLoading" class="loading">加载中...</view>
      <view v-else-if="my.length === 0" class="empty">
        <wd-status-tip status="empty" title="暂无券" />
      </view>
      <view v-for="c in my" :key="c.id" class="card" :class="{ disabled: c.status !== 0 }">
        <view class="value-block">
          <view class="value">
            <text class="amount">{{ fmtMyValue(c) }}</text>
          </view>
          <view class="cond">{{ c.minAmount > 0 ? '满 ¥' + (c.minAmount / 100).toFixed(0) + ' 可用' : '无门槛' }}</view>
        </view>
        <view class="info">
          <view class="name">{{ c.templateName }}</view>
          <view class="meta">有效期至 {{ fmtTs(c.expireTime) }}</view>
          <view v-if="c.status === 2" class="meta success">已使用 - 订单 #{{ c.orderId }}</view>
          <view v-else-if="c.status === 3" class="meta error">已过期</view>
        </view>
      </view>
    </view>
  </view>
  <shared-tab-bar />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  listAvailableCoupons,
  listMyCoupons,
  receiveCoupon,
  type CouponTemplateView,
  type MyCouponView,
} from '@/api/coupon'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const activeTab = ref<'available' | 'my'>('available')

const available = ref<CouponTemplateView[]>([])
const availableLoading = ref(false)
const my = ref<MyCouponView[]>([])
const myLoading = ref(false)
const myStatus = ref<number>(0)

async function reloadAvailable() {
  availableLoading.value = true
  try {
    const r = await listAvailableCoupons({ pageSize: 50 })
    available.value = r.templates ?? []
  } finally {
    availableLoading.value = false
  }
}

async function reloadMy() {
  if (!userStore.token) {
    my.value = []
    return
  }
  myLoading.value = true
  try {
    const r = await listMyCoupons({ status: myStatus.value, pageSize: 50 })
    my.value = r.coupons ?? []
  } finally {
    myLoading.value = false
  }
}

onShow(() => {
  reloadAvailable()
  reloadMy()
})

async function handleReceive(t: CouponTemplateView) {
  if (!userStore.token) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.navigateTo({ url: '/pages/login/index' })
    return
  }
  try {
    await receiveCoupon(t.templateId)
    uni.showToast({ title: '领取成功', icon: 'success' })
    reloadAvailable()
    reloadMy()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '领取失败', icon: 'none' })
  }
}

function fmtValue(t: CouponTemplateView): string {
  if (t.type === 'discount') return (t.value / 10).toFixed(1) + '折'
  if (t.type === 'freeship') return '包邮'
  return '¥' + (t.value / 100).toFixed(0)
}
function fmtMyValue(c: MyCouponView): string {
  if (c.type === 'discount') return (c.value / 10).toFixed(1) + '折'
  if (c.type === 'freeship') return '包邮'
  return '¥' + (c.value / 100).toFixed(0)
}
function fmtValidity(t: CouponTemplateView): string {
  if (t.validType === 1) return `领取后 ${t.validDays} 天有效`
  return `${fmtTs(t.validStart)} ~ ${fmtTs(t.validEnd)}`
}
function fmtTs(ts: number): string {
  return ts ? new Date(ts * 1000).toLocaleDateString() : ''
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $color-bg-page;
}

.list {
  padding: $space-md;
}

.loading,
.empty {
  text-align: center;
  padding: $space-xl;
  color: $color-text-secondary;
}

.card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: $radius-md;
  margin-bottom: $space-md;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);

  &.disabled {
    opacity: 0.55;
  }
}

.value-block {
  width: 200rpx;
  padding: $space-md;
  background: linear-gradient(135deg, #ff4b4b 0%, #e1251b 100%);
  color: #fff;
  text-align: center;
  flex-shrink: 0;
}

.value .amount {
  font-size: 40rpx;
  font-weight: $font-weight-bold;
}

.cond {
  font-size: 22rpx;
  margin-top: $space-xs;
  opacity: 0.9;
}

.info {
  flex: 1;
  padding: $space-md;
  min-width: 0;
}

.name {
  font-size: $font-size-md;
  font-weight: $font-weight-medium;
  margin-bottom: $space-xs;
}

.meta {
  font-size: 22rpx;
  color: $color-text-secondary;
  &.success { color: $color-success; }
  &.error { color: $color-error; }
  &.muted { opacity: 0.7; }
}

.action {
  padding-right: $space-md;
  flex-shrink: 0;
}
</style>
