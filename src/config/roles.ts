import { ROLE_ALIASES, ROLE_PRIORITY, type UserRole } from '@/common/role'
import { ROUTES } from '@/routes/paths'

// Chỉ khách hàng tự đổi mật khẩu, tài khoản nội bộ do quản trị cấp (backend vẫn cho phép, đây chỉ ẩn ở giao diện)
export function canChangeOwnPassword(role: UserRole | undefined) {
  return role === 'customer'
}

/** Bỏ hoa thường, khoảng trắng, "_" và "-" trước khi tra ROLE_ALIASES */
function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')
}

/** Đổi một giá trị claim thành UserRole, không nhận ra thì trả null */
export function parseRole(value: unknown): UserRole | null {
  if (typeof value === 'string') return ROLE_ALIASES[normalize(value)] ?? null

  if (Array.isArray(value)) {
    const found = value.map((item) => parseRole(item)).filter((role): role is UserRole => role !== null)
    if (found.length === 0) return null
    return ROLE_PRIORITY.find((role) => found.includes(role)) ?? found[0] ?? null
  }

  return null
}

/** Trang đích sau đăng nhập theo vai trò, mỗi vai trò có một portal */
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
