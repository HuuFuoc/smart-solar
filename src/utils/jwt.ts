import { jwtDecode } from 'jwt-decode'
import type { UserRole } from '@/common/role'
import { parseRole } from '@/config/roles'

/*
 * Đọc claim trong accessToken.
 *
 * AuthTokensResponse của swagger không có role/tên người dùng, nên role lấy từ JWT. Token thật
 * (dò 08/10/2026) để role ở claim .NET `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`
 * với giá trị ADMIN / SALES / CUSTOMER; claim `role` ngắn vẫn được đọc trước nếu sau này backend đổi.
 * Token không có claim tên và backend chưa có /me, nên tên hiển thị là email; khi có /me thì
 * chuyển sang dùng dữ liệu của /me (xem src/services/me.ts).
 */

export type JwtClaims = {
  role?: unknown
  name?: unknown
  fullName?: unknown
  email?: unknown
  sub?: unknown
  exp?: number
  [claim: string]: unknown
}

export function decodeToken(token: string): JwtClaims | null {
  try {
    return jwtDecode<JwtClaims>(token)
  } catch {
    return null
  }
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** Claim role mặc định của ASP.NET Core (ClaimTypes.Role) khi backend không đổi tên thành `role`. */
const DOTNET_ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'

/** Vai trò lấy từ claim `role`, không có thì thử claim role của .NET. */
export function roleFromToken(token: string): UserRole | null {
  const claims = decodeToken(token)
  if (!claims) return null
  return parseRole(claims.role ?? claims[DOTNET_ROLE_CLAIM])
}

/** Email lấy từ claim `email`, không có thì thử các claim quen thuộc khác. */
export function emailFromToken(token: string): string | null {
  const claims = decodeToken(token)
  if (!claims) return null
  return (
    asString(claims.email) ??
    asString(claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'])
  )
}

/**
 * Tên hiển thị lấy từ claim name/fullName (hoặc họ + tên tách rời) nếu backend có phát. Token thật (dò lại 08/10/2026)
 * chỉ có sub, email, role nên hiện tại trả null và giao diện hiện email; backend thêm claim là tên tự hiện.
 */
export function nameFromToken(token: string): string | null {
  const claims = decodeToken(token)
  if (!claims) return null
  const familyGiven = [asString(claims.family_name), asString(claims.given_name)].filter(Boolean).join(' ')
  return (
    asString(claims.fullName) ??
    asString(claims.name) ??
    asString(claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']) ??
    (familyGiven || null)
  )
}

/** userId lấy từ claim `sub`. */
export function userIdFromToken(token: string): string | null {
  const claims = decodeToken(token)
  if (!claims) return null
  return asString(claims.sub) ?? asString(claims.nameid)
}
