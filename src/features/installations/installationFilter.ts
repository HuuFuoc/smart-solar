import {
  formatDateVn,
  formatDay,
  formatTime,
  formatTimeRange,
  relativeDay,
  vnDate,
} from '../scheduling/schedulingDisplay.ts'
import type { InstallationTechnicianView } from '../../types/res/technicianInstallationsRes'

/** Chuẩn hoá chuỗi tìm kiếm không phân biệt hoa thường và dấu */
export function normalizeInstallationSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Chuỗi từ khoá tìm kiếm gồm ngày, giờ, công trình, khách hàng và khu vực */
export function installationKeywords(view: InstallationTechnicianView): string {
  const startDay = vnDate(view.startsAt)
  const endDay = vnDate(view.endsAt)
  const dateTokens: string[] = []

  for (const day of [startDay, endDay]) {
    if (!day) continue
    const [y, m, d] = day.split('-')
    if (y && m && d) {
      dateTokens.push(day, `${d}/${m}/${y}`, `${d}/${m}`, formatDay(day), relativeDay(day))
    }
  }
  if (view.startsAt) dateTokens.push(formatDateVn(view.startsAt))
  if (view.endsAt) dateTokens.push(formatDateVn(view.endsAt))

  const startTime = formatTime(view.startsAt)
  const endTime = formatTime(view.endsAt)
  const timeTokens: string[] = [startTime, endTime, formatTimeRange(view.startsAt, view.endsAt)]
  if (startTime.includes(':')) {
    const [sh, sm] = startTime.split(':')
    const h = Number(sh)
    if (!Number.isNaN(h)) {
      timeTokens.push(`${h}h`, `${h}h${sm !== '00' ? sm : ''}`)
    }
  }
  if (endTime.includes(':')) {
    const [eh, em] = endTime.split(':')
    const h = Number(eh)
    if (!Number.isNaN(h)) {
      timeTokens.push(`${h}h`, `${h}h${em !== '00' ? em : ''}`)
    }
  }

  const site = view.site
  const placeTokens = [
    site?.propertyName,
    site?.customerName,
    site?.customerPhone,
    site?.province,
    site?.district,
    site?.ward,
    site?.streetLine,
    view.zoneName,
  ].filter(Boolean) as string[]

  return normalizeInstallationSearch([...dateTokens, ...timeTokens, ...placeTokens].join(' '))
}

/** Lọc công trình lắp đặt theo từ khoá, ngày (nằm trong khung thi công) và giờ bắt đầu */
export function matchesInstallation(
  view: InstallationTechnicianView,
  search: string,
  date: string,
  time: string,
): boolean {
  if (date) {
    const startDate = vnDate(view.startsAt)
    const endDate = vnDate(view.endsAt) || startDate
    if (date < startDate || date > endDate) return false
  }
  if (time && formatTime(view.startsAt) !== time) return false
  if (!search.trim()) return true
  const text = installationKeywords(view)
  const tokens = normalizeInstallationSearch(search).split(/\s+/).filter(Boolean)
  return tokens.every((token) => text.includes(token))
}
