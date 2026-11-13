import { toast } from 'sonner'
import { useState } from 'react'
import { QUOTATION_LIMITS } from '@/common/quotation'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { formatDateVn, formatQuantity, formatQuotationMoney } from '@/features/quotations/quotationDisplay'
import {
  bomMismatchesOf,
  reviewNoteError,
  reviewNoteRequired,
  type BomMismatch,
} from '@/features/quotations/quotationRules'
import { useSendQuotationMutation } from '@/hooks/useSalesQuotations'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { QuotationView } from '@/types/res/quotationsRes'

// Xác nhận gửi bản nháp cho khách. Gửi rồi thì bản này không sửa được; bản trước (nếu có) hết hiệu lực cùng lúc

type Props = {
  open: boolean
  quotation: QuotationView
  /** Bản đang gửi khách sẽ bị thay */
  replacing: QuotationView | null
  onClose: () => void
}

export function SendQuotationDialog({ open, quotation: q, replacing, onClose }: Props) {
  const send = useSendQuotationMutation()
  const [note, setNote] = useState('')
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mismatches, setMismatches] = useState<BomMismatch[]>([])
  const noteRequired = reviewNoteRequired(q)
  const noteError = checked ? reviewNoteError(note, noteRequired) : undefined
  // Lỗi của lần trước không hiện lại khi mở hộp thoại lần sau
  const close = () => {
    setNote('')
    setChecked(false)
    setError(null)
    setMismatches([])
    onClose()
  }

  async function submit() {
    if (send.isPending) return
    setChecked(true)
    setError(null)
    setMismatches([])
    if (reviewNoteError(note, noteRequired)) return
    try {
      await send.mutateAsync({ quotationId: q.quotationId, revision: q.revision, reviewNote: note.trim() || null })
      toast.success('Đã gửi báo giá cho khách.')
      close()
    } catch (e) {
      setError(errorMessage(e))
      if (isApiError(e) && e.code === 'QUOTATION_BOM_MISMATCH') setMismatches(bomMismatchesOf(e.details))
    }
  }

  const lineOf = (m: BomMismatch) => q.lines.find((l) => l.productId === m.productId)

  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => !next && !send.isPending && close()}
      dismissible={!send.isPending}
      aria-label="Gửi báo giá cho khách"
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
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
          <Field
            className="mt-4"
            label="Lý do chấp nhận các điểm còn lưu ý"
            htmlFor="quotation-review-note"
            required
            hint={`Lưu vào lịch sử báo giá, tối đa ${QUOTATION_LIMITS.reviewNoteLength} ký tự.`}
            error={noteError}
          >
            <Textarea
              id="quotation-review-note"
              rows={3}
              value={note}
              maxLength={QUOTATION_LIMITS.reviewNoteLength}
              aria-required
              aria-invalid={noteError ? true : undefined}
              disabled={send.isPending}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        )}
        {error && (
          <div role="alert" className="mt-4">
            <Notice tone="danger">
              <p>{error}</p>
              {mismatches.length > 0 && (
                <ul className="mt-2 list-disc pl-5">
                  {mismatches.map((m) => (
                    <li key={m.productId} className="tnum">
                      {lineOf(m)?.name ?? m.sku ?? 'Thiết bị'}: biên bản {formatQuantity(m.surveyQuantity)}, báo giá{' '}
                      {formatQuantity(m.quotedQuantity)}
                    </li>
                  ))}
                </ul>
              )}
            </Notice>
          </div>
        )}
        <DialogFooter>
          <Button icon="close" variant="secondary" disabled={send.isPending} onClick={close}>
            Đóng
          </Button>
          <Button icon="send" type="submit" variant="primary" disabled={send.isPending}>
            {send.isPending ? 'Đang gửi…' : 'Gửi cho khách'}
          </Button>
        </DialogFooter>
      </form>
    </ModalDialog>
  )
}
