// Các hàm đọc số từ ô nhập và định dạng số kiểu Việt Nam

/**
 * Đọc số khách gõ vào ô nhập. Cho phép dấu phẩy thập phân: "12,5" là 12.5.
 * Ô trống trả về null, gõ không phải số trả về NaN.
 */
export function parseDecimal(text: string): number | null {
  const raw = text.trim().replace(',', '.')
  if (raw === '') return null
  return Number(raw)
}

/**
 * Đọc số có dấu chấm ngăn hàng nghìn: "1.200" là 1200, "1.200,5" là 1200.5.
 * Dùng cho diện tích và khoảng cách mm, vì giao diện in số theo kiểu này và khách hay chép lại.
 * Số không có dạng hàng nghìn ("1.5", "12,5") thì đọc như parseDecimal.
 */
export function parseGroupedNumber(text: string): number | null {
  const raw = text.trim()
  const hasThousandDots = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)
  if (hasThousandDots) {
    const withoutDots = raw.replace(/\./g, '')
    return Number(withoutDots.replace(',', '.'))
  }
  return parseDecimal(raw)
}

/** Như parseDecimal nhưng trả về null cả khi gõ sai, để dùng thẳng trong tính toán */
export function readDecimal(text: string): number | null {
  const value = parseDecimal(text)
  if (value === null || !Number.isFinite(value)) return null
  return value
}

/** Như parseGroupedNumber nhưng trả về null cả khi gõ sai */
export function readGroupedNumber(text: string): number | null {
  const value = parseGroupedNumber(text)
  if (value === null || !Number.isFinite(value)) return null
  return value
}

/** Làm tròn 3 chữ số thập phân (tới mm khi đơn vị là mét), tránh lỗi số thực như 1.2000000000000002 */
export function roundTo3Decimals(value: number) {
  return Math.round(value * 1000) / 1000
}

/** Số thành chữ để đặt vào ô nhập: 1.5 thành "1,5" */
export function toInputText(value: number) {
  return String(roundTo3Decimals(value)).replace('.', ',')
}

/** 1000000 thành "1.000.000" */
export function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value)
}

/** Viết hoa chữ cái đầu: "chiều rộng" thành "Chiều rộng" */
export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
