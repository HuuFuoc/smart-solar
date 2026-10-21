// Viết tay vì swagger không có schema response (tag SurveySlots)
import type { ZoneView } from '@/types/res/surveyRequestsRes'

/** Một giờ bắt đầu đặt được. Giờ địa phương có offset (+07:00); bản UTC đi kèm */
export type SurveySlot = {
  /** Format: date-time, vd. "2026-10-20T08:00:00+07:00" */
  startsAt: string
  endsAt: string
  startsAtUtc: string
  endsAtUtc: string
  canBook: boolean
  /** EXACT: số kỹ thuật viên đếm đủ; AT_LEAST: dừng sớm, chỉ là cận dưới */
  capacityStatus: 'EXACT' | 'AT_LEAST' | (string & {})
  knownAvailableTechnicians: number
  /** Đang chỉ có "AVAILABLE" */
  status: string
}

/**
 * COVERED khi có giờ, còn lại là lý do không có giờ: SITE_LOCATION_REQUIRED (địa điểm thiếu mã phường),
 * NO_ZONE_COVERAGE, ZONE_NOT_SERVICEABLE, NO_ZONE_TECHNICIAN, NO_AVAILABLE_TECHNICIAN, SCHEDULE_CONFLICT
 */
export type CoverageStatus =
  | 'COVERED'
  | 'SITE_LOCATION_REQUIRED'
  | 'NO_ZONE_COVERAGE'
  | 'ZONE_NOT_SERVICEABLE'
  | 'NO_ZONE_TECHNICIAN'
  | 'NO_AVAILABLE_TECHNICIAN'
  | 'SCHEDULE_CONFLICT'
  | (string & {})

export type SurveySlotsView = {
  /** Format: date (YYYY-MM-DD, theo giờ Việt Nam) */
  date: string
  timeZone: string
  appointmentDurationMinutes: number
  /** Khu vực phục vụ của địa điểm, null khi phường chưa thuộc khu nào */
  zone: ZoneView | null
  /** Rỗng không phải lỗi: xem coverageStatus và note */
  slots: SurveySlot[]
  note: string | null
  coverageStatus: CoverageStatus
  /** Khách gửi được yêu cầu điều phối thay vì tự đặt giờ */
  dispatchAvailable: boolean
}
