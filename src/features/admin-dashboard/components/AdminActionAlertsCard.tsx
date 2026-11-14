import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { Skeleton } from '@/components/common/ui/states'
import { ROUTES } from '@/routes/paths'

type AdminActionAlertsCardProps = {
  isLoading?: boolean
  readyContractsCount: number
  missingBaseTechCount: number
  openDispatchCount: number
  warrantyGap: boolean
}

type AlertItem = {
  id: string
  title: string
  description: string
  count?: number
  tone: 'danger' | 'warn' | 'info'
  badgeText: string
  icon: string
  actionLabel: string
  actionTo: string
}

export function AdminActionAlertsCard({
  isLoading,
  readyContractsCount,
  missingBaseTechCount,
  openDispatchCount,
  warrantyGap,
}: AdminActionAlertsCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-container border border-line bg-surface-2 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-3.5 rounded-control border border-line bg-canvas space-y-2.5">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
              <div className="pt-2 border-t border-line/50 flex justify-end">
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const alerts: AlertItem[] = []

  if (readyContractsCount > 0) {
    alerts.push({
      id: 'ready-contracts',
      title: 'Hợp đồng chờ khởi tạo dự án thi công',
      description: `Có ${readyContractsCount} hợp đồng đã thanh toán đủ, đang chờ quản trị viên tạo dự án lắp đặt và phân bổ vật tư.`,
      count: readyContractsCount,
      tone: 'danger',
      badgeText: 'Cần khởi tạo',
      icon: 'assignment_late',
      actionLabel: 'Xử lý hợp đồng',
      actionTo: ROUTES.admin.installations,
    })
  }

  if (missingBaseTechCount > 0) {
    alerts.push({
      id: 'missing-tech-base',
      title: 'Kỹ thuật viên chưa gán khu vực cơ sở (Base Zone)',
      description: `Có ${missingBaseTechCount} kỹ thuật viên chưa được chỉ định địa bàn hoạt động hoặc chưa cấu hình ca trực.`,
      count: missingBaseTechCount,
      tone: 'warn',
      badgeText: 'Chưa có Zone',
      icon: 'person_alert',
      actionLabel: 'Phân bổ kỹ thuật viên',
      actionTo: ROUTES.admin.technicians,
    })
  }

  if (openDispatchCount > 3) {
    alerts.push({
      id: 'open-dispatch-queue',
      title: 'Hàng chờ điều phối kỹ thuật viên đang ùn ứ',
      description: `Hiện có ${openDispatchCount} yêu cầu khảo sát đang mở chờ gán kỹ thuật viên hoặc chờ khách chốt khung giờ.`,
      count: openDispatchCount,
      tone: 'warn',
      badgeText: 'Điều phối mở',
      icon: 'notification_important',
      actionLabel: 'Mở điều phối',
      actionTo: ROUTES.admin.dispatch,
    })
  }

  if (warrantyGap) {
    alerts.push({
      id: 'warranty-gap',
      title: 'Thiếu cấu hình thời hạn bảo hành lắp đặt',
      description:
        'Hệ thống chưa có gói bảo hành mặc định cho hợp đồng thi công mới. Cần cấu hình trong danh mục bảo hành.',
      tone: 'warn',
      badgeText: 'Cấu hình thiếu',
      icon: 'policy',
      actionLabel: 'Thêm thời hạn',
      actionTo: ROUTES.admin.warrantyOptions,
    })
  }

  return (
    <section aria-labelledby="admin-alerts" className="rounded-container bg-surface-2 p-4">
      <h2 id="admin-alerts" className="mb-3 text-title font-semibold">
        Việc cần xử lý
      </h2>
      {alerts.length === 0 ? (
        <p className="text-body text-fg-2">Không có việc nào cần xử lý.</p>
      ) : (
        <ul className="divide-y divide-line">
          {alerts.map((alert) => (
            <li key={alert.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-fg">{alert.title}</p>
                <Badge tone={alert.tone}>{alert.badgeText}</Badge>
              </div>
              <p className="mt-1 text-meta text-fg-2">{alert.description}</p>
              <ButtonLink to={alert.actionTo} variant="info" size="sm" icon="arrow_forward" className="mt-2">
                {alert.actionLabel}
              </ButtonLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
