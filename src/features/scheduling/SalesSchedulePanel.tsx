import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { UseQueryResult } from '@tanstack/react-query'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { DateField, Field, Textarea, TimeSelect } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatDateTime } from '@/features/pre-surveys/preSurveyDisplay'
import { TechnicianChoiceList } from '@/features/scheduling/TechnicianChoiceList'
import {
  BOOKING_HORIZON_DAYS,
  addDays,
  appointmentStatusMeta,
  assignmentSourceLabel,
  formatAppointment,
  formatDay,
  formatMoment,
  formatTime,
  formatTimeRange,
  ineligibleLabel,
  schedulingErrorMessage,
  todayVn,
  vnDate,
  vnTimestamp,
} from '@/features/scheduling/schedulingDisplay'
import {
  useAssignTechnicianMutation,
  useSalesRescheduleMutation,
  useTechnicianAvailabilityQuery,
} from '@/hooks/useSurveyRequests'
import { errorMessage, type ApiError } from '@/services/api/errors'
import type { AvailableTechnicianView, TechnicianAvailabilityView } from '@/types/res/technicianAvailabilityRes'
import type { SurveyAppointmentSummary, SurveyRequestDetail } from '@/types/res/surveyRequestsRes'

// Lịch khảo sát ở trang chi tiết yêu cầu của sales.
// Khách đặt giờ thì kỹ thuật viên trong khu vực tự nhận; sales chỉ theo dõi.
// Quá hạn không ai nhận (ESCALATED) thì sales phân công, lý do bắt buộc. Không cập nhật lạc quan, luôn chờ server

/** Chọn sẵn người đang giữ chỗ nếu còn trong danh sách, không thì người đầu tiên */
function defaultChoice(list: AvailableTechnicianView[], preferredId?: string | null) {
  return list.find((t) => t.technicianUserId === preferredId) ?? list.find((t) => t.isCapacityHolder) ?? list[0] ?? null
}

/* Trạng thái tải của danh sách kỹ thuật viên rảnh; có danh sách thì vẽ `children` */
function AvailabilityState({
  query,
  children,
}: {
  query: UseQueryResult<TechnicianAvailabilityView, ApiError>
  children: (data: TechnicianAvailabilityView) => ReactNode
}) {
  if (query.isPending)
    return (
      <div aria-label="Đang kiểm tra kỹ thuật viên rảnh" className="space-y-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    )
  if (query.isError)
    return (
      <ErrorState
        title="Không kiểm tra được kỹ thuật viên rảnh."
        message={errorMessage(query.error)}
        onRetry={() => query.refetch()}
      />
    )
  const data = query.data
  return (
    <div className="space-y-3" aria-busy={query.isFetching}>
      {data.technicians.length === 0 ? (
        <Notice tone="warn" title="Không còn kỹ thuật viên nào nhận được giờ này">
          Đổi giờ khảo sát, hoặc nhờ quản lý thêm kỹ thuật viên vào khu vực {data.zone?.name ?? 'của công trình'}.
        </Notice>
      ) : (
        children(data)
      )}
      {data.ineligible.length > 0 && (
        <p className="text-meta text-fg-2">
          Không nhận được: {data.ineligible.map((t) => `${t.fullName} (${ineligibleLabel(t.reason)})`).join(', ')}.
        </p>
      )}
    </div>
  )
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="flex basis-full items-center gap-1.5 text-body font-medium text-danger" role="alert">
      <Icon name="error" className="shrink-0 text-[20px]" />
      {message}
    </p>
  )
}

