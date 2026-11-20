import { useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
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
import {
  SCHEDULE_NOTE_MAX,
  isSchedulableContract,
  canRequestChange,
  liveSchedule,
  plannedWaitReason,
} from '@/features/installation-schedules/scheduleRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useCustomerContractScheduleQuery, useRequestScheduleChangeMutation } from '@/hooks/useInstallationSchedules'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { InstallationScheduleView } from '@/types/res/installationSchedulesRes'

// Lịch thi công khách đã thống nhất trực tiếp với kỹ thuật viên, trên trang hợp đồng của khách (chỉ theo dõi, khách không chọn
// khung nào). Lịch dự kiến không bao giờ ghi là đã xác nhận: chỉ xác nhận khi hợp đồng đã trả tiền và đã ký. Khách xin ngày khác
// bằng ghi chú (không bắt buộc); lịch giữ nguyên tới khi kỹ thuật viên ghi ngày mới

/** Câu dưới ngày hẹn: đã xác nhận chưa, chờ gì */
function scheduleNote(live: InstallationScheduleView, plan: boolean) {
  if (live.status === 'CONFIRMED') return 'Lịch đã xác nhận. Tiến độ thi công xem ở mục Lắp đặt.'
  if (live.status === 'RESCHEDULE_REQUIRED') return 'Ngày này không xác nhận được, cần hẹn ngày khác.'
  if (live.status !== 'PLANNED') return scheduleStatusMeta(live.status, 'customer').label
  const wait = plannedWaitReason(live)
  if (wait === 'signature')
    return plan
      ? 'Ngày dự kiến, chưa xác nhận. Bạn đã trả 30%; lịch được xác nhận tự động khi hợp đồng giấy được ký và tải đủ các trang.'
      : 'Ngày dự kiến, chưa xác nhận. Bạn đã thanh toán; lịch được xác nhận tự động khi hồ sơ hợp đồng hoàn tất.'
  if (wait === 'payment') return 'Ngày dự kiến, chưa xác nhận. Lịch được xác nhận sau khi hợp đồng được thanh toán.'
  return 'Hợp đồng đã hoàn tất, hệ thống đang xác nhận lịch với kỹ thuật viên.'
}

export function CustomerSchedulePanel({ contract }: { contract: ContractView }) {
  // Hợp đồng 30/70 hẹn được ngày từ khi khoản 30% được xác minh
  const enabled = isSchedulableContract(contract)
  const plan = contract.paymentPlan != null
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
      />
      <PanelBody className="space-y-4">
        {live && (
          <div className="ct-box ct-well flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-4 py-3">
            <div className="flex min-w-0 gap-3">
              <Icon name="calendar_month" className="mt-0.5 shrink-0 text-[20px] text-accent-fg" />
              <div className="min-w-0">
                <p className="tnum text-body font-bold text-fg">{scheduleWhen(live)}</p>
                <p className="mt-0.5 text-meta text-fg-2">{scheduleNote(live, plan)}</p>
              </div>
            </div>
            <div className="text-meta sm:text-right">
              <p className="text-fg-3">Kỹ thuật viên phụ trách:</p>
              <p className="font-semibold text-fg">{live.technicianName}</p>
            </div>
          </div>
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
            Kỹ thuật viên đã khảo sát sẽ thống nhất ngày thi công trực tiếp với bạn rồi ghi lại ở đây.
          </p>
        ) : (
          <>
            {live.status === 'RESCHEDULE_REQUIRED' && (
              <Notice tone="info" title="Ngày này không xác nhận được">
                Kỹ thuật viên hoặc Smart Solar sẽ liên hệ để chọn ngày khác.
              </Notice>
            )}
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
