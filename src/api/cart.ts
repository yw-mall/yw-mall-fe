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

// Phase 1 价格引擎: 实时算价 - 输入选中的购物车 items + 可选券 + 运费
export interface CartCalcItem {
  skuId: number
  productId: number
  shopId: number
  categoryId?: number
  originalPrice: number
  quantity: number
}

export interface CartCalcPriceResp {
  totalAmount: number
  promotionDiscount: number
  couponDiscount: number
  shippingFee: number
  paidAmount: number
  discountDetail: string
  conflicts?: { couponId: number; reason: string }[]
}

export const calcPrice = (data: {
  items: CartCalcItem[]
  couponIds?: number[]
  shippingFee?: number
}) =>
  request<CartCalcPriceResp>({
    url: `${BASE}/calc-price`,
    method: 'POST',
    auth: true,
    data: {
      items: data.items,
      couponIds: data.couponIds ?? [],
      shippingFee: data.shippingFee ?? 0,
    },
  })
