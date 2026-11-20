import './charts.css'

// Màu và định dạng số của biểu đồ. Màu là biến CSS nên tự đổi theo giao diện sáng / tối (charts.css)

export const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)'] as const
export const ORDINAL = ['var(--ord-1)', 'var(--ord-2)', 'var(--ord-3)', 'var(--ord-4)', 'var(--ord-5)'] as const

/** Màu trạng thái dùng lại token của globals.css; chỉ dùng khi màu mang nghĩa trạng thái */
export const STATUS_COLOR = {
  ok: 'var(--ok)',
  info: 'var(--info)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  neutral: 'var(--chart-neutral)',
} as const

export const CHART_GRID = 'var(--chart-grid)'
export const CHART_AXIS = 'var(--chart-axis)'
export const CHART_SURFACE = 'var(--surface)'

const count = new Intl.NumberFormat('vi-VN')
const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const twoDecimals = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

export const formatCount = (n: number) => count.format(n)
export const formatVndFull = (n: number) => vnd.format(n)

/** Số tiền gọn cho trục và ô số: "1,25 tỷ", "350 tr", "950 nghìn". Số đầy đủ luôn có trong chú giải và bảng */
export function formatVndCompact(n: number) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (abs >= 1_000_000_000) return `${sign}${twoDecimals.format(abs / 1_000_000_000)} tỷ`
  if (abs >= 1_000_000) return `${sign}${oneDecimal.format(abs / 1_000_000)} tr`
  if (abs >= 1_000) return `${sign}${count.format(Math.round(abs / 1_000))} nghìn`
  return `${sign}${count.format(abs)} đ`
}

/** Nhãn trục: bỏ "đ" và phần thập phân dài cho gọn */
export function formatVndAxis(n: number) {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `${oneDecimal.format(n / 1_000_000_000)} tỷ`
  if (abs >= 1_000_000) return `${count.format(Math.round(n / 1_000_000))} tr`
  if (abs >= 1_000) return `${count.format(Math.round(n / 1_000))} N`
  return count.format(n)
}

export function formatPercent(part: number, total: number) {
  if (total <= 0) return '0%'
  const p = (part / total) * 100
  return `${p > 0 && p < 1 ? '<1' : count.format(Math.round(p))}%`
}
