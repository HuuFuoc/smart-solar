import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { UseQueryResult } from '@tanstack/react-query'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Input, Select, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatDateTime } from '@/features/pre-surveys/preSurveyDisplay'
import { TechnicianChoiceList } from '@/features/scheduling/TechnicianChoiceList'
import {
  BOOKING_HORIZON_DAYS,
  HALF_HOUR_TIMES,
  addDays,
  appointmentStatusMeta,
  formatAppointment,
  formatDay,
  formatTime,
  formatTimeRange,
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
import { errorMessage, isApiError, type ApiError } from '@/services/api/errors'
import type { AvailableTechnicianView, TechnicianAvailabilityView } from '@/types/res/technicianAvailabilityRes'
import type { SurveyAppointmentSummary, SurveyRequestDetail } from '@/types/res/surveyRequestsRes'

/*
  Lịch khảo sát ở trang chi tiết yêu cầu của sales (luồng 1, 12/10/2026):
  - Khách chưa đặt giờ: chỉ báo, sales không đặt thay được (backend không có API).
  - Khách đã đặt (BOOKED): phân công chính thức – chọn trong danh sách kỹ thuật viên rảnh (người hệ thống đang giữ chỗ đứng
    đầu, chọn sẵn). Yêu cầu thành "Đã hẹn khảo sát".
  - Đã phân công / kỹ thuật viên đã nhận: đổi người (người mới phải xác nhận lại) hoặc đổi giờ (kiểm tra người rảnh ở giờ
    mới trước khi đổi). Lỗi thì lịch cũ giữ nguyên trên server, màn hình tải lại để thấy đúng bản đang có.
  Không cập nhật lạc quan: mọi thao tác chờ server rồi tải lại chi tiết + danh sách người rảnh.
*/

/** Người nên chọn sẵn: người đang phụ trách / đang giữ chỗ nếu còn trong danh sách, không thì người đầu tiên. */
function defaultChoice(list: AvailableTechnicianView[], preferredId?: string | null) {
  return list.find((t) => t.technicianUserId === preferredId) ?? list.find((t) => t.isCurrentReservation) ?? list[0] ?? null
}

/* Trạng thái tải của danh sách kỹ thuật viên rảnh; có danh sách thì vẽ `children`. */
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
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    )
  if (query.isError) return <ErrorState title="Không kiểm tra được kỹ thuật viên rảnh." message={errorMessage(query.error)} onRetry={() => query.refetch()} />
  const data = query.data
  return (
    <div className="space-y-3" aria-busy={query.isFetching}>
      {data.routingStatus !== 'VERIFIED' && (
        <Notice tone="warn">
          Chưa kiểm tra được đường đi của một số kỹ thuật viên (dịch vụ bản đồ lỗi) nên họ không có trong danh sách.{' '}
          <button type="button" className="tap ui-link font-medium" onClick={() => query.refetch()}>
            Kiểm tra lại
          </button>
        </Notice>
      )}
      {data.technicians.length === 0 ? (
        <Notice tone="warn" title="Không còn kỹ thuật viên nào nhận được giờ này">
          Đổi giờ khảo sát, hoặc xem lại giờ làm và lịch nghỉ của kỹ thuật viên.
        </Notice>
      ) : (
        children(data)
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

function AssignPanel({ request, appointment, onReschedule }: { request: SurveyRequestDetail; appointment: SurveyAppointmentSummary; onReschedule: () => void }) {
  const availability = useTechnicianAvailabilityQuery(request.surveyRequestId)
  const [picked, setPicked] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const assign = useAssignTechnicianMutation()
  const list = availability.data?.technicians ?? []
  const selected = list.find((t) => t.technicianUserId === picked) ?? defaultChoice(list, appointment.reservedTechnicianUserId)

  async function submit() {
    if (!selected) return
    setError(null)
    try {
      const result = await assign.mutateAsync({
        id: request.surveyRequestId,
        technicianUserId: selected.technicianUserId,
        reason: reason.trim() || null,
        reassign: false,
      })
      toast.success(`Đã phân công ${result.technicianName}. Kỹ thuật viên cần xác nhận nhận việc.`)
    } catch (e) {
      if (isApiError(e) && e.code === 'TECHNICIAN_NOT_AVAILABLE') setPicked(null)
      setError(schedulingErrorMessage(e))
    }
  }

  return (
    <Panel raised>
      <PanelHeader
        title="Phân công kỹ thuật viên"
        description={`Khách đã đặt ${formatAppointment(appointment.startsAt, appointment.endsAt)}. Hệ thống đang giữ chỗ cho ${appointment.reservedTechnicianName}; đổi người nếu cần.`}
        action={
          <Button size="sm" icon="edit_calendar" onClick={onReschedule}>
            Đổi giờ
          </Button>
        }
      />
      <PanelBody className="space-y-4">
        {appointment.customerNote && <Notice title="Ghi chú của khách">{appointment.customerNote}</Notice>}
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
        <Field label="Ghi chú phân công" htmlFor="assign-reason" hint="Không bắt buộc. Lưu vào lịch sử của lịch hẹn.">
          <Textarea id="assign-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </PanelBody>
      <PanelFooter className="justify-end">
        <ErrorLine message={error} />
        <Button variant="primary" disabled={!selected || assign.isPending} onClick={() => void submit()} className="w-full sm:w-auto">
          {assign.isPending ? 'Đang phân công…' : selected ? `Phân công ${selected.fullName}` : 'Phân công'}
        </Button>
      </PanelFooter>
    </Panel>
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
  const availability = useTechnicianAvailabilityQuery(request.surveyRequestId, undefined, { enabled: open })
  const [picked, setPicked] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const assign = useAssignTechnicianMutation()
  const currentId = appointment.assignedTechnicianUserId
  const others = (availability.data?.technicians ?? []).filter((t) => t.technicianUserId !== currentId)
  const selected = others.find((t) => t.technicianUserId === picked) ?? others[0] ?? null

  async function submit() {
    if (!selected) return
    setError(null)
    try {
      const result = await assign.mutateAsync({
        id: request.surveyRequestId,
        technicianUserId: selected.technicianUserId,
        reason: reason.trim() || null,
        reassign: true,
      })
      toast.success(`Đã chuyển lịch cho ${result.technicianName}. Kỹ thuật viên cần xác nhận nhận việc.`)
      onOpenChange(false)
    } catch (e) {
      if (isApiError(e) && e.code === 'TECHNICIAN_NOT_AVAILABLE') setPicked(null)
      setError(schedulingErrorMessage(e))
    }
  }

  return (
    <ModalDialog open={open} onOpenChange={onOpenChange} dismissible={!assign.isPending} className="max-w-2xl" aria-label="Đổi kỹ thuật viên">
      <DialogTitle>Đổi kỹ thuật viên</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Lịch {formatAppointment(appointment.startsAt, appointment.endsAt)}, đang giao cho {appointment.assignedTechnicianName}.
      </p>
      <div className="mt-4 max-h-[55dvh] space-y-4 overflow-y-auto scrollbar-thin">
        {appointment.status === 'ACKNOWLEDGED' && (
          <Notice tone="warn">
            {appointment.assignedTechnicianName} đã nhận việc. Đổi người thì xác nhận đó hết hiệu lực và người mới phải xác nhận lại.
          </Notice>
        )}
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
        <Field label="Lý do đổi người" htmlFor="reassign-reason" hint="Lưu vào lịch sử và báo cho người cũ.">
          <Textarea id="reassign-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
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
  /** Giờ đã bấm "Xem kỹ thuật viên rảnh"; đổi ngày / giờ thì phải kiểm tra lại. */
  const [checked, setChecked] = useState<string | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const availability = useTechnicianAvailabilityQuery(request.surveyRequestId, checked ?? undefined, { enabled: open && checked !== null })
  const reschedule = useSalesRescheduleMutation()
  const currentId = appointment.assignedTechnicianUserId ?? appointment.reservedTechnicianUserId
  const list = checked ? (availability.data?.technicians ?? []) : []
  const selected = list.find((t) => t.technicianUserId === picked) ?? defaultChoice(list, currentId)
  const startsAt = vnTimestamp(date, time)
  const unchanged = checked !== null && new Date(checked).getTime() === new Date(appointment.startsAt).getTime() && selected?.technicianUserId === currentId

  function edit(next: { date?: string; time?: string }) {
    if (next.date !== undefined) setDate(next.date)
    if (next.time !== undefined) setTime(next.time)
    setChecked(null)
    setPicked(null)
    setError(null)
  }

  async function submit() {
    if (!checked || !selected) return
    setError(null)
    try {
      const result = await reschedule.mutateAsync({
        id: request.surveyRequestId,
        body: { startsAt: checked, reason: reason.trim() || null, technicianUserId: selected.technicianUserId },
      })
      toast.success(
        `Đã đổi lịch sang ${formatAppointment(result.startsAt, result.endsAt)}, ${result.technicianName} phụ trách.${
          result.acknowledgementRequired ? ' Kỹ thuật viên cần xác nhận nhận việc.' : ''
        }`,
      )
      onOpenChange(false)
    } catch (e) {
      if (isApiError(e) && e.code === 'TECHNICIAN_NOT_AVAILABLE') setPicked(null)
      setError(schedulingErrorMessage(e))
    }
  }

  return (
    <ModalDialog open={open} onOpenChange={onOpenChange} dismissible={!reschedule.isPending} className="max-w-2xl" aria-label="Đổi giờ khảo sát">
      <DialogTitle>Đổi giờ khảo sát</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Giờ hiện tại: {formatAppointment(appointment.startsAt, appointment.endsAt)}. Lịch cũ giữ nguyên cho tới khi đổi xong.
      </p>
      <div className="mt-4 max-h-[60dvh] space-y-4 overflow-y-auto scrollbar-thin">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Ngày" htmlFor="reschedule-date" className="w-full sm:w-48">
            <Input
              id="reschedule-date"
              type="date"
              min={today}
              max={addDays(today, BOOKING_HORIZON_DAYS - 1)}
              value={date}
              onChange={(e) => e.target.value && edit({ date: e.target.value })}
            />
          </Field>
          <Field label="Giờ bắt đầu" htmlFor="reschedule-time" className="w-full sm:w-36">
            <Select id="reschedule-time" value={time} onChange={(e) => edit({ time: e.target.value })}>
              {HALF_HOUR_TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Button onClick={() => setChecked(startsAt)} disabled={checked === startsAt}>
            Xem kỹ thuật viên rảnh
          </Button>
        </div>
        <p className="text-meta text-fg-2">
          {formatDay(date)}, mỗi lần khảo sát 90 phút. Giờ phải nằm trọn trong giờ làm của kỹ thuật viên; hệ thống kiểm tra lại khi xem.
        </p>
        {checked && (
          <AvailabilityState query={availability}>
            {(data) => (
              <>
                <p className="text-body font-medium text-fg">Kỹ thuật viên nhận được {formatTimeRange(data.startsAt, data.endsAt)}</p>
                <TechnicianChoiceList
                  label="Kỹ thuật viên phụ trách giờ mới"
                  technicians={data.technicians}
                  value={selected?.technicianUserId ?? null}
                  currentAssigneeId={appointment.assignedTechnicianUserId}
                  onChange={(id) => {
                    setPicked(id)
                    setError(null)
                  }}
                />
              </>
            )}
          </AvailabilityState>
        )}
        <Field label="Lý do đổi giờ" htmlFor="reschedule-reason" hint="Không bắt buộc, tối đa 500 ký tự. Lưu vào lịch sử.">
          <Textarea id="reschedule-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
      <DialogFooter className="items-center">
        <ErrorLine message={error ?? (unchanged ? 'Giờ và người phụ trách giống lịch hiện tại.' : null)} />
        <Button variant="ghost" disabled={reschedule.isPending} onClick={() => onOpenChange(false)}>
          Huỷ
        </Button>
        <Button variant="primary" disabled={!checked || !selected || unchanged || reschedule.isPending} onClick={() => void submit()}>
          {reschedule.isPending ? 'Đang đổi…' : 'Đổi lịch'}
        </Button>
      </DialogFooter>
    </ModalDialog>
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
  // Lịch đã tới giờ thì backend không cho đổi; mốc lấy lúc mở trang (lỡ quá giờ trong lúc mở thì backend vẫn báo lỗi rõ).
  const [now] = useState(() => Date.now())
  const upcoming = new Date(appointment.startsAt).getTime() > now
  return (
    <Panel>
      <PanelHeader
        title="Lịch khảo sát"
        action={
          upcoming ? (
            <>
              <Button size="sm" icon="edit_calendar" onClick={onReschedule}>
                Đổi giờ
              </Button>
              <Button size="sm" icon="swap_horiz" onClick={onReassign}>
                Đổi kỹ thuật viên
              </Button>
            </>
          ) : undefined
        }
      />
      <PanelBody className="space-y-4">
        <div>
          <p className="text-title font-semibold text-fg">{formatDay(vnDate(appointment.startsAt), { year: true })}</p>
          <p className="tnum text-figure font-semibold text-fg">{formatTimeRange(appointment.startsAt, appointment.endsAt)}</p>
        </div>
        <Facts
          items={[
            { k: 'Kỹ thuật viên', v: appointment.assignedTechnicianName ?? '—' },
            { k: 'Trạng thái', v: <Badge tone={status.tone}>{appointment.status === 'ASSIGNED' ? 'Chờ kỹ thuật viên nhận việc' : status.label}</Badge> },
            { k: 'Phân công lúc', v: formatDateTime(appointment.assignedAt) },
            ...(appointment.acknowledgedAt ? [{ k: 'Nhận việc lúc', v: formatDateTime(appointment.acknowledgedAt) }] : []),
          ]}
        />
        {appointment.customerNote && <Notice title="Ghi chú của khách">{appointment.customerNote}</Notice>}
      </PanelBody>
    </Panel>
  )
}

export function SalesSchedulePanel({ request }: { request: SurveyRequestDetail }) {
  const a = request.appointment
  const [dialog, setDialog] = useState<'reassign' | 'reschedule' | null>(null)
  /* Tăng mỗi lần mở: key mới nên form (ngày, giờ, người chọn) bắt đầu lại từ lịch hiện tại, không giữ lần mở trước. */
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
            Khách chưa đặt giờ khảo sát. Khách tự chọn giờ trên cổng khách hàng; gọi khách để nhắc nếu yêu cầu chờ lâu. Có giờ, bạn phân
            công kỹ thuật viên ở đây.
          </p>
        </PanelBody>
      </Panel>
    )

  return (
    <>
      {a.status === 'BOOKED' ? (
        <AssignPanel key={a.appointmentId} request={request} appointment={a} onReschedule={() => open('reschedule')} />
      ) : (
        <ScheduledPanel appointment={a} onReassign={() => open('reassign')} onReschedule={() => open('reschedule')} />
      )}
      <ReassignDialog key={`reassign-${session}`} open={dialog === 'reassign'} onOpenChange={close} request={request} appointment={a} />
      <RescheduleDialog key={`reschedule-${session}`} open={dialog === 'reschedule'} onOpenChange={close} request={request} appointment={a} />
    </>
  )
}
