import { useState } from 'react'
import { useLocation } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, buttonClass } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { isPayableAttempt, paymentStatusMeta } from '@/features/after-sales/afterSalesDisplay'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import { QuotationDetail } from '@/features/after-sales/ServiceRequestParts'
import { formatVnd } from '@/features/after-sales/serviceDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { isCheckoutUrl, rememberCheckout } from '@/features/payments/payosReturn'
import { useCheckoutRedirect } from '@/hooks/useCheckoutRedirect'
import {
  useAcceptQuotationMutation,
  useCheckoutQuotationMutation,
  useQuotationCashMutation,
  useQuotationPaymentQuery,
  useRejectQuotationMutation,
} from '@/hooks/useCustomerServiceRequests'
import { errorMessage } from '@/services/api/errors'
import type { ServiceQuotationView } from '@/types/res/customerAfterSalesRes'

// Báo giá đang chờ khách: đồng ý hoặc từ chối, rồi thanh toán qua PayOS hoặc chọn trả tiền mặt (quản lý xác nhận đã thu).
// "Đã thanh toán" chỉ hiện khi backend xác nhận, không dựa vào trang PayOS chuyển về. Chọn tiền mặt không kéo dài hạn báo giá
export function CustomerQuotationPanel({ quotation }: { quotation: ServiceQuotationView }) {
  const accept = useAcceptQuotationMutation()
  const reject = useRejectQuotationMutation()
  const checkout = useCheckoutQuotationMutation()
  const cash = useQuotationCashMutation()
  const payment = useQuotationPaymentQuery(quotation.currentPaymentAttemptId)
  // PayOS chuyển về thì đưa khách lại trang yêu cầu này
  const { pathname } = useLocation()
  const [rejecting, setRejecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const redirect = useCheckoutRedirect()
  const busy = accept.isPending || checkout.isPending || cash.isPending || redirect.leaving
  const attempt = payment.data
  // Link còn trả được thì mở lại link đó; hết hạn hoặc chưa có thì tạo link mới
  const payable = attempt && isPayableAttempt(attempt.status) ? attempt : null
  const cashChosen = payable?.method === 'CASH'

  async function run(action: () => Promise<unknown>, done: string) {
    setError(null)
    try {
      await action()
      toast.success(done)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  // Tạo link xong là sang ngay trang PayOS trong tab này; PayOS chưa trả link thì ở lại, trạng thái link hiện bên dưới
  async function pay() {
    setError(null)
    try {
      const created = await checkout.mutateAsync(quotation.quotationId)
      if (!redirect.go(created, pathname)) toast.success('Đã tạo link thanh toán PayOS.')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Panel id="quotation" className="scroll-mt-6">
      <PanelHeader
        title={quotation.status === 'ISSUED' ? 'Báo giá chờ bạn duyệt' : 'Thanh toán báo giá'}
        description={`Số tiền ${formatVnd(quotation.customerAmount)}`}
      />
      <PanelBody className="space-y-4">
        <QuotationDetail quotation={quotation} />
        {quotation.status === 'ISSUED' && (
          <div className="flex flex-wrap gap-3">
            <Button
              icon="check_circle"
              variant="primary"
              disabled={busy}
              onClick={() => void run(() => accept.mutateAsync(quotation.quotationId), 'Đã đồng ý báo giá.')}
            >
              {accept.isPending ? 'Đang gửi…' : 'Đồng ý báo giá'}
            </Button>
            <Button icon="block" variant="danger" disabled={busy} onClick={() => setRejecting(true)}>
              Từ chối
            </Button>
          </div>
        )}
        {quotation.status === 'ACCEPTED' && cashChosen && (
          <div className="space-y-3">
            <p className="flex flex-wrap items-center gap-2 text-body text-fg-2">
              Bạn đã chọn trả tiền mặt:
              <Badge tone={paymentStatusMeta(payable.status, payable.method).tone}>
                {paymentStatusMeta(payable.status, payable.method).label}
              </Badge>
            </p>
            <p className="text-body text-fg-2">
              Trả {formatVnd(quotation.customerAmount)} cho nhân viên Smart Solar trước{' '}
              <span className="tnum">{formatMoment(quotation.expiresAt)}</span> (hạn báo giá). Quá hạn mà chưa xác nhận
              thu thì lựa chọn tiền mặt tự huỷ.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                icon="refresh"
                variant="secondary"
                disabled={payment.isFetching}
                onClick={() => void payment.refetch()}
              >
                {payment.isFetching ? 'Đang kiểm tra…' : 'Kiểm tra lại'}
              </Button>
              <Button
                icon="undo"
                variant="warn"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => cash.mutateAsync({ quotationId: quotation.quotationId, cancel: true }),
                    'Đã bỏ chọn tiền mặt.',
                  )
                }
              >
                Bỏ chọn tiền mặt
              </Button>
            </div>
          </div>
        )}
        {quotation.status === 'ACCEPTED' && !cashChosen && (
          <div className="space-y-3">
            <p className="text-body text-fg-2">
              Thanh toán xong, Smart Solar xếp lịch cho kỹ thuật viên tới làm. Trả qua PayOS trước{' '}
              <span className="tnum">{formatMoment(quotation.expiresAt)}</span>, hoặc chọn trả tiền mặt cho nhân viên.
            </p>
            {attempt && (
              <p className="flex flex-wrap items-center gap-2 text-body text-fg-2">
                Lần thanh toán gần nhất:
                <Badge tone={paymentStatusMeta(attempt.status, attempt.method).tone}>
                  {paymentStatusMeta(attempt.status, attempt.method).label}
                </Badge>
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {payable && isCheckoutUrl(payable.checkoutUrl) ? (
                <a
                  href={payable.checkoutUrl}
                  className={buttonClass('primary')}
                  onClick={() => rememberCheckout(payable.orderCode, pathname)}
                >
                  Mở trang thanh toán PayOS
                </a>
              ) : (
                <Button icon="payments" variant="primary" disabled={busy} onClick={() => void pay()}>
                  {checkout.isPending || redirect.leaving ? 'Đang mở PayOS…' : 'Thanh toán qua PayOS'}
                </Button>
              )}
              {payable && (
                <Button
                  icon="refresh"
                  variant="secondary"
                  disabled={payment.isFetching}
                  onClick={() => void payment.refetch()}
                >
                  {payment.isFetching ? 'Đang kiểm tra…' : 'Kiểm tra lại'}
                </Button>
              )}
              {!payable && (
                <Button
                  icon="payments"
                  variant="soft"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => cash.mutateAsync({ quotationId: quotation.quotationId, cancel: false }),
                      'Đã chọn trả tiền mặt. Smart Solar xác nhận khi nhận tiền.',
                    )
                  }
                >
                  {cash.isPending ? 'Đang gửi…' : 'Trả tiền mặt'}
                </Button>
              )}
              <Button icon="block" variant="danger" disabled={busy} onClick={() => setRejecting(true)}>
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
        icon="block"
        variant="danger"
        onSubmit={(reason) => reject.mutateAsync({ quotationId: quotation.quotationId, reason })}
        onClose={() => setRejecting(false)}
      />
    </Panel>
  )
}
