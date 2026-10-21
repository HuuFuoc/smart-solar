import { Badge } from '@/components/common/ui/badge'
import { Button, buttonClass } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { isPayableAttempt, paymentStatusMeta } from '@/features/after-sales/afterSalesDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { usePaymentQuery } from '@/hooks/useCustomerAfterSales'
import type { PaymentAttemptView } from '@/types/res/customerAfterSalesRes'
import { formatMoney } from '@/utils/format'

// Câu theo trạng thái link do backend trả. Không suy ra "đã thanh toán" từ việc tạo link hay từ trang PayOS chuyển về
function Outcome({ attempt }: { attempt: PaymentAttemptView }) {
  switch (attempt.status) {
    case 'PAID':
      return (
        <Notice tone="ok">
          PayOS đã xác nhận nhận tiền. Trạng thái gói ở mục Gói của bạn đã được tải lại theo hệ thống.
        </Notice>
      )
    case 'FAILED':
      return (
        <Notice tone="danger">
          Không tạo được link thanh toán cho đơn này. Huỷ đơn ở mục Gói của bạn rồi mua lại.
        </Notice>
      )
    case 'CANCELLED':
    case 'EXPIRED':
      return <Notice>Link này không còn dùng được. Nếu vẫn cần gói, mua lại ở mục Gói đang bán.</Notice>
    case 'REVIEW_REQUIRED':
    case 'REFUND_REQUIRED':
      return (
        <Notice tone="warn">
          Khoản tiền này cần nhân viên Smart Solar kiểm tra thủ công (số tiền không khớp hoặc trả sau hạn).
        </Notice>
      )
    default:
      return null
  }
}

function Payable({
  attempt,
  checking,
  onCheck,
}: {
  attempt: PaymentAttemptView
  checking: boolean
  onCheck: () => void
}) {
  return (
    <div className="mt-4 space-y-4">
      {attempt.checkoutUrl ? (
        <p className="text-body text-fg-2">
          Trả tiền trên trang PayOS rồi quay lại đây. Trạng thái tự kiểm tra lại mỗi 10 giây và chỉ đổi khi PayOS xác
          nhận đã nhận tiền.
        </p>
      ) : (
        <Notice tone="warn">PayOS chưa trả link cho đơn này. Bấm Kiểm tra lại sau ít phút.</Notice>
      )}
      <div className="flex flex-wrap gap-3">
        {attempt.checkoutUrl && (
          <a href={attempt.checkoutUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('primary')}>
            Mở trang thanh toán PayOS<span className="sr-only"> (mở tab mới)</span>
          </a>
        )}
        <Button variant="secondary" icon="refresh" disabled={checking} onClick={onCheck}>
          {checking ? 'Đang kiểm tra…' : 'Kiểm tra lại'}
        </Button>
      </div>
    </div>
  )
}

/** Một link thanh toán PayOS của khách: số tiền, hạn, trạng thái đọc từ backend */
export function PaymentDialog({ attemptId, onClose }: { attemptId: string | null; onClose: () => void }) {
  const query = usePaymentQuery(attemptId)
  const attempt = query.data

  return (
    <ModalDialog
      open={attemptId !== null}
      onOpenChange={(open) => !open && onClose()}
      aria-label="Thanh toán qua PayOS"
      className="max-w-lg"
    >
      <DialogTitle>Thanh toán qua PayOS</DialogTitle>
      {query.isPending ? (
        <Skeleton className="mt-4 h-32" />
      ) : attempt === undefined ? (
        <div className="mt-4">
          <ErrorState
            title="Không tải được thông tin thanh toán."
            message={query.error?.message}
            onRetry={() => void query.refetch()}
          />
        </div>
      ) : (
        <>
          <KeyValueList
            className="mt-4"
            items={[
              {
                k: 'Số tiền',
                v: (
                  <span className="tnum">
                    {formatMoney(attempt.amount, attempt.currency)}
                    {attempt.contractId && <span className="font-normal text-fg-2">, gồm cả tiền hợp đồng</span>}
                  </span>
                ),
              },
              { k: 'Mã đơn PayOS', v: <span className="tnum">{attempt.orderCode}</span> },
              { k: 'Hạn thanh toán', v: <span className="tnum">{formatMoment(attempt.expiresAt)}</span> },
              {
                k: 'Trạng thái',
                v: (
                  <Badge tone={paymentStatusMeta(attempt.status).tone}>{paymentStatusMeta(attempt.status).label}</Badge>
                ),
              },
            ]}
          />
          {isPayableAttempt(attempt.status) ? (
            <Payable attempt={attempt} checking={query.isFetching} onCheck={() => void query.refetch()} />
          ) : (
            <div className="mt-4">
              <Outcome attempt={attempt} />
            </div>
          )}
        </>
      )}
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Đóng
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
