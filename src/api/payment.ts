import { request } from './request'
import type { CashierInfo, OkResp } from '@/types/api'

const BASE = '/api/payment'

export const getCashier = (orderId: number) =>
  request<CashierInfo>({ url: `${BASE}/cashier/${orderId}`, auth: true })

export const confirmMockPay = (orderId: number) =>
  request<OkResp>({ url: `${BASE}/mock-confirm/${orderId}`, method: 'POST', auth: true })
