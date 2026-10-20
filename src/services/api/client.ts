import axios, { AxiosError, AxiosHeaders, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { ENDPOINTS } from '@/services/api/endpoints'
import { ApiError, messageForStatus, parseRetryAfter, toApiError } from '@/services/api/errors'
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '@/services/api/tokens'
import { apiBaseUrl, apiPath } from '@/services/api/url'
import type { RefreshTokenRequest } from '@/types/req/authReq'
import type { ApiResponse } from '@/types/res/apiRes'
import type { AuthTokensResponse } from '@/types/res/authRes'

// Axios instance dùng chung
// Request gắn Bearer token. Response bỏ wrapper *ApiResponse và trả thẳng `data`, lỗi thì ném ApiError
// Gặp 401 thì refresh một lần cho mọi request đang chờ (single-flight), refresh lỗi thì bắn "session-expired"
// Refresh giữa các tab xếp hàng bằng Web Locks, vì backend thu hồi mọi phiên khi một refresh token bị dùng lại

/** Sự kiện phát trên window khi phiên không còn cứu được */
export const SESSION_EXPIRED_EVENT = 'session-expired'

export function emitSessionExpired() {
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
}

// Khai thiếu /api hay thừa dấu / ở cuối đều về đúng địa chỉ gốc (url.ts)
const baseURL = apiBaseUrl(import.meta.env.VITE_API_BASE_URL)

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

/** Đường dẫn không gắn token và không refresh khi 401. Logout chỉ cần refresh token trong body */
const PUBLIC_PATHS: string[] = [
  ENDPOINTS.auth.login,
  ENDPOINTS.auth.logout,
  ENDPOINTS.auth.register,
  ENDPOINTS.auth.refresh,
  ENDPOINTS.auth.verifyEmail,
  ENDPOINTS.auth.resendVerification,
  ENDPOINTS.auth.forgotPassword,
  ENDPOINTS.auth.resetPassword,
]

function isPublicPath(url: string | undefined) {
  if (!url) return false
  return PUBLIC_PATHS.some((path) => url.startsWith(path))
}

apiClient.interceptors.request.use((config) => {
  // Chuẩn hoá trước khi so, '/api/auth/login' hay 'auth/login' đều là endpoint công khai
  config.url = apiPath(config.url)
  const token = getAccessToken()
  if (token && !isPublicPath(config.url)) {
    const headers = AxiosHeaders.from(config.headers)
    headers.set('Authorization', `Bearer ${token}`)
    config.headers = headers
  }
  return config
})

/** Promise của lần refresh đang chạy, các 401 khác chờ vào đây thay vì gọi thêm */
let refreshInFlight: Promise<string> | null = null

// Dùng axios riêng để không lọt vào interceptor (tránh đệ quy khi refresh trả 401)
async function requestNewAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new ApiError({ status: 401, message: messageForStatus(401) })

  const response = await axios.post<unknown>(
    `${baseURL}${ENDPOINTS.auth.refresh}`,
    { refreshToken } satisfies RefreshTokenRequest,
    { headers: { 'Content-Type': 'application/json' } },
  )

  const body = response.data as ApiResponse<AuthTokensResponse> | null
  const tokens = body?.data
  if (!tokens?.accessToken || !tokens.refreshToken) {
    throw new ApiError({ status: 401, message: 'Phiên đăng nhập không còn hiệu lực.' })
  }

  // Giữ nguyên nơi lưu cũ (local hay session), không truyền `remember`
  saveTokens({
    accessToken: tokens.accessToken,
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    refreshToken: tokens.refreshToken,
    refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
    tokenType: tokens.tokenType ?? undefined,
    userId: tokens.userId,
  })
  return tokens.accessToken
}

const REFRESH_LOCK = 'smart-solar.refresh'

// Xếp hàng refresh giữa các tab để không gửi token đã bị đổi
function withRefreshLock<T>(run: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) return run()
  return navigator.locks.request(REFRESH_LOCK, run)
}

/** Single-flight: mọi lời gọi trong lúc đang refresh đều dùng chung 1 promise */
export function refreshAccessToken(): Promise<string> {
  refreshInFlight ??= withRefreshLock(requestNewAccessToken).finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

/** Chờ lần refresh đang chạy xong, dùng trước khi đăng xuất */
export async function waitForRefresh() {
  await refreshInFlight?.catch(() => undefined)
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

apiClient.interceptors.response.use(
  // Mở wrapper: trả thẳng `data` bên trong *ApiResponse
  (response) => {
    const body = response.data as ApiResponse<unknown> | null

    if (body && typeof body === 'object' && 'isSuccess' in body) {
      if (body.isSuccess === false) throw toApiError(response.status, body)
      return { ...response, data: body.data }
    }
    return response
  },

  async (error: unknown) => {
    if (error instanceof ApiError) throw error

    if (!axios.isAxiosError(error)) {
      throw new ApiError({ status: 0, message: messageForStatus(0) })
    }

    const axiosError = error as AxiosError
    const config = axiosError.config as RetriableConfig | undefined

    // Không có response là mất mạng hoặc server không chạy
    if (!axiosError.response) {
      throw new ApiError({ status: 0, message: messageForStatus(0) })
    }

    const { status, data, headers } = axiosError.response

    // Không có refreshToken nghĩa là chưa đăng nhập: trả 401, không bật hộp hết phiên
    const canRetry =
      status === 401 && config && !config._retried && !isPublicPath(config.url) && getRefreshToken() !== null
    if (canRetry) {
      config._retried = true
      let token: string
      try {
        token = await refreshAccessToken()
      } catch {
        clearTokens()
        emitSessionExpired()
        throw toApiError(status, data)
      }
      const headers = AxiosHeaders.from(config.headers)
      headers.set('Authorization', `Bearer ${token}`)
      config.headers = headers
      // Lỗi của lần gửi lại đi qua chính interceptor này (đã _retried) và tới màn hình nguyên vẹn
      return apiClient.request(config)
    }

    // 429 kèm Retry-After để màn hình đếm ngược
    throw toApiError(status, data, parseRetryAfter(headers?.['retry-after']))
  },
)

/** Gọi API và nhận thẳng phần `data` đã mở wrapper */
async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<T>(config)
  return response.data
}

export function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request<T>({ ...config, method: 'GET', url })
}

export function post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return request<T>({ ...config, method: 'POST', url, data: body })
}

export function put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return request<T>({ ...config, method: 'PUT', url, data: body })
}

export function patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return request<T>({ ...config, method: 'PATCH', url, data: body })
}

/** `delete` là từ khoá của JavaScript nên hàm tên `del` */
export function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request<T>({ ...config, method: 'DELETE', url })
}
