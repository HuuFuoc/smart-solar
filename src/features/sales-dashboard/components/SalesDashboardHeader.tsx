import { Link } from 'react-router'
import { Button } from '@/components/common/stitch-ui/Button'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ROUTES } from '@/routes/paths'

type SalesDashboardHeaderProps = {
  totalSurveys: number
  pendingCount: number
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function SalesDashboardHeader({
  totalSurveys,
  pendingCount,
  onRefresh,
  isRefreshing,
}: SalesDashboardHeaderProps) {
  const now = new Date()
  const dateFormatted = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-label-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Hệ thống kinh doanh trực tuyến
          </span>
          <span className="text-body-sm text-on-surface-variant">| {dateFormatted}</span>
        </div>
        <h1 className="text-headline-md font-bold text-on-surface sm:text-headline-lg">Tổng quan kinh doanh</h1>
        <p className="text-body-md text-on-surface-variant">
          Bạn đang quản lý{' '}
          <strong className="font-semibold text-primary">{totalSurveys} hồ sơ khảo sát</strong>
          {pendingCount > 0 ? (
            <>
              {' '}
              và có{' '}
              <strong className="font-semibold text-amber-600 dark:text-amber-400">
                {pendingCount} yêu cầu mới
              </strong>{' '}
              đang chờ tiếp nhận trong khu vực.
            </>
          ) : (
            ' và tất cả yêu cầu mới đã được điều phối kịp thời.'
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {onRefresh && (
          <Button
            variant="tonal"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <Icon name="refresh" className={isRefreshing ? 'animate-spin' : ''} />
            Làm mới
          </Button>
        )}
        <Link to={ROUTES.ops.surveys}>
          <Button
            variant="primary"
            size="sm"
          >
            <Icon name="add_task" />
            Tiếp nhận khảo sát
          </Button>
        </Link>
      </div>
    </div>
  )
}
