/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type PackageRequest = {
  kind?: string | null
  name?: string | null
  description?: string | null
  /** Format: double */
  price?: number
  /** Format: int32 */
  durationMonths?: number
  visitMonths?: number[] | null
  coveredDisasterTypes?: string[] | null
  /** Format: double */
  coveragePercent?: number | null
  /** Format: double */
  perIncidentLimit?: number | null
  /** Format: double */
  termLimit?: number | null
  isActive?: boolean
  /** Format: int32 */
  revision?: number
}
