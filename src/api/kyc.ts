import { request } from './request'
import type { SubmitKycReq, SubmitKycResp, KycStatusResp } from '@/types/api'

export function submitKyc(req: SubmitKycReq) {
  return request<SubmitKycResp>({
    url: '/api/user/kyc/submit',
    method: 'POST',
    data: req as unknown as Record<string, unknown>,
    auth: true,
  })
}

export function getKycStatus() {
  return request<KycStatusResp>({
    url: '/api/user/kyc/status',
    auth: true,
  })
}
