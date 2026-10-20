import type { Tone } from '@/components/common/ui/badge'

// Vai trò và trạng thái tài khoản theo mã của backend. Mã lạ thì in nguyên văn

/** Mã vai trò của API tài khoản. Vai trò của phiên đăng nhập ở common/role.ts */
export const ROLE_CODES = [
  { value: 'CUSTOMER', label: 'Khách hàng' },
  { value: 'SALES', label: 'Kinh doanh' },
  { value: 'TECHNICIAN', label: 'Kỹ thuật viên' },
  { value: 'MANAGER', label: 'Quản lý' },
  { value: 'ADMIN', label: 'Quản trị viên' },
] as const

// Chờ kích hoạt là người dùng chưa đặt mật khẩu hoặc chưa xác minh email
export const USER_STATUSES = [
  { value: 'PENDING_VERIFICATION', label: 'Chờ kích hoạt', tone: 'info' },
  { value: 'ACTIVE', label: 'Đang hoạt động', tone: 'ok' },
  { value: 'SUSPENDED', label: 'Tạm khoá', tone: 'warn' },
  { value: 'DISABLED', label: 'Vô hiệu', tone: 'neutral' },
] as const satisfies readonly { value: string; label: string; tone: Tone }[]
