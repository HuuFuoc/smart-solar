import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea } from '@/components/common/ui/field'
import { useWithdrawRequestMutation } from '@/hooks/useBooking'
import { errorMessage } from '@/services/api/errors'

const REASON_MAX = 1000

// Khách rút yêu cầu khi không làm nữa. Rút rồi thì không mở lại, muốn khảo sát lại phải gửi đánh giá mới
export function WithdrawRequestDialog({
  surveyRequestId,
  propertyName,
  open,
  onOpenChange,
}: {
  surveyRequestId: string
  propertyName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const withdraw = useWithdrawRequestMutation()

  async function confirm() {
    setError(null)
    try {
      await withdraw.mutateAsync({ id: surveyRequestId, reason: reason.trim() || null })
      toast.success('Đã rút yêu cầu khảo sát.')
      setReason('')
      onOpenChange(false)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!withdraw.isPending}
      aria-label="Rút yêu cầu khảo sát"
    >
      <DialogTitle>Rút yêu cầu khảo sát {propertyName}?</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Yêu cầu sẽ đóng hẳn, báo giá chưa trả lời cũng huỷ theo. Muốn khảo sát lại sau này, bạn gửi đánh giá mới cho
        công trình.
      </p>
      <Field
        label="Lý do"
        htmlFor="withdraw-reason"
        hint={`Không bắt buộc, tối đa ${REASON_MAX} ký tự.`}
        error={error ?? undefined}
        className="mt-4"
      >
        <Textarea
          id="withdraw-reason"
          rows={3}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={withdraw.isPending} onClick={() => onOpenChange(false)}>
          Giữ yêu cầu
        </Button>
        <Button icon="cancel" variant="danger" disabled={withdraw.isPending} onClick={() => void confirm()}>
          {withdraw.isPending ? 'Đang rút…' : 'Rút yêu cầu'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
