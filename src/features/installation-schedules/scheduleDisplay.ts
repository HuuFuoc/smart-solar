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

/** Vì sao kỹ thuật viên không nhận được một khung: backend trả mã khả năng nhận lịch hoặc câu tiếng Anh, không hiện nguyên văn */
export function slotReasonText(reason: string | null | undefined) {
  if (!reason) return null
  const code = INELIGIBLE_REASONS[reason]
  if (code) return code.charAt(0).toUpperCase() + code.slice(1)
  if (/already has an installation planned/i.test(reason)) return 'Bạn đã có lịch thi công khác trong khoảng này'
  if (/must be in the future/i.test(reason)) return 'Đã qua giờ bắt đầu'
  const horizon = /within (\d+) days/i.exec(reason)
  if (horizon) return `Chỉ hẹn được trong ${horizon[1]} ngày tới`
  const span = /at most (\d+) local days/i.exec(reason)
  if (span) return `Một lần thi công dài tối đa ${span[1]} ngày`
  return 'Không nhận được khung này'
}

const OFFER_STATUSES: Record<string, { label: string; tone: Tone }> = {
  OPEN: { label: 'Đang chờ khách chọn', tone: 'info' },
  SELECTED: { label: 'Khách đã chọn', tone: 'ok' },
  WITHDRAWN: { label: 'Đã rút', tone: 'neutral' },
}

export const offerStatusMeta = (status: string) => OFFER_STATUSES[status] ?? { label: status, tone: 'neutral' as Tone }

export const withdrawnReasonText = (reason: string | null | undefined) =>
  reason === 'REPLACED_BY_NEW_OFFERS'
    ? 'Thay bằng lần đề xuất mới'
    : reason === 'ANOTHER_OFFER_SELECTED'
      ? 'Khách chọn khung khác'
      : null
