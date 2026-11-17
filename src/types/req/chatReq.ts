/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type AskChatRequest = {
  /** Format: uuid */
  sessionId?: string | null
  message?: string | null
  clientMessageId?: string | null
  advisor?: SolarAdvisorRequest
}

export type SolarAdvisorRequest = {
  /** Format: double */
  roofAreaM2?: number | null
  /** Format: double */
  budgetVnd?: number | null
  /** Format: double */
  monthlyConsumptionKwh?: number | null
  /** Format: uuid */
  propertySiteId?: string | null
  /** Format: double */
  latitude?: number | null
  /** Format: double */
  longitude?: number | null
  /** Format: double */
  tiltDegree?: number | null
  /** Format: double */
  azimuthDegree?: number | null
  wantsBattery?: boolean | null
}
