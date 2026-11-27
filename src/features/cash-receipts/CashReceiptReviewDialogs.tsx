import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea, fieldMessageId } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { reviewErrorText } from '@/features/cash-receipts/cashReceiptDisplay'
import {
  reasonError,
  receiptContextLabel,
  REVIEW_NOTE_MAX,
  REVIEW_REASON_MAX,
  reviewFailure,
  reviewNoteError,
} from '@/features/cash-receipts/cashReceiptRules'
import { formatVnd } from '@/features/payment-plan/paymentPlanDisplay'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useAcceptCashReceiptMutation, useRejectCashReceiptMutation } from '@/hooks/useCashReceipts'
import type { StaffCashReceiptView } from '@/types/res/paymentPlanRes'

// Quản lý / quản trị xác nhận hoặc yêu cầu bổ sung một phiếu thu, dùng ảnh kỹ thuật viên đã gửi (không tải tệp khác). Gửi kèm
// `revision` của phiếu lúc mở hộp: phiếu đã đổi ở nơi khác thì backend trả 409 STALE, hộp đóng và trang tải lại để xem lại, không
// ghi đè. Không cập nhật lạc quan: "đã trả" chỉ hiện khi backend trả lần thanh toán PAID

/** Phiếu vừa đổi ở nơi khác hoặc chưa rõ đã ghi chưa: trang tải lại và hiện câu này */
export type ReviewOutcome = { kind: 'done' } | { kind: 'reload'; message: string }

function Summary({ row }: { row: StaffCashReceiptView }) {
  const r = row.receipt
  return (
    <Facts
      className="mt-3"
      items={[
        { k: 'Hợp đồng', v: row.contractNumber || '—' },
        { k: 'Khoản thu', v: receiptContextLabel(row) },
        { k: 'Khách hàng', v: row.customerName },
        { k: 'Số tiền', v: <span className="font-semibold">{formatVnd(r.amount)}</span> },
        { k: 'Số phiếu thu', v: r.receiptNumber },
        { k: 'Kỹ thuật viên thu', v: `${row.collectedByName}, lúc ${formatMoment(r.collectedAt)}` },
      ]}
    />
  )
}

/** Lỗi khiến hộp phải đóng và trang tải lại; còn lại giữ hộp để sửa / thử lại */
function closesDialog(action: string) {
  return action === 'stale' || action === 'reload' || action === 'ambiguous'
}

export function AcceptReceiptDialog({
  row,
  onClose,
}: {
  row: StaffCashReceiptView
  onClose: (outcome?: ReviewOutcome) => void
}) {
  const accept = useAcceptCashReceiptMutation()
  // Đúng phiếu quản lý đang xem lúc mở hộp
  const [revision] = useState(row.receipt.revision)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const busy = accept.isPending

  async function confirm() {
    if (busy) return
    setError(null)
    const problem = reviewNoteError(note)
    setNoteError(problem)
    if (problem) return
    try {
      const attempt = await accept.mutateAsync({
        receiptId: row.receipt.cashReceiptId,
        body: { revision, note: note.trim() || null },
      })
      toast.success(
        attempt.status === 'PAID'
          ? `Đã xác nhận phiếu thu ${row.receipt.receiptNumber}. ${receiptContextLabel(row)} đã được ghi đã trả.`
          : `Đã xác nhận phiếu thu ${row.receipt.receiptNumber}.`,
      )
      onClose({ kind: 'done' })
    } catch (e) {
      const failure = reviewFailure(e)
      const text = reviewErrorText(e, failure)
      if (closesDialog(failure.action)) return onClose({ kind: 'reload', message: text })
      if (failure.action === 'fields') setNoteError(failure.fields.note ?? null)
      setError(text)
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      dismissible={!busy}
      className="max-w-xl"
      aria-label="Xác nhận phiếu thu"
    >
      <DialogTitle>Xác nhận phiếu thu?</DialogTitle>
      <Summary row={row} />
      <p className="mt-4 text-body text-fg-2">
        Đối chiếu ảnh phiếu thu với số phiếu và số tiền trước khi xác nhận. Xác nhận xong khoản này được ghi đã trả bằng
        tiền mặt, không đổi lại được.
      </p>
      <Field label="Ghi chú" htmlFor="accept-note" optional error={noteError ?? undefined} className="mt-4">
        <Textarea
          id="accept-note"
          rows={2}
          maxLength={REVIEW_NOTE_MAX}
          aria-describedby={fieldMessageId('accept-note')}
          value={note}
          disabled={busy}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={busy} onClick={() => onClose()}>
          Đóng
        </Button>
        <Button icon="task_alt" variant="primary" disabled={busy} onClick={() => void confirm()}>
          {busy ? 'Đang xác nhận…' : 'Xác nhận phiếu thu'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

export function RejectReceiptDialog({
  row,
  onClose,
}: {
  row: StaffCashReceiptView
  onClose: (outcome?: ReviewOutcome) => void
}) {
  const reject = useRejectCashReceiptMutation()
  const [revision] = useState(row.receipt.revision)
  const [reason, setReason] = useState('')
  const [reasonProblem, setReasonProblem] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const busy = reject.isPending

  async function send() {
    if (busy) return
    setError(null)
    const problem = reasonError(reason)
    setReasonProblem(problem)
    if (problem) return
    try {
      await reject.mutateAsync({ receiptId: row.receipt.cashReceiptId, body: { revision, reason: reason.trim() } })
      toast.success(`Đã yêu cầu kỹ thuật viên bổ sung phiếu thu ${row.receipt.receiptNumber}.`)
      onClose({ kind: 'done' })
    } catch (e) {
      const failure = reviewFailure(e)
      const text = reviewErrorText(e, failure)
      if (closesDialog(failure.action)) return onClose({ kind: 'reload', message: text })
      if (failure.action === 'fields') setReasonProblem(failure.fields.reason ?? null)
      setError(text)
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      dismissible={!busy}
      className="max-w-xl"
      aria-label="Yêu cầu bổ sung phiếu thu"
    >
      <DialogTitle>Yêu cầu bổ sung phiếu thu</DialogTitle>
      <Summary row={row} />
      <p className="mt-4 text-body text-fg-2">
        Khoản vẫn chờ tiền mặt. Kỹ thuật viên thấy lý do và gửi lại phiếu thu cho cùng lần thanh toán.
      </p>
      <Field
        label="Lý do"
        htmlFor="reject-reason"
        required
        error={reasonProblem ?? undefined}
        hint={`${reason.trim().length}/${REVIEW_REASON_MAX} ký tự`}
        className="mt-4"
      >
        <Textarea
          id="reject-reason"
          rows={3}
          maxLength={REVIEW_REASON_MAX}
          aria-required
          aria-invalid={Boolean(reasonProblem) || undefined}
          aria-describedby={fieldMessageId('reject-reason')}
          value={reason}
          disabled={busy}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={busy} onClick={() => onClose()}>
          Đóng
        </Button>
        <Button icon="assignment_return" variant="warn" disabled={busy} onClick={() => void send()}>
          {busy ? 'Đang gửi…' : 'Gửi yêu cầu bổ sung'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
