import { homePathForRole } from '@/config/roles'
import type { AuthUser } from '@/context/AuthProvider'
import { ROUTES } from '@/routes/paths'

/*
  Đích của nút "Đăng ký khảo sát": chưa đăng nhập thì tạo tài khoản; khách hàng đã đăng nhập vào thẳng đánh giá sơ bộ
  (bước đầu của yêu cầu khảo sát); tài khoản nội bộ không đăng ký khảo sát nên về trang làm việc của mình.
*/
export function surveyPath(user: AuthUser | null) {
  if (!user) return ROUTES.register
  return user.role === 'customer' ? ROUTES.customer.assessment : homePathForRole(user.role)
}