/** Ô lý do bắt buộc khi phân công / đổi người */
function ReasonField({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label="Lý do" htmlFor={id} required hint="Bắt buộc, tối đa 500 ký tự. Lưu vào lịch sử của lịch hẹn.">
      <Textarea id={id} rows={2} maxLength={500} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}

function AssignPanel({
  request,
  appointment,
}: {
  request: SurveyRequestDetail
  appointment: SurveyAppointmentSummary
}) {
  const availability = useTechnicianAvailabilityQuery(request.surveyRequestId)
  const [picked, setPicked] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const assign = useAssignTechnicianMutation()
  const list = availability.data?.technicians ?? []
  const selected =
    list.find((t) => t.technicianUserId === picked) ?? defaultChoice(list, appointment.capacityHolderUserId)
  const escalated = appointment.status === 'ESCALATED'

  async function submit() {
    if (!selected || !availability.data) return
    if (!reason.trim()) {
      setError('Ghi lý do phân công.')
      return
    }
    setError(null)
    try {
      const result = await assign.mutateAsync({
        id: request.surveyRequestId,
        technicianUserId: selected.technicianUserId,
        reason: reason.trim(),
        revision: availability.data.revision,
        reassign: false,
      })
      toast.success(`Đã phân công ${result.technicianName}.`)
    } catch (e) {
      setPicked(null)
      setError(schedulingErrorMessage(e))
    }
  }

  return (
    <Panel raised>
      <PanelHeader
        title={escalated ? 'Cần phân công kỹ thuật viên' : 'Phân công thay kỹ thuật viên'}
        description={
          escalated
            ? `Lịch ${formatAppointment(appointment.startsAt, appointment.endsAt)} quá hạn mà không kỹ thuật viên nào nhận.`
            : `Lịch ${formatAppointment(appointment.startsAt, appointment.endsAt)} đang chờ kỹ thuật viên nhận. Chỉ phân công khi cần.`
        }
      />
      <PanelBody className="space-y-4">
        <AvailabilityState query={availability}>
          {(data) => (
            <TechnicianChoiceList
              label="Kỹ thuật viên đi khảo sát"
              technicians={data.technicians}
              value={selected?.technicianUserId ?? null}
              onChange={(id) => {
                setPicked(id)
                setError(null)
              }}
            />
          )}
        </AvailabilityState>
        <ReasonField
          id="assign-reason"
          value={reason}
          onChange={(value) => {
            setReason(value)
            setError(null)
          }}
        />
      </PanelBody>
      <PanelFooter className="justify-end">
        <ErrorLine message={error} />
        <Button
          variant="primary"
          disabled={!selected || assign.isPending}
          onClick={() => void submit()}
          className="w-full sm:w-auto"
        >
          {assign.isPending ? 'Đang phân công…' : selected ? `Phân công ${selected.fullName}` : 'Phân công'}
        </Button>
      </PanelFooter>
    </Panel>
  )
}

/** Lịch đang chờ kỹ thuật viên trong khu vực tự nhận: sales chỉ theo dõi, phân công thay khi cần */
function WaitingPanel({
  request,
  appointment,
  onReschedule,
}: {
  request: SurveyRequestDetail
  appointment: SurveyAppointmentSummary
  onReschedule: () => void
}) {
  const [assigning, setAssigning] = useState(false)
  return (
    <>
      <Panel>
        <PanelHeader
          title="Lịch khảo sát"
          action={
            <>
              <Button size="sm" variant="soft" icon="edit_calendar" onClick={onReschedule}>
                Đổi giờ
              </Button>
              {!assigning && (
                <Button size="sm" variant="soft" icon="person_add" onClick={() => setAssigning(true)}>
                  Phân công thay
                </Button>
              )}
            </>
          }
        />
        <PanelBody className="space-y-4">
          <ScheduleTime appointment={appointment} />
          <Facts items={[{ k: 'Hạn kỹ thuật viên nhận', v: formatMoment(appointment.acceptanceDeadlineAt) }]} />
          {appointment.customerNote && <Notice title="Ghi chú của khách">{appointment.customerNote}</Notice>}
        </PanelBody>
      </Panel>
      {assigning && <AssignPanel request={request} appointment={appointment} />}
    </>
  )
}

function ReassignDialog({
  request,
  appointment,
  open,
  onOpenChange,
}: {
  request: SurveyRequestDetail
  appointment: SurveyAppointmentSummary
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const availability = useTechnicianAvailabilityQuery(request.surveyRequestId, { enabled: open })
  const [picked, setPicked] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const assign = useAssignTechnicianMutation()
  const currentId = appointment.assignedTechnicianUserId
  const others = (availability.data?.technicians ?? []).filter((t) => t.technicianUserId !== currentId)
  const selected = others.find((t) => t.technicianUserId === picked) ?? others[0] ?? null

  async function submit() {
    if (!selected || !availability.data) return
    if (!reason.trim()) {
      setError('Ghi lý do đổi người.')
      return
    }
    setError(null)
    try {
      const result = await assign.mutateAsync({
        id: request.surveyRequestId,
        technicianUserId: selected.technicianUserId,
        reason: reason.trim(),
        revision: availability.data.revision,
        reassign: true,
      })
      toast.success(`Đã chuyển lịch cho ${result.technicianName}.`)
      onOpenChange(false)
    } catch (e) {
      setPicked(null)
      setError(schedulingErrorMessage(e))
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!assign.isPending}
      className="max-w-2xl"
      aria-label="Đổi kỹ thuật viên"
    >
      <DialogTitle>Đổi kỹ thuật viên</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Lịch {formatAppointment(appointment.startsAt, appointment.endsAt)}, đang giao cho{' '}
        {appointment.assignedTechnicianName}.
      </p>
      <div className="mt-4 max-h-[55dvh] space-y-4 overflow-y-auto scrollbar-thin">
        <AvailabilityState query={availability}>
          {() =>
            others.length === 0 ? (
              <Notice tone="warn">Không có kỹ thuật viên nào khác nhận được giờ này.</Notice>
            ) : (
              <TechnicianChoiceList
                label="Chuyển cho"
                technicians={others}
                value={selected?.technicianUserId ?? null}
                onChange={(id) => {
                  setPicked(id)
                  setError(null)
                }}
              />
            )
          }
        </AvailabilityState>
        <ReasonField
          id="reassign-reason"
          value={reason}
          onChange={(value) => {
            setReason(value)
            setError(null)
          }}
        />
      </div>
      <DialogFooter className="items-center">
        <ErrorLine message={error} />
        <Button variant="ghost" disabled={assign.isPending} onClick={() => onOpenChange(false)}>
          Huỷ
        </Button>
        <Button variant="primary" disabled={!selected || assign.isPending} onClick={() => void submit()}>
          {assign.isPending ? 'Đang chuyển…' : selected ? `Chuyển cho ${selected.fullName}` : 'Chuyển'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

// Đổi giờ: người đã xác nhận giữ lịch nếu vẫn rảnh giờ mới, không thì lịch quay về chờ kỹ thuật viên nhận
function RescheduleDialog({
  request,
  appointment,
  open,
  onOpenChange,
}: {
  request: SurveyRequestDetail
  appointment: SurveyAppointmentSummary
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const today = todayVn()
  const [date, setDate] = useState(() => vnDate(appointment.startsAt))
  const [time, setTime] = useState(() => formatTime(appointment.startsAt))
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const reschedule = useSalesRescheduleMutation()
  const startsAt = vnTimestamp(date, time)
  const unchanged = new Date(startsAt).getTime() === new Date(appointment.startsAt).getTime()

  async function submit() {
    setError(null)
    try {
      const result = await reschedule.mutateAsync({
        id: request.surveyRequestId,
        body: { startsAt, reason: reason.trim() || null },
      })
      const who = result.technicianName ? `, ${result.technicianName} phụ trách` : ', chờ kỹ thuật viên nhận'
      toast.success(`Đã đổi lịch sang ${formatAppointment(result.startsAt, result.endsAt)}${who}.`)
      onOpenChange(false)
    } catch (e) {
      setError(schedulingErrorMessage(e))
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!reschedule.isPending}
      className="max-w-xl"
      aria-label="Đổi giờ khảo sát"
    >
      <DialogTitle>Đổi giờ khảo sát</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Giờ hiện tại: {formatAppointment(appointment.startsAt, appointment.endsAt)}. Kỹ thuật viên đang phụ trách giữ
        lịch nếu vẫn rảnh giờ mới, không thì lịch quay về chờ người trong khu vực nhận.
      </p>
      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Ngày" htmlFor="reschedule-date" className="w-full sm:w-48">
            <DateField
              id="reschedule-date"
              min={today}
              max={addDays(today, BOOKING_HORIZON_DAYS - 1)}
              value={date}
              onChange={(value) => value && setDate(value)}
            />
          </Field>
          <Field label="Giờ bắt đầu" htmlFor="reschedule-time" className="w-full sm:w-36">
            <TimeSelect id="reschedule-time" from="07:00" to="17:00" value={time} onChange={setTime} />
          </Field>
        </div>
        <p className="text-meta text-fg-2">{formatDay(date)}, mỗi lần khảo sát 90 phút.</p>
        <Field label="Lý do đổi giờ" htmlFor="reschedule-reason" hint="Không bắt buộc, tối đa 500 ký tự.">
          <Textarea
            id="reschedule-reason"
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </div>
      <DialogFooter className="items-center">
        <ErrorLine message={error ?? (unchanged ? 'Giờ mới giống giờ hiện tại.' : null)} />
        <Button variant="ghost" disabled={reschedule.isPending} onClick={() => onOpenChange(false)}>
          Huỷ
        </Button>
        <Button variant="primary" disabled={unchanged || reschedule.isPending} onClick={() => void submit()}>
          {reschedule.isPending ? 'Đang đổi…' : 'Đổi lịch'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

function ScheduleTime({ appointment }: { appointment: SurveyAppointmentSummary }) {
  return (
    <div>
      <p className="text-title font-semibold text-fg">{formatDay(vnDate(appointment.startsAt), { year: true })}</p>
      <p className="tnum text-figure font-semibold text-fg">
        {formatTimeRange(appointment.startsAt, appointment.endsAt)}
      </p>
    </div>
  )
}

function ScheduledPanel({
  appointment,
  onReassign,
  onReschedule,
}: {
  appointment: SurveyAppointmentSummary
  onReassign: () => void
  onReschedule: () => void
}) {
  const status = appointmentStatusMeta(appointment.status, 'sales')
  // Lịch đã tới giờ thì backend không cho đổi
  const [now] = useState(() => Date.now())
  const upcoming = new Date(appointment.startsAt).getTime() > now
  return (
    <Panel>
      <PanelHeader
        title="Lịch khảo sát"
        action={
          upcoming ? (
            <>
              <Button size="sm" variant="soft" icon="edit_calendar" onClick={onReschedule}>
                Đổi giờ
              </Button>
              <Button size="sm" variant="soft" icon="swap_horiz" onClick={onReassign}>
                Đổi kỹ thuật viên
              </Button>
            </>
          ) : undefined
        }
      />
      <PanelBody className="space-y-4">
        <ScheduleTime appointment={appointment} />
        <Facts
          items={[
            { k: 'Kỹ thuật viên', v: appointment.assignedTechnicianName ?? '—' },
            { k: 'Trạng thái', v: <Badge tone={status.tone}>{status.label}</Badge> },
            { k: 'Cách xếp', v: assignmentSourceLabel(appointment.assignmentSource, 'sales') },
            { k: 'Xác nhận lúc', v: formatDateTime(appointment.acceptedAt ?? appointment.assignedAt) },
          ]}
        />
        {appointment.assignmentReason && <Notice title="Lý do phân công">{appointment.assignmentReason}</Notice>}
        {appointment.customerNote && <Notice title="Ghi chú của khách">{appointment.customerNote}</Notice>}
      </PanelBody>
    </Panel>
  )
}

export function SalesSchedulePanel({ request }: { request: SurveyRequestDetail }) {
  const a = request.appointment
  const [dialog, setDialog] = useState<'reassign' | 'reschedule' | null>(null)
  // Đổi key mỗi lần mở để form bắt đầu lại từ lịch hiện tại
  const [session, setSession] = useState(0)
  const open = (which: 'reassign' | 'reschedule') => {
    setSession((n) => n + 1)
    setDialog(which)
  }
  const close = (next: boolean) => !next && setDialog(null)

  if (!a)
    return (
      <Panel>
        <PanelHeader title="Lịch khảo sát" />
        <PanelBody>
          <p className="max-w-prose text-body text-fg-2">
            Khách chưa đặt giờ khảo sát. Khách tự chọn giờ trên cổng khách hàng, rồi kỹ thuật viên trong khu vực tự nhận
            lịch. Gọi khách để nhắc nếu yêu cầu chờ lâu.
          </p>
        </PanelBody>
      </Panel>
    )

  return (
    <>
      {a.status === 'ESCALATED' && <AssignPanel key={a.appointmentId} request={request} appointment={a} />}
      {a.status === 'PENDING_ACCEPTANCE' && (
        <WaitingPanel key={a.appointmentId} request={request} appointment={a} onReschedule={() => open('reschedule')} />
      )}
      {a.status !== 'ESCALATED' && a.status !== 'PENDING_ACCEPTANCE' && (
        <ScheduledPanel appointment={a} onReassign={() => open('reassign')} onReschedule={() => open('reschedule')} />
      )}
      <ReassignDialog
        key={`reassign-${session}`}
        open={dialog === 'reassign'}
        onOpenChange={close}
        request={request}
        appointment={a}
      />
      <RescheduleDialog
        key={`reschedule-${session}`}
        open={dialog === 'reschedule'}
        onOpenChange={close}
        request={request}
        appointment={a}
      />
    </>
  )
}
