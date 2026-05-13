import { useUserStore } from '@/stores/user'
import type { ApiError } from '@/types/api'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, unknown>
  auth?: boolean
  // _retried is set by the interceptor after a 401 → refresh round-trip so we
  // don't loop on a refresh that itself fails.
  _retried?: boolean
}

interface RefreshResp {
  uid: number
  username: string
  accessToken: string
  refreshToken: string
  expiresIn: number
  csrfToken: string
}

// Single in-flight refresh promise so a burst of 401s doesn't trigger a burst
// of refreshes (which would invalidate each other).
let refreshing: Promise<boolean> | null = null

function callRefresh(): Promise<boolean> {
  if (refreshing) return refreshing
  refreshing = new Promise<boolean>((resolve) => {
    const userStore = useUserStore()
    const rt = userStore.refreshToken
    if (!rt) {
      resolve(false)
      return
    }
    uni.request({
      url: '/api/auth/refresh',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { refreshToken: rt },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body = res.data as RefreshResp
          userStore.setSession({
            accessToken: body.accessToken,
            refreshToken: body.refreshToken,
            csrfToken: body.csrfToken,
            expiresIn: body.expiresIn,
            uid: body.uid,
          })
          resolve(true)
        } else {
          resolve(false)
        }
      },
      fail() {
        resolve(false)
      },
    })
  }).finally(() => {
    refreshing = null
  })
  return refreshing
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE'])

export function request<T>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, auth = false, _retried = false } = options

  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const userStore = useUserStore()
  if (auth && userStore.token) {
    header['Authorization'] = `Bearer ${userStore.token}`
  }
  // Double-submit CSRF (P0 design 2.x). Only attach on writes when we have a
  // bound csrf token — backend will start enforcing in P1.
  if (WRITE_METHODS.has(method) && userStore.csrfToken) {
    header['X-CSRF-Token'] = userStore.csrfToken
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method,
      data,
      header,
      success(res) {
        if (res.statusCode === 401) {
          // Try one refresh round before kicking the user back to /login.
          if (!_retried && auth && userStore.refreshToken) {
            callRefresh().then((ok) => {
              if (ok) {
                request<T>({ ...options, _retried: true }).then(resolve).catch(reject)
              } else {
                userStore.clear()
                uni.reLaunch({ url: '/pages/login/index' })
                reject({ code: 401, message: '请先登录' } as ApiError)
              }
            })
            return
          }
          userStore.clear()
          uni.reLaunch({ url: '/pages/login/index' })
          reject({ code: 401, message: '请先登录' } as ApiError)
          return
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T)
        } else {
          const body = res.data as { message?: string; code?: number }
          reject({
            code: body?.code ?? res.statusCode,
            message: body?.message ?? '请求失败',
          } as ApiError)
        }
      },
      fail(err) {
        reject({ code: -1, message: err.errMsg ?? '网络错误，请重试' } as ApiError)
      },
    })
  })
}

export function showError(err: unknown): void {
  const message = (err as ApiError)?.message ?? '请求失败，请重试'
  uni.showToast({ title: message, icon: 'none', duration: 2000 })
}
