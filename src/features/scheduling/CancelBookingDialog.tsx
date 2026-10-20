import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea } from '@/components/common/ui/field'
import { formatAppointment } from '@/features/scheduling/schedulingDisplay'
import { useCancelAppointmentMutation } from '@/hooks/useBooking'
import { errorMessage } from '@/services/api/errors'
import type { CustomerAppointmentView } from '@/types/res/customerSurveyRequestsRes'

const REASON_MAX = 200

/*
  Khách huỷ lịch còn BOOKED. Huỷ nhả chỗ của kỹ thuật viên ngay; yêu cầu vẫn còn và khách đặt lại giờ khác được, nên nút
  xác nhận là `danger` (viền đỏ), không phải nút đặc đỏ của thao tác không hoàn tác.
*/
export function CancelBookingDialog({
  surveyRequestId,
  appointment,
  open,
  onOpenChange,
}: {
  surveyRequestId: string
  appointment: CustomerAppointmentView
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const cancel = useCancelAppointmentMutation()

  async function confirm() {
    setError(null)
    try {
      await cancel.mutateAsync({ id: surveyRequestId, reason: reason.trim() || null })
      toast.success('Đã huỷ lịch khảo sát. Bạn có thể đặt giờ khác bất cứ lúc nào.')
      setReason('')
      onOpenChange(false)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <ModalDialog open={open} onOpenChange={onOpenChange} dismissible={!cancel.isPending} aria-label="Huỷ lịch khảo sát">
      <DialogTitle>Huỷ lịch {formatAppointment(appointment.startsAt, appointment.endsAt)}?</DialogTitle>
      <p className="mt-2 text-body text-fg-2">Giờ này được nhả cho khách khác. Yêu cầu khảo sát vẫn giữ, bạn đặt lại giờ khác được.</p>
      <Field label="Lý do" htmlFor="cancel-reason" hint={`Không bắt buộc, tối đa ${REASON_MAX} ký tự.`} error={error ?? undefined} className="mt-4">
        <Textarea id="cancel-reason" rows={3} maxLength={REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <DialogFooter>
        <Button variant="ghost" disabled={cancel.isPending} onClick={() => onOpenChange(false)}>
          Giữ lịch
        </Button>
        <Button variant="danger" disabled={cancel.isPending} onClick={() => void confirm()}>
          {cancel.isPending ? 'Đang huỷ…' : 'Huỷ lịch'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
