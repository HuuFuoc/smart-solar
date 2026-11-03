import { ButtonLink } from '@/components/common/ui/button'
import { EmptyState } from '@/components/common/ui/states'
import { ROUTES } from '@/routes/paths'

export function DashboardEmptyState() {
  return (
    <EmptyState
      title="Chưa có công trình hay yêu cầu nào"
      description="Làm khảo sát sơ bộ mái rồi gửi để đặt lịch khảo sát."
      action={
        <ButtonLink to={ROUTES.customer.assessment} variant="primary" icon="roofing">
          Khảo sát sơ bộ mái
        </ButtonLink>
      }
    />
  )
}
