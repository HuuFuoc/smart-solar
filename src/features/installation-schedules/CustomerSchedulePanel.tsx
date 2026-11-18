import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState } from '@/components/common/ui/states'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import { ScheduleHistory } from '@/features/installation-schedules/ScheduleHistory'
import {
  scheduleErrorMessage,
  scheduleStatusMeta,
  scheduleWhen,
} from '@/features/installation-schedules/scheduleDisplay'
import { CustomerSlotOffers } from '@/features/installation-schedules/CustomerSlotOffers'
import {
  SCHEDULE_NOTE_MAX,
  canRequestChange,
  liveSchedule,
  projectLocksSchedule,
} from '@/features/installation-schedules/scheduleRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useCustomerContractScheduleQuery, useRequestScheduleChangeMutation } from '@/hooks/useInstallationSchedules'
import type { ContractView } from '@/types/res/customerContractsRes'

// Lịch thi công khách đã thống nhất với kỹ thuật viên, trên trang hợp đồng của khách. Lịch dự kiến không bao giờ ghi là đã xác
// nhận: chỉ xác nhận khi hợp đồng đã thanh toán. Khách xin ngày khác bằng ghi chú; lịch giữ nguyên tới khi kỹ thuật viên ghi
// ngày mới

export function CustomerSchedulePanel({ contract }: { contract: ContractView }) {
  const enabled = contract.status === 'SIGNED' || contract.status === 'PAID'
  const query = useCustomerContractScheduleQuery(contract.contractId, { enabled })
  const change = useRequestScheduleChangeMutation()
  const [asking, setAsking] = useState(false)
  if (!enabled) return null
  const history = query.data ?? []
  const live = liveSchedule(history)
  const status = live ? scheduleStatusMeta(live.status, 'customer') : null

  return (
    <Panel id="installation-schedule" className="scroll-mt-6">
      <PanelHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Lịch thi công {status && <Badge tone={status.tone}>{status.label}</Badge>}
          </span>
        }
        description={live ? scheduleWhen(live) : undefined}
      />
      <PanelBody className="space-y-4">
        {!projectLocksSchedule(live?.projectStatus) && (
          <CustomerSlotOffers contractId={contract.contractId} paid={contract.status === 'PAID'} />
        )}
        {query.isPending ? (
          <p className="text-body text-fg-2">Đang tải lịch thi công…</p>
        ) : query.data === undefined ? (
          <ErrorState
            title="Không tải được lịch thi công."
            message={scheduleErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : !live ? (
          <p className="text-body text-fg-2">
            Kỹ thuật viên đã khảo sát sẽ đề xuất vài khung để bạn chọn, hoặc gọi bạn để thống nhất ngày thi công.
          </p>
        ) : (
          <>
            {live.status === 'PLANNED' && (
              <p className="text-body text-fg-2">
                {live.awaitingPayment
                  ? 'Ngày dự kiến, chưa xác nhận. Lịch được xác nhận sau khi hợp đồng được thanh toán.'
                  : 'Hợp đồng đã thanh toán, hệ thống đang xác nhận lịch với kỹ thuật viên.'}
              </p>
            )}
            {live.status === 'CONFIRMED' && (
              <p className="text-body text-fg-2">Lịch đã xác nhận. Tiến độ thi công xem ở mục Lắp đặt.</p>
            )}
            {live.status === 'RESCHEDULE_REQUIRED' && (
              <Notice tone="info" title="Ngày này không xác nhận được">
                Kỹ thuật viên hoặc Smart Solar sẽ liên hệ để chọn ngày khác.
              </Notice>
            )}
            <p className="text-meta text-fg-2">Kỹ thuật viên {live.technicianName}</p>
            {live.customerChangeRequestedAt && (
              <Notice title={`Bạn đã xin đổi ngày lúc ${formatMoment(live.customerChangeRequestedAt)}`}>
                <span className="whitespace-pre-line">{live.customerChangeRequestNote}</span>
              </Notice>
            )}
            {canRequestChange(live) && (
              <div className="flex flex-wrap gap-3">
                <Button icon="edit_calendar" variant="soft" onClick={() => setAsking(true)}>
                  Xin đổi ngày
                </Button>
              </div>
            )}
            {history.length > 1 && (
              <details className="border-t border-line pt-4">
                <summary className="tap cursor-pointer text-body font-medium text-fg">
                  Các lần hẹn ({history.length})
                </summary>
                <div className="mt-3">
                  <ScheduleHistory history={history} viewer="customer" />
                </div>
              </details>
            )}
          </>
        )}
      </PanelBody>
      {live && (
        <ReasonDialog
          open={asking}
          title="Xin đổi ngày thi công"
          description="Kỹ thuật viên thấy ghi chú này và gọi bạn để thống nhất ngày mới. Lịch hiện tại giữ nguyên tới lúc đó."
          label="Lý do và những ngày bạn tiện"
          maxLength={SCHEDULE_NOTE_MAX}
          submitLabel="Gửi"
          variant="primary"
          icon="send"
          onSubmit={(note) =>
            change.mutateAsync({ scheduleId: live.scheduleId, note }).then(
              () => toast.success('Đã gửi. Kỹ thuật viên sẽ liên hệ bạn.'),
              (e: unknown) => {
                throw new Error(scheduleErrorMessage(e))
              },
            )
          }
          onClose={() => setAsking(false)}
        />
      )}
    </Panel>
  )
}
