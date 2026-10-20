/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */
import type { ProductResponse } from '@/types/res/adminProductsRes'

export type ProductResponsePagedResult = {
  items?: ProductResponse[] | null
  /** Format: int32 */
  page?: number
  /** Format: int32 */
  pageSize?: number
  /** Format: int32 */
  totalItems?: number
  /** Format: int32 */
  totalPages?: number
}
