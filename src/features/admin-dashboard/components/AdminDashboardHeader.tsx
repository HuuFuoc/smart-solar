import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { ROUTES } from '@/routes/paths'
import { cx } from '@/utils/cx'

type AdminDashboardHeaderProps = {
  onRefresh?: () => void
  isRefreshing?: boolean
  criticalCount?: number
}

export function AdminDashboardHeader({ onRefresh, isRefreshing, criticalCount = 0 }: AdminDashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-2.5 py-0.5 text-meta font-medium text-warn">
              <span className="size-1.5 rounded-full bg-warn animate-pulse" />
              {criticalCount} vấn đề cần lưu ý
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-2.5 py-0.5 text-meta font-medium text-ok">
              <span className="size-1.5 rounded-full bg-ok animate-pulse" />
              Hệ thống vận hành ổn định
            </span>
          )}
        </div>
        <h1 className="mt-1.5 text-display font-bold tracking-tight text-fg">
          Trung tâm quản trị & điều hành
        </h1>
        <p className="mt-1 text-meta text-fg-2 sm:text-body">
          Giám sát sức khỏe hệ thống toàn diện: nhân sự KTV, thi công lắp đặt, điều phối hiện trường và dịch vụ sau bán.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
        {onRefresh && (
          <Button
            size="sm"
            variant="secondary"
            icon={<Icon name="refresh" className={cx('-ml-0.5 text-[20px]', isRefreshing && 'animate-spin')} />}
            disabled={isRefreshing}
            onClick={onRefresh}
          >
            Làm mới
          </Button>
        )}
        <ButtonLink to={ROUTES.admin.users} size="sm" variant="secondary" icon="manage_accounts">
          Tài khoản
        </ButtonLink>
        <ButtonLink to={ROUTES.admin.dispatch} size="sm" variant="primary" icon="support_agent">
          Hàng đợi điều phối
        </ButtonLink>
      </div>
    </div>
  )
}
