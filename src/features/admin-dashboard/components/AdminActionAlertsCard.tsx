import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { Skeleton } from '@/components/common/ui/states'
import { ROUTES } from '@/routes/paths'

type AdminActionAlertsCardProps = {
  isLoading?: boolean
  readyContractsCount: number
  missingBaseTechCount: number
  refundsToRecordCount: number
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
  refundsToRecordCount,
  openDispatchCount,
  warrantyGap,
}: AdminActionAlertsCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-container border border-line bg-surface-2 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-3.5 rounded-control border border-line bg-surface-1 space-y-2.5">
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
      actionLabel: 'Phân bổ KTV',
      actionTo: ROUTES.admin.technicians,
    })
  }

  if (refundsToRecordCount > 0) {
    alerts.push({
      id: 'refunds-to-record',
      title: 'Khoản hoàn tiền đã duyệt chờ ghi nhận thực chi',
      description: `Có ${refundsToRecordCount} khoản hoàn tiền đã được quản lý phê duyệt, cần Admin ghi nhận mã chuyển khoản ngoài.`,
      count: refundsToRecordCount,
      tone: 'danger',
      badgeText: 'Chờ ghi nhận',
      icon: 'receipt_long',
      actionLabel: 'Ghi nhận hoàn tiền',
      actionTo: ROUTES.admin.refunds,
    })
  }

  if (openDispatchCount > 3) {
    alerts.push({
      id: 'open-dispatch-queue',
      title: 'Hàng chờ điều phối KTV đang ùn ứ',
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
      description: 'Hệ thống chưa có gói bảo hành mặc định cho hợp đồng thi công mới. Cần cấu hình trong danh mục bảo hành.',
      tone: 'warn',
      badgeText: 'Cấu hình thiếu',
      icon: 'policy',
      actionLabel: 'Thêm thời hạn',
      actionTo: ROUTES.admin.warrantyOptions,
    })
  }

  return (
    <div className="rounded-container border border-line bg-surface-2 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header với đường ngăn cách */}
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h3 className="text-body font-semibold text-fg flex items-center gap-2">
          <Icon name="error" className="text-warn text-[20px]" />
          Cảnh báo & Việc cần xử lý gấp
        </h3>
        {alerts.length > 0 ? (
          <Badge tone="danger">
            {alerts.length} vấn đề
          </Badge>
        ) : (
          <Badge tone="ok">
            Tất cả ổn định
          </Badge>
        )}
      </div>

      {/* Alert list: Tách thành từng bảng hộp có đường viền và ngăn cách rõ ràng */}
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center text-fg-muted rounded-control border border-dashed border-line bg-surface-1">
          <Icon name="verified" className="text-[36px] text-ok mb-2" />
          <p className="text-body font-medium text-fg">Không có cảnh báo khẩn cấp</p>
          <p className="text-meta text-fg-2">Mọi quy trình thi công, điều phối và bảo hành đang diễn ra bình thường.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="group relative flex flex-col justify-between rounded-control border border-line bg-surface-1 p-3.5 shadow-xs transition-all duration-200 hover:border-line-2 hover:shadow-sm"
            >
              {/* Tiêu đề & Badge */}
              <div className="flex items-start justify-between gap-2 border-b border-line/60 pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex size-7 shrink-0 items-center justify-center rounded-control ${
                      alert.tone === 'danger'
                        ? 'bg-danger-soft text-danger'
                        : alert.tone === 'warn'
                          ? 'bg-warn-soft text-warn'
                          : 'bg-info-soft text-info'
                    }`}
                  >
                    <Icon name={alert.icon} className="text-[17px]" />
                  </div>
                  <span className="text-meta font-semibold text-fg leading-tight">
                    {alert.title}
                  </span>
                </div>
                <Badge tone={alert.tone}>
                  {alert.badgeText}
                </Badge>
              </div>

              {/* Nội dung mô tả */}
              <p className="text-meta text-fg-2 leading-relaxed py-2.5">
                {alert.description}
              </p>

              {/* Nút hành động có đường ngăn cách trên */}
              <div className="flex items-center justify-between border-t border-line/60 pt-2">
                <span className="text-[11px] font-medium text-fg-muted">Cần quản trị viên kiểm tra</span>
                <ButtonLink
                  to={alert.actionTo}
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary-hover gap-1 font-medium text-xs -mr-1"
                >
                  <span>{alert.actionLabel}</span>
                  <Icon name="chevron_right" className="text-[16px]" />
                </ButtonLink>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
