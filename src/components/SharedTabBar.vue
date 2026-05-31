<!--
  非 tabBar 页面用的共享底部 tab。
  原生 tabBar 只在 pages.json tabBar.list 里的 3 个页面显示，
  其它页面 (product/order/shop/coupon/...) 用这个组件挂底部。
  尺寸 + 风格保持与原生 tabBar 一致 (50px 高、color/selectedColor 同步)。
-->
<template>
  <view class="shared-tabbar">
    <view
      class="tab-item"
      :class="{ active: active === 'home' }"
      @tap="goTab('/pages/index/index')"
    >
      <text class="icon">🏠</text>
      <text class="label">首页</text>
    </view>
    <view
      class="tab-item"
      :class="{ active: active === 'cart' }"
      @tap="goTab('/pages/cart/index')"
    >
      <text class="icon">🛒</text>
      <text class="label">购物车</text>
    </view>
    <view
      class="tab-item"
      :class="{ active: active === 'my' }"
      @tap="goTab('/pages/my/index')"
    >
      <text class="icon">👤</text>
      <text class="label">我的</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  active?: 'home' | 'cart' | 'my'
}>()

function goTab(url: string) {
  uni.switchTab({
    url,
    // 兜底: 部分 H5 实现 switchTab 在非 tabBar 路径时会 fail
    fail: () => uni.reLaunch({ url }),
  })
}
</script>

<style lang="scss" scoped>
.shared-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  background: #fff;
  border-top: 1px solid #eee;
  display: flex;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #999999;
  font-size: 11px;

  &.active {
    color: #ff4b4b;
  }
}

.icon {
  font-size: 22px;
  line-height: 1;
}

.label {
  font-size: 11px;
  line-height: 1;
}
</style>
