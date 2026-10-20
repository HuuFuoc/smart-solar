import type { UserRole } from '@/config/roles'

/*
 * Hồ sơ người dùng đang đăng nhập.
 *
 * ĐANG CHỜ BACKEND: swagger hiện tại (docs/api/swagger.json) không có endpoint /me,
 * nên chưa gọi được. Khi có đường dẫn + schema thật:
 *   1. chạy lại `npm run gen:api` để src/types/req|res có type của endpoint đó;
 *   2. thay phần thân fetchCurrentUser() bên dưới bằng lời gọi apiGet('<đường dẫn>')
 *      và ánh xạ sang CurrentUser;
 *   3. không cần sửa chỗ nào khác – AuthProvider đã gọi hàm này sau mỗi lần
 *      đăng nhập / khôi phục phiên và tự lùi về claim trong JWT nếu trả null.
 */

export type CurrentUser = {
  name?: string | null
  email?: string | null
  role?: UserRole | null
  userId?: string | null
}

/** Trả null nghĩa là "chưa có /me" – AuthProvider sẽ dùng claim trong JWT. */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  return null
}
