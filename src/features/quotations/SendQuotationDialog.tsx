import { toast } from 'sonner'
import { useState } from 'react'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { formatDateVn, formatQuotationMoney, quotationErrorMessage } from '@/features/quotations/quotationDisplay'
import { REVIEW_REASON_MAX, reviewReasonError } from '@/features/quotations/quotationRules'
import { useSendQuotationMutation } from '@/hooks/useSalesQuotations'
import type { QuotationView } from '@/types/res/quotationsRes'

// Xác nhận gửi bản nháp cho khách. Gửi rồi thì bản này không sửa được; bản trước (nếu có) hết hiệu lực cùng lúc

type Props = {
  open: boolean
  quotation: QuotationView
  /** Bản đang gửi khách sẽ bị thay */
  replacing: QuotationView | null
  /** Bản nháp vừa tải lại có điều kiện chưa đạt (vd. biên bản vừa được bổ sung): khoá nút gửi, lỗi vẫn hiện */
  blocked: boolean
  onClose: () => void
}

export function SendQuotationDialog({ open, quotation: q, replacing, blocked, onClose }: Props) {
  const send = useSendQuotationMutation()
  const [error, setError] = useState<string | null>(null)
  // Bản tạo từ biên bản khảo sát còn vấn đề về giá chấp nhận được: phải ghi lý do vẫn gửi
  const noteRequired = q.pricingReview?.noteRequired ?? false
  const [note, setNote] = useState('')
  // Lỗi của lần trước không hiện lại khi mở hộp thoại lần sau
  const close = () => {
    setError(null)
    onClose()
  }

  async function submit() {
    const noteError = noteRequired ? reviewReasonError(note) : null
    setError(noteError)
    if (noteError) return
    try {
      await send.mutateAsync({
        quotationId: q.quotationId,
        revision: q.revision,
        reviewNote: noteRequired ? note.trim() : undefined,
      })
      toast.success('Đã gửi báo giá cho khách.')
      close()
    } catch (e) {
      setError(quotationErrorMessage(e))
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => !next && !send.isPending && close()}
      dismissible={!send.isPending}
      aria-label="Gửi báo giá cho khách"
    >
      <DialogTitle>Gửi báo giá cho khách?</DialogTitle>
      <div className="mt-2 space-y-3 text-body text-fg-2">
        <p>
          Tổng cộng{' '}
          <span className="tnum font-semibold text-fg">{formatQuotationMoney(q.totalAmount, q.currency)}</span> cho{' '}
          {q.lines.length} dòng hàng, hiệu lực đến hết ngày{' '}
          <span className="tnum text-fg">{formatDateVn(q.validUntil)}</span>.
        </p>
        <p>
          Khách xem trên cổng khách hàng rồi đồng ý hoặc yêu cầu sửa. Đã gửi thì không sửa được; muốn đổi, bạn lập bản
          sửa.
        </p>
        {replacing && <p>Bản {replacing.version} khách đang có sẽ hết hiệu lực khi bản này được gửi.</p>}
      </div>
      {noteRequired && (
        <Field label="Lý do vẫn gửi khi còn vấn đề về giá" htmlFor="send-review-note" required className="mt-4">
          <Textarea
            id="send-review-note"
            rows={2}
            maxLength={REVIEW_REASON_MAX}
            aria-required
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      )}
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={send.isPending} onClick={close}>
          Đóng
        </Button>
        <Button icon="send" variant="primary" disabled={send.isPending || blocked} onClick={() => void submit()}>
          {send.isPending ? 'Đang gửi…' : 'Gửi cho khách'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
