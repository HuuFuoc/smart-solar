import type {
  ChangeProductStatusRequest,
  CreateProductRequest,
  UpdateProductRequest,
} from '@/types/req/adminProductsReq'
import type { ProductDeletedResponse, ProductResponse } from '@/types/res/adminProductsRes'
import type { ProductResponsePagedResult } from '@/types/res/productsRes'
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

/** Bỏ các giá trị rỗng để URL không mang `?Search=&Brand=` */
function compact(params: ProductListParams) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
}

/** GET /api/products */
export function listProducts(params: ProductListParams = {}) {
  return get<ProductResponsePagedResult>(ENDPOINTS.products.base, { params: compact(params) })
}

/** GET /api/products/{id} */
export function getProduct(id: string) {
  return get<ProductResponse>(ENDPOINTS.products.byId(id))
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
