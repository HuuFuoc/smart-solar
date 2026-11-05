import type { ProductStatusFilter } from '@/common/product'
import type {
  AddProductImageRequest,
  ChangeProductStatusRequest,
  CreateProductRequest,
  UpdateProductRequest,
} from '@/types/req/adminProductsReq'
import type { ProductDeletedResponse, ProductResponse, ProductResponsePagedResult } from '@/types/res/adminProductsRes'
import { get, post, put, patch, del } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Các endpoint sản phẩm. Query của GET /api/products không có schema nên khai ở đây (PascalCase)

// SortBy: name | brand | ratedPowerW | unitPrice | createdAt, SortDirection: asc | desc, PageSize 1-100
export type ProductSortBy = 'name' | 'brand' | 'ratedPowerW' | 'unitPrice' | 'createdAt'
export type ProductSortDirection = 'asc' | 'desc'
export const PRODUCT_PAGE_SIZE_MAX = 100

/** Query của GET /api/products, theo swagger */
export type ProductListParams = {
  Search?: string
  ProductType?: string
  Category?: string
  Brand?: string
  MinPower?: number
  MaxPower?: number
  MinPrice?: number
  MaxPrice?: number
  Page?: number
  PageSize?: number
  SortBy?: ProductSortBy
  SortDirection?: ProductSortDirection
}

/** Danh sách quản lý nhận thêm `status`, mặc định ALL */
export type AdminProductListParams = ProductListParams & { status?: ProductStatusFilter }

/** Bỏ các giá trị rỗng để URL không mang `?Search=&Brand=` */
function compact(params: AdminProductListParams) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
}

/** GET /api/products, chỉ sản phẩm đang bán */
export function listProducts(params: ProductListParams = {}) {
  return get<ProductResponsePagedResult>(ENDPOINTS.products.base, { params: compact(params) })
}

/** GET /api/products/{id} */
export function getProduct(id: string) {
  return get<ProductResponse>(ENDPOINTS.products.byId(id))
}

/** GET /api/admin/products: như danh mục công khai, có cả sản phẩm ngừng bán. Chung giới hạn ghi của danh mục */
export function listAdminProducts(params: AdminProductListParams = {}) {
  return get<ProductResponsePagedResult>(ENDPOINTS.adminProducts.base, { params: compact(params) })
}

/** POST /api/admin/products, trả 201 kèm sản phẩm vừa tạo */
export function createProduct(body: CreateProductRequest) {
  return post<ProductResponse>(ENDPOINTS.adminProducts.base, body)
}

/** PUT /api/admin/products/{id}, body không có status, đổi status qua PATCH riêng */
export function updateProduct(id: string, body: UpdateProductRequest) {
  return put<ProductResponse>(ENDPOINTS.adminProducts.byId(id), body)
}

/** DELETE /api/admin/products/{id} */
export function deleteProduct(id: string) {
  return del<ProductDeletedResponse>(ENDPOINTS.adminProducts.byId(id))
}

/** PATCH /api/admin/products/{id}/status */
export function changeProductStatus(id: string, body: ChangeProductStatusRequest) {
  return patch<ProductResponse>(ENDPOINTS.adminProducts.status(id), body)
}

// Ảnh sản phẩm (ADMIN, MANAGER). Mọi lệnh trả lại cả sản phẩm kèm mảng images; chung giới hạn 30 lần / phút với mọi thao tác
// quản trị danh mục, kể cả GET chi tiết quản trị

/** GET /api/admin/products/{id}: chi tiết ở mọi trạng thái (kể cả INACTIVE), sản phẩm đã xoá thì 404 */
export function getAdminProduct(id: string) {
  return get<ProductResponse>(ENDPOINTS.adminProducts.byId(id))
}

/** POST .../images (201). Link https tuyệt đối; ảnh đầu tiên luôn là ảnh chính */
export function addProductImage(id: string, body: AddProductImageRequest) {
  return post<ProductResponse>(ENDPOINTS.adminProducts.images(id), body)
}

/** DELETE .../images/{imageId}. Xoá ảnh chính thì ảnh đứng đầu còn lại thành ảnh chính */
export function removeProductImage(id: string, imageId: string) {
  return del<ProductResponse>(ENDPOINTS.adminProducts.image(id, imageId))
}

/** PUT .../images/order. `imageIds` phải đúng bộ ảnh hiện có, mỗi ảnh một lần */
export function reorderProductImages(id: string, imageIds: string[]) {
  return put<ProductResponse>(ENDPOINTS.adminProducts.imageOrder(id), { imageIds })
}

/** PUT .../images/{imageId}/primary */
export function setPrimaryProductImage(id: string, imageId: string) {
  return put<ProductResponse>(ENDPOINTS.adminProducts.imagePrimary(id, imageId))
}
