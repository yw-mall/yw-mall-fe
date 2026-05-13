import { defineStore } from 'pinia'
import { ref } from 'vue'

// P0 login revamp (opaque token + Redis session): store the access token,
// the refresh token, the bound CSRF token, and the expected access expiry
// (epoch seconds) so the request layer can decide when to pre-emptively
// refresh.
export const useUserStore = defineStore('user', () => {
  const token = ref('')          // access_token (opaque)
  const refreshToken = ref('')
  const csrfToken = ref('')
  const accessExpireAt = ref(0)  // unix-seconds, 0 = unknown
  const userId = ref(0)

  function setSession(payload: {
    accessToken: string
    refreshToken?: string
    csrfToken?: string
    expiresIn?: number
    uid: number
  }) {
    token.value = payload.accessToken
    refreshToken.value = payload.refreshToken ?? ''
    csrfToken.value = payload.csrfToken ?? ''
    accessExpireAt.value = payload.expiresIn
      ? Math.floor(Date.now() / 1000) + payload.expiresIn
      : 0
    userId.value = payload.uid
  }

  // Backward-compatible helper for the legacy /api/user/login response shape.
  function setToken(t: string, id: number) {
    token.value = t
    userId.value = id
    refreshToken.value = ''
    csrfToken.value = ''
    accessExpireAt.value = 0
  }

  function clear() {
    token.value = ''
    refreshToken.value = ''
    csrfToken.value = ''
    accessExpireAt.value = 0
    userId.value = 0
  }

  return {
    token,
    refreshToken,
    csrfToken,
    accessExpireAt,
    userId,
    setSession,
    setToken,
    clear,
  }
}, {
  persist: true,
})
