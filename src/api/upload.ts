import { useUserStore } from '@/stores/user'

interface UploadReviewMediaResp {
  media: { type: number; url: string; sort: number }[]
}

export function uploadKycImage(filePath: string): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const userStore = useUserStore()
    uni.uploadFile({
      url: '/api/upload/review-media',
      filePath,
      name: 'file',
      header: userStore.token ? { Authorization: `Bearer ${userStore.token}` } : {},
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body: UploadReviewMediaResp =
            typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          const first = body?.media?.[0]
          if (first?.url) {
            resolve({ url: first.url })
          } else {
            reject({ code: -1, message: '上传响应格式异常' })
          }
        } else {
          reject({ code: res.statusCode, message: '上传失败' })
        }
      },
      fail(err) {
        reject({ code: -1, message: err.errMsg ?? '上传网络错误' })
      },
    })
  })
}
