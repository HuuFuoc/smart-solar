import { formatDateVn, formatDay, formatTime, formatTimeRange, relativeDay, vnDate } from './schedulingDisplay.ts'
import type { OpenAppointmentView, TechnicianAppointmentListItem } from '../../types/res/technicianAppointmentsRes'

export type JobFilterTarget = OpenAppointmentView | TechnicianAppointmentListItem

/** Chuẩn hoá chuỗi tìm kiếm không phân biệt hoa thường và dấu */
export function normalizeJobSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Chuỗi từ khoá tìm kiếm gồm ngày, giờ, công trình và địa bàn */
export function jobKeywords(job: JobFilterTarget): string {
  const day = vnDate(job.startsAt)
  const dateTokens: string[] = []
  if (day) {
    const [y, m, d] = day.split('-')
    if (y && m && d) {
      dateTokens.push(day, `${d}/${m}/${y}`, `${d}/${m}`, formatDateVn(job.startsAt), formatDay(day), relativeDay(day))
    }
  }

  const startTime = formatTime(job.startsAt)
  const endTime = formatTime(job.endsAt)
  const timeTokens: string[] = [startTime, endTime, formatTimeRange(job.startsAt, job.endsAt)]
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

  const placeTokens = [
    job.propertyName,
    job.province,
    job.district,
    job.ward,
    'communeName' in job ? job.communeName : null,
    'zone' in job && job.zone ? job.zone.name : null,
  ].filter(Boolean) as string[]

  return normalizeJobSearch([...dateTokens, ...timeTokens, ...placeTokens].join(' '))
}

/** Lọc lịch theo từ khoá, ngày và giờ bắt đầu */
export function matchesJob(job: JobFilterTarget, search: string, date: string, time: string): boolean {
  if (date && vnDate(job.startsAt) !== date) return false
  if (time && formatTime(job.startsAt) !== time) return false
  if (!search.trim()) return true
  const text = jobKeywords(job)
  const tokens = normalizeJobSearch(search).split(/\s+/).filter(Boolean)
  return tokens.every((token) => text.includes(token))
}
