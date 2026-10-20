/*
 * VIẾT TAY – swagger chỉ khai "200 OK" cho tag TechnicianAvailability, không có schema response.
 * Tên kiểu và field lấy đúng theo SmartSolar.Modules.Scheduling.PreSurveyAppointments.Views
 * (TechnicianAvailabilityView, AvailableTechnicianView, TravelEstimateView – backend main 4d12e4d,
 * 12/10/2026). TravelEstimateView dùng chung cho lịch kỹ thuật viên. Khi backend khai response trong
 * swagger, `npm run gen:api` sẽ ghi đè file này bằng bản sinh tự động.
 */

/** Dữ liệu kẹt xe của nhà cung cấp, hoặc NOT_RETURNED_BY_PROVIDER. Không bao giờ suy ra từ thời gian đi. */
export type TravelCongestionView = {
  status: 'AVAILABLE' | 'NOT_RETURNED_BY_PROVIDER' | (string & {})
  segmentsByLevel: Record<string, number> | null
  heavyOrWorseMeters: number | null
  metersByLevel: Record<string, number> | null
}

/** Ước tính quãng đường xe máy (Vietmap) tại thời điểm `estimatedAt`: số liệu lịch sử, không phải giao thông trực tiếp. */
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
  /** OK, ROUTE_NOT_FOUND, QUOTA_EXCEEDED, RATE_LIMITED, TIMEOUT, PROVIDER_UNAVAILABLE, … */
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
