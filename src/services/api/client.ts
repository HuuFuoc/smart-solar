import axios, { AxiosError, AxiosHeaders, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { ApiError, messageForStatus, parseRetryAfter, toApiError } from '@/services/api/errors'
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '@/services/api/tokens'
import type { RefreshTokenRequest } from '@/types/req/authReq'
import type { ApiResponse } from '@/types/res/apiRes'
import type { AuthTokensResponse } from '@/types/res/authRes'

/*
 * Axios instance dùng chung.
 *
 * - Request: gắn Authorization: Bearer <accessToken>.
 * - Response: mở wrapper *ApiResponse ({ isSuccess, traceId, data, error }) và trả thẳng `data`;
 *   lỗi thì ném ApiError.
 * - 401: gọi /auth/refresh theo kiểu single-flight (nhiều request cùng 401 chỉ refresh 1 lần,
 *   các request còn lại xếp hàng chờ rồi retry). Refresh hỏng → xoá phiên + bắn "session-expired".
 *   Chỉ lỗi của chính lần refresh mới tính là hết phiên; request gửi lại mà lỗi (400, 409, 5xx…) thì
 *   trả nguyên lỗi đó cho màn hình.
 * - Backend thu hồi MỌI phiên khi một refresh token đã dùng bị gửi lại, nên refresh giữa các tab được
 *   xếp hàng bằng Web Locks và luôn đọc refresh token mới nhất ngay trước khi gửi.
 */

/** Sự kiện phát trên window khi phiên không còn cứu được. */
export const SESSION_EXPIRED_EVENT = 'session-expired'

export function emitSessionExpired() {
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Đường dẫn không gắn token và không thử refresh khi 401.
 * /auth/logout chỉ cần refresh token trong body (dò 08/10/2026: trả 200 cả khi không có Bearer); để nó
 * đi qua refresh-rồi-gửi-lại sẽ gửi lại đúng refresh token vừa bị đổi, tức là "dùng lại" token.
 */
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/logout',
  '/auth/register',
  '/auth/refresh',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/forgot-password',
  '/auth/reset-password',
]

function isPublicPath(url: string | undefined) {
  if (!url) return false
  return PUBLIC_PATHS.some((path) => url.startsWith(path))
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token && !isPublicPath(config.url)) {
    const headers = AxiosHeaders.from(config.headers)
    headers.set('Authorization', `Bearer ${token}`)
    config.headers = headers
  }
  return config
})

/* ---------------------------------------------------------------- refresh */


/** Promise của lần refresh đang chạy; các 401 khác chờ vào đây thay vì gọi thêm. */
let refreshInFlight: Promise<string> | null = null

/*
 * Gọi /auth/refresh bằng axios "trần" để không lọt vào interceptor của apiClient
 * (tránh đệ quy khi chính refresh trả 401).
 */
async function requestNewAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new ApiError({ status: 401, message: messageForStatus(401) })

  const response = await axios.post<unknown>(
    `${baseURL}/auth/refresh`,
    { refreshToken } satisfies RefreshTokenRequest,
    { headers: { 'Content-Type': 'application/json' } },
  )

  const body = response.data as ApiResponse<AuthTokensResponse> | null
  const tokens = body?.data
  if (!tokens?.accessToken || !tokens.refreshToken) {
    throw new ApiError({ status: 401, message: 'Phiên đăng nhập không còn hiệu lực.' })
  }

  // Giữ nguyên nơi lưu cũ (local hay session) – không truyền `remember`.
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

/*
 * Xếp hàng refresh giữa các tab cùng trình duyệt (cùng chung refresh token trong localStorage): tab sau
 * chờ tab trước đổi xong rồi mới đọc token, nên không bao giờ gửi một token đã bị đổi. Trình duyệt không có
 * Web Locks thì chạy thẳng như cũ.
 */
function withRefreshLock<T>(run: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) return run()
  return navigator.locks.request(REFRESH_LOCK, run)
}

/** Single-flight: mọi lời gọi trong lúc đang refresh đều dùng chung 1 promise. */
export function refreshAccessToken(): Promise<string> {
  refreshInFlight ??= withRefreshLock(requestNewAccessToken).finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

/** Chờ lần refresh đang chạy (nếu có) xong, bỏ qua kết quả; dùng trước khi đọc refresh token để đăng xuất. */
export async function waitForRefresh() {
  await refreshInFlight?.catch(() => undefined)
}

/* --------------------------------------------------------------- response */

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

apiClient.interceptors.response.use(
  // Mở wrapper: trả thẳng `data` bên trong *ApiResponse.
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

    // Không có response = mất mạng / server không chạy.
    if (!axiosError.response) {
      throw new ApiError({ status: 0, message: messageForStatus(0) })
    }

    const { status, data, headers } = axiosError.response

    // Không có refreshToken = khách chưa đăng nhập: trả 401 cho màn hình tự xử lý, không bật "hết phiên".
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
      // Lỗi của lần gửi lại đi qua chính interceptor này (đã _retried) và tới màn hình nguyên vẹn.
      return apiClient.request(config)
    }

    // 429 kèm Retry-After (giới hạn tạo mô phỏng 10 lần/phút): màn hình đếm ngược thay vì đoán thời gian chờ.
    throw toApiError(status, data, parseRetryAfter(headers?.['retry-after']))
  },
)

/** Gọi API và nhận thẳng phần `data` đã mở wrapper. */
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

/** `delete` là từ khoá của JavaScript nên hàm tên `del`. */
export function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request<T>({ ...config, method: 'DELETE', url })
}
