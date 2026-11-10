import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Input, Radio, Textarea } from '@/components/common/ui/field'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { managerActionError, refundSourceLabel } from '@/features/after-sales/managerAfterSalesDisplay'
import {
  REFUND_NOTE_MAX,
  refundDecisionBody,
  refundDecisionErrors,
  refundReasonText,
  type RefundDecisionInput,
} from '@/features/after-sales/managerAfterSalesRules'
import { formatVnd } from '@/features/after-sales/serviceDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useDecideRefundMutation } from '@/hooks/useManagerAfterSales'
import { isApiError } from '@/services/api/errors'
import type { RefundView } from '@/types/res/managerAfterSalesRes'

// Duyệt hoặc từ chối một khoản hoàn PENDING_APPROVAL (backend cho quản lý và quản trị). Duyệt chỉ ghi số tiền được hoàn,
// không phải đã trả: quản trị chuyển tiền ngoài hệ thống rồi ghi nhận. Không có hoàn tiền qua PayOS

function DecisionForm({ refund, onClose }: { refund: RefundView; onClose: () => void }) {
  const decide = useDecideRefundMutation()
  const [input, setInput] = useState<RefundDecisionInput>({
    approve: true,
    amount: String(refund.originalAmount),
    note: '',
  })
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const max = formatVnd(refund.originalAmount)
  const errors = checked ? refundDecisionErrors(refund, input, max) : {}

  async function submit() {
    if (decide.isPending) return
    setChecked(true)
    setError(null)
    if (Object.keys(refundDecisionErrors(refund, input, max)).length > 0) return
    try {
      const result = await decide.mutateAsync({ refundId: refund.refundId, body: refundDecisionBody(input) })
      toast.success(
        result.status === 'APPROVED'
          ? `Đã duyệt hoàn ${formatVnd(result.approvedAmount ?? 0)}. Chờ quản trị chuyển tiền và ghi nhận.`
          : 'Đã từ chối hoàn tiền.',
      )
      onClose()
    } catch (e) {
      // Khoản vừa được người khác quyết định: danh sách đã tải lại, đóng để xem bản mới
      if (isApiError(e) && (e.code === 'AFTER_SALES_INVALID_STATE' || e.code === 'REFUND_NOT_FOUND')) {
        toast.error(managerActionError(e))
        onClose()
        return
      }
      setError(managerActionError(e))
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <DialogTitle>Xét hoàn tiền</DialogTitle>
      <KeyValueList
        className="mt-4"
        items={[
          { k: 'Khoản', v: refundSourceLabel(refund) },
          { k: 'Số tiền gốc', v: <span className="tnum font-semibold">{max}</span> },
          { k: 'Lý do', v: refundReasonText(refund.reason) },
          { k: 'Tạo lúc', v: formatMoment(refund.createdAt) },
        ]}
      />
      <fieldset className="mt-4 space-y-2">
        <legend className="text-body font-medium text-fg">Quyết định</legend>
        <Radio
          name="refund-decision"
          label="Duyệt hoàn tiền"
          checked={input.approve}
          disabled={decide.isPending}
          onChange={() => setInput((v) => ({ ...v, approve: true }))}
        />
        <Radio
          name="refund-decision"
          label="Không hoàn"
          checked={!input.approve}
          disabled={decide.isPending}
          onChange={() => setInput((v) => ({ ...v, approve: false }))}
        />
      </fieldset>
      <div className="mt-4 grid gap-4">
        {input.approve && (
          <Field
            label="Số tiền được hoàn (VND)"
            htmlFor="refund-amount"
            required
            hint={`Từ 0 đến ${max}.`}
            error={errors.amount}
          >
            <Input
              id="refund-amount"
              inputMode="numeric"
              className="w-full sm:w-56"
              value={input.amount}
              aria-required
              aria-invalid={errors.amount ? true : undefined}
              disabled={decide.isPending}
              onChange={(e) => setInput((v) => ({ ...v, amount: e.target.value }))}
            />
          </Field>
        )}
        <Field
          label="Ghi chú"
          htmlFor="refund-note"
          hint={`Không bắt buộc, tối đa ${REFUND_NOTE_MAX} ký tự. Quản trị đọc được khi chuyển tiền.`}
          error={errors.note}
        >
          <Textarea
            id="refund-note"
            rows={2}
            maxLength={REFUND_NOTE_MAX}
            value={input.note}
            disabled={decide.isPending}
            onChange={(e) => setInput((v) => ({ ...v, note: e.target.value }))}
          />
        </Field>
      </div>
      {input.approve && (
        <Notice tone="neutral" className="mt-4">
          Duyệt chưa phải đã hoàn: khoản này ở "Đã duyệt, chờ ghi nhận" tới khi quản trị chuyển tiền và ghi nhận.
        </Notice>
      )}
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={decide.isPending} onClick={onClose}>
          Huỷ
        </Button>
        <Button
          icon={input.approve ? 'check_circle' : 'block'}
          type="submit"
          variant={input.approve ? 'primary' : 'danger-solid'}
          disabled={decide.isPending}
        >
          {decide.isPending ? 'Đang gửi…' : input.approve ? 'Duyệt hoàn tiền' : 'Không hoàn'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function RefundDecisionDialog({ refund, onClose }: { refund: RefundView | null; onClose: () => void }) {
  return (
    <ModalDialog
      open={Boolean(refund)}
      onOpenChange={(open) => !open && onClose()}
      className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto"
      aria-label="Xét hoàn tiền"
    >
      {refund && <DecisionForm key={refund.refundId} refund={refund} onClose={onClose} />}
    </ModalDialog>
  )
}
