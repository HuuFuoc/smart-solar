// Lịch tháng của bộ chọn ngày khảo sát. Tháng là chuỗi "YYYY-MM", ngày là "YYYY-MM-DD" theo giờ Việt Nam
// Tính ở 12:00 UTC nên không lệch ngày vì múi giờ

const pad = (n: number) => String(n).padStart(2, '0')

export function monthOf(date: string) {
  return date.slice(0, 7)
}

export function addMonths(month: string, count: number) {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(year!, m! - 1 + count, 1, 12))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

/** "Tháng 10, 2026" */
export function monthLabel(month: string) {
  const [year, m] = month.split('-').map(Number)
  return `Tháng ${m}, ${year}`
}

/** Các ô của tháng theo tuần bắt đầu từ thứ Hai; null là ô trống trước ngày 1 và sau ngày cuối */
export function monthCells(month: string): (string | null)[] {
  const [year, m] = month.split('-').map(Number)
  const lead = (new Date(Date.UTC(year!, m! - 1, 1, 12)).getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(year!, m!, 0, 12)).getUTCDate()
  const cells: (string | null)[] = Array.from({ length: lead }, () => null)
  for (let day = 1; day <= days; day += 1) cells.push(`${month}-${pad(day)}`)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}
