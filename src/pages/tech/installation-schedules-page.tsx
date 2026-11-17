import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { contractStatusMeta } from '@/features/contracts/contractDisplay'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import { ScheduleDialog } from '@/features/installation-schedules/ScheduleDialog'
import {
  rescheduleReasonText,
  scheduleErrorMessage,
  scheduleStatusMeta,
  scheduleWhen,
} from '@/features/installation-schedules/scheduleDisplay'
import {
  SCHEDULE_NOTE_MAX,
  canCancelSchedule,
  projectLocksSchedule,
} from '@/features/installation-schedules/scheduleRules'
import { useCancelTechnicianScheduleMutation, useTechnicianSchedulesQuery } from '@/hooks/useInstallationSchedules'
import type { InstallationScheduleView, TechnicianScheduleContractView } from '@/types/res/installationSchedulesRes'

// Hợp đồng đã ký / đã thanh toán của công trình kỹ thuật viên đã khảo sát. Kỹ thuật viên gọi khách thống nhất ngày thi công rồi
// ghi lên đây (lịch dự kiến, không giữ chỗ); hợp đồng thanh toán xong thì hệ thống tự tạo dự án thi công và xác nhận lịch. Việc
// cần làm (chưa hẹn, phải hẹn lại, khách xin đổi) lên đầu

const rank = (row: TechnicianScheduleContractView) => {
  const s = row.schedule
  if (!s) return 0
  if (s.status === 'RESCHEDULE_REQUIRED') return 0
  if (s.customerChangeRequestedAt) return 1
  if (s.status === 'PLANNED') return 2
  return 3
}

function needsAction(row: TechnicianScheduleContractView) {
  const s = row.schedule
  return !s || s.status === 'RESCHEDULE_REQUIRED' || Boolean(s.customerChangeRequestedAt)
}

export function TechInstallationSchedulesPage() {
  const query = useTechnicianSchedulesQuery()
  const cancel = useCancelTechnicianScheduleMutation()
  const [planning, setPlanning] = useState<TechnicianScheduleContractView | null>(null)
  const [cancelling, setCancelling] = useState<InstallationScheduleView | null>(null)
  const todo = query.data?.filter(needsAction).length ?? 0

  return (
    <div>
      <PageHeader
        title="Hẹn lịch thi công"
        description={
          todo > 0 ? <span className="text-danger">{todo} hợp đồng cần hẹn hoặc hẹn lại ngày thi công</span> : undefined
        }
      />
      <QueryBoundary query={query}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              title="Chưa có hợp đồng nào đã ký"
              description="Khi hợp đồng của công trình bạn khảo sát được ký, gọi khách hẹn ngày thi công rồi ghi ở đây."
            />
          ) : (
            <Table stack="xl">
              <thead>
                <tr>
                  <Th>Công trình</Th>
                  <Th>Hợp đồng</Th>
                  <Th>Lịch thi công</Th>
                  <Th>
                    <span className="sr-only">Thao tác</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {[...rows]
                  .sort((a, b) => rank(a) - rank(b))
                  .map((row) => {
                    const s = row.schedule
                    const contract = contractStatusMeta(row.contractStatus)
                    const status = s ? scheduleStatusMeta(s.status, 'staff') : null
                    const locked = projectLocksSchedule(s?.projectStatus)
                    return (
                      <Tr key={row.contractId}>
                        <Td label="Công trình">
                          <p className="font-medium text-fg">{row.propertyName || 'Công trình chưa đặt tên'}</p>
                          <p className="text-meta text-fg-2">{row.customerName}</p>
                        </Td>
                        <Td label="Hợp đồng">
                          <p className="tnum text-fg">{row.contractNumber}</p>
                          <Badge tone={contract.tone}>{contract.label}</Badge>
                        </Td>
                        <Td label="Lịch thi công">
                          {s && status ? (
                            <>
                              <p className="tnum text-fg">{scheduleWhen(s)}</p>
                              <Badge tone={status.tone}>{status.label}</Badge>
                              {s.status === 'RESCHEDULE_REQUIRED' && (
                                <p className="text-meta text-fg-2">{rescheduleReasonText(s.rescheduleReasonCode)}</p>
                              )}
                              {s.customerChangeRequestNote && (
                                <p className="text-meta text-fg-2">Khách xin đổi: {s.customerChangeRequestNote}</p>
                              )}
                            </>
                          ) : (
                            <span className="text-danger">Chưa hẹn</span>
                          )}
                        </Td>
                        <Td>
                          <div className="flex flex-wrap gap-2 xl:justify-end">
                            {!locked && (
                              <Button
                                size="sm"
                                icon={s ? 'edit_calendar' : 'event_available'}
                                variant="soft"
                                onClick={() => setPlanning(row)}
                              >
                                {s ? 'Đổi ngày' : 'Hẹn ngày'}
                              </Button>
                            )}
                            {s && canCancelSchedule(s) && (
                              <Button size="sm" icon="event_busy" variant="danger" onClick={() => setCancelling(s)}>
                                Huỷ lịch
                              </Button>
                            )}
                          </div>
                        </Td>
                      </Tr>
                    )
                  })}
              </tbody>
            </Table>
          )
        }
      </QueryBoundary>

      {planning && (
        <ScheduleDialog
          contractId={planning.contractId}
          title={`${planning.propertyName || 'Công trình'}, hợp đồng ${planning.contractNumber}, khách ${planning.customerName}`}
          live={planning.schedule}
          by="technician"
          onClose={() => setPlanning(null)}
        />
      )}
      <ReasonDialog
        open={cancelling !== null}
        title="Huỷ lịch thi công?"
        description="Khách nhận thông báo lịch bị huỷ. Gọi khách hẹn ngày mới rồi ghi lại."
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
    </div>
  )
}
