import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { INSTALLATION_SCHEDULE_FILTERS } from '@/common/installationSchedule'
import { Badge } from '@/components/common/ui/badge'
import { Button, IconButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { PageHeader } from '@/components/common/ui/page-header'
import { PagedList } from '@/components/common/ui/pagination'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import {
  rescheduleReasonText,
  scheduleErrorMessage,
  scheduleStatusMeta,
  scheduleWhen,
} from '@/features/installation-schedules/scheduleDisplay'
import { SCHEDULE_NOTE_MAX, canCancelSchedule, canRetryConfirm } from '@/features/installation-schedules/scheduleRules'
import {
  useCancelStaffScheduleMutation,
  useConfirmStaffScheduleMutation,
  useStaffInstallationSchedulesQuery,
} from '@/hooks/useInstallationSchedules'
import { ROUTES, withId } from '@/routes/paths'
import type { InstallationScheduleView } from '@/types/res/installationSchedulesRes'

// Lịch thi công kỹ thuật viên đã hẹn với khách (quản lý và quản trị dùng chung). Mặc định là hàng chờ phải hẹn lại: lịch không
// xác nhận được khi hợp đồng đã thanh toán (kỹ thuật viên bận, khu vực đổi, dự án đã giao người khác). Mở hợp đồng để ghi lịch
// cho người khác; xác nhận lại / huỷ làm ngay trên dòng. Lọc trạng thái gửi thẳng lên backend (?status=)

type Filter = (typeof INSTALLATION_SCHEDULE_FILTERS)[number]['value']

const isFilter = (value: string | null): value is Filter => INSTALLATION_SCHEDULE_FILTERS.some((f) => f.value === value)

function InstallationSchedulesPage({ contractPattern }: { contractPattern: string }) {
  const [params, setParams] = useSearchParams()
  const raw = params.get('trang-thai')
  const filter: Filter = isFilter(raw) ? raw : 'RESCHEDULE_REQUIRED'
  const query = useStaffInstallationSchedulesQuery(filter || null)
  const toReschedule = useStaffInstallationSchedulesQuery('RESCHEDULE_REQUIRED').data?.length ?? 0
  const confirm = useConfirmStaffScheduleMutation()
  const cancel = useCancelStaffScheduleMutation()
  const [cancelling, setCancelling] = useState<InstallationScheduleView | null>(null)

  const setFilter = (next: Filter) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('trang-thai', next)
        return p
      },
      { replace: true },
    )

  async function retry(s: InstallationScheduleView) {
    try {
      const view = await confirm.mutateAsync(s.contractId)
      toast.success(
        view?.status === 'CONFIRMED' ? 'Đã xác nhận lịch thi công.' : 'Chưa xác nhận được; xem trạng thái vừa tải lại.',
      )
    } catch (e) {
      toast.error(scheduleErrorMessage(e))
    }
  }

  return (
    <div>
      <PageHeader
        title="Lịch thi công"
        description={
          toReschedule > 0 ? <span className="text-danger">{toReschedule} lịch phải hẹn lại</span> : undefined
        }
      />
      <FilterChips
        className="mb-4"
        label="Trạng thái lịch"
        value={filter}
        onChange={setFilter}
        chips={INSTALLATION_SCHEDULE_FILTERS.map((f) => ({
          value: f.value,
          label: f.label,
          count: f.value === 'RESCHEDULE_REQUIRED' ? toReschedule : undefined,
        }))}
      />
      <QueryBoundary query={query}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              title={filter === 'RESCHEDULE_REQUIRED' ? 'Không có lịch nào phải hẹn lại' : 'Không có lịch nào'}
            />
          ) : (
            <PagedList items={rows} noun="lịch">
              {(page) => (
                <Table stack="xl">
                  <thead>
                    <tr>
                      <Th>Công trình</Th>
                      <Th>Thời gian</Th>
                      <Th>Kỹ thuật viên</Th>
                      <Th>Trạng thái</Th>
                      <Th>
                        <span className="sr-only">Thao tác</span>
                      </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.map((s) => {
                      const status = scheduleStatusMeta(s.status, 'staff')
                      return (
                        <Tr key={s.scheduleId}>
                          <Td label="Công trình">
                            <p className="font-medium text-fg">{s.propertyName || 'Công trình chưa đặt tên'}</p>
                            <p className="tnum text-meta text-fg-2">Hợp đồng {s.contractNumber}</p>
                          </Td>
                          <Td label="Thời gian" className="tnum">
                            {scheduleWhen(s)}
                          </Td>
                          <Td label="Kỹ thuật viên">{s.technicianName || '—'}</Td>
                          <Td label="Trạng thái">
                            <Badge tone={status.tone}>{status.label}</Badge>
                            {s.status === 'RESCHEDULE_REQUIRED' && (
                              <p className="text-meta text-fg-2">{rescheduleReasonText(s.rescheduleReasonCode)}</p>
                            )}
                            {s.status === 'PLANNED' && s.awaitingPayment && (
                              <p className="text-meta text-fg-2">Chờ khách thanh toán</p>
                            )}
                            {s.status === 'PLANNED' && s.awaitingContractSignature && (
                              <p className="text-meta text-fg-2">Đã nhận tiền, chờ hợp đồng ký xong</p>
                            )}
                            {s.customerChangeRequestNote && (
                              <p className="text-meta text-fg-2">Khách xin đổi: {s.customerChangeRequestNote}</p>
                            )}
                          </Td>
                          <Td>
                            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                              {canRetryConfirm(s) && (
                                <Button
                                  size="sm"
                                  icon="refresh"
                                  variant="info"
                                  disabled={confirm.isPending}
                                  onClick={() => void retry(s)}
                                >
                                  Xác nhận lại
                                </Button>
                              )}
                              {canCancelSchedule(s) && (
                                <Button size="sm" icon="event_busy" variant="danger" onClick={() => setCancelling(s)}>
                                  Huỷ lịch
                                </Button>
                              )}
                              <IconButtonLink
                                to={`${withId(contractPattern, s.contractId)}#installation-schedule`}
                                icon="visibility"
                                variant="info"
                                label={`Mở hợp đồng ${s.contractNumber}`}
                                tooltip="Mở hợp đồng"
                              />
                            </div>
                          </Td>
                        </Tr>
                      )
                    })}
                  </tbody>
                </Table>
              )}
            </PagedList>
          )
        }
      </QueryBoundary>
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
    </div>
  )
}

export function ManageInstallationSchedulesPage() {
  return <InstallationSchedulesPage contractPattern={ROUTES.manage.contract} />
}

export function AdminInstallationSchedulesPage() {
  return <InstallationSchedulesPage contractPattern={ROUTES.admin.contract} />
}
