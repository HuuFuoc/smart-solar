import { ButtonLink } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { ROUTES } from '@/routes/paths'

export function DashboardHeader() {
  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <PageHeader
      title="Tổng quan dịch vụ"
      description={`Hôm nay là ${today}. Theo dõi tiến độ lắp đặt và yêu cầu dịch vụ của bạn.`}
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
