<template>
  <view class="page">
    <view v-if="loading" class="state">
      <wd-skeleton :row="5" />
    </view>
    <view v-else-if="!cartStore.items.length" class="state">
      <wd-status-tip status="content" tip="购物车空空如也" />
    </view>
    <template v-else>
      <view class="list">
        <view v-for="row in rows" :key="row.productId" class="item">
          <image
            class="thumb"
            :src="row.image || '/static/placeholder.png'"
            mode="aspectFill"
          />
          <view class="info">
            <text class="name">{{ row.name }}</text>
            <text class="price">¥{{ (row.price / 100).toFixed(2) }}</text>
          </view>
          <view class="actions">
            <wd-input-number
              :model-value="row.quantity"
              :min="1"
              :max="row.stock || 999"
              @change="qtyHandler(row.productId)"
            />
            <wd-button size="small" type="text" @tap="remove(row.productId)">删除</wd-button>
          </view>
        </view>
      </view>

      <view class="bottom-bar">
        <view class="total">合计 <text class="price">¥{{ (total / 100).toFixed(2) }}</text></view>
        <wd-button type="primary" :disabled="!cartStore.items.length" @tap="checkout">
          结算 ({{ cartStore.count }})
        </wd-button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { getProductDetail } from '@/api/product'
import { showError } from '@/api/request'

interface Row {
  productId: number
  name: string
  price: number
  stock: number
  image: string
  quantity: number
}

const cartStore = useCartStore()
const userStore = useUserStore()
const loading = ref(true)
const productMap = ref<Record<number, { name: string; price: number; stock: number; image: string }>>({})

const rows = computed<Row[]>(() =>
  cartStore.items.map((it) => {
    const p = productMap.value[it.productId]
    return {
      productId: it.productId,
      quantity: it.quantity,
      name: p?.name ?? `#${it.productId}`,
      price: p?.price ?? 0,
      stock: p?.stock ?? 0,
      image: p?.image ?? '',
    }
  }),
)

const total = computed(() => rows.value.reduce((sum, r) => sum + r.price * r.quantity, 0))

async function refresh() {
  loading.value = true
  try {
    if (!userStore.token) {
      uni.navigateTo({ url: '/pages/login/index' })
      return
    }
    await cartStore.load()
    const missing = cartStore.items
      .map((it) => it.productId)
      .filter((pid) => !productMap.value[pid])
    if (missing.length) {
      const fetched = await Promise.all(missing.map((pid) => getProductDetail(pid).catch(() => null)))
      const next = { ...productMap.value }
      fetched.forEach((p, i) => {
        if (!p) return
        next[missing[i]] = {
          name: p.name,
          price: p.price,
          stock: p.stock,
          image: p.images?.[0] ?? '',
        }
      })
      productMap.value = next
    }
  } catch (err) {
    showError(err)
  } finally {
    loading.value = false
  }
}

async function changeQty(productId: number, quantity: number) {
  try {
    await cartStore.updateQuantity(productId, quantity)
  } catch (err) {
    showError(err)
  }
}

function qtyHandler(productId: number) {
  return (e: { value: number }) => changeQty(productId, e.value)
}

async function remove(productId: number) {
  try {
    await cartStore.remove(productId)
  } catch (err) {
    showError(err)
  }
}

function checkout() {
  uni.showToast({ title: '结算页待接入', icon: 'none' })
}

onShow(() => {
  refresh()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $color-bg-page;
  padding-bottom: 96px;
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

.item {
  background: $color-bg-card;
  border-radius: 8px;
  padding: $space-sm;
  display: flex;
  gap: $space-sm;
  align-items: center;
}

.thumb {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  background: $color-border;
  flex-shrink: 0;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $space-xs;
  min-width: 0;
}

.name {
  font-size: $font-size-base;
  color: $color-text-primary;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.price {
  font-size: $font-size-md;
  color: $color-primary;
  font-weight: $font-weight-bold;
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: $space-xs;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: $space-sm $space-md;
  background: $color-bg-card;
  border-top: 1px solid $color-border;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $space-md;
}

.total {
  font-size: $font-size-base;
  color: $color-text-primary;
}
</style>
