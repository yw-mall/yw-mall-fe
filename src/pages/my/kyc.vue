<template>
  <view class="page">
    <!-- Rejected: show reason banner -->
    <wd-notice-bar v-if="kycStatus === 3 && rejectReason" :text="'审核未通过：' + rejectReason" left-icon="warning" custom-class="msg-banner" />

    <!-- ===== Form: status 0 (未提交) or 3 (拒绝可重新提交) ===== -->
    <view v-if="kycStatus === 0 || kycStatus === 3">
      <view class="section-card">
        <view class="section-title">身份证照片</view>

        <view class="upload-row">
          <view class="upload-item">
            <text class="upload-label">正面</text>
            <wd-upload
              :file-list="frontList"
              :limit="1"
              accept="image"
              @change="handleFront"
            />
          </view>
          <view class="upload-item">
            <text class="upload-label">反面</text>
            <wd-upload
              :file-list="backList"
              :limit="1"
              accept="image"
              @change="handleBack"
            />
          </view>
        </view>

        <view class="upload-video">
          <text class="upload-label">人脸视频（可选）</text>
          <wd-upload
            :file-list="videoList"
            :limit="1"
            accept="video"
            @change="handleVideo"
          />
        </view>
      </view>

      <view class="section-card">
        <view class="section-title">个人信息</view>
        <view class="form-row">
          <text class="form-label">真实姓名</text>
          <wd-input
            v-model="realName"
            placeholder="请输入真实姓名"
            no-border
            custom-class="form-input"
          />
        </view>
        <view class="divider" />
        <view class="form-row">
          <text class="form-label">身份证号</text>
          <wd-input
            v-model="idCardNo"
            placeholder="请输入18位身份证号"
            maxlength="18"
            no-border
            custom-class="form-input"
            @blur="validateIdCard"
          />
        </view>
        <text v-if="idCardError" class="field-error">{{ idCardError }}</text>
      </view>

      <view class="bottom-bar">
        <wd-button
          type="primary"
          block
          size="large"
          :loading="submitting"
          :disabled="!canSubmit"
          @tap="submit"
        >
          提交认证
        </wd-button>
      </view>
    </view>

    <!-- ===== Pending: status 1 (审核中) ===== -->
    <view v-else-if="kycStatus === 1" class="status-page">
      <wd-status-tip status="loading" title="审核中" tip="请耐心等待，审核结果将在1-3个工作日内通知" />
      <wd-button type="text" @tap="refreshStatus">刷新状态</wd-button>
    </view>

    <!-- ===== Approved: status 2 (已通过) ===== -->
    <view v-else-if="kycStatus === 2" class="status-page">
      <wd-status-tip status="success" title="认证已通过" />
      <view class="info-card">
        <view class="info-row">
          <text class="info-label">姓名</text>
          <text class="info-value">{{ maskedName }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">身份证</text>
          <text class="info-value">{{ maskedIdCard }}</text>
        </view>
        <view class="info-row" v-if="auditTimeStr">
          <text class="info-label">审核时间</text>
          <text class="info-value">{{ auditTimeStr }}</text>
        </view>
      </view>
    </view>

    <!-- Initial loading -->
    <view v-else-if="kycStatus === -1" class="state">
      <wd-skeleton :row="4" />
    </view>
  </view>
  <shared-tab-bar />
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getKycStatus, submitKyc } from '@/api/kyc'
import { uploadKycImage } from '@/api/upload'
import { showError } from '@/api/request'

// -1 = loading, 0 = 未提交, 1 = 审核中, 2 = 已通过, 3 = 已拒绝
const kycStatus = ref(-1)
const rejectReason = ref('')
const maskedName = ref('')
const maskedIdCard = ref('')
const auditTimeStr = ref('')

// Form state
const realName = ref('')
const idCardNo = ref('')
const idCardError = ref('')

// Upload file lists (wot-upload expects {url, ...} objects)
const frontList = ref<{ url: string }[]>([])
const backList = ref<{ url: string }[]>([])
const videoList = ref<{ url: string }[]>([])

// Resolved remote URLs after upload
const frontUrl = ref('')
const backUrl = ref('')
const videoUrl = ref('')

const submitting = ref(false)

const ID_CARD_RE = /^\d{17}[\dXx]$/

const canSubmit = computed(() =>
  realName.value.trim().length > 0 &&
  ID_CARD_RE.test(idCardNo.value) &&
  frontUrl.value !== '' &&
  backUrl.value !== ''
)

function validateIdCard() {
  if (idCardNo.value && !ID_CARD_RE.test(idCardNo.value)) {
    idCardError.value = '身份证号格式不正确'
  } else {
    idCardError.value = ''
  }
}

