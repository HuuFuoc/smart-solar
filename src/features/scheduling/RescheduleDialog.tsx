import { useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { DateField, Field, Textarea, TimeSelect } from '@/components/common/ui/field'
import {
  BOOKING_HORIZON_DAYS,
  addDays,
  formatAppointment,
  formatDay,
  formatTime,
  isAppointmentOverdue,
  schedulingErrorMessage,
  todayVn,
  vnDate,
  vnTimestamp,
} from '@/features/scheduling/schedulingDisplay'
import type { SalesRescheduleRequest } from '@/types/req/surveyRequestsReq'
import type { SalesRescheduleView } from '@/types/res/surveyRequestsRes'

// Đổi giờ khảo sát, dùng chung cho kinh doanh phụ trách và quản lý / quản trị (chỉ khác API gọi).
// Người đã xác nhận giữ lịch nếu vẫn rảnh giờ mới, không thì lịch quay về chờ kỹ thuật viên nhận

export type RescheduleTarget = { startsAt: string; endsAt: string; status: string }

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="flex basis-full items-center gap-1.5 text-body font-medium text-danger" role="alert">
      <Icon name="error" className="shrink-0 text-[20px]" />
      {message}
    </p>
  )
}

/** Phần thân + hàng nút của hộp đổi giờ; nơi gọi tự bọc trong ModalDialog */
export function RescheduleForm({
  appointment,
  pending,
  onSubmit,
  onClose,
}: {
  appointment: RescheduleTarget
  pending: boolean
  onSubmit: (body: SalesRescheduleRequest) => Promise<SalesRescheduleView>
  onClose: () => void
}) {
  const today = todayVn()
  const [overdue] = useState(() => isAppointmentOverdue(appointment))
  // Lịch quá giờ thì giờ cũ đã qua, mở sẵn hôm nay
  const [date, setDate] = useState(() => (overdue ? today : vnDate(appointment.startsAt)))
  const [time, setTime] = useState(() => formatTime(appointment.startsAt))
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const startsAt = vnTimestamp(date, time)
  const unchanged = new Date(startsAt).getTime() === new Date(appointment.startsAt).getTime()

  async function submit() {
    if (overdue && !reason.trim()) {
      setError('Lịch đã qua giờ: ghi lý do đổi giờ.')
      return
    }
    setError(null)
    try {
      const result = await onSubmit({ startsAt, reason: reason.trim() || null })
      const who = result.technicianName ? `, ${result.technicianName} phụ trách` : ', chờ kỹ thuật viên nhận'
      toast.success(`Đã đổi lịch sang ${formatAppointment(result.startsAt, result.endsAt)}${who}.`)
      onClose()
    } catch (e) {
      setError(schedulingErrorMessage(e))
    }
  }

  return (
    <>
      <p className="mt-2 text-body text-fg-2">
        {overdue ? 'Lịch đã qua giờ mà chưa khảo sát' : 'Giờ hiện tại'}:{' '}
        {formatAppointment(appointment.startsAt, appointment.endsAt)}. Kỹ thuật viên đang phụ trách giữ lịch nếu vẫn
        rảnh giờ mới, không thì lịch quay về chờ người trong khu vực nhận.
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
        <Field
          label="Lý do đổi giờ"
          htmlFor="reschedule-reason"
          required={overdue}
          hint={overdue ? 'Bắt buộc vì lịch đã qua giờ, tối đa 500 ký tự.' : 'Không bắt buộc, tối đa 500 ký tự.'}
        >
          <Textarea
            id="reschedule-reason"
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setError(null)
            }}
          />
        </Field>
      </div>
      <DialogFooter className="items-center">
        <ErrorLine message={error ?? (unchanged ? 'Giờ mới giống giờ hiện tại.' : null)} />
        <Button icon="close" variant="secondary" disabled={pending} onClick={onClose}>
          Huỷ
        </Button>
        <Button icon="edit_calendar" variant="primary" disabled={unchanged || pending} onClick={() => void submit()}>
          {pending ? 'Đang đổi…' : 'Đổi lịch'}
        </Button>
      </DialogFooter>
    </>
  )
}

export function RescheduleDialog({
  appointment,
  open,
  onOpenChange,
  pending,
  onSubmit,
}: {
  appointment: RescheduleTarget
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onSubmit: (body: SalesRescheduleRequest) => Promise<SalesRescheduleView>
}) {
  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!pending}
      className="max-w-xl"
      aria-label="Đổi giờ khảo sát"
    >
      <DialogTitle>Đổi giờ khảo sát</DialogTitle>
      <RescheduleForm
        appointment={appointment}
        pending={pending}
        onSubmit={onSubmit}
        onClose={() => onOpenChange(false)}
      />
    </ModalDialog>
  )
}
