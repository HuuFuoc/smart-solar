import { Badge } from '@/components/common/ui/badge'
import { receiptStatusMeta, technicianStatusLabel } from '@/features/cash-receipts/cashReceiptDisplay'

// Trạng thái phiếu thu bằng chữ có màu (chờ: vàng, đã xác nhận: xanh, yêu cầu bổ sung: đỏ, đã đóng: xám); chữ luôn nói rõ trạng
// thái nên không chỉ dựa vào màu
export function CashReceiptStatusBadge({
  status,
  viewer = 'staff',
  className,
}: {
  status: string | null | undefined
  viewer?: 'technician' | 'staff'
  className?: string
}) {
  const meta = receiptStatusMeta(status)
  return (
    <Badge tone={meta.tone} className={className}>
      {viewer === 'technician' ? technicianStatusLabel(status) : meta.label}
    </Badge>
  )
}
