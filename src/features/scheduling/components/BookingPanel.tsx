import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { Field, Textarea } from '@/components/common/ui/field'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { SlotPicker } from '@/features/scheduling/components/SlotPicker'
import { formatAppointment, initialBookingDate, vnDate } from '@/features/scheduling/components/schedulingDisplay'
import { useBookAppointmentMutation, useRescheduleAppointmentMutation } from '@/features/scheduling/hooks/useBooking'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { CustomerAppointmentView } from '@/types/res/customerSurveyRequestsRes'
import type { SurveySlot } from '@/types/res/surveySlotsRes'

const NOTE_MAX = 500

/*
  Khối đặt giờ / đổi giờ khảo sát của khách: chọn ngày + giờ, ghi chú cho kỹ thuật viên, xác nhận. Đây là khối duy nhất
  trên trang đòi khách quyết định nên nằm trong khung viền (Panel raised) và có nút đặc của trang.
  - 201: đặt mới. 200 + created=false: lần gửi trước đã tới server (mất phản hồi, bấm lại) – vẫn là thành công.
  - 409 SURVEY_SLOT_UNAVAILABLE: người khác vừa lấy giờ đó; giờ trống đã tải lại (hook), bỏ chọn để khách chọn giờ khác.
  - Lỗi khác: giữ lựa chọn, báo lỗi ngay trên nút.
*/
export function BookingPanel({
  surveyRequestId,
  propertySiteId,
  current,
  onDone,
  onCancel,
}: {
  surveyRequestId: string
  propertySiteId: string
  /** Lịch đang có khi khách đổi giờ; không có là đặt mới. */
  current?: CustomerAppointmentView | null
  onDone?: () => void
  onCancel?: () => void
}) {
  const rescheduling = Boolean(current)
  const [date, setDate] = useState(() => (current ? vnDate(current.startsAt) : initialBookingDate()))
  const [slot, setSlot] = useState<SurveySlot | null>(null)
  const [note, setNote] = useState(current?.customerNote ?? '')
  const [error, setError] = useState<string | null>(null)
  const book = useBookAppointmentMutation()
  const reschedule = useRescheduleAppointmentMutation()
  const busy = book.isPending || reschedule.isPending

  async function confirm() {
    if (!slot || busy) return
    setError(null)
    const body = { startsAt: slot.startsAt, note: note.trim() || null }
    try {
      const result = rescheduling
        ? await reschedule.mutateAsync({ id: surveyRequestId, body })
        : await book.mutateAsync({ id: surveyRequestId, body })
      const when = formatAppointment(result.startsAt, result.endsAt)
      if (rescheduling) toast.success(`Đã đổi lịch khảo sát sang ${when}.`)
      else if (result.created) toast.success(`Đã đặt lịch khảo sát ${when}.`)
      else toast.success(`Lịch khảo sát ${when} đã được đặt trước đó.`)
      onDone?.()
    } catch (e) {
      if (isApiError(e) && e.code === 'SURVEY_SLOT_UNAVAILABLE') setSlot(null)
      if (isApiError(e) && e.status === 429 && e.retryAfter) setError(`Bạn thao tác quá nhanh. Thử lại sau ${e.retryAfter} giây.`)
      else setError(errorMessage(e))
    }
  }

  return (
    <Panel raised>
      <PanelHeader
        title={rescheduling ? 'Chọn giờ mới' : 'Chọn giờ khảo sát'}
        description={
          rescheduling
            ? 'Lịch hiện tại giữ nguyên cho tới khi bạn xác nhận giờ mới.'
            : 'Kỹ thuật viên tới công trình đo đạc và kiểm tra mái. Danh sách chỉ có giờ còn người nhận và đã tính đường đi.'
        }
      />
      <PanelBody className="space-y-6">
        <SlotPicker
          propertySiteId={propertySiteId}
          date={date}
          onDateChange={setDate}
          value={slot?.startsAt ?? null}
          onChange={(next) => {
            setSlot(next)
            setError(null)
          }}
          currentStartsAt={current?.startsAt}
        />
        <Field
          label="Ghi chú cho kỹ thuật viên"
          htmlFor="booking-note"
          hint="Không bắt buộc. Ví dụ: gọi trước khi đến, lối lên mái, giờ ra vào nhà xưởng."
        >
          <Textarea
            id="booking-note"
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </PanelBody>
      <PanelFooter className="mt-6 border-t border-line pt-4">
        <p className="min-w-0 flex-1 basis-64 text-body text-fg-2" aria-live="polite">
          {slot ? (
            <>
              Giờ đã chọn: <span className="font-semibold text-fg">{formatAppointment(slot.startsAt, slot.endsAt)}</span>
            </>
          ) : (
            'Chưa chọn giờ.'
          )}
        </p>
        {error && (
          <span className="flex basis-full items-center gap-1.5 text-body font-medium text-danger sm:order-last" role="alert">
            <Icon name="error" className="shrink-0 text-[20px]" />
            {error}
          </span>
        )}
        {onCancel && (
          <Button variant="ghost" bleed={false} disabled={busy} onClick={onCancel}>
            Thôi
          </Button>
        )}
        <Button variant="primary" disabled={!slot || busy} onClick={() => void confirm()} className="w-full sm:w-auto">
          {busy ? 'Đang giữ chỗ…' : rescheduling ? 'Đổi sang giờ này' : 'Đặt lịch khảo sát'}
        </Button>
      </PanelFooter>
    </Panel>
  )
}
