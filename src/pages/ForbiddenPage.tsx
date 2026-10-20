import { Link } from 'react-router'
import { homePathForRole } from '@/config/roles'
import { useAuth } from '@/context/AuthProvider'
import { ForbiddenCard } from '@/features/auth/ForbiddenCard'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ROUTES } from '@/routes/paths'

/** /403, render trong AuthLayout, phần <main> là ForbiddenCard. */
export function ForbiddenPage() {
  // Đã đăng nhập thì về trang làm việc của vai trò mình, không phải landing công khai.
  const { user } = useAuth()
  return (
    <div className="flex flex-col gap-space-md">
      <ForbiddenCard />
      <div className="flex flex-wrap items-center gap-space-sm">
        <Link
          to={user ? homePathForRole(user.role) : ROUTES.home}
          className="inline-flex items-center gap-space-xs rounded-lg bg-surface-container-lowest px-3 py-1.5 text-label-sm text-on-surface-variant shadow-sm transition-colors hover:text-on-surface"
        >
          <Icon name="arrow_back" className="text-[16px]" />
          {user ? 'Về trang làm việc' : 'Về trang chủ'}
        </Link>
      </div>
    </div>
  )
}
