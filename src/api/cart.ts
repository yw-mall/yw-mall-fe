import { request } from './request'
import type { CartListResp, OkResp } from '@/types/api'

const BASE = '/api/cart'

export const listCart = () =>
  request<CartListResp>({ url: `${BASE}/list`, method: 'GET', auth: true })

export const addCart = (productId: number, quantity = 1) =>
  request<OkResp>({ url: `${BASE}/add`, method: 'POST', data: { productId, quantity }, auth: true })

export const removeCart = (productId: number) =>
  request<OkResp>({ url: `${BASE}/remove`, method: 'POST', data: { productId }, auth: true })

export const updateCartQuantity = (productId: number, quantity: number) =>
  request<OkResp>({
    url: `${BASE}/update-quantity`,
    method: 'POST',
    data: { productId, quantity },
    auth: true,
  })

export const clearCart = () =>
  request<OkResp>({ url: `${BASE}/clear`, method: 'POST', auth: true })
