import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { ROUTES } from '@/routes/paths'
import { cx } from '@/utils/cx'

type SalesDashboardHeaderProps = {
  pendingCount: number
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function SalesDashboardHeader({ pendingCount, onRefresh, isRefreshing }: SalesDashboardHeaderProps) {
  return (
    <PageHeader
      title="Tổng quan"
      description={pendingCount > 0 ? <Badge tone="danger">{pendingCount} yêu cầu mới chờ tiếp nhận</Badge> : undefined}
      actions={
        <>
          {onRefresh && (
            <Button
              icon={<Icon name="refresh" className={cx('-ml-0.5 text-[20px]', isRefreshing && 'animate-spin')} />}
              disabled={isRefreshing}
              onClick={onRefresh}
            >
              Làm mới
            </Button>
          )}
          <ButtonLink to={ROUTES.ops.surveys} variant="primary" icon="add_task">
            Tiếp nhận khảo sát
          </ButtonLink>
        </>
      }
    />
  )
}
