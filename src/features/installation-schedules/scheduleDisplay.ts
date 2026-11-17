import type { Tone } from '@/components/common/ui/badge'
import { INSTALLATION_RESCHEDULE_REASONS, INSTALLATION_SCHEDULE_STATUSES } from '@/common/installationSchedule'
import { INELIGIBLE_REASONS } from '@/common/scheduling'
import { formatAppointment, formatMoment, vnDate } from '@/features/scheduling/schedulingDisplay'
import { detailOf, isApiError, messageForCode } from '@/services/api/errors'
import type { InstallationScheduleView } from '@/types/res/installationSchedulesRes'

// Nhãn và câu của lịch thi công đã thống nhất với khách

export function scheduleStatusMeta(status: string, viewer: 'staff' | 'customer'): { label: string; tone: Tone } {
  const meta = INSTALLATION_SCHEDULE_STATUSES[status]
  return meta ? { label: meta[viewer], tone: meta.tone } : { label: status, tone: 'neutral' }
}

/** "Thứ Bảy, 29/11/2026, 08:00–17:00", hoặc hai mốc khi kéo qua nhiều ngày */
export function scheduleWhen(s: Pick<InstallationScheduleView, 'startsAt' | 'endsAt'>) {
  if (vnDate(s.startsAt) === vnDate(s.endsAt)) return formatAppointment(s.startsAt, s.endsAt)
  return `${formatMoment(s.startsAt)} – ${formatMoment(s.endsAt)}`
}

export const rescheduleReasonText = (code: string | null | undefined) =>
  code ? (INSTALLATION_RESCHEDULE_REASONS[code] ?? 'Lịch không xác nhận được, cần hẹn ngày khác.') : null

/** Lý do huỷ do hệ thống ghi khi đổi lịch ("REPLACED: <lý do>") viết lại cho người đọc */
export function cancellationText(reason: string | null | undefined) {
  if (!reason) return null
  return reason.startsWith('REPLACED:') ? `Đổi sang lịch mới: ${reason.slice('REPLACED:'.length).trim()}` : reason
}

/** Câu lỗi khi ghi / đổi / huỷ lịch; kỹ thuật viên không nhận được khoảng giờ thì ghi rõ vì sao (details.reason) */
export function scheduleErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 429)
      return error.retryAfter
        ? `Bạn thao tác quá nhanh. Thử lại sau ${error.retryAfter} giây.`
        : 'Bạn thao tác quá nhanh. Chờ một lát rồi thử lại.'
    if (error.code === 'INSTALLATION_SCHEDULE_TECHNICIAN_INELIGIBLE') {
      const reason = detailOf(error, 'reason')
      const text = typeof reason === 'string' ? INELIGIBLE_REASONS[reason] : undefined
      if (text) return `Kỹ thuật viên không nhận được khoảng thời gian này: ${text}. Chọn giờ khác.`
    }
    return messageForCode(error.code) ?? error.message
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.'
}
