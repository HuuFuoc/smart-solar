import { useLocation } from 'react-router'
import { ButtonLink } from '@/components/common/ui/button'
import { CashReceiptStatusBadge } from '@/features/cash-receipts/CashReceiptStatusBadge'
import { receiptDetailPath, receiptPortalOf } from '@/features/cash-receipts/cashReceiptRoutes'
import { currentReceipt, receiptPanelFor } from '@/features/cash-receipts/cashReceiptRules'
import { TechnicianCashReceiptPanel } from '@/features/cash-receipts/TechnicianCashReceiptPanel'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import type { InstallmentActor } from '@/services/installmentService'
import type { InstallmentPaymentView } from '@/types/res/paymentPlanRes'

// Chỗ gắn phiếu thu vào khối thanh toán một khoản (InstallmentPaymentBlock): kỹ thuật viên đã khảo sát chụp / gửi phiếu; nhân viên
// thấy phiếu đã gửi, quản lý / quản trị mở trang xét duyệt. Khách không thấy gì (receiptPanelFor trả null)

function StaffCashReceiptNote({ view, canReview }: { view: InstallmentPaymentView; canReview: boolean }) {
  const { pathname } = useLocation()
  const receipt = currentReceipt(view)
  if (!receipt) return null
  return (
    <div className="space-y-2">
      <p className="flex flex-wrap items-center gap-2 text-body text-fg">
        Phiếu thu {receipt.receiptNumber}
        <CashReceiptStatusBadge status={receipt.status} />
      </p>
      <p className="tnum text-meta text-fg-2">
        Kỹ thuật viên thu tiền lúc {formatMoment(receipt.collectedAt)}, gửi lúc {formatMoment(receipt.submittedAt)}.
      </p>
      {receipt.status === 'REJECTED' && receipt.reviewReason && (
        <p className="text-body text-fg-2 wrap-break-word">Đã yêu cầu bổ sung: {receipt.reviewReason}</p>
      )}
      {canReview && receipt.status === 'SUBMITTED' && (
        <ButtonLink
          size="sm"
          icon="receipt_long"
          variant="info"
          to={receiptDetailPath(receiptPortalOf(pathname), receipt.cashReceiptId)}
        >
          Xét duyệt phiếu thu
        </ButtonLink>
      )}
    </div>
  )
}

export function InstallmentCashReceipt({
  actor,
  view,
  canReview = false,
}: {
  actor: InstallmentActor
  view: InstallmentPaymentView
  /** Quản lý / quản trị: có nút mở trang xét duyệt */
  canReview?: boolean
}) {
  const panel = receiptPanelFor(actor, view)
  if (panel === 'technician')
    return <TechnicianCashReceiptPanel view={view} target={{ contractId: view.contractId, sequence: view.sequence }} />
  if (panel === 'staff') return <StaffCashReceiptNote view={view} canReview={canReview} />
  return null
}
