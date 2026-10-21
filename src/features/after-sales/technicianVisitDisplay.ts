import type { Tone } from '@/components/common/ui/badge'
import { visitStatusMeta } from '@/features/after-sales/serviceDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import type { TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'

// Điều kiện và nhãn của buổi hẹn phía kỹ thuật viên, bám TechnicianServiceHandlers của backend

/** Backend cho bắt đầu (và báo khách vắng) sớm nhất 2 giờ trước giờ hẹn */
const EARLY_START_MS = 2 * 60 * 60 * 1000

export type VisitTab = 'pending' | 'active' | 'done'

export const awaitsAnswer = (v: TechnicianVisitView) => v.status === 'SCHEDULED' && v.assignmentStatus === 'PENDING'
export const isOpen = (v: TechnicianVisitView) => v.status === 'SCHEDULED' || v.status === 'IN_PROGRESS'
export const isAccepted = (v: TechnicianVisitView) => v.assignmentStatus === 'ACCEPTED'

export function visitTab(v: TechnicianVisitView): VisitTab {
  if (awaitsAnswer(v)) return 'pending'
  return isOpen(v) && isAccepted(v) ? 'active' : 'done'
}

/** Mốc sớm nhất được bắt đầu buổi hẹn */
export const startOpensAt = (v: TechnicianVisitView) => new Date(new Date(v.startsAt).getTime() - EARLY_START_MS)

/** Lý do chưa bắt đầu được, null khi bắt đầu được */
export function startBlocker(v: TechnicianVisitView, now = new Date()) {
  if (v.customerConfirmationRequired && !v.customerConfirmedAt) return 'Khách chưa xác nhận giờ hẹn này.'
  if (now < startOpensAt(v))
    return `Bắt đầu được từ ${formatMoment(startOpensAt(v).toISOString())}, tức 2 giờ trước giờ hẹn.`
  return null
}

export function technicianVisitMeta(v: TechnicianVisitView): { label: string; tone: Tone } {
  if (awaitsAnswer(v)) return { label: 'Chờ bạn nhận', tone: 'danger' }
  if (v.status === 'SCHEDULED') return { label: 'Đã nhận, chờ tới giờ', tone: 'ok' }
  if (v.status === 'IN_PROGRESS') return { label: 'Đang làm', tone: 'info' }
  return visitStatusMeta(v.status)
}
