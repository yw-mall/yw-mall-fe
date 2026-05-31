// C 端优惠券 - 券中心列表 / 领券 / 我的券包
import { request } from './request'

export interface CouponTemplateView {
  templateId: number
  shopId: number
  name: string
  type: 'full_reduce' | 'discount' | 'cash' | 'freeship'
  value: number // 分；折扣类是百分比 (75=7.5折)
  minAmount: number
  maxDiscount: number
  totalCount: number
  receivedCount: number
  perUserLimit: number
  validType: number // 0固定/1领后N天
  validDays: number
  validStart: number
  validEnd: number
  receiveStart: number
  receiveEnd: number
}

export interface MyCouponView {
  id: number
  templateId: number
  shopId: number
  status: number // 0未用/1已锁定/2已使用/3已过期
  orderId: number
  receiveTime: number
  expireTime: number
  useTime: number
  templateName: string
  type: string
  value: number
  minAmount: number
}

export const listAvailableCoupons = (params: {
  shopId?: number
  page?: number
  pageSize?: number
}) =>
  request<{ templates: CouponTemplateView[]; total: number }>({
    url: '/api/coupon/list',
    data: {
      shopId: params.shopId ?? 0,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    },
  })

export const receiveCoupon = (templateId: number) =>
  request<{ couponId: number }>({
    url: '/api/coupon/receive',
    method: 'POST',
    auth: true,
    data: { templateId },
  })

export const listMyCoupons = (params: { status?: number; page?: number; pageSize?: number }) =>
  request<{ coupons: MyCouponView[]; total: number }>({
    url: '/api/coupon/my',
    auth: true,
    data: {
      status: params.status ?? -1,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    },
  })
