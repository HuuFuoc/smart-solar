import { Navigate, useLocation } from 'react-router'
import { PAYOS_RETURN_PARAM, returnPathFor } from '@/features/payments/payosReturn'
import { ROUTES } from '@/routes/paths'

// Điểm PayOS chuyển về sau khi khách trả tiền hoặc bấm huỷ. Không đọc kết quả từ địa chỉ: đưa khách về trang đã mở link,
// trang đó hỏi hệ thống trạng thái thật. Không biết trang nào thì về danh sách hợp đồng
export function PaymentReturnPage() {
  const { pathname, search } = useLocation()
  const outcome = pathname === ROUTES.paymentCancel ? 'cancel' : 'return'
  const orderCode = new URLSearchParams(search).get('orderCode')
  const target = returnPathFor(orderCode, outcome) ?? `${ROUTES.customer.contracts}?${PAYOS_RETURN_PARAM}=${outcome}`
  return <Navigate to={target} replace />
}
