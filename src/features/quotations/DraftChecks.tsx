import { useState } from 'react'
import { toast } from 'sonner'
import { QUOTATION_LIMITS } from '@/common/quotation'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { pricingIssueLabel } from '@/features/quotations/quotationDisplay'
import {
  approvalReasonError,
  blockingPricingIssues,
  isAcknowledgeable,
  surveyChangedDraft,
} from '@/features/quotations/quotationRules'
import { useConfirmSurveyVersionMutation } from '@/hooks/useSalesQuotations'
import { errorMessage } from '@/services/api/errors'
import type { QuotationView } from '@/types/res/quotationsRes'

// Hai điều kiện gửi khách của bản nháp có thao tác riêng: biên bản khảo sát đổi sau khi lập (xác nhận lại theo biên bản mới) và
// vấn đề giá của bản nháp hệ thống tự lập (sửa điểm bắt buộc, điểm còn lại ghi lý do lúc gửi)

/** Biên bản khảo sát đã bổ sung sau khi lập bản nháp: xem lại dòng hàng rồi xác nhận theo biên bản mới */
export function SurveyChangedNotice({ draft }: { draft: QuotationView }) {
  const [confirming, setConfirming] = useState(false)
  if (!surveyChangedDraft(draft)) return null
  return (
    <>
      <Notice
        tone="warn"
        title={`Biên bản khảo sát đã bổ sung (bản ${draft.onSiteSurveyVersion} → bản ${draft.currentSurveyVersion ?? 'mới'})`}
      >
        <p>
          Bản nháp này lập theo biên bản cũ. Xem lại kết quả khảo sát, sửa dòng thiết bị cho khớp, rồi xác nhận theo
          biên bản mới để gửi được cho khách.
        </p>
        <div className="mt-3">
          <Button size="sm" variant="info" icon="fact_check" onClick={() => setConfirming(true)}>
            Xác nhận theo biên bản mới
          </Button>
        </div>
      </Notice>
      <ConfirmSurveyVersionDialog open={confirming} quotation={draft} onClose={() => setConfirming(false)} />
    </>
  )
}

function ConfirmSurveyVersionDialog({
  open,
  quotation: q,
  onClose,
}: {
  open: boolean
  quotation: QuotationView
  onClose: () => void
}) {
  const confirm = useConfirmSurveyVersionMutation()
  const [reason, setReason] = useState('')
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reasonError = checked ? approvalReasonError(reason) : undefined

  const close = () => {
    setReason('')
    setChecked(false)
    setError(null)
    onClose()
  }

  async function submit() {
    if (confirm.isPending) return
    setChecked(true)
    setError(null)
    if (approvalReasonError(reason)) return
    try {
      await confirm.mutateAsync({ quotationId: q.quotationId, revision: q.revision, reason: reason.trim() })
      toast.success('Đã xác nhận báo giá theo biên bản khảo sát mới.')
      close()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => !next && !confirm.isPending && close()}
      dismissible={!confirm.isPending}
      aria-label="Xác nhận theo biên bản mới"
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <DialogTitle>Xác nhận theo biên bản mới?</DialogTitle>
        <div className="mt-4 space-y-4">
          <p className="text-body text-fg-2">
            Bạn xác nhận đã xem lại dòng hàng theo biên bản khảo sát mới. Dòng thiết bị phải khớp bảng vật tư của biên
            bản thì mới xác nhận được.
          </p>
          <Field
            label="Đã xem lại những gì"
            htmlFor="confirm-survey-reason"
            required
            hint={`Tối đa ${QUOTATION_LIMITS.approvalReasonLength} ký tự.`}
            error={reasonError}
          >
            <Textarea
              id="confirm-survey-reason"
              rows={3}
              value={reason}
              maxLength={QUOTATION_LIMITS.approvalReasonLength}
              aria-required
              aria-invalid={reasonError ? true : undefined}
              disabled={confirm.isPending}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          {error && (
            <div role="alert">
              <Notice tone="danger">{error}</Notice>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button icon="close" variant="secondary" disabled={confirm.isPending} onClick={close}>
            Đóng
          </Button>
          <Button icon="check" type="submit" variant="primary" disabled={confirm.isPending}>
            {confirm.isPending ? 'Đang lưu…' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </form>
    </ModalDialog>
  )
}

/** Bản nháp hệ thống tự lập còn vấn đề giá: điểm phải sửa và điểm gửi được nếu ghi lý do */
export function PricingReviewNotice({ draft }: { draft: QuotationView }) {
  const outstanding = draft.pricingReview?.outstanding ?? []
  if (outstanding.length === 0) return null
  const blocking = blockingPricingIssues(draft)
  const acknowledgeable = outstanding.filter(isAcknowledgeable)
  return (
    <Notice tone="warn" title="Hệ thống tự lập bản nháp này nhưng chưa gửi được cho khách">
      {blocking.length > 0 && (
        <>
          <p>Phải sửa:</p>
          <ul className="mt-1 list-disc pl-5">
            {blocking.map((issue, i) => (
              <li key={`${issue.code}-${issue.productId ?? i}`}>{pricingIssueLabel(issue)}</li>
            ))}
          </ul>
        </>
      )}
      {acknowledgeable.length > 0 && (
        <>
          <p className={blocking.length > 0 ? 'mt-3' : undefined}>Gửi được nếu ghi lý do chấp nhận lúc gửi:</p>
          <ul className="mt-1 list-disc pl-5">
            {acknowledgeable.map((issue, i) => (
              <li key={`${issue.code}-${issue.productId ?? i}`}>{pricingIssueLabel(issue)}</li>
            ))}
          </ul>
        </>
      )}
    </Notice>
  )
}
