import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as cartApi from '@/api/cart'
import type { CartItem } from '@/types/api'

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])

  const count = computed(() => items.value.reduce((sum, it) => sum + it.quantity, 0))

  async function load() {
    const resp = await cartApi.listCart()
    items.value = resp.items ?? []
  }

  async function add(productId: number, quantity = 1) {
    await cartApi.addCart(productId, quantity)
    await load()
  }

  async function remove(productId: number) {
    await cartApi.removeCart(productId)
    items.value = items.value.filter((it) => it.productId !== productId)
  }

  async function updateQuantity(productId: number, quantity: number) {
    await cartApi.updateCartQuantity(productId, quantity)
    const it = items.value.find((x) => x.productId === productId)
    if (it) it.quantity = quantity
  }

  async function clear() {
    await cartApi.clearCart()
    items.value = []
  }

  function reset() {
    items.value = []
  }

  return { items, count, load, add, remove, updateQuantity, clear, reset }
})
