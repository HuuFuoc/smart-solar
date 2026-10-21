import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, buttonClass } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { isPayableAttempt, paymentStatusMeta } from '@/features/after-sales/afterSalesDisplay'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import { QuotationDetail } from '@/features/after-sales/ServiceRequestParts'
import { formatVnd } from '@/features/after-sales/serviceDisplay'
import {
  useAcceptQuotationMutation,
  useCheckoutQuotationMutation,
  useQuotationPaymentQuery,
  useRejectQuotationMutation,
} from '@/hooks/useCustomerServiceRequests'
import { errorMessage } from '@/services/api/errors'
import type { ServiceQuotationView } from '@/types/res/customerAfterSalesRes'

// Báo giá đang chờ khách: đồng ý hoặc từ chối, rồi thanh toán qua PayOS
// "Đã thanh toán" chỉ hiện khi backend xác nhận (hỏi lại 10 giây một lần), không dựa vào trang PayOS chuyển về
export function CustomerQuotationPanel({ quotation }: { quotation: ServiceQuotationView }) {
  const accept = useAcceptQuotationMutation()
  const reject = useRejectQuotationMutation()
  const checkout = useCheckoutQuotationMutation()
  const payment = useQuotationPaymentQuery(quotation.currentPaymentAttemptId)
  const [rejecting, setRejecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = accept.isPending || checkout.isPending
  const attempt = payment.data
  // Link còn trả được thì mở lại link đó; hết hạn hoặc chưa có thì tạo link mới
  const payable = attempt && isPayableAttempt(attempt.status) ? attempt : null

  async function run(action: () => Promise<unknown>, done: string) {
    setError(null)
    try {
      await action()
      toast.success(done)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Panel>
      <PanelHeader
        title={quotation.status === 'ISSUED' ? 'Báo giá chờ bạn duyệt' : 'Thanh toán báo giá'}
        description={`Số tiền ${formatVnd(quotation.customerAmount)}`}
      />
      <PanelBody className="space-y-4">
        <QuotationDetail quotation={quotation} />
        {quotation.status === 'ISSUED' && (
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => void run(() => accept.mutateAsync(quotation.quotationId), 'Đã đồng ý báo giá.')}
            >
              {accept.isPending ? 'Đang gửi…' : 'Đồng ý báo giá'}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setRejecting(true)}>
              Từ chối
            </Button>
          </div>
        )}
        {quotation.status === 'ACCEPTED' && (
          <div className="space-y-3">
            <p className="text-body text-fg-2">
              Thanh toán xong, Smart Solar xếp lịch cho kỹ thuật viên tới làm. Trạng thái tự cập nhật khi PayOS xác nhận
              đã nhận tiền.
            </p>
            {attempt && (
              <p className="flex flex-wrap items-center gap-2 text-body text-fg-2">
                Link thanh toán:
                <Badge tone={paymentStatusMeta(attempt.status).tone}>{paymentStatusMeta(attempt.status).label}</Badge>
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {payable?.checkoutUrl ? (
                <a href={payable.checkoutUrl} target="_blank" rel="noreferrer" className={buttonClass('primary')}>
                  Mở trang thanh toán PayOS
                </a>
              ) : (
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() =>
                    void run(() => checkout.mutateAsync(quotation.quotationId), 'Đã tạo link thanh toán PayOS.')
                  }
                >
                  {checkout.isPending ? 'Đang tạo link…' : 'Thanh toán qua PayOS'}
                </Button>
              )}
              {payable && (
                <Button variant="secondary" disabled={payment.isFetching} onClick={() => void payment.refetch()}>
                  {payment.isFetching ? 'Đang kiểm tra…' : 'Kiểm tra lại'}
                </Button>
              )}
              <Button variant="ghost" bleed={false} disabled={busy} onClick={() => setRejecting(true)}>
                Không làm nữa
              </Button>
            </div>
          </div>
        )}
        {error && (
          <div role="alert">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}
      </PanelBody>
      <ReasonDialog
        open={rejecting}
        title="Từ chối báo giá?"
        description="Các hạng mục trong báo giá sẽ không được làm. Phần được bảo hành (nếu có) vẫn làm bình thường."
        submitLabel="Từ chối báo giá"
        variant="danger"
        onSubmit={(reason) => reject.mutateAsync({ quotationId: quotation.quotationId, reason })}
        onClose={() => setRejecting(false)}
      />
    </Panel>
  )
}
