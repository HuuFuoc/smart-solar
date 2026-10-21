import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authService from '@/services/authService'
import { SESSION_EXPIRED_EVENT, refreshAccessToken, waitForRefresh } from '@/services/api/client'
import { ApiError } from '@/services/api/errors'
import { fetchCurrentUser } from '@/services/me'
import { clearTokens, getAccessToken, getRefreshToken, hasRefreshToken, saveTokens } from '@/services/api/tokens'
import { emailFromToken, nameFromToken, roleFromToken, userIdFromToken } from '@/utils/jwt'
import type { UserRole } from '@/common/role'

// Phiên đăng nhập. accessToken trong bộ nhớ, refreshToken trong storage (services/api/tokens.ts)
// Mở app mà còn refreshToken thì gọi /auth/refresh, trong lúc chờ status = 'loading'
// Đổi người dùng thì xoá cache React Query để không lộ dữ liệu của người trước

export type AuthUser = {
  name: string
  email: string
  role: UserRole
  userId?: string
}

export type AuthStatus = 'loading' | 'ready'

export type AuthContextValue = {
  user: AuthUser | null
  status: AuthStatus
  isAuthenticated: boolean
  /** Đăng nhập, ném ApiError nếu sai thông tin */
  signIn: (email: string, password: string, remember?: boolean) => Promise<AuthUser>
  /** Đăng xuất: gọi API rồi xoá phiên, lỗi mạng vẫn xoá phía client */
  signOut: () => Promise<void>
  /** Xoá phiên tại chỗ (dùng khi backend thu hồi phiên sau đổi mật khẩu) */
  clearSession: () => void
  sessionExpired: boolean
  dismissSessionExpired: () => void
  /** Ép phiên hết hạn, chỉ dùng cho ô demo ở /login khi chạy DEV */
  expireSession: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Dựng AuthUser từ accessToken. Không đọc được vai trò thì coi như đăng nhập lỗi */
async function buildUser(accessToken: string, fallbackEmail?: string): Promise<AuthUser> {
  const profile = await fetchCurrentUser().catch(() => null)

  const role = profile?.role ?? roleFromToken(accessToken)
  if (!role) {
    throw new ApiError({
      status: 0,
      message: 'Không xác định được vai trò của tài khoản. Vui lòng liên hệ quản trị viên.',
    })
  }

  const email = profile?.email ?? emailFromToken(accessToken) ?? fallbackEmail ?? ''
  const name = profile?.name ?? nameFromToken(accessToken) ?? email

  return {
    name,
    email,
    role,
    userId: profile?.userId ?? userIdFromToken(accessToken) ?? undefined,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() => (hasRefreshToken() ? 'loading' : 'ready'))
  const [sessionExpired, setSessionExpired] = useState(false)
  const queryClient = useQueryClient()

  // Mở app: còn refreshToken thì khôi phục phiên trước khi render route bảo vệ
  useEffect(() => {
    let cancelled = false

    // Không có refreshToken thì status đã là 'ready' ngay từ useState khởi tạo
    if (!hasRefreshToken()) return

    void (async () => {
      try {
        const accessToken = await refreshAccessToken()
        const restored = await buildUser(accessToken)
        if (!cancelled) setUser(restored)
      } catch {
        // refreshToken hỏng / hết hạn khi mở app: dọn im lặng, không bật modal
        clearTokens()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setStatus('ready')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // client.ts bắn sự kiện này khi refresh thất bại giữa chừng
  useEffect(() => {
    const onExpired = () => {
      queryClient.clear()
      setUser(null)
      setSessionExpired(true)
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [queryClient])

  const signIn = useCallback(
    async (email: string, password: string, remember = true) => {
      const tokens = await authService.login({ email, password })
      queryClient.clear()
      if (!tokens.accessToken || !tokens.refreshToken) {
        throw new ApiError({ status: 0, message: 'Đăng nhập chưa thành công. Vui lòng thử lại.' })
      }

      saveTokens(
        {
          accessToken: tokens.accessToken,
          accessTokenExpiresAt: tokens.accessTokenExpiresAt,
          refreshToken: tokens.refreshToken,
          refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
          tokenType: tokens.tokenType ?? undefined,
          userId: tokens.userId,
        },
        remember,
      )

      try {
        const next = await buildUser(tokens.accessToken, email)
        setSessionExpired(false)
        setUser(next)
        setStatus('ready')
        return next
      } catch (error) {
        // Token không dùng được (thiếu role...) thì không giữ phiên dở dang
        clearTokens()
        throw error
      }
    },
    [queryClient],
  )

  const clearSession = useCallback(() => {
    clearTokens()
    queryClient.clear()
    setUser(null)
  }, [queryClient])

  const signOut = useCallback(async () => {
    try {
      // Đang refresh thì chờ xong rồi mới đọc token, gửi token cũ (đã bị đổi) sẽ bị coi là dùng lại
      await waitForRefresh()
      const refreshToken = getRefreshToken()
      if (refreshToken) await authService.logout({ refreshToken })
    } catch {
      // Lỗi mạng / token đã bị thu hồi: vẫn xoá phiên phía client
    } finally {
      clearTokens()
      queryClient.clear()
      setUser(null)
      setSessionExpired(false)
    }
  }, [queryClient])

  const expireSession = useCallback(() => {
    clearTokens()
    queryClient.clear()
    setUser(null)
    setSessionExpired(true)
  }, [queryClient])

  const dismissSessionExpired = useCallback(() => setSessionExpired(false), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: user !== null && getAccessToken() !== null,
      signIn,
      signOut,
      clearSession,
      sessionExpired,
      dismissSessionExpired,
      expireSession,
    }),
    [user, status, signIn, signOut, clearSession, sessionExpired, dismissSessionExpired, expireSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth phải dùng bên trong <AuthProvider>')
  return context
}
