import type { ChangeProductStatusRequest, CreateProductRequest, UpdateProductRequest } from '@/types/req/adminProductsReq'
import type { ProductDeletedResponse, ProductResponse } from '@/types/res/adminProductsRes'
import type { ProductResponsePagedResult } from '@/types/res/productsRes'
import { get, post, put, patch, del } from '@/services/api/client'

/*
 * 6 endpoint sản phẩm: 2 endpoint đọc (tag Products) và 4 endpoint quản trị (tag AdminProducts).
 * Kiểu body/response sinh từ swagger; riêng query của GET /api/products không có schema nên
 * khai ở đây, tên field đúng như swagger (PascalCase).
 */

/*
 * Swagger khai SortBy/SortDirection là string; giá trị hợp lệ lấy từ lỗi validate của backend
 * (29/09/2026): SortBy ∈ name | brand | ratedPowerW | unitPrice | createdAt, SortDirection ∈ asc | desc,
 * Page ≥ 1, PageSize 1–100 (mặc định 20), MinPrice ≤ MaxPrice.
 */
export type ProductSortBy = 'name' | 'brand' | 'ratedPowerW' | 'unitPrice' | 'createdAt'
export type ProductSortDirection = 'asc' | 'desc'
export const PRODUCT_PAGE_SIZE_MAX = 100

/** Query của GET /api/products – theo swagger. */
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

/** Bỏ các giá trị rỗng để URL không mang `?Search=&Brand=`. */
function compact(params: ProductListParams) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
}

/** GET /api/products */
export function listProducts(params: ProductListParams = {}) {
  return get<ProductResponsePagedResult>('/products', { params: compact(params) })
}

/** GET /api/products/{id} */
export function getProduct(id: string) {
  return get<ProductResponse>(`/products/${encodeURIComponent(id)}`)
}

/** POST /api/admin/products – trả 201 kèm sản phẩm vừa tạo */
export function createProduct(body: CreateProductRequest) {
  return post<ProductResponse>('/admin/products', body)
}

/** PUT /api/admin/products/{id} – body không có status, đổi status qua PATCH riêng */
export function updateProduct(id: string, body: UpdateProductRequest) {
  return put<ProductResponse>(`/admin/products/${encodeURIComponent(id)}`, body)
}

/** DELETE /api/admin/products/{id} */
export function deleteProduct(id: string) {
  return del<ProductDeletedResponse>(`/admin/products/${encodeURIComponent(id)}`)
}

/** PATCH /api/admin/products/{id}/status */
export function changeProductStatus(id: string, body: ChangeProductStatusRequest) {
  return patch<ProductResponse>(`/admin/products/${encodeURIComponent(id)}/status`, body)
}
