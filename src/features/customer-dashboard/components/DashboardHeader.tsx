import { ButtonLink } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { ROUTES } from '@/routes/paths'

export function DashboardHeader() {
  return (
    <PageHeader
      title="Tổng quan"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink to={ROUTES.customer.assessment} variant="primary" icon="roofing">
            Khảo sát sơ bộ mái
          </ButtonLink>
          <ButtonLink to={ROUTES.customer.afterSales} variant="soft" icon="support_agent">
            Yêu cầu hỗ trợ
          </ButtonLink>
        </div>
      }
    />
  )
}
