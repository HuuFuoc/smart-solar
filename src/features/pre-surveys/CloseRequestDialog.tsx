import { useState } from 'react'
import { toast } from 'sonner'
import { CLOSE_REASONS } from '@/common/preSurvey'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Radio, Textarea } from '@/components/common/ui/field'
import { useCloseSurveyRequestMutation } from '@/hooks/useSurveyRequests'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { CloseReasonCode } from '@/types/res/surveyRequestsRes'

const NOTE_MAX = 1000

// Hai lỗi 409 cần câu riêng cho sales: bản nháp hợp đồng phải huỷ trước, lịch đang hẹn thì chỉ khách huỷ được
function closeErrorMessage(error: unknown) {
  if (isApiError(error) && error.code === 'SURVEY_REQUEST_CONTRACT_EXISTS') {
    const details = error.details as { contractStatus?: unknown } | null
    return details?.contractStatus === 'DRAFT'
      ? 'Yêu cầu còn bản nháp hợp đồng. Huỷ bản nháp hợp đồng trước rồi đóng yêu cầu.'
      : 'Yêu cầu đã có hợp đồng nên không đóng được.'
  }
  if (isApiError(error) && error.code === 'SURVEY_REQUEST_APPOINTMENT_OPEN')
    return 'Khách còn lịch khảo sát đang hẹn. Nhờ khách huỷ lịch, hoặc chờ khảo sát xong rồi đóng.'
  return errorMessage(error)
}

// Sales đóng yêu cầu khi khách không lắp. Đóng hẳn, báo giá chưa trả lời huỷ theo
// "Không lắp được" chỉ chọn được khi biên bản khảo sát kết luận vậy
export function CloseRequestDialog({
  surveyRequestId,
  notFeasible,
  open,
  onOpenChange,
}: {
  surveyRequestId: string
  /** Biên bản khảo sát kết luận NOT_FEASIBLE */
  notFeasible: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [reason, setReason] = useState<CloseReasonCode | null>(notFeasible ? 'NOT_FEASIBLE' : null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const close = useCloseSurveyRequestMutation()
  const noteRequired = reason === 'OTHER'

  async function confirm() {
    if (!reason) {
      setError('Chọn lý do đóng yêu cầu.')
      return
    }
    if (noteRequired && !note.trim()) {
      setError('Ghi rõ lý do khác.')
      return
    }
    setError(null)
    try {
      await close.mutateAsync({ id: surveyRequestId, reasonCode: reason, note: note.trim() || null })
      toast.success('Đã đóng yêu cầu khảo sát.')
      onOpenChange(false)
    } catch (e) {
      setError(closeErrorMessage(e))
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!close.isPending}
      className="max-w-lg"
      aria-label="Đóng yêu cầu khảo sát"
    >
      <DialogTitle>Đóng yêu cầu khảo sát</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Yêu cầu đóng hẳn và rời hàng chờ, báo giá khách chưa trả lời huỷ theo. Không mở lại được: khách muốn làm tiếp
        thì gửi đánh giá mới.
      </p>
      <fieldset className="mt-4 space-y-3">
        <legend className="mb-2 text-body font-medium text-fg">Lý do</legend>
        {CLOSE_REASONS.map((option) => {
          const disabled = option.value === 'NOT_FEASIBLE' && !notFeasible
          return (
            <Radio
              key={option.value}
              name="close-reason"
              value={option.value}
              checked={reason === option.value}
              disabled={disabled || close.isPending}
              onChange={() => {
                setReason(option.value)
                setError(null)
              }}
              label={option.label}
              description={disabled ? 'Chỉ chọn được khi biên bản khảo sát kết luận không lắp được.' : undefined}
            />
          )
        })}
      </fieldset>
      <Field
        label="Ghi chú"
        htmlFor="close-note"
        required={noteRequired}
        hint={`${noteRequired ? 'Bắt buộc' : 'Không bắt buộc'}, tối đa ${NOTE_MAX} ký tự.`}
        error={error ?? undefined}
        className="mt-4"
      >
        <Textarea
          id="close-note"
          rows={3}
          maxLength={NOTE_MAX}
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
            setError(null)
          }}
        />
      </Field>
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={close.isPending} onClick={() => onOpenChange(false)}>
          Giữ yêu cầu
        </Button>
        <Button icon="block" variant="danger" disabled={close.isPending} onClick={() => void confirm()}>
          {close.isPending ? 'Đang đóng…' : 'Đóng yêu cầu'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
