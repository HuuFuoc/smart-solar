import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Radio, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { QuotationLines, QuotationTotals } from '@/features/quotations/QuotationContent'
import {
  adjustmentText,
  formatQuotationMoney,
  quotationErrorMessage,
  quotationTitle,
} from '@/features/quotations/quotationDisplay'
import { REVIEW_REASON_MAX, reviewReasonError } from '@/features/quotations/quotationRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useDecidePricingApprovalMutation, usePricingApprovalsQuery } from '@/hooks/useManagerQuotations'
import type { QuotationView } from '@/types/res/quotationsRes'

// Quản lý duyệt giá báo giá lắp đặt: bản nháp có giảm giá, đơn giá thấp hơn danh mục hoặc giá 0 mà kinh doanh đã xin duyệt.
// Duyệt đúng bộ giá đang có; kinh doanh sửa giá sau đó thì yêu cầu tự hết và phải xin lại

function DecisionDialog({ quotation: q, onClose }: { quotation: QuotationView; onClose: () => void }) {
  const decide = useDecidePricingApprovalMutation()
  const [approve, setApprove] = useState(true)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const request = q.pricingApproval?.request

  async function submit() {
    const invalid = reviewReasonError(reason)
    setError(invalid)
    if (invalid || decide.isPending) return
    try {
      await decide.mutateAsync({ quotationId: q.quotationId, revision: q.revision, approve, reason: reason.trim() })
      toast.success(approve ? 'Đã duyệt giá. Kinh doanh gửi được báo giá cho khách.' : 'Đã không duyệt giá.')
      onClose()
    } catch (e) {
      setError(quotationErrorMessage(e))
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !decide.isPending && onClose()}
      dismissible={!decide.isPending}
      className="max-w-3xl"
      aria-label="Duyệt giá báo giá"
    >
      <DialogTitle>Duyệt giá {quotationTitle(q)}</DialogTitle>
      <div className="mt-4 space-y-4">
        <Notice tone="warn" title="Giá thấp hơn danh mục">
          <ul className="list-disc pl-5">
            {(q.pricingApproval?.adjustments ?? []).map((a, i) => (
              <li key={i} className="tnum">
                {adjustmentText(a, q)}
              </li>
            ))}
          </ul>
          {request?.reason && <p className="mt-2 whitespace-pre-line">Kinh doanh ghi: {request.reason}</p>}
        </Notice>
        <QuotationLines quotation={q} showCatalogPrice />
        <div className="flex justify-end">
          <QuotationTotals quotation={q} />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-body font-medium text-fg">Quyết định</legend>
          <Radio
            name="pricing-decision"
            label="Duyệt giá"
            checked={approve}
            disabled={decide.isPending}
            onChange={() => setApprove(true)}
          />
          <Radio
            name="pricing-decision"
            label="Không duyệt"
            checked={!approve}
            disabled={decide.isPending}
            onChange={() => setApprove(false)}
          />
        </fieldset>
        <Field label="Lý do" htmlFor="pricing-reason" required>
          <Textarea
            id="pricing-reason"
            rows={2}
            maxLength={REVIEW_REASON_MAX}
            aria-required
            value={reason}
            disabled={decide.isPending}
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
        <Button icon="close" variant="secondary" disabled={decide.isPending} onClick={onClose}>
          Đóng
        </Button>
        <Button
          icon={approve ? 'check_circle' : 'block'}
          variant={approve ? 'primary' : 'danger-solid'}
          disabled={decide.isPending}
          onClick={() => void submit()}
        >
          {decide.isPending ? 'Đang gửi…' : approve ? 'Duyệt giá' : 'Không duyệt'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

export function ManagePricingApprovalsPage() {
  const query = usePricingApprovalsQuery()
  const [deciding, setDeciding] = useState<QuotationView | null>(null)

  return (
    <>
      <PageHeader title="Duyệt giá báo giá" />
      <QueryBoundary query={query}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState title="Không có báo giá nào chờ duyệt giá" />
          ) : (
            <Table stack>
              <thead>
                <tr>
                  <Th>Báo giá</Th>
                  <Th className="text-right">Tổng cộng</Th>
                  <Th>Giá thấp hơn danh mục</Th>
                  <Th>Kinh doanh xin lúc</Th>
                  <Th className="text-right">
                    <span className="sr-only">Thao tác</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {list.map((q) => (
                  <Tr key={q.quotationId}>
                    <Td label="Báo giá" className="tnum font-medium text-fg">
                      {quotationTitle(q)}
                    </Td>
                    <Td label="Tổng cộng" className="tnum whitespace-nowrap lg:text-right">
                      {formatQuotationMoney(q.totalAmount, q.currency)}
                    </Td>
                    <Td label="Giá thấp hơn danh mục" className="tnum text-meta text-fg-2">
                      {(q.pricingApproval?.adjustments ?? []).map((a, i) => (
                        <p key={i}>{adjustmentText(a, q)}</p>
                      ))}
                    </Td>
                    <Td label="Kinh doanh xin lúc" className="tnum whitespace-nowrap">
                      {formatMoment(q.pricingApproval?.request?.at)}
                    </Td>
                    <Td className="whitespace-nowrap lg:text-right">
                      <Button size="sm" variant="info" icon="gavel" onClick={() => setDeciding(q)}>
                        Xét giá
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )
        }
      </QueryBoundary>
      {deciding && <DecisionDialog quotation={deciding} onClose={() => setDeciding(null)} />}
    </>
  )
}
