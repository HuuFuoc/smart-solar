import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { MaintenanceDialog } from '@/features/after-sales/MaintenanceDialog'
import { ReportFaultDialog } from '@/features/after-sales/ReportFaultDialog'
import {
  byRequestRank,
  isFinalRequest,
  requestKindLabel,
  requestStatusMeta,
  warrantyStatusMeta,
} from '@/features/after-sales/serviceDisplay'
import { formatDateOnly, formatWarrantyMonths } from '@/features/installations/installationDisplay'
import { formatMoment, vnDate } from '@/features/scheduling/schedulingDisplay'
import { useMyServiceRequestsQuery, useWarrantyQuery } from '@/hooks/useCustomerServiceRequests'
import { ROUTES, withId } from '@/routes/paths'
import type { WarrantyView } from '@/types/res/customerAfterSalesRes'

// Khối bảo hành trên trang công trình đã bàn giao: hạn bảo hành, báo lỗi, đặt bảo trì lẻ, các yêu cầu đang mở

function warrantyText(w: WarrantyView) {
  if (w.warrantyStatus === 'ACTIVE' || w.warrantyStatus === 'EXPIRED')
    return `Bảo hành lắp đặt ${formatWarrantyMonths(w.warrantyMonths)}, đến ${formatDateOnly(vnDate(w.warrantyEndsAt ?? ''))}`
  if (w.warrantyStatus === 'NOT_RECORDED')
    return 'Hợp đồng không ghi thời hạn bảo hành; lỗi báo lên sẽ được quản lý xét.'
  return 'Công trình chưa bàn giao.'
}

export function ProjectAfterSalesPanel({ projectId }: { projectId: string }) {
  const warranty = useWarrantyQuery(projectId)
  const requests = useMyServiceRequestsQuery()
  const [dialog, setDialog] = useState<'fault' | 'maintenance' | null>(null)
  const mine = (requests.data ?? []).filter((r) => r.projectId === projectId).sort(byRequestRank('customer'))
  const open = mine.filter((r) => !isFinalRequest(r.status))

  return (
    <Panel>
      <PanelHeader
        title="Bảo hành, sửa chữa"
        description={warranty.data ? warrantyText(warranty.data) : undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <Button icon="report" size="sm" variant="danger" onClick={() => setDialog('fault')}>
              Báo lỗi
            </Button>
            <Button icon="event" size="sm" variant="soft" onClick={() => setDialog('maintenance')}>
              Đặt bảo trì lẻ
            </Button>
          </div>
        }
      />
      <PanelBody className="space-y-3">
        {warranty.isPending ? (
          <Skeleton className="h-6 w-48" />
        ) : warranty.data ? (
          <Badge tone={warrantyStatusMeta(warranty.data.warrantyStatus).tone}>
            {warrantyStatusMeta(warranty.data.warrantyStatus).label}
          </Badge>
        ) : (
          <ErrorState
            title="Không tải được thông tin bảo hành."
            message={warranty.error?.message}
            onRetry={() => void warranty.refetch()}
          />
        )}
        {open.length === 0 ? (
          <p className="text-body text-fg-2">
            {mine.length === 0
              ? 'Chưa có yêu cầu nào. Thiết bị có vấn đề thì bấm Báo lỗi.'
              : 'Không có yêu cầu nào đang xử lý.'}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {open.map((r) => {
              const status = requestStatusMeta(r.status, 'customer')
              return (
                <li key={r.requestId} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium text-fg">
                      {requestKindLabel(r.kind)} <span className="tnum">{r.requestNumber}</span>
                    </p>
                    <p className="truncate text-meta text-fg-2">
                      Gửi {formatMoment(r.createdAt)}: {r.description}
                    </p>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <ButtonLink
                    icon="visibility"
                    size="sm"
                    variant="info"
                    to={withId(ROUTES.customer.afterSalesRequest, r.requestId)}
                  >
                    Xem
                  </ButtonLink>
                </li>
              )
            })}
          </ul>
        )}
        {mine.length > open.length && (
          <ButtonLink icon="visibility" size="sm" variant="info" to={ROUTES.customer.afterSales}>
            Xem mọi yêu cầu
          </ButtonLink>
        )}
      </PanelBody>
      <ReportFaultDialog
        open={dialog === 'fault'}
        projectId={projectId}
        assets={warranty.data?.assets ?? []}
        onClose={() => setDialog(null)}
      />
      <MaintenanceDialog open={dialog === 'maintenance'} projectId={projectId} onClose={() => setDialog(null)} />
    </Panel>
  )
}
