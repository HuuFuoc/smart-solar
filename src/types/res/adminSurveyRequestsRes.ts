/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type SalesRescheduleView = {
  /** Format: uuid */
  appointmentId?: string
  /** Format: uuid */
  previousAppointmentId?: string | null
  /** Format: uuid */
  surveyRequestId?: string
  /** Format: uuid */
  technicianUserId?: string | null
  technicianName?: string | null
  /** Format: date-time */
  startsAt?: string
  /** Format: date-time */
  endsAt?: string
  appointmentStatus?: string | null
  acceptanceStatus?: string | null
  surveyRequestStatus?: string | null
  /** Format: date-time */
  scheduledAt?: string | null
}
