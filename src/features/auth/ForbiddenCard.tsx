import { useLocation, useNavigate } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { ROUTES } from '@/routes/paths'
import { useAuth } from '@/context/AuthProvider'
import { ROLE_LABELS, type UserRole } from '@/common/role'
import { forbiddenContent } from '@/data/auth'

// Thẻ 403. "Đổi tài khoản khác" là đăng xuất rồi về /login
export function ForbiddenCard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const requiredRole = (location.state as { required?: UserRole } | null)?.required

  const currentRoleLabel = user ? ROLE_LABELS[user.role] : forbiddenContent.guestLabel

  // Đăng nhập lại bằng tài khoản đúng vai trò thì quay về đúng trang vừa bị chặn.
  const switchAccount = async () => {
    const from = (location.state as { from?: string } | null)?.from
    await signOut()
    navigate(ROUTES.login, { replace: true, state: from ? { from } : undefined })
  }

  return (
    <div className="rounded-container border border-line bg-surface-container-lowest p-space-md">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-headline-md text-on-surface">{forbiddenContent.title}</h1>
        {requiredRole && (
          <Badge tone="danger">
            {forbiddenContent.requiredPrefix}
            {ROLE_LABELS[requiredRole]}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-body-md text-on-surface-variant">
        {forbiddenContent.descriptionBefore}
        <span className="text-on-surface">{currentRoleLabel}</span>
        {forbiddenContent.descriptionAfter}
      </p>
      <Button icon="switch_account" variant="secondary" className="mt-space-sm" onClick={() => void switchAccount()}>
        {forbiddenContent.switchAccount}
      </Button>
    </div>
  )
}
