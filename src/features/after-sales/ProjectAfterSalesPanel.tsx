import { useState } from 'react'
import { Badge, type Tone } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { MaintenanceDialog } from '@/features/after-sales/MaintenanceDialog'
import {
  byRequestRank,
  groupEquipmentWarranty,
  isFinalRequest,
  requestKindLabel,
  requestStatusMeta,
  warrantyStatusMeta,
} from '@/features/after-sales/serviceDisplay'
import { assetTypeLabel, formatDateOnly, formatWarrantyMonths } from '@/features/installations/installationDisplay'
import { formatMoment, vnDate } from '@/features/scheduling/schedulingDisplay'
import { useMyServiceRequestsQuery, useWarrantyQuery } from '@/hooks/useCustomerServiceRequests'
import { ROUTES, withId } from '@/routes/paths'
import type { WarrantyView } from '@/types/res/customerAfterSalesRes'

// Khối bảo hành trên trang công trình đã bàn giao: hạn bảo hành, báo lỗi, đặt bảo trì lẻ, các yêu cầu đang mở, bảo hành của hãng
// theo thiết bị. Kiểu thẻ của trang công trình phía khách (contract-detail.css)

function warrantyText(w: WarrantyView) {
  if (w.warrantyStatus === 'ACTIVE' || w.warrantyStatus === 'EXPIRED')
    return (
      <>
        Bảo hành lắp đặt {formatWarrantyMonths(w.warrantyMonths)}, đến{' '}
        <span className="tnum font-semibold text-fg">{formatDateOnly(vnDate(w.warrantyEndsAt ?? ''))}</span>
      </>
    )
  if (w.warrantyStatus === 'NOT_RECORDED')
    return 'Hợp đồng không ghi thời hạn bảo hành; lỗi báo lên sẽ được quản lý xét.'
  return 'Công trình chưa bàn giao.'
}

// Màu nhãn loại thiết bị trên thẻ: tấm pin vàng nắng, inverter xanh, pin lưu trữ xanh dương
const ASSET_TONES: Record<string, Tone> = { PANEL: 'warn', INVERTER: 'ok', BATTERY: 'info' }

export function ProjectAfterSalesPanel({ projectId }: { projectId: string }) {
  const warranty = useWarrantyQuery(projectId)
  const requests = useMyServiceRequestsQuery()
  const [dialog, setDialog] = useState<'maintenance' | null>(null)
  const mine = (requests.data ?? []).filter((r) => r.projectId === projectId).sort(byRequestRank('customer'))
  const open = mine.filter((r) => !isFinalRequest(r.status))
  const groups = warranty.data ? groupEquipmentWarranty(warranty.data.assets) : []

  return (
    <Panel>
      <PanelHeader
        className="border-b border-line pb-4"
        title="Bảo hành, sửa chữa"
        description={warranty.data ? warrantyText(warranty.data) : undefined}
        action={
          <Button icon="calendar_month" size="sm" variant="soft" onClick={() => setDialog('maintenance')}>
            Đặt bảo trì lẻ
          </Button>
        }
      />
      <PanelBody className="space-y-5">
        {warranty.isPending ? (
          <Skeleton className="h-12" />
        ) : !warranty.data ? (
          <ErrorState
            title="Không tải được thông tin bảo hành."
            message={warranty.error?.message}
            onRetry={() => void warranty.refetch()}
          />
        ) : (
          <div className="ct-box ct-well flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
            <Badge tone={warrantyStatusMeta(warranty.data.warrantyStatus).tone}>
              {warrantyStatusMeta(warranty.data.warrantyStatus).label}
            </Badge>
            {open.length === 0 && (
              <p className="min-w-0 flex-1 text-meta text-fg-2">
                {mine.length === 0 ? (
                  <>
                    Chưa có yêu cầu nào. Thiết bị có vấn đề thì bấm{' '}
                    <span className="font-semibold text-danger">Báo lỗi</span> ở đầu trang.
                  </>
                ) : (
                  'Không có yêu cầu nào đang xử lý.'
                )}
              </p>
            )}
          </div>
        )}

        {open.length > 0 && (
          <ul className="space-y-2">
            {open.map((r) => {
              const status = requestStatusMeta(r.status, 'customer')
              return (
                <li key={r.requestId} className="ct-box flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-semibold text-fg">
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

        {groups.length > 0 && (
          <section aria-labelledby="equipment-warranty">
            <h3 id="equipment-warranty" className="ct-eyebrow text-fg">
              Bảo hành của hãng theo thiết bị
            </h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {groups.map((g) => (
                <li key={`${g.name}|${g.text}`} className="ct-box min-w-0 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone={ASSET_TONES[g.assetType] ?? 'neutral'}>{assetTypeLabel(g.assetType)}</Badge>
                    <span className="tnum text-meta text-fg-2">Số lượng: {g.count.toLocaleString('vi-VN')}</span>
                  </div>
                  <p className="mt-3 text-body font-semibold wrap-break-word text-fg">{g.product}</p>
                  <p className="mt-3 border-t border-line pt-3 text-meta text-fg-2">{g.text}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {mine.length > open.length && (
          <ButtonLink icon="visibility" size="sm" variant="info" to={ROUTES.customer.afterSales}>
            Xem mọi yêu cầu
          </ButtonLink>
        )}
      </PanelBody>
      <MaintenanceDialog open={dialog === 'maintenance'} projectId={projectId} onClose={() => setDialog(null)} />
    </Panel>
  )
}
