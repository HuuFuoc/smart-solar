import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState } from '@/components/common/ui/states'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import { ScheduleDialog } from '@/features/installation-schedules/ScheduleDialog'
import { ScheduleHistory } from '@/features/installation-schedules/ScheduleHistory'
import {
  rescheduleReasonText,
  scheduleErrorMessage,
  scheduleStatusMeta,
  scheduleWhen,
} from '@/features/installation-schedules/scheduleDisplay'
import {
  SCHEDULE_NOTE_MAX,
  canCancelSchedule,
  canRetryConfirm,
  liveSchedule,
  projectLocksSchedule,
} from '@/features/installation-schedules/scheduleRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  useCancelStaffScheduleMutation,
  useConfirmStaffScheduleMutation,
  useStaffContractScheduleQuery,
} from '@/hooks/useInstallationSchedules'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { InstallationScheduleView } from '@/types/res/installationSchedulesRes'

// Lịch thi công của hợp đồng đã ký, phía quản lý / quản trị: xem lịch kỹ thuật viên đã hẹn với khách, ghi lịch thay khi kỹ
// thuật viên khảo sát không làm được, thử xác nhận lại lịch của hợp đồng đã thanh toán, huỷ lịch dự kiến. Lịch đã xác nhận là
// phân công của dự án thi công: đổi người / huỷ làm ở mục Thi công

export function StaffContractSchedulePanel({ contract }: { contract: ContractView }) {
  const query = useStaffContractScheduleQuery(contract.contractId)
  const confirm = useConfirmStaffScheduleMutation()
  const cancel = useCancelStaffScheduleMutation()
  const [planning, setPlanning] = useState(false)
  const [cancelling, setCancelling] = useState<InstallationScheduleView | null>(null)
  const history = query.data ?? []
  const live = liveSchedule(history)
  const status = live ? scheduleStatusMeta(live.status, 'staff') : null
  const locked = projectLocksSchedule(live?.projectStatus)

  async function retryConfirm() {
    try {
      const view = await confirm.mutateAsync(contract.contractId)
      toast.success(
        view?.status === 'CONFIRMED'
          ? 'Đã xác nhận lịch thi công.'
          : 'Chưa xác nhận được; xem trạng thái lịch vừa tải lại.',
      )
    } catch (e) {
      toast.error(scheduleErrorMessage(e))
    }
  }

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
        {query.isPending ? (
          <p className="text-body text-fg-2">Đang tải lịch thi công…</p>
        ) : query.data === undefined ? (
          <ErrorState
            title="Không tải được lịch thi công."
            message={scheduleErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            {!live && (
              <p className="text-body text-fg-2">
                Kỹ thuật viên đã khảo sát chưa hẹn ngày thi công với khách. Ghi lịch thay khi kỹ thuật viên đó không làm
                được.
              </p>
            )}
            {live?.status === 'RESCHEDULE_REQUIRED' && (
              <Notice tone="danger" title="Lịch không xác nhận được, cần hẹn lại">
                {rescheduleReasonText(live.rescheduleReasonCode)} Kỹ thuật viên ghi ngày mới, hoặc ghi lịch cho người
                khác ở đây.
              </Notice>
            )}
            {live?.status === 'PLANNED' && live.awaitingPayment && (
              <p className="text-body text-fg-2">
                Lịch dự kiến, chưa giữ chỗ. Hệ thống xác nhận khi hợp đồng đã thanh toán.
              </p>
            )}
            {live?.customerChangeRequestedAt && (
              <Notice tone="warn" title={`Khách xin đổi ngày lúc ${formatMoment(live.customerChangeRequestedAt)}`}>
                <span className="whitespace-pre-line">{live.customerChangeRequestNote}</span>
              </Notice>
            )}
            {live && (
              <p className="text-meta text-fg-2">
                Kỹ thuật viên {live.technicianName}. Khách đồng ý: {live.customerAgreementNote}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {!locked && (
                <Button icon="edit_calendar" variant="soft" onClick={() => setPlanning(true)}>
                  {live ? 'Ghi ngày khác' : 'Ghi lịch thay kỹ thuật viên'}
                </Button>
              )}
              {live && canRetryConfirm(live) && (
                <Button icon="refresh" variant="info" disabled={confirm.isPending} onClick={() => void retryConfirm()}>
                  {confirm.isPending ? 'Đang xác nhận…' : 'Xác nhận lại'}
                </Button>
              )}
              {live && canCancelSchedule(live) && (
                <Button icon="event_busy" variant="danger" onClick={() => setCancelling(live)}>
                  Huỷ lịch
                </Button>
              )}
            </div>
            {history.length > 1 && (
              <details className="border-t border-line pt-4">
                <summary className="tap cursor-pointer text-body font-medium text-fg">
                  Lịch sử lịch thi công ({history.length})
                </summary>
                <div className="mt-3">
                  <ScheduleHistory history={history} viewer="staff" />
                </div>
              </details>
            )}
          </>
        )}
      </PanelBody>
      {planning && (
        <ScheduleDialog
          contractId={contract.contractId}
          title={`Hợp đồng ${contract.contractNumber}`}
          live={live}
          by="staff"
          onClose={() => setPlanning(false)}
        />
      )}
      <ReasonDialog
        open={cancelling !== null}
        title="Huỷ lịch thi công?"
        description="Khách nhận thông báo lịch bị huỷ; kỹ thuật viên hẹn lại ngày mới."
        label="Lý do huỷ"
        maxLength={SCHEDULE_NOTE_MAX}
        submitLabel="Huỷ lịch"
        variant="danger"
        icon="event_busy"
        onSubmit={(reason) =>
          cancel.mutateAsync({ scheduleId: cancelling!.scheduleId, reason }).then(
            () => toast.success('Đã huỷ lịch thi công.'),
            (e: unknown) => {
              throw new Error(scheduleErrorMessage(e))
            },
          )
        }
        onClose={() => setCancelling(null)}
      />
    </Panel>
  )
}
