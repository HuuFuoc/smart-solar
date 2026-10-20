/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type ChangeProductStatusRequest = {
  status?: string | null
}

export type CreateProductRequest = {
  sku?: string | null
  productType?: string | null
  category?: string | null
  name?: string | null
  brand?: string | null
  model?: string | null
  unit?: string | null
  /** Format: double */
  unitPrice?: number | null
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
  imageUrl?: string | null
  status?: string | null
}

export type UpdateProductRequest = {
  sku?: string | null
  productType?: string | null
  category?: string | null
  name?: string | null
  brand?: string | null
  model?: string | null
  unit?: string | null
  /** Format: double */
  unitPrice?: number | null
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
  imageUrl?: string | null
}
