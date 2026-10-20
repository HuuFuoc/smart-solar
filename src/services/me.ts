import type { UserRole } from '@/common/role'

// Hồ sơ người dùng đang đăng nhập. Backend chưa có endpoint /me nên tạm trả null
// Khi có endpoint: chạy lại `npm run gen:api` rồi thay thân fetchCurrentUser() bằng lời gọi API

export type CurrentUser = {
  name?: string | null
  email?: string | null
  role?: UserRole | null
  userId?: string | null
}

/** Trả null nghĩa là "chưa có /me", AuthProvider sẽ dùng claim trong JWT */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  return null
}
