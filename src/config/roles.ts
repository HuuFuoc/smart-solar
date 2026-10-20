import { ROLE_ALIASES, ROLE_PRIORITY, type UserRole } from '@/common/role'
import { ROUTES } from '@/routes/paths'

/* Hàm theo vai trò của phiên đăng nhập; bảng vai trò, nhãn và bí danh claim ở common/role.ts. */

/*
 * Ai được tự đổi mật khẩu trong giao diện (quyết định 08/10/2026): chỉ khách hàng. Tài khoản nội bộ (sales, kỹ thuật
 * viên, quản lý, quản trị) do quản trị cấp. Backend vẫn cho mọi vai trò gọi API đổi mật khẩu; đây chỉ là ẩn ở giao diện.
 */
export function canChangeOwnPassword(role: UserRole | undefined) {
  return role === 'customer'
}

/** Chuẩn hoá giá trị claim để tra ROLE_ALIASES: không phân biệt hoa thường, bỏ khoảng trắng, "_" và "-". */
function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]/g, '')
}

/** Đổi một giá trị claim thành UserRole; không nhận ra thì trả null. */
export function parseRole(value: unknown): UserRole | null {
  if (typeof value === 'string') return ROLE_ALIASES[normalize(value)] ?? null

  if (Array.isArray(value)) {
    const found = value
      .map((item) => parseRole(item))
      .filter((role): role is UserRole => role !== null)
    if (found.length === 0) return null
    return ROLE_PRIORITY.find((role) => found.includes(role)) ?? found[0] ?? null
  }

  return null
}

/** Trang đích sau đăng nhập theo vai trò – mỗi vai trò có một portal. */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case 'admin':
      return ROUTES.admin.home
    case 'technician':
      return ROUTES.tech.home
    case 'sales':
      return ROUTES.ops.home
    case 'manager':
      return ROUTES.manage.home
    case 'customer':
      return ROUTES.customer.home
  }
}
