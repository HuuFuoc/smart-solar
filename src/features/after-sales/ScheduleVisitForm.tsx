import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DateField, Field, Input, Select, TimeSelect } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { openVisit, visitPurposeLabel } from '@/features/after-sales/serviceDisplay'
import { addDays, formatTime, todayVn, vnDate, vnTimestamp } from '@/features/scheduling/schedulingDisplay'
import { useScheduleVisitMutation } from '@/hooks/useManagerAfterSales'
import { useTechniciansQuery } from '@/hooks/useTechnicianAdmin'
import { errorMessage, isApiError, messageForCode } from '@/services/api/errors'
import type { TechnicianProfileView } from '@/types/res/adminTechniciansRes'
import type { ServiceRequestView } from '@/types/res/customerAfterSalesRes'

// Quản lý xếp buổi hẹn (kiểm tra, sửa, bảo trì, làm lại) hoặc đổi buổi đã hẹn mà kỹ thuật viên chưa bắt đầu
// Kỹ thuật viên ngoài khu vực của công trình thì backend bắt đánh dấu ngoài khu vực và ghi lý do
// Giờ chọn được cả ngày: giờ làm của từng kỹ thuật viên khác nhau và backend kiểm tra

const REASON_MAX = 500

const inZone = (t: TechnicianProfileView, zoneId: string | null) =>
  zoneId !== null && t.zones.some((z) => z.zoneId === zoneId)

/** Lỗi trùng lịch có mã lý do trong `details.reason`, dịch được thì dùng câu đó */
function scheduleError(error: unknown) {
  if (isApiError(error) && error.details && typeof error.details === 'object' && 'reason' in error.details) {
    const reason = (error.details as { reason?: unknown }).reason
    if (typeof reason === 'string') return messageForCode(reason) ?? error.message
  }
  return errorMessage(error)
}

export function ScheduleVisitForm({
  request,
  purpose,
  zoneId,
}: {
  request: ServiceRequestView
  purpose: string
  /** Khu vực của công trình; null khi chưa biết */
  zoneId: string | null
}) {
  const technicians = useTechniciansQuery()
  const schedule = useScheduleVisitMutation()
  const moving = openVisit(request)
  // Đổi lịch thì mở sẵn lịch cũ; hẹn mới thì lấy giờ khách muốn, không có thì sáng mai
  const start = moving?.startsAt ?? request.preferredStartsAt
  const [technicianId, setTechnicianId] = useState(moving?.technicianUserId ?? '')
  const [date, setDate] = useState(start ? vnDate(start) : addDays(todayVn(), 1))
  const [from, setFrom] = useState(start ? formatTime(start) : '08:00')
  const [to, setTo] = useState(moving ? formatTime(moving.endsAt) : '10:00')
  const [reason, setReason] = useState('')
  const [issue, setIssue] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const list = [...(technicians.data ?? [])]
    .filter((t) => t.isActiveUser)
    .sort((a, b) => Number(inZone(b, zoneId)) - Number(inZone(a, zoneId)) || a.fullName.localeCompare(b.fullName))
  const picked = list.find((t) => t.technicianUserId === technicianId)
  const outside = Boolean(picked && zoneId && !inZone(picked, zoneId))
  const reasonRequired = Boolean(moving) || outside

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!technicianId) return setIssue('Chọn kỹ thuật viên.')
    if (!date) return setIssue('Chọn ngày hẹn.')
    if (to <= from) return setIssue('Giờ kết thúc phải sau giờ bắt đầu.')
    if (reasonRequired && !reason.trim())
      return setIssue(moving ? 'Ghi lý do đổi lịch.' : 'Ghi lý do giao cho kỹ thuật viên ngoài khu vực.')
    setIssue(null)
    try {
      await schedule.mutateAsync({
        requestId: request.requestId,
        body: {
          technicianUserId: technicianId,
          startsAt: vnTimestamp(date, from),
          endsAt: vnTimestamp(date, to),
          reason: reason.trim() || null,
          expectedRevision: request.revision,
          crossZoneAuthorized: outside,
        },
      })
      toast.success(moving ? 'Đã đổi lịch hẹn.' : 'Đã xếp lịch. Chờ kỹ thuật viên nhận việc.')
      setReason('')
    } catch (err) {
      setError(scheduleError(err))
    }
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <p className="text-body text-fg-2">
        {moving
          ? `Đổi buổi ${visitPurposeLabel(purpose).toLowerCase()} đã hẹn. Kỹ thuật viên phải nhận lại lịch mới.`
          : `Hẹn buổi ${visitPurposeLabel(purpose).toLowerCase()}. Kỹ thuật viên nhận việc rồi mới tới.`}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Kỹ thuật viên" htmlFor="visit-technician" required className="sm:col-span-2 xl:col-span-1">
          <Select id="visit-technician" value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
            <option value="">{technicians.isPending ? 'Đang tải…' : 'Chọn kỹ thuật viên'}</option>
            {list.map((t) => (
              <option key={t.technicianUserId} value={t.technicianUserId}>
                {t.fullName}
                {zoneId && !inZone(t, zoneId) ? ' (ngoài khu vực)' : ''}
                {!t.isSchedulingActive ? ' (đang tắt nhận lịch)' : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ngày" htmlFor="visit-date" required>
          <DateField id="visit-date" value={date} min={todayVn()} onChange={setDate} />
        </Field>
        <Field label="Từ" htmlFor="visit-from" required>
          <TimeSelect id="visit-from" value={from} onChange={setFrom} />
        </Field>
        <Field label="Đến" htmlFor="visit-to" required>
          <TimeSelect id="visit-to" value={to} onChange={setTo} />
        </Field>
      </div>
      {outside && (
        <Notice tone="warn">
          Kỹ thuật viên này không thuộc khu vực của công trình. Ghi lý do để giao ngoài khu vực.
        </Notice>
      )}
      <Field
        label="Lý do"
        htmlFor="visit-reason"
        hint={reasonRequired ? `Bắt buộc, tối đa ${REASON_MAX} ký tự.` : 'Không bắt buộc.'}
        required={reasonRequired}
      >
        <Input id="visit-reason" maxLength={REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      {(issue ?? error) && (
        <div role="alert">
          <Notice tone="danger">{issue ?? error}</Notice>
        </div>
      )}
      <Button icon="edit_calendar" type="submit" variant="primary" disabled={schedule.isPending}>
        {schedule.isPending ? 'Đang lưu…' : moving ? 'Đổi lịch' : 'Xếp lịch'}
      </Button>
    </form>
  )
}
