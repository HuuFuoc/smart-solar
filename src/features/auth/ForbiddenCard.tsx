import { useLocation, useNavigate } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ROUTES } from '@/routes/paths'
import { useAuth } from '@/context/AuthProvider'
import { ROLE_LABELS, type UserRole } from '@/common/role'
import { forbiddenContent } from '@/data/auth'

/*
 * Thẻ 403 – "State 1: Unauthorized Access Warning Box" trong auth_portal/code.html.
 * "Đổi tài khoản khác" = đăng xuất rồi về /login.
 */
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
    <div className="flex items-start gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-error-container text-error">
        <Icon name="gpp_bad" className="text-[24px]" />
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-headline-md text-on-surface">{forbiddenContent.title}</h1>
          {requiredRole && (
            <span className="rounded-full bg-error-container px-2 py-0.5 text-label-sm text-error">
              {forbiddenContent.requiredPrefix}
              {ROLE_LABELS[requiredRole]}
            </span>
          )}
        </div>
        <p className="mt-1 text-body-md text-on-surface-variant">
          {forbiddenContent.descriptionBefore}
          <span className="text-on-surface">{currentRoleLabel}</span>
          {forbiddenContent.descriptionAfter}
        </p>
        <div className="mt-space-sm flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void switchAccount()}
            className="rounded-lg bg-surface-container px-3 py-1.5 text-label-sm text-on-surface transition-colors hover:bg-surface-container-high"
          >
            {forbiddenContent.switchAccount}
          </button>
        </div>
      </div>
    </div>
  )
}
