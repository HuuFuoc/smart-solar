import { DocumentPreviewButtons, type DocumentLink } from '@/components/common/ui/document-preview'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { CashReceiptStatusBadge } from '@/features/cash-receipts/CashReceiptStatusBadge'
import { readErrorText } from '@/features/cash-receipts/cashReceiptDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import type { EvidenceDisposition } from '@/services/cashReceiptService'
import type { CashReceiptView } from '@/types/res/paymentPlanRes'

// Các lần gửi phiếu thu của một khoản (mới nhất trước): số phiếu, trạng thái, giờ thu / gửi / xét, lý do yêu cầu bổ sung, ảnh. Ảnh
// xin link ký sẵn đúng lúc bấm xem (DocumentPreviewButtons), không lưu. Chỉ kỹ thuật viên của hợp đồng và quản lý / quản trị thấy

export function CashReceiptHistory({
  receipts,
  evidence,
  highlightId,
}: {
  receipts: CashReceiptView[]
  evidence: (receiptId: string, disposition: EvidenceDisposition) => Promise<DocumentLink>
  /** Phiếu đang xem ở trang chi tiết */
  highlightId?: string
}) {
  return (
    <Table stack>
      <thead>
        <tr>
          <Th>Số phiếu thu</Th>
          <Th>Trạng thái</Th>
          <Th>Thời gian</Th>
          <Th>Ghi chú, lý do</Th>
          <Th>
            <span className="sr-only">Ảnh phiếu thu</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {receipts.map((r) => (
          <Tr key={r.cashReceiptId} aria-current={r.cashReceiptId === highlightId || undefined}>
            <Td label="Số phiếu thu" className="tnum">
              <span className="font-medium text-fg">{r.receiptNumber}</span>
              {r.cashReceiptId === highlightId && <p className="text-meta text-fg-2">Đang xem</p>}
            </Td>
            <Td label="Trạng thái">
              <CashReceiptStatusBadge status={r.status} />
            </Td>
            <Td label="Thời gian" className="tnum text-meta text-fg-2">
              <p>Thu lúc {formatMoment(r.collectedAt)}</p>
              <p>Gửi lúc {formatMoment(r.submittedAt)}</p>
              {r.reviewedAt && <p>Xét lúc {formatMoment(r.reviewedAt)}</p>}
            </Td>
            <Td label="Ghi chú, lý do" className="text-body">
              {r.status === 'REJECTED' && r.reviewReason && (
                <p className="text-fg wrap-break-word">Cần bổ sung: {r.reviewReason}</p>
              )}
              {r.status === 'ACCEPTED' && r.reviewReason && (
                <p className="text-fg-2 wrap-break-word">Quản lý ghi: {r.reviewReason}</p>
              )}
              {r.note && <p className="text-fg-2 wrap-break-word">Kỹ thuật viên ghi: {r.note}</p>}
              {!r.note && !r.reviewReason && <span className="text-fg-3">—</span>}
            </Td>
            <Td>
              <div className="flex lg:justify-end">
                <DocumentPreviewButtons
                  name={`Ảnh phiếu thu ${r.receiptNumber}`}
                  request={(disposition) => evidence(r.cashReceiptId, disposition)}
                  errorText={readErrorText}
                />
              </div>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  )
}
