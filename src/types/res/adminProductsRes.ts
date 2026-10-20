/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type ProductDeletedResponse = {
  /** Format: uuid */
  id?: string
  deleted?: boolean
}

export type ProductResponse = {
  /** Format: uuid */
  id?: string
  sku?: string | null
  productType?: string | null
  category?: string | null
  name?: string | null
  brand?: string | null
  model?: string | null
  unit?: string | null
  /** Format: double */
  unitPrice?: number
  currency?: string | null
  /** Format: double */
  ratedPowerW?: number | null
  /** Format: double */
  widthMm?: number | null
  /** Format: double */
  heightMm?: number | null
  /** Format: int32 */
  warrantyMonth?: number | null
  spec?: unknown
  status?: string | null
  imageUrl?: string | null
  /** Format: date-time */
  createdAt?: string
  /** Format: date-time */
  updatedAt?: string
}
