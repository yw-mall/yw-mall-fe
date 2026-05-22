import { request } from './request'
import type { SendCodeReq, SendCodeResp, RegisterV2Req, RegisterV2Resp } from '@/types/api'

export function sendVerifyCode(req: SendCodeReq) {
  return request<SendCodeResp>({
    url: '/api/auth/send-code',
    method: 'POST',
    data: req as unknown as Record<string, unknown>,
  })
}

export function registerV2(req: RegisterV2Req) {
  return request<RegisterV2Resp>({
    url: '/api/auth/register',
    method: 'POST',
    data: req as unknown as Record<string, unknown>,
  })
}

export function resetPassword(req: import('@/types/api').ResetPasswordReq) {
  return request<{ ok: boolean }>({
    url: '/api/auth/reset-password',
    method: 'POST',
    data: req,
  })
}