async function handleUploadChange(
  e: { fileList: { url?: string; path?: string }[] },
  targetUrl: ReturnType<typeof ref<string>>,
  targetList: ReturnType<typeof ref<{ url: string }[]>>
) {
  const files = e.fileList
  if (!files.length) {
    targetUrl.value = ''
    targetList.value = []
    return
  }
  const last = files[files.length - 1]
  const localPath = last.path ?? last.url ?? ''
  if (!localPath || localPath.startsWith('http')) {
    // already uploaded or cleared
    return
  }
  try {
    uni.showLoading({ title: '上传中...' })
    const resp = await uploadKycImage(localPath)
    targetUrl.value = resp.url
    targetList.value = [{ url: resp.url }]
  } catch (err) {
    showError(err)
    targetList.value = []
    targetUrl.value = ''
  } finally {
    uni.hideLoading()
  }
}

function handleFront(e: { fileList: { url?: string; path?: string }[] }) {
  handleUploadChange(e, frontUrl, frontList)
}

function handleBack(e: { fileList: { url?: string; path?: string }[] }) {
  handleUploadChange(e, backUrl, backList)
}

function handleVideo(e: { fileList: { url?: string; path?: string }[] }) {
  handleUploadChange(e, videoUrl, videoList)
}

async function submit() {
  validateIdCard()
  if (idCardError.value) return
  if (!canSubmit.value) {
    uni.showToast({ title: '请填写完整信息并上传身份证照片', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await submitKyc({
      realName: realName.value.trim(),
      idCardNo: idCardNo.value,
      idCardFrontUrl: frontUrl.value,
      idCardBackUrl: backUrl.value,
      faceVideoUrl: videoUrl.value,
    })
    uni.showToast({ title: '提交成功，等待审核', icon: 'success' })
    kycStatus.value = 1
    startPolling(1500, 20)
  } catch (err) {
    showError(err)
  } finally {
    submitting.value = false
  }
}

let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollCount = 0

function clearPoll() {
  if (pollTimer !== null) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

function startPolling(intervalMs: number, maxTimes: number) {
  clearPoll()
  pollCount = 0

  async function tick() {
    pollCount++
    try {
      const resp = await getKycStatus()
      applyStatusResp(resp)
      if (resp.status !== 1 || pollCount >= maxTimes) {
        clearPoll()
        return
      }
    } catch {
      // swallow poll errors silently
    }
    pollTimer = setTimeout(tick, intervalMs)
  }

  pollTimer = setTimeout(tick, intervalMs)
}

function applyStatusResp(resp: {
  status: number
  rejectReason: string
  submitTime: number
  auditTime: number
  realName: string
  idCardNo: string
}) {
  kycStatus.value = resp.status
  rejectReason.value = resp.rejectReason ?? ''
  maskedName.value = resp.realName ?? ''
  maskedIdCard.value = resp.idCardNo ?? ''
  if (resp.auditTime) {
    auditTimeStr.value = new Date(resp.auditTime * 1000).toLocaleString('zh-CN')
  }
  if (resp.status === 1) {
    // status returned to pending — auto-poll every 3s (manual refresh scenario)
  }
}

async function refreshStatus() {
  try {
    const resp = await getKycStatus()
    applyStatusResp(resp)
    if (resp.status === 1) {
      startPolling(3000, 100)
    }
  } catch (err) {
    showError(err)
  }
}

onShow(async () => {
  clearPoll()
  try {
    const resp = await getKycStatus()
    applyStatusResp(resp)
    if (resp.status === 1) {
      startPolling(3000, 100)
    }
  } catch {
    // If user never submitted, backend returns 0/empty — treat as not submitted
    kycStatus.value = 0
  }
})

onUnmounted(() => {
  clearPoll()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $color-bg-page;
  padding-bottom: 96px;
}

.msg-banner {
  margin: $space-sm $space-md 0;
}

.section-card {
  background: $color-bg-card;
  border-radius: 12px;
  margin: $space-md;
  padding: $space-md;
}

.section-title {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  margin-bottom: $space-sm;
  font-weight: $font-weight-medium;
}

.upload-row {
  display: flex;
  gap: $space-md;
  margin-bottom: $space-md;
}

.upload-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $space-xs;
}

.upload-video {
  display: flex;
  flex-direction: column;
  gap: $space-xs;
}

.upload-label {
  font-size: $font-size-sm;
  color: $color-text-hint;
}

.form-row {
  display: flex;
  align-items: center;
  padding: $space-xs 0;
}

.form-label {
  font-size: $font-size-base;
  color: $color-text-secondary;
  width: 80px;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
}

.divider {
  height: 1px;
  background: $color-border;
  margin: $space-xs 0;
}

.field-error {
  font-size: $font-size-sm;
  color: #f56c6c;
  display: block;
  padding-top: $space-xs;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: $space-sm $space-md calc(#{$space-sm} + env(safe-area-inset-bottom));
  background: $color-bg-card;
  border-top: 1px solid $color-border;
}

.status-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: $space-xl;
  gap: $space-lg;
}

.info-card {
  background: $color-bg-card;
  border-radius: 12px;
  padding: $space-md;
  width: 80%;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $space-xs 0;
  border-bottom: 1px solid $color-border;

  &:last-of-type {
    border-bottom: 0;
  }
}

.info-label {
  font-size: $font-size-sm;
  color: $color-text-hint;
}

.info-value {
  font-size: $font-size-base;
  color: $color-text-primary;
}

.state {
  padding: $space-xl $space-md;
}
</style>
