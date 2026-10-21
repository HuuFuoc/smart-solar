import { useState } from 'react'
import { toast } from 'sonner'
import { ACCEPTANCE_CHOICES, type AcceptanceChoice } from '@/common/installation'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { useDecideAcceptanceMutation } from '@/hooks/useCustomerInstallations'
import { errorMessage } from '@/services/api/errors'

// Backend cắt lý do quá 2000 ký tự, chặn ở ô nhập để không mất chữ
const REASON_MAX = 2000

const COPY = {
  [ACCEPTANCE_CHOICES.accept]: {
    title: 'Nghiệm thu công trình?',
    body: 'Bạn xác nhận công trình đã lắp đặt đạt yêu cầu theo báo cáo của kỹ thuật viên. Quyết định này không đổi lại được.',
    label: 'Ghi chú',
    hint: `Không bắt buộc, tối đa ${REASON_MAX} ký tự.`,
    submit: 'Nghiệm thu',
    icon: 'check_circle',
    pending: 'Đang gửi…',
    back: 'Xem lại',
  },
  [ACCEPTANCE_CHOICES.requestRework]: {
    title: 'Yêu cầu sửa lại?',
    body: 'Kỹ thuật viên sửa theo mô tả của bạn rồi gửi báo cáo mới để bạn nghiệm thu lại. Yêu cầu đã gửi không rút lại được.',
    label: 'Chỗ cần sửa',
    hint: `Bắt buộc, tối đa ${REASON_MAX} ký tự.`,
    submit: 'Gửi yêu cầu sửa lại',
    icon: 'replay',
    pending: 'Đang gửi…',
    back: 'Huỷ',
  },
} as const

// Khách quyết định nghiệm thu báo cáo hoàn thành đang chờ. Chỉ gửi khi khách bấm xác nhận trong hộp thoại,
// trạng thái sau khi gửi lấy từ backend (trang tự tải lại), không tự đánh dấu xong
export function AcceptanceDialog({
  projectId,
  round,
  decision,
  onClose,
}: {
  projectId: string
  round: number
  /** null: hộp thoại đóng */
  decision: AcceptanceChoice | null
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const decide = useDecideAcceptanceMutation()
  const copy = decision ? COPY[decision] : null
  const rework = decision === ACCEPTANCE_CHOICES.requestRework

  function close() {
    if (decide.isPending) return
    setReason('')
    setFieldError(null)
    setError(null)
    onClose()
  }

  async function confirm() {
    if (!decision || decide.isPending) return
    const text = reason.trim()
    setError(null)
    if (rework && !text) {
      setFieldError('Mô tả chỗ cần sửa để kỹ thuật viên biết phải làm gì.')
      return
    }
    setFieldError(null)
    try {
      const project = await decide.mutateAsync({ projectId, decision, reason: text || null })
      if (project.status === 'COMPLETED') toast.success('Đã nghiệm thu. Công trình đã được bàn giao cho bạn.')
      else if (project.status === 'REWORK_REQUIRED') toast.success('Đã gửi yêu cầu sửa lại cho kỹ thuật viên.')
      else toast.success('Đã gửi quyết định nghiệm thu.')
      setReason('')
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <ModalDialog
      open={decision !== null}
      onOpenChange={(open) => !open && close()}
      dismissible={!decide.isPending}
      aria-label={copy?.title}
    >
      {copy && (
        <>
          <DialogTitle>{copy.title}</DialogTitle>
          <p className="mt-2 text-body text-fg-2">
            Báo cáo hoàn thành lần {round}. {copy.body}
          </p>
          <Field
            label={copy.label}
            htmlFor="acceptance-reason"
            hint={copy.hint}
            error={fieldError ?? undefined}
            required={rework}
            className="mt-4"
          >
            <Textarea
              id="acceptance-reason"
              rows={4}
              maxLength={REASON_MAX}
              value={reason}
              aria-invalid={fieldError ? true : undefined}
              onChange={(e) => {
                setReason(e.target.value)
                if (fieldError) setFieldError(null)
              }}
            />
          </Field>
          {error && (
            <div role="alert" className="mt-4">
              <Notice tone="danger">{error}</Notice>
            </div>
          )}
          <DialogFooter>
            <Button icon="close" variant="secondary" disabled={decide.isPending} onClick={close}>
              {copy.back}
            </Button>
            <Button icon={copy.icon} variant="primary" disabled={decide.isPending} onClick={() => void confirm()}>
              {decide.isPending ? copy.pending : copy.submit}
            </Button>
          </DialogFooter>
        </>
      )}
    </ModalDialog>
  )
}
