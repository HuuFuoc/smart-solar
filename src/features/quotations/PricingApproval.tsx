import { useState } from 'react'
import { toast } from 'sonner'
import { QUOTATION_LIMITS } from '@/common/quotation'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea } from '@/components/common/ui/field'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { formatQuotationMoney, priceAdjustmentLabel, pricingApprovalMeta } from '@/features/quotations/quotationDisplay'
import {
  approvalReasonError,
  canRequestPricingApproval,
  priceAdjustments,
  pricingApprovalStatus,
  totalReduction,
} from '@/features/quotations/quotationRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useRequestPricingApprovalMutation } from '@/hooks/useSalesQuotations'
import { errorMessage } from '@/services/api/errors'
import type { PricingApprovalView, QuotationView } from '@/types/res/quotationsRes'

// Duyệt giá của bản nháp báo giá lắp đặt: giảm giá, đơn giá dưới giá danh mục hoặc giá 0 cần quản lý duyệt đúng bộ giá đó
// trước khi gửi khách. Sửa bất kỳ số nào sau khi duyệt thì backend coi là bộ giá mới, phải xin lại

/** Các điểm lệch giá so với giá danh mục, kèm số tiền giảm */
export function PriceAdjustmentTable({ quotation: q }: { quotation: QuotationView }) {
  const adjustments = priceAdjustments(q)
  const money = (amount: number) => formatQuotationMoney(amount, q.currency)
  const total = totalReduction(adjustments)
  const lineName = (lineNumber: number | null) => q.lines.find((l) => l.lineNumber === lineNumber)?.name
  return (
    <div className="space-y-2">
      <Table stack>
        <thead>
          <tr>
            <Th>Điểm cần duyệt</Th>
            <Th className="text-right">Đơn giá</Th>
            <Th className="text-right">Giá danh mục</Th>
            <Th className="text-right">Giảm</Th>
          </tr>
        </thead>
        <tbody>
          {adjustments.map((a, i) => (
            <Tr key={`${a.kind}-${a.lineNumber ?? 'header'}-${i}`}>
              <Td label="Điểm cần duyệt">
                <p className="font-medium text-fg">{priceAdjustmentLabel(a.kind)}</p>
                {a.lineNumber != null && (
                  <p className="text-meta text-fg-2">
                    Dòng {a.lineNumber}
                    {lineName(a.lineNumber) ? `: ${lineName(a.lineNumber)}` : ''}
                  </p>
                )}
              </Td>
              <Td label="Đơn giá" className="tnum whitespace-nowrap lg:text-right">
                {a.unitPrice != null ? money(a.unitPrice) : '—'}
              </Td>
              <Td label="Giá danh mục" className="tnum whitespace-nowrap lg:text-right">
                {a.catalogUnitPrice != null ? money(a.catalogUnitPrice) : '—'}
              </Td>
              <Td label="Giảm" className="tnum font-medium whitespace-nowrap text-fg lg:text-right">
                {a.amount != null ? money(a.amount) : '—'}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {total != null && adjustments.length > 1 && (
        <p className="tnum text-body text-fg-2">
          Tổng giảm so với giá danh mục: <span className="font-semibold text-fg">{money(total)}</span>
        </p>
      )}
    </div>
  )
}

/** Ai xin, ai quyết định, lý do. Chỉ ghi lần xin / quyết định của đúng bộ giá hiện tại */
export function PricingApprovalHistory({ approval }: { approval: PricingApprovalView | null | undefined }) {
  if (!approval?.request && !approval?.decision) return null
  const items = []
  if (approval.request)
    items.push({
      k: `Xin duyệt lúc ${formatMoment(approval.request.at)}`,
      v: <span className="whitespace-pre-line">{approval.request.reason || '—'}</span>,
    })
  if (approval.decision)
    items.push({
      k: `${approval.decision.eventType === 'PRICING_APPROVED' ? 'Duyệt' : 'Không duyệt'} lúc ${formatMoment(approval.decision.at)}`,
      v: <span className="whitespace-pre-line">{approval.decision.reason || '—'}</span>,
    })
  return <KeyValueList items={items} />
}

/** Khối "Duyệt giá" trên bản nháp của kinh doanh; không có điểm lệch giá thì không hiện */
export function SalesPricingApproval({ draft }: { draft: QuotationView }) {
  const [requesting, setRequesting] = useState(false)
  const status = pricingApprovalStatus(draft)
  if (status === 'NOT_REQUIRED') return null
  const meta = pricingApprovalMeta(status, 'sales')
  const canRequest = canRequestPricingApproval(draft)
  return (
    <section aria-labelledby="pricing-approval-title" className="space-y-4 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="pricing-approval-title" className="flex flex-wrap items-center gap-2 text-body font-semibold text-fg">
          Duyệt giá <Badge tone={meta.tone}>{meta.label}</Badge>
        </h3>
        {canRequest && (
          <Button size="sm" variant="soft" icon="price_check" onClick={() => setRequesting(true)}>
            {status === 'REJECTED' ? 'Xin duyệt lại' : 'Xin duyệt giá'}
          </Button>
        )}
      </div>
      <p className="text-body text-fg-2">
        {status === 'PENDING'
          ? 'Quản lý đang xem bộ giá này. Sửa giá lúc này thì yêu cầu duyệt hết hiệu lực và phải xin lại.'
          : status === 'APPROVED'
            ? 'Gửi được cho khách. Sửa bất kỳ số nào thì phải xin duyệt lại.'
            : status === 'REJECTED'
              ? 'Sửa giá về đúng danh mục, hoặc xin duyệt lại kèm lý do mới.'
              : 'Báo giá có điểm lệch giá danh mục dưới đây. Quản lý duyệt xong mới gửi được cho khách.'}
      </p>
      <PriceAdjustmentTable quotation={draft} />
      <PricingApprovalHistory approval={draft.pricingApproval} />
      <RequestPricingApprovalDialog open={requesting} quotation={draft} onClose={() => setRequesting(false)} />
    </section>
  )
}

function RequestPricingApprovalDialog({
  open,
  quotation: q,
  onClose,
}: {
  open: boolean
  quotation: QuotationView
  onClose: () => void
}) {
  const request = useRequestPricingApprovalMutation()
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
    if (request.isPending) return
    setChecked(true)
    setError(null)
    if (approvalReasonError(reason)) return
    try {
      await request.mutateAsync({ quotationId: q.quotationId, revision: q.revision, reason: reason.trim() })
      toast.success('Đã gửi quản lý duyệt giá.')
      close()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => !next && !request.isPending && close()}
      dismissible={!request.isPending}
      aria-label="Xin quản lý duyệt giá"
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <DialogTitle>Xin quản lý duyệt giá</DialogTitle>
        <div className="mt-4 space-y-4">
          <p className="text-body text-fg-2">
            Quản lý duyệt đúng bộ giá đang hiện (tổng{' '}
            <span className="tnum font-semibold text-fg">{formatQuotationMoney(q.totalAmount, q.currency)}</span>). Sửa
            giá sau khi gửi thì phải xin lại.
          </p>
          <Field
            label="Lý do giảm giá"
            htmlFor="pricing-approval-reason"
            required
            hint={`Tối đa ${QUOTATION_LIMITS.approvalReasonLength} ký tự.`}
            error={reasonError}
          >
            <Textarea
              id="pricing-approval-reason"
              rows={3}
              value={reason}
              maxLength={QUOTATION_LIMITS.approvalReasonLength}
              aria-required
              aria-invalid={reasonError ? true : undefined}
              disabled={request.isPending}
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
          <Button icon="close" variant="secondary" disabled={request.isPending} onClick={close}>
            Đóng
          </Button>
          <Button icon="send" type="submit" variant="primary" disabled={request.isPending}>
            {request.isPending ? 'Đang gửi…' : 'Gửi quản lý'}
          </Button>
        </DialogFooter>
      </form>
    </ModalDialog>
  )
}
