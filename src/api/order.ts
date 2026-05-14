import { request } from './request'
import type { CreateOrderItem, CreateOrderResp, OrderDetailResp, OrderListResp } from '@/types/api'

const BASE = '/api/order'

export const getOrderDetail = (id: number) =>
  request<OrderDetailResp>({ url: `${BASE}/detail/${id}`, auth: true })

export const listMyOrders = (params: { status?: number; page?: number; pageSize?: number } = {}) =>
  request<OrderListResp>({
    url: `${BASE}/list`,
    data: { status: params.status ?? -1, page: params.page ?? 1, pageSize: params.pageSize ?? 20 },
    auth: true,
  })

export const createOrder = (items: CreateOrderItem[]) =>
  request<CreateOrderResp>({
    url: `${BASE}/create`,
    method: 'POST',
    data: { items } as unknown as Record<string, unknown>,
    auth: true,
  })
