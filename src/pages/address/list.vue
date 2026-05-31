<template>
  <view class="page">
    <view v-if="loading" class="state"><wd-skeleton :row="4" /></view>
    <view v-else-if="!items.length" class="state">
      <wd-status-tip status="empty" tip="还没有收货地址，去添加一个吧" />
    </view>
    <view v-else class="list">
      <view v-for="addr in items" :key="addr.id" class="card">
        <view class="header">
          <text class="name">{{ addr.receiverName }}</text>
          <text class="phone">{{ addr.phone }}</text>
          <text v-if="addr.isDefault" class="badge">默认</text>
        </view>
        <text class="addr">{{ addr.province }}{{ addr.city }}{{ addr.district }} {{ addr.detail }}</text>
        <view class="row">
          <wd-button
            v-if="!addr.isDefault"
            size="small"
            type="text"
            @tap="setDefault(addr.id)"
          >设为默认</wd-button>
          <wd-button size="small" type="text" @tap="edit(addr.id)">编辑</wd-button>
          <wd-button size="small" type="text" custom-class="danger" @tap="remove(addr.id)">删除</wd-button>
        </view>
      </view>
    </view>

    <view class="bottom-bar">
      <wd-button type="primary" block @tap="add">新增地址</wd-button>
    </view>
  </view>
  <shared-tab-bar />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import * as addressApi from '@/api/address'
import { showError } from '@/api/request'
import type { AddressItem } from '@/types/api'

const items = ref<AddressItem[]>([])
const loading = ref(true)

async function refresh() {
  loading.value = true
  try {
    const resp = await addressApi.listAddresses()
    items.value = resp.addresses ?? []
  } catch (err) {
    showError(err)
  } finally {
    loading.value = false
  }
}

function add() {
  uni.navigateTo({ url: '/pages/address/edit' })
}

function edit(id: number) {
  uni.navigateTo({ url: `/pages/address/edit?id=${id}` })
}

async function setDefault(id: number) {
  try {
    await addressApi.setDefaultAddress(id)
    uni.showToast({ title: '已设为默认', icon: 'success' })
    await refresh()
  } catch (err) {
    showError(err)
  }
}

function remove(id: number) {
  uni.showModal({
    title: '提示',
    content: '确定删除这个地址？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await addressApi.deleteAddress(id)
        uni.showToast({ title: '已删除', icon: 'success' })
        await refresh()
      } catch (err) {
        showError(err)
      }
    },
  })
}

onShow(() => {
  refresh()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $color-bg-page;
  padding-bottom: 88px;
}

.state {
  padding: $space-xl $space-md;
}

.list {
  padding: $space-sm;
  display: flex;
  flex-direction: column;
  gap: $space-sm;
}

.card {
  background: $color-bg-card;
  border-radius: 8px;
  padding: $space-md;
  display: flex;
  flex-direction: column;
  gap: $space-xs;
}

.header {
  display: flex;
  align-items: center;
  gap: $space-sm;
}

.name {
  font-size: $font-size-md;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.phone {
  font-size: $font-size-base;
  color: $color-text-secondary;
}

.badge {
  font-size: $font-size-sm;
  background: $color-primary;
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
}

.addr {
  font-size: $font-size-base;
  color: $color-text-secondary;
  line-height: 1.5;
}

.row {
  display: flex;
  gap: $space-md;
  justify-content: flex-end;
  align-items: center;
  margin-top: $space-xs;

  ::v-deep(.danger) {
    color: #f56c6c;
  }
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: $space-sm $space-md calc(#{$space-sm} + env(safe-area-inset-bottom));
  background: $color-bg-card;
  border-top: 1px solid $color-border;
}
</style>
