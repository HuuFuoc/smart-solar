const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usdCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const num = new Intl.NumberFormat('en-US')

export const fmt = {
  usd: (n: number) => usd.format(n),
  usdCents: (n: number) => usdCents.format(n),
  num: (n: number) => num.format(n),
  pct: (n: number, digits = 1) => `${n.toFixed(digits)}%`,
}

/** Định dạng tiền kiểu Việt Nam theo mã tiền tệ. Mã lạ thì in số kèm mã */
export function formatMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null) return '—'
  const code = currency?.trim().toUpperCase() || 'VND'
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: code }).format(amount)
  } catch {
    return `${new Intl.NumberFormat('vi-VN').format(amount)} ${code}`
  }
}
