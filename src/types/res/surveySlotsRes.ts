// Viết tay vì swagger không có schema response (tag SurveySlots)

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
