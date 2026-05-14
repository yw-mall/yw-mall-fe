import { request } from './request'
import type { AddressItem, OkResp } from '@/types/api'

const BASE = '/api/address'

export interface AddressInput {
  receiverName: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault?: boolean
}

export const listAddresses = () =>
  request<{ items: AddressItem[] }>({ url: `${BASE}/list`, auth: true })

export const getAddress = (id: number) =>
  request<AddressItem>({ url: `${BASE}/${id}`, auth: true })

export const getDefaultAddress = () =>
  request<AddressItem>({ url: `${BASE}/default`, auth: true })

export const addAddress = (input: AddressInput) =>
  request<{ id: number }>({
    url: `${BASE}/add`,
    method: 'POST',
    data: input as unknown as Record<string, unknown>,
    auth: true,
  })

export const updateAddress = (id: number, input: AddressInput) =>
  request<OkResp>({
    url: `${BASE}/update/${id}`,
    method: 'PUT',
    data: input as unknown as Record<string, unknown>,
    auth: true,
  })

export const deleteAddress = (id: number) =>
  request<OkResp>({ url: `${BASE}/delete/${id}`, method: 'DELETE', auth: true })

export const setDefaultAddress = (id: number) =>
  request<OkResp>({ url: `${BASE}/${id}/default`, method: 'POST', auth: true })
