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
              @change="(e: { value: number }) => changeQty(row.productId, e.value)"
            />
            <wd-button size="small" type="text" @tap="remove(row.productId)">删除</wd-button>
          </view>
        </view>
      </view>

      <!-- 优惠明细面板 (有任何减免时显示) -->
      <view
        v-if="priceCalc && (priceCalc.promotionDiscount > 0 || priceCalc.couponDiscount > 0)"
        class="discount-panel"
      >
        <view class="discount-row">
          <text class="lbl">商品合计</text>
          <text class="val">¥{{ (selectedTotal / 100).toFixed(2) }}</text>
        </view>
        <view v-if="priceCalc.promotionDiscount > 0" class="discount-row">
          <text class="lbl">活动优惠</text>
          <text class="val saved">- ¥{{ (priceCalc.promotionDiscount / 100).toFixed(2) }}</text>
        </view>
        <view v-if="priceCalc.couponDiscount > 0" class="discount-row">
          <text class="lbl">优惠券{{ appliedCoupon ? '（' + appliedCoupon.templateName + '）' : '' }}</text>
          <text class="val saved">- ¥{{ (priceCalc.couponDiscount / 100).toFixed(2) }}</text>
        </view>
      </view>

      <view class="bottom-bar">
        <view class="check-all" @tap="toggleAll">
          <text class="check-mark" :class="{ on: allSelected }">{{ allSelected ? '✓' : '' }}</text>
          <text class="check-all-label">全选</text>
        </view>
        <view class="total-area">
          <text class="total-label">{{ priceCalc && (priceCalc.promotionDiscount > 0 || priceCalc.couponDiscount > 0) ? '实付' : '合计' }}</text>
          <text class="total-value">
            ¥{{ (((priceCalc?.paidAmount) ?? selectedTotal) / 100).toFixed(2) }}
          </text>
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
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { getProductDetail } from '@/api/product'
import { createOrder } from '@/api/order'
import { calcPrice } from '@/api/cart'
import { listMyCoupons, type MyCouponView } from '@/api/coupon'
import { showError } from '@/api/request'
import type { CreateOrderItem } from '@/types/api'

interface Row {
  productId: number
  shopId: number
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
const productMap = ref<Record<number, { name: string; price: number; stock: number; image: string; shopId: number }>>({})
const selectedIds = ref<Set<number>>(new Set())

// Phase 1 价格引擎：实时算价后的优惠拆分
const priceCalc = ref<{ promotionDiscount: number; couponDiscount: number; paidAmount: number } | null>(null)
const priceCalcing = ref(false)
let calcTimer: ReturnType<typeof setTimeout> | null = null

// 用户可用券 + 当前自动选用的券 id (取门槛达标 + 面值最大那张)
const myCoupons = ref<MyCouponView[]>([])
const selectedCouponId = ref<number | null>(null)
const appliedCoupon = computed(() =>
  selectedCouponId.value ? myCoupons.value.find((c) => c.id === selectedCouponId.value) : null,
)

const rows = computed<Row[]>(() =>
  cartStore.items.map((it) => {
    const p = productMap.value[it.productId]
    return {
      productId: it.productId,
      shopId: p?.shopId ?? 0,
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
    loadCoupons() // 后台异步加载, 不 block 渲染
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
          shopId: p.shopId,
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
    const resp = await createOrder(items, {
      couponIds: selectedCouponId.value ? [selectedCouponId.value] : [],
    })
    uni.redirectTo({ url: `/pages/payment/cashier?orderId=${resp.id}` })
  } catch (err) {
    showError(err)
  } finally {
    checkingOut.value = false
  }
}

// 加载用户可用券 (status=0 未用), 自动选 "门槛达标 + 面值最大" 一张
async function loadCoupons() {
  if (!userStore.token) return
  try {
    const r = await listMyCoupons({ status: 0, pageSize: 50 })
    myCoupons.value = r.coupons ?? []
  } catch {
    myCoupons.value = []
  }
}

// 在 selectedRows 变后, 重新挑最优券 (门槛达标 + 单店内匹配 shopId + 面值最大)
function pickBestCoupon() {
  if (!myCoupons.value.length || !selectedRows.value.length) {
    selectedCouponId.value = null
    return
  }
  const shopSubtotal: Record<number, number> = {}
  for (const r of selectedRows.value) {
    shopSubtotal[r.shopId] = (shopSubtotal[r.shopId] ?? 0) + r.price * r.quantity
  }
  let best: MyCouponView | null = null
  for (const c of myCoupons.value) {
    const subtotal = c.shopId > 0 ? shopSubtotal[c.shopId] ?? 0 : Object.values(shopSubtotal).reduce((a, b) => a + b, 0)
    if (subtotal < c.minAmount) continue
    if (!best || c.value > best.value) best = c
  }
  selectedCouponId.value = best ? best.id : null
}

// 实时算价 - 500ms 防抖, 选择变化 / 数量变化 / 券变化都触发
function triggerCalcPrice() {
  if (calcTimer) clearTimeout(calcTimer)
  calcTimer = setTimeout(async () => {
    if (!selectedRows.value.length) {
      priceCalc.value = null
      return
    }
    if (selectedRows.value.some((r) => r.shopId === 0)) {
      priceCalc.value = null
      return
    }
    pickBestCoupon()
    priceCalcing.value = true
    try {
      const r = await calcPrice({
        items: selectedRows.value.map((row) => ({
          skuId: row.productId,
          productId: row.productId,
          shopId: row.shopId,
          originalPrice: row.price,
          quantity: row.quantity,
        })),
        couponIds: selectedCouponId.value ? [selectedCouponId.value] : [],
      })
      priceCalc.value = {
        promotionDiscount: r.promotionDiscount,
        couponDiscount: r.couponDiscount,
        paidAmount: r.paidAmount,
      }
    } catch {
      priceCalc.value = null
    } finally {
      priceCalcing.value = false
    }
  }, 300)
}

watch([selectedRows, () => rows.value.map((r) => r.quantity).join(','), myCoupons], triggerCalcPrice, { immediate: true })

onShow(() => {
  refresh()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $color-bg-page;
  // 110px = bottom-bar (~60) + uni-app H5 tabBar (~50) — so 列表底部内容不会被
  // 底部栏 + tabBar 一起盖住。
  padding-bottom: 160px;
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
  // 50px 让 bottom-bar 浮在 uni-app H5 tabBar 之上（默认 tabBar 高 50px）。
  // iOS 安全区由 padding-bottom: env(safe-area-inset-bottom) 兜底。
  bottom: 50px;
  left: 0;
  right: 0;
  padding: $space-sm $space-md calc(#{$space-sm} + env(safe-area-inset-bottom));
  background: $color-bg-card;
  border-top: 1px solid $color-border;
  display: flex;
  align-items: center;
  gap: $space-md;
  z-index: 10;
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

.discount-line {
  display: flex;
  gap: 4px;
  font-size: $font-size-sm;
  color: $color-text-hint;
}

.discount-amount {
  color: #67c23a;
  font-weight: $font-weight-medium;
}

.discount-panel {
  position: fixed;
  bottom: calc(50px + 60px + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  background: #fff8f0;
  border-top: 1px solid #ffe4d0;
  padding: $space-sm $space-md;
  z-index: 9;
}

.discount-row {
  display: flex;
  justify-content: space-between;
  font-size: $font-size-sm;
  line-height: 1.6;

  .lbl {
    color: $color-text-secondary;
  }

  .val {
    color: $color-text-primary;
    &.saved {
      color: #e6a23c;
      font-weight: $font-weight-medium;
    }
  }
}
</style>
