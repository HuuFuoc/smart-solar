import type { Tone } from '@/components/common/ui/badge'

/*
 * Enum của quản lý tài khoản (AdminUserContracts, backend main 4d12e4d, 12/10/2026). Mã là chuỗi IN HOA của backend; hàm
 * tra nhãn ở features/users/userDisplay.ts, mã lạ in nguyên văn thay vì đoán nghĩa.
 */

/** Mã vai trò của API tài khoản (IN HOA). Vai trò của phiên đăng nhập là USER_ROLES trong common/role.ts. */
export const ROLE_CODES = [
  { value: 'CUSTOMER', label: 'Khách hàng' },
  { value: 'SALES', label: 'Kinh doanh' },
  { value: 'TECHNICIAN', label: 'Kỹ thuật viên' },
  { value: 'MANAGER', label: 'Quản lý' },
  { value: 'ADMIN', label: 'Quản trị viên' },
] as const

/*
  Đang hoạt động là ok; chờ kích hoạt là đang xử lý (người dùng chưa đặt mật khẩu / xác minh email); tạm khoá là lưu ý;
  vô hiệu (và đã xoá, xem userStatusMeta) là không còn hoạt động.
*/
export const USER_STATUSES = [
  { value: 'PENDING_VERIFICATION', label: 'Chờ kích hoạt', tone: 'info' },
  { value: 'ACTIVE', label: 'Đang hoạt động', tone: 'ok' },
  { value: 'SUSPENDED', label: 'Tạm khoá', tone: 'warn' },
  { value: 'DISABLED', label: 'Vô hiệu', tone: 'neutral' },
] as const satisfies readonly { value: string; label: string; tone: Tone }[]
