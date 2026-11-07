import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { ROUTES } from '@/routes/paths'
import { cx } from '@/utils/cx'

type AdminDashboardHeaderProps = {
  onRefresh?: () => void
  isRefreshing?: boolean
  criticalCount?: number
}

// Tiêu đề là tên màn; việc cần xử lý báo một dòng đỏ ở mô tả, không có câu trạng thái chung khi không có dữ liệu
export function AdminDashboardHeader({ onRefresh, isRefreshing, criticalCount = 0 }: AdminDashboardHeaderProps) {
  return (
    <PageHeader
      title="Tổng quan"
      description={criticalCount > 0 ? <Badge tone="danger">{criticalCount} việc cần xử lý</Badge> : undefined}
      actions={
        <>
          {onRefresh && (
            <Button
              variant="secondary"
              icon={<Icon name="refresh" className={cx('-ml-0.5 text-[20px]', isRefreshing && 'animate-spin')} />}
              disabled={isRefreshing}
              onClick={onRefresh}
            >
              Làm mới
            </Button>
          )}
          <ButtonLink to={ROUTES.admin.users} variant="secondary" icon="manage_accounts">
            Tài khoản
          </ButtonLink>
          <ButtonLink to={ROUTES.admin.dispatch} variant="primary" icon="support_agent">
            Điều phối kỹ thuật viên
          </ButtonLink>
        </>
      }
    />
  )
}
