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
          <view class="check" @tap="toggleOne(row.productId)">
            <text class="check-mark" :class="{ on: isSelected(row.productId) }">
              {{ isSelected(row.productId) ? '✓' : '' }}
            </text>
          </view>
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
        <view class="check-all" @tap="toggleAll">
          <text class="check-mark" :class="{ on: allSelected }">{{ allSelected ? '✓' : '' }}</text>
          <text class="check-all-label">全选</text>
        </view>
        <view class="total-area">
          <text class="total-label">合计</text>
          <text class="total-value">¥{{ (selectedTotal / 100).toFixed(2) }}</text>
        </view>
        <wd-button
          type="primary"
          :disabled="selectedCount === 0 || checkingOut"
          :loading="checkingOut"
          @tap="checkout"
        >
          去结算{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}
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
import { createOrder } from '@/api/order'
import { showError } from '@/api/request'
import type { CreateOrderItem } from '@/types/api'

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
const checkingOut = ref(false)
const productMap = ref<Record<number, { name: string; price: number; stock: number; image: string }>>({})
const selectedIds = ref<Set<number>>(new Set())

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

const allSelected = computed(
  () => rows.value.length > 0 && rows.value.every((r) => selectedIds.value.has(r.productId)),
)

const selectedRows = computed(() => rows.value.filter((r) => selectedIds.value.has(r.productId)))

const selectedTotal = computed(() =>
  selectedRows.value.reduce((sum, r) => sum + r.price * r.quantity, 0),
)

const selectedCount = computed(() =>
  selectedRows.value.reduce((sum, r) => sum + r.quantity, 0),
)

function isSelected(productId: number): boolean {
  return selectedIds.value.has(productId)
}

function toggleOne(productId: number) {
  const next = new Set(selectedIds.value)
  if (next.has(productId)) {
    next.delete(productId)
  } else {
    next.add(productId)
  }
  selectedIds.value = next
}

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(rows.value.map((r) => r.productId))
  }
}

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
      const fetched = await Promise.all(
        missing.map((pid) => getProductDetail(pid).catch(() => null)),
      )
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
    // Default: select everything currently in the cart so the user can hit
    // 去结算 immediately. Preserve any prior manual deselection by keeping
    // ids that are still in the cart.
    const present = new Set(cartStore.items.map((it) => it.productId))
    if (selectedIds.value.size === 0) {
      selectedIds.value = new Set(present)
    } else {
      const filtered = new Set<number>()
      selectedIds.value.forEach((id) => {
        if (present.has(id)) filtered.add(id)
      })
      // Auto-select newly added items.
      present.forEach((id) => filtered.add(id))
      selectedIds.value = filtered
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
    const next = new Set(selectedIds.value)
    next.delete(productId)
    selectedIds.value = next
  } catch (err) {
    showError(err)
  }
}

async function checkout() {
  if (!selectedRows.value.length) return
  checkingOut.value = true
  try {
    const items: CreateOrderItem[] = selectedRows.value.map((r) => ({
      productId: r.productId,
      productName: r.name,
      price: r.price,
      quantity: r.quantity,
    }))
    const resp = await createOrder(items)
    uni.redirectTo({ url: `/pages/payment/cashier?orderId=${resp.id}` })
  } catch (err) {
    showError(err)
  } finally {
    checkingOut.value = false
  }
}

onShow(() => {
  refresh()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $color-bg-page;
  padding-bottom: 110px;
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

.check {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.check-mark {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid $color-border;
  background: $color-bg-card;
  color: #fff;
  font-size: 14px;
  line-height: 22px;
  text-align: center;
  box-sizing: border-box;
}

.check-mark.on {
  border-color: $color-primary;
  background: $color-primary;
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
  align-items: center;
  gap: $space-md;
}

.check-all {
  display: flex;
  align-items: center;
  gap: $space-xs;
  flex-shrink: 0;
}

.check-all-label {
  font-size: $font-size-base;
  color: $color-text-primary;
}

.total-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.total-label {
  font-size: $font-size-sm;
  color: $color-text-hint;
}

.total-value {
  font-size: $font-size-md;
  color: $color-primary;
  font-weight: $font-weight-bold;
}
</style>
