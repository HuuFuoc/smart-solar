/*
 * VIẾT TAY – swagger chỉ khai "200 OK" cho tag SurveySlots, không có schema response.
 * Tên kiểu và field lấy đúng theo SmartSolar.Modules.Scheduling.PreSurveyAppointments.Views
 * (SurveySlotsView, SurveySlotView – backend main 4d12e4d, 12/10/2026). Khi backend khai response
 * trong swagger, `npm run gen:api` sẽ ghi đè file này bằng bản sinh tự động.
 */

/** Một giờ bắt đầu đặt được. Giờ địa phương có offset (+07:00); bản UTC đi kèm. */
export type SurveySlot = {
  /** Format: date-time, vd. "2026-10-20T08:00:00+07:00" */
  startsAt: string
  endsAt: string
  startsAtUtc: string
  endsAtUtc: string
  canBook: boolean
  /** EXACT: số kỹ thuật viên đếm đủ; AT_LEAST: dừng sớm, chỉ là cận dưới. */
  capacityStatus: 'EXACT' | 'AT_LEAST' | (string & {})
  knownAvailableTechnicians: number
  /** Đang chỉ có "AVAILABLE". */
  status: string
}

export type SurveySlotsView = {
  /** Format: date (YYYY-MM-DD, theo giờ Việt Nam) */
  date: string
  timeZone: string
  appointmentDurationMinutes: number
  /** Rỗng không phải lỗi: xem `note`. */
  slots: SurveySlot[]
  /** VERIFIED | PARTIAL | UNAVAILABLE */
  routingStatus: string
  unverifiedSlotCount: number
  note: string | null
}
