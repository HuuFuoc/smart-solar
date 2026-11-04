import { ButtonLink } from '@/components/common/ui/button'
import { useAuth } from '@/context/AuthProvider'
import { ROUTES } from '@/routes/paths'

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

export function DashboardHeader() {
  const { user } = useAuth()
  const greeting = getTimeGreeting()
  const displayName = user?.name || 'Quý khách'

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-meta font-medium text-accent-fg">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            Cổng thông tin khách hàng
          </span>
        </div>
        <h1 className="mt-1.5 text-display font-bold tracking-tight text-fg">
          {greeting}, {displayName} 👋
        </h1>
        <p className="mt-1 text-meta text-fg-2 sm:text-body">
          Theo dõi tiến độ lắp đặt, lịch hẹn kỹ thuật và dịch vụ năng lượng mặt trời của bạn.
        </p>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
        <ButtonLink to={ROUTES.customer.assessment} variant="primary" icon="roofing" size="sm">
          Ước tính công suất mới
        </ButtonLink>
        <ButtonLink to={ROUTES.customer.requests} variant="soft" icon="calendar_month" size="sm">
          Đặt lịch khảo sát
        </ButtonLink>
        <ButtonLink to={ROUTES.customer.afterSales} variant="secondary" icon="build" size="sm">
          Báo sự cố nhanh
        </ButtonLink>
      </div>
    </div>
  )
}
