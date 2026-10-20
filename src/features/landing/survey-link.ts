import { homePathForRole } from '@/config/roles'
import type { AuthUser } from '@/context/AuthProvider'
import { ROUTES } from '@/routes/paths'

// Nút "Đăng ký khảo sát": chưa đăng nhập thì đi đăng ký, khách hàng vào đánh giá sơ bộ, nhân viên về portal của mình
export function surveyPath(user: AuthUser | null) {
  if (!user) return ROUTES.register
  return user.role === 'customer' ? ROUTES.customer.assessment : homePathForRole(user.role)
}
