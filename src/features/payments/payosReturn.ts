// PayOS chuyển trình duyệt về ReturnUrl / CancelUrl của backend (/payments/return, /payments/cancel) kèm orderCode. Trang đó
// chỉ là điểm quay về: trước khi mở PayOS, nhớ trang đã mở link theo mã đơn để đưa khách về đúng chỗ, rồi trang đó tự hỏi
// trạng thái thật. Không tin tham số PayOS gắn vào địa chỉ. Lưu ở localStorage vì PayOS mở ở tab mới (sessionStorage không
// đi theo), chỉ giữ một ngày

const STORAGE_KEY = 'payos-return'
const KEEP_MS = 24 * 60 * 60 * 1000

/** Tham số gắn vào trang đích để trang đó biết khách vừa quay về từ PayOS (chỉ để hiện câu "đang kiểm tra") */
export const PAYOS_RETURN_PARAM = 'payos'

type Entry = { path: string; at: number }

function read(): Record<string, Entry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, Entry>) : {}
  } catch {
    return {}
  }
}

/** Nhớ trang mở link thanh toán `orderCode`; bỏ các mục quá một ngày */
export function rememberCheckout(orderCode: number | string, path: string) {
  const now = Date.now()
  const entries = Object.fromEntries(Object.entries(read()).filter(([, e]) => now - e.at < KEEP_MS))
  entries[String(orderCode)] = { path, at: now }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Không lưu được thì trang quay về đưa khách tới danh sách hợp đồng
  }
}

/** Trang đã mở link thanh toán này, kèm tham số báo khách vừa quay về; null khi không biết */
export function returnPathFor(orderCode: string | null, outcome: 'return' | 'cancel') {
  const entry = orderCode ? read()[orderCode] : undefined
  if (!entry || Date.now() - entry.at >= KEEP_MS || !entry.path.startsWith('/')) return null
  const sep = entry.path.includes('?') ? '&' : '?'
  return `${entry.path}${sep}${PAYOS_RETURN_PARAM}=${outcome}`
}
