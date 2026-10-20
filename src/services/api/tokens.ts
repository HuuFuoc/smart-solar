// Lưu token phía client. Token trả trong body nên không dùng withCredentials
// accessToken trong bộ nhớ, refreshToken trong localStorage nếu chọn "Ghi nhớ đăng nhập", không thì sessionStorage

const REFRESH_KEY = 'smart-solar.refresh-token'
/** Nhớ nơi đã lưu refreshToken để lần sau đọc/ghi đúng chỗ. */
const STORE_KEY = 'smart-solar.refresh-store'

export type TokenStore = 'local' | 'session'

export type AuthTokens = {
  accessToken: string
  accessTokenExpiresAt?: string
  refreshToken: string
  refreshTokenExpiresAt?: string
  tokenType?: string
  userId?: string
}

let accessToken: string | null = null
let accessTokenExpiresAt: string | null = null

function storageFor(store: TokenStore): Storage | null {
  try {
    return store === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

/** Nơi refreshToken đang nằm; mặc định 'local'. */
function currentStore(): TokenStore {
  try {
    return window.localStorage.getItem(STORE_KEY) === 'session' ? 'session' : 'local'
  } catch {
    return 'local'
  }
}

export function getAccessToken() {
  return accessToken
}

export function getAccessTokenExpiresAt() {
  return accessTokenExpiresAt
}

export function setAccessToken(token: string | null, expiresAt?: string | null) {
  accessToken = token
  accessTokenExpiresAt = expiresAt ?? null
}

export function getRefreshToken(): string | null {
  const store = currentStore()
  try {
    return storageFor(store)?.getItem(REFRESH_KEY) ?? null
  } catch {
    return null
  }
}

export function setRefreshToken(token: string | null, store: TokenStore = currentStore()) {
  try {
    // Xoá ở cả hai nơi trước khi ghi để không còn bản cũ ở chỗ kia.
    window.localStorage.removeItem(REFRESH_KEY)
    window.sessionStorage.removeItem(REFRESH_KEY)
    if (token) {
      storageFor(store)?.setItem(REFRESH_KEY, token)
      window.localStorage.setItem(STORE_KEY, store)
    } else {
      window.localStorage.removeItem(STORE_KEY)
    }
  } catch {
    /* storage bị chặn, bỏ qua, phiên vẫn chạy được trong bộ nhớ */
  }
}

/** Lưu cả cặp token sau login/refresh. `remember` chỉ có tác dụng ở lần đăng nhập. */
export function saveTokens(tokens: AuthTokens, remember?: boolean) {
  setAccessToken(tokens.accessToken, tokens.accessTokenExpiresAt ?? null)
  setRefreshToken(tokens.refreshToken, remember === undefined ? currentStore() : remember ? 'local' : 'session')
}

/** Xoá sạch phiên phía client. */
export function clearTokens() {
  setAccessToken(null, null)
  setRefreshToken(null)
}

export function hasRefreshToken() {
  return getRefreshToken() !== null
}
