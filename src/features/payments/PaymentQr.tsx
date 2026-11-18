import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

// Vẽ chuỗi VietQR của PayOS (`qrCode`, không phải ảnh) thành mã QR để khách quét bằng app ngân hàng trên máy kỹ thuật viên.
// Một <path> cho mọi ô tối, có lề trắng 4 ô theo chuẩn; màu cố định tối trên sáng ở cả giao diện tối

const QUIET_ZONE = 4

function qrPath(text: string) {
  const qr = qrcode(0, 'M')
  qr.addData(text, 'Byte')
  qr.make()
  const count = qr.getModuleCount()
  let d = ''
  for (let row = 0; row < count; row++)
    for (let col = 0; col < count; col++)
      if (qr.isDark(row, col)) d += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`
  return { d, size: count + QUIET_ZONE * 2 }
}

export function PaymentQr({ value, label, className }: { value: string; label: string; className?: string }) {
  const qr = useMemo(() => {
    try {
      return qrPath(value)
    } catch {
      return null
    }
  }, [value])
  if (!qr) return <p className="text-body text-danger">Không vẽ được mã QR. Mở trang thanh toán bằng nút bên dưới.</p>
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={qr.size} height={qr.size} className="fill-qr-bg" />
      <path d={qr.d} className="fill-qr-fg" />
    </svg>
  )
}
