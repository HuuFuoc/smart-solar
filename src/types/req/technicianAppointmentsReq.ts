/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type AcceptAppointmentRequest = {
  /** Format: int32 */
  expectedRevision?: number | null
}

export type ReleaseAppointmentRequest = {
  reason?: string | null
}
