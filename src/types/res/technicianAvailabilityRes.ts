// Viết tay vì swagger không có schema response (tag TechnicianAvailability)

/** Dữ liệu kẹt xe của nhà cung cấp, không suy ra từ thời gian đi */
export type TravelCongestionView = {
  status: 'AVAILABLE' | 'NOT_RETURNED_BY_PROVIDER' | (string & {})
  segmentsByLevel: Record<string, number> | null
  heavyOrWorseMeters: number | null
  metersByLevel: Record<string, number> | null
}

/** Ước tính quãng đường xe máy (Vietmap) tại `estimatedAt` */
export type TravelEstimateView = {
  provider: string
  providerVersion: string
  vehicle: string
  /** BASE (từ nơi xuất phát của kỹ thuật viên) | APPOINTMENT (từ lịch trước đó) */
  originKind: 'BASE' | 'APPOINTMENT' | (string & {})
  originAppointmentId: string | null
  originLatitude: number
  originLongitude: number
  destinationLatitude: number
  destinationLongitude: number
  /** Format: date-time */
  departureAt: string
  estimatedAt: string
  /** null khi không tính được đường. */
  distanceMeters: number | null
  durationSeconds: number | null
  safetyBufferMinutes: number
  estimatedArrivalAt: string | null
  /** OK, ROUTE_NOT_FOUND, QUOTA_EXCEEDED, RATE_LIMITED, TIMEOUT, PROVIDER_UNAVAILABLE, ... */
  routeCalculationStatus: string
  congestion: TravelCongestionView
  /** Đang chỉ có "HISTORICAL_ESTIMATE". */
  kind: string
}

export type AvailableTechnicianView = {
  technicianUserId: string
  fullName: string
  /** Người hệ thống đã giữ chỗ khi khách đặt giờ. */
  isCurrentReservation: boolean
  activeAppointmentsThatDay: number
  /** Giờ tới sớm nhất (đã cộng thời gian đi + dự phòng). */
  earliestArrivalAt: string
  inbound: TravelEstimateView
  outbound: TravelEstimateView | null
}

export type TechnicianAvailabilityView = {
  surveyRequestId: string
  startsAt: string
  endsAt: string
  /** Khung giờ hỏi trùng giờ khách đã đặt. */
  matchesBookedAppointment: boolean
  technicians: AvailableTechnicianView[]
  /** VERIFIED | PARTIAL | UNAVAILABLE */
  routingStatus: string
}
