import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DocumentPreviewButtons } from '@/components/common/ui/document-preview'
import { Notice } from '@/components/common/ui/lists'
import { CashReceiptCaptureDialog } from '@/features/cash-receipts/CashReceiptCaptureDialog'
import { CashReceiptHistory } from '@/features/cash-receipts/CashReceiptHistory'
import { CashReceiptStatusBadge } from '@/features/cash-receipts/CashReceiptStatusBadge'
import { readErrorText } from '@/features/cash-receipts/cashReceiptDisplay'
import {
  canSubmitReceipt,
  currentReceipt,
  receiptHistory,
  receiptKey,
  receiptTransition,
  technicianReceiptStep,
} from '@/features/cash-receipts/cashReceiptRules'
import { formatVnd } from '@/features/payment-plan/paymentPlanDisplay'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { paymentPlanKeys } from '@/hooks/paymentPlanKeys'
import * as service from '@/services/cashReceiptService'
import type { InstallmentTarget } from '@/services/installmentService'
import type { InstallmentPaymentView } from '@/types/res/paymentPlanRes'

// Phiếu thu tiền mặt trên khối thanh toán một khoản, phía kỹ thuật viên đã khảo sát (đang chờ tiền mặt):
// - chưa gửi: nút "Chụp phiếu thu";
// - đã gửi: "Đã gửi phiếu thu, chờ quản lý xác nhận", xem lại ảnh; khoản vẫn chưa trả, không bỏ chọn tiền mặt được;
// - bị yêu cầu bổ sung: lý do của quản lý và nút "Gửi lại phiếu thu".
// Trạng thái luôn lấy từ backend (khối thanh toán hỏi lại 15 giây một lần khi phiếu đang chờ); đổi trạng thái trong phiên thì báo
// một lần

export function TechnicianCashReceiptPanel({
  view,
  target,
}: {
  view: InstallmentPaymentView
  target: InstallmentTarget
}) {
  const queryClient = useQueryClient()
  const [capturing, setCapturing] = useState(false)
  const step = technicianReceiptStep(view)
  const receipt = currentReceipt(view)
  const history = receiptHistory(view)
  const lastKey = useRef<string | null>(receiptKey(receipt))

  useEffect(() => {
    const change = receiptTransition(lastKey.current, receipt)
    lastKey.current = receiptKey(receipt)
    if (change === 'rejected' && receipt)
      toast.error(`Quản lý yêu cầu bổ sung phiếu thu ${receipt.receiptNumber}.`, {
        description: receipt.reviewReason ?? undefined,
      })
  }, [receipt])

  // Đọc lại đúng khoản này (cùng khoá cache với khối thanh toán, không mở thêm lần hỏi định kỳ)
  async function reload() {
    const key = paymentPlanKeys.installment('technician', target.contractId, target.sequence)
    await queryClient.refetchQueries({ queryKey: key, exact: true })
    return queryClient.getQueryData<InstallmentPaymentView>(key)
  }

  const evidence = (receiptId: string, disposition: service.EvidenceDisposition) =>
    service.getTechnicianReceiptEvidenceUrl(target, receiptId, disposition)

  return (
    <div className="space-y-3">
      {step === 'capture' && (
        <>
          <p className="text-body text-fg-2">
            Khách trả tiền mặt {formatVnd(view.amount)}. Nhận đủ tiền, ghi phiếu thu giấy rồi chụp gửi quản lý.
          </p>
          <Notice tone="info">Khoản thanh toán chỉ được ghi nhận sau khi quản lý xác nhận phiếu thu.</Notice>
        </>
      )}

      {step === 'submitted' && receipt && (
        <div className="space-y-3" aria-live="polite">
          <CashReceiptStatusBadge status={receipt.status} viewer="technician" />
          <Facts
            items={[
              { k: 'Số phiếu thu', v: receipt.receiptNumber },
              { k: 'Thu tiền lúc', v: formatMoment(receipt.collectedAt) },
              { k: 'Gửi lúc', v: formatMoment(receipt.submittedAt) },
            ]}
          />
          <DocumentPreviewButtons
            name={`Ảnh phiếu thu ${receipt.receiptNumber}`}
            request={(disposition) => evidence(receipt.cashReceiptId, disposition)}
            errorText={readErrorText}
          />
          <p className="text-meta text-fg-2">
            Khoản này chưa được ghi đã trả. Trạng thái tự cập nhật khi quản lý xác nhận.
          </p>
        </div>
      )}

      {step === 'rejected' && receipt && (
        <div aria-live="polite">
          <Notice tone="danger" title={`Quản lý yêu cầu bổ sung phiếu thu ${receipt.receiptNumber}`}>
            <p className="wrap-break-word text-fg">{receipt.reviewReason ?? 'Gửi lại phiếu thu.'}</p>
            {receipt.reviewedAt && <p className="tnum mt-1 text-meta">Xét lúc {formatMoment(receipt.reviewedAt)}</p>}
          </Notice>
        </div>
      )}

      {canSubmitReceipt(view) && (
        <Button icon="photo_camera" variant="primary" className="w-full sm:w-auto" onClick={() => setCapturing(true)}>
          {step === 'rejected' ? 'Gửi lại phiếu thu' : 'Chụp phiếu thu'}
        </Button>
      )}

      {history.length > 1 && (
        <details className="rounded-control border border-line px-3 py-2">
          <summary className="cursor-pointer text-body font-medium text-fg">
            Các lần gửi phiếu thu ({history.length})
          </summary>
          <div className="mt-2">
            <CashReceiptHistory receipts={history} evidence={evidence} />
          </div>
        </details>
      )}

      {capturing && canSubmitReceipt(view) && (
        <CashReceiptCaptureDialog view={view} target={target} reload={reload} onClose={() => setCapturing(false)} />
      )}
    </div>
  )
}
