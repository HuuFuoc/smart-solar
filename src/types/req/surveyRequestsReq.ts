/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api` – KHÔNG sửa tay. */

export type AssignTechnicianRequest = {
  /** Format: uuid */
  technicianUserId?: string
  reason?: string | null
}

export type SalesRescheduleRequest = {
  startsAt?: string | null
  reason?: string | null
  /** Format: uuid */
  technicianUserId?: string | null
}
