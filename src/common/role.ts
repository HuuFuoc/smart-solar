/*
 * Vai trò của phiên đăng nhập (đọc từ claim `role` của JWT). Hàm đổi claim → vai trò, trang chủ theo vai trò ở
 * config/roles.ts. Mã vai trò IN HOA của API tài khoản là ROLE_CODES trong common/user.ts.
 */

/** 5 vai trò của hệ thống. */
export const USER_ROLES = ['customer', 'technician', 'sales', 'manager', 'admin'] as const

export type UserRole = (typeof USER_ROLES)[number]

/** Nhãn tiếng Việt – dùng cho hàng tài khoản và trang /403. */
export const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'Khách hàng',
  technician: 'Kỹ thuật viên',
  sales: 'Kinh doanh',
  manager: 'Quản lý',
  admin: 'Quản trị viên',
}

/*
 * Giá trị claim `role` trong JWT → vai trò của web (khoá đã chuẩn hoá: chữ thường, bỏ khoảng trắng, "_" và "-").
 * Thêm vài biến thể hay gặp phía .NET; backend phát giá trị khác thì bổ sung vào bảng này (chỉ sửa 1 chỗ).
 */
export const ROLE_ALIASES: Record<string, UserRole> = {
  customer: 'customer',
  user: 'customer',
  homeowner: 'customer',
  technician: 'technician',
  tech: 'technician',
  sales: 'sales',
  salesperson: 'sales',
  manager: 'manager',
  admin: 'admin',
  administrator: 'admin',
  systemadmin: 'admin',
}

/** Khi JWT có nhiều role, lấy vai trò quyền cao nhất theo thứ tự này. */
export const ROLE_PRIORITY: UserRole[] = ['admin', 'manager', 'sales', 'technician', 'customer']
