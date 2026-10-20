import type { Tone } from '@/components/common/ui/badge'
import type { ProductSortBy, ProductSortDirection } from '@/services/productService'

/*
 * Enum của sản phẩm (trang admin, danh mục của các portal và trang công khai). Hàm tra nhãn ở
 * features/products/productDisplay.ts.
 *
 * Swagger khai `status` là string tự do. Danh sách dưới đây là các giá trị backend nhận
 * (backend trả "'Status' must be ACTIVE or INACTIVE." khi dò PATCH .../status ngày 29/09/2026);
 * so khớp không phân biệt hoa thường, giá trị lạ thì in nguyên văn thay vì đoán nghĩa.
 */
export const PRODUCT_STATUSES = [
  { value: 'ACTIVE', label: 'Đang bán', tone: 'ok' },
  { value: 'INACTIVE', label: 'Ngừng bán', tone: 'neutral' },
] as const satisfies readonly { value: string; label: string; tone: Tone }[]

export type ProductStatus = (typeof PRODUCT_STATUSES)[number]['value']

/*
 * Loại sản phẩm là chữ tự do; riêng tấm pin có mã SOLAR_PANEL mà backend kiểm tra thêm (dò validator
 * 05/10/2026, không phân biệt hoa thường): bắt buộc ratedPowerW, widthMm, heightMm. Mô phỏng 3D cũng
 * chỉ lấy sản phẩm loại này.
 */
export const SOLAR_PANEL_TYPE = 'SOLAR_PANEL'

/** Tuỳ chọn sắp xếp; value = "SortBy:SortDirection" theo giá trị backend chấp nhận. */
export const PRODUCT_SORT_OPTIONS: { value: `${ProductSortBy}:${ProductSortDirection}`; label: string }[] = [
  { value: 'createdAt:desc', label: 'Mới thêm gần đây' },
  { value: 'name:asc', label: 'Tên A–Z' },
  { value: 'unitPrice:asc', label: 'Giá thấp đến cao' },
  { value: 'unitPrice:desc', label: 'Giá cao đến thấp' },
  { value: 'ratedPowerW:desc', label: 'Công suất lớn nhất' },
  { value: 'brand:asc', label: 'Hãng A–Z' },
]
