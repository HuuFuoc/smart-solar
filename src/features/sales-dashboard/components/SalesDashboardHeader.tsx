import { Link } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/stitch-ui/Button'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ROUTES } from '@/routes/paths'

type SalesDashboardHeaderProps = {
  pendingCount: number
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function SalesDashboardHeader({ pendingCount, onRefresh, isRefreshing }: SalesDashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <h1 className="text-headline-md font-bold text-on-surface sm:text-headline-lg">Tổng quan</h1>
        {pendingCount > 0 && (
          <Badge tone="danger" icon="assignment_late">
            {pendingCount} yêu cầu mới chờ tiếp nhận
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {onRefresh && (
          <Button variant="tonal" size="sm" onClick={onRefresh} disabled={isRefreshing}>
            <Icon name="refresh" className={isRefreshing ? 'animate-spin' : ''} />
            Làm mới
          </Button>
        )}
        <Link to={ROUTES.ops.surveys}>
          <Button variant="primary" size="sm">
            <Icon name="add_task" />
            Tiếp nhận khảo sát
          </Button>
        </Link>
      </div>
    </div>
  )
}
