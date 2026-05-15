import { request } from './request'

export function changePassword(oldPassword: string, newPassword: string) {
  return request<{ ok: boolean }>({
    url: '/api/user/password',
    method: 'POST',
    auth: true,
    data: { oldPassword, newPassword },
  })
}
