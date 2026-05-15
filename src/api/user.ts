import { request } from './request'
import type { UserInfoResp } from '@/types/api'

export interface AuthLoginResp {
  uid: number
  username: string
  accessToken: string
  refreshToken: string
  expiresIn: number
  csrfToken: string
  // S4.3 — when true the FE must reLaunch to /pages/my/password before any other nav.
  passwordExpired?: boolean
}

// login hits the P0 /api/auth/login endpoint which returns the full opaque
// session (access + refresh + csrf). The legacy /api/user/login still works
// but returns the old `{ id, token }` shape only.
export function login(username: string, password: string) {
  return request<AuthLoginResp>({
    url: '/api/auth/login',
    method: 'POST',
    data: { username, password },
  })
}

export function logout() {
  return request<{ ok: boolean }>({
    url: '/api/auth/logout',
    method: 'POST',
    auth: true,
  })
}

export function getUserInfo() {
  return request<UserInfoResp>({ url: '/api/user/info', auth: true })
}
