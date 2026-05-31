<template>
  <view class="page">
    <view v-if="loading" class="state"><wd-skeleton :row="5" /></view>
    <view v-else class="form">
      <wd-input v-model="form.receiverName" label="收货人" placeholder="姓名" clearable />
      <wd-input v-model="form.phone" label="手机号" placeholder="11 位手机号" clearable />
      <wd-input v-model="form.province" label="省" placeholder="如 北京市" clearable />
      <wd-input v-model="form.city" label="市" placeholder="如 北京市" clearable />
      <wd-input v-model="form.district" label="区" placeholder="如 朝阳区" clearable />
      <wd-input v-model="form.detail" label="详细" placeholder="街道、门牌号" clearable />
      <view class="default-row">
        <text>设为默认地址</text>
        <wd-switch :model-value="form.isDefault" @change="onToggleDefault" />
      </view>
    </view>

    <view class="bottom-bar">
      <wd-button type="primary" block :loading="saving" :disabled="!canSave || saving" @tap="save">
        {{ isEdit ? '保存修改' : '新增地址' }}
      </wd-button>
    </view>
  </view>
  <shared-tab-bar />
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import * as addressApi from '@/api/address'
import { showError } from '@/api/request'

const id = ref<number>(0)
const isEdit = computed(() => id.value > 0)
const loading = ref(false)
const saving = ref(false)

const form = reactive({
  receiverName: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: false,
})

const canSave = computed(
  () =>
    form.receiverName.trim() &&
    /^\d{11}$/.test(form.phone) &&
    form.province.trim() &&
    form.city.trim() &&
    form.district.trim() &&
    form.detail.trim(),
)

onLoad(async (query) => {
  const raw = (query as Record<string, string | undefined>)?.id
  id.value = Number(raw ?? 0)
  if (!isEdit.value) return
  loading.value = true
  try {
    const a = await addressApi.getAddress(id.value)
    form.receiverName = a.receiverName
    form.phone = a.phone
    form.province = a.province
    form.city = a.city
    form.district = a.district
    form.detail = a.detail
    form.isDefault = a.isDefault
  } catch (err) {
    showError(err)
  } finally {
    loading.value = false
  }
})

function onToggleDefault(e: { value: boolean }) {
  form.isDefault = e.value
}

async function save() {
  if (!canSave.value) {
    uni.showToast({ title: '请填写完整', icon: 'none' })
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await addressApi.updateAddress(id.value, { ...form })
    } else {
      await addressApi.addAddress({ ...form })
    }
    uni.showToast({ title: isEdit.value ? '已保存' : '已添加', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  } catch (err) {
    showError(err)
  } finally {
    saving.value = false
  }
}
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

.form {
  padding: $space-sm;
  display: flex;
  flex-direction: column;
  gap: $space-sm;
  background: $color-bg-card;
}

.default-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-sm $space-md;
  background: $color-bg-card;
  font-size: $font-size-base;
  color: $color-text-primary;
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
