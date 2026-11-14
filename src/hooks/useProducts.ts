import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as productService from '@/services/productService'
import type { AdminProductListParams, ProductListParams } from '@/services/productService'
import type {
  AddProductImageRequest,
  ChangeProductStatusRequest,
  CreateProductRequest,
  UpdateProductRequest,
} from '@/types/req/adminProductsReq'
import type { ProductDeletedResponse, ProductResponse, ProductResponsePagedResult } from '@/types/res/adminProductsRes'
import type { ApiError } from '@/services/api/errors'

// Mọi thao tác ghi (kể cả lỗi) đều làm mới danh sách và chi tiết

export const productKeys = {
  all: ['products'] as const,
  list: (params: ProductListParams) => [...productKeys.all, 'list', params] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
  adminList: (params: AdminProductListParams) => [...productKeys.all, 'admin-list', params] as const,
  adminDetail: (id: string) => [...productKeys.all, 'admin-detail', id] as const,
}

export function useProductsQuery(params: ProductListParams, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<ProductResponsePagedResult, ApiError>({
    queryKey: productKeys.list(params),
    queryFn: () => productService.listProducts(params),
    // Giữ trang cũ trên màn hình trong lúc tải trang mới / đổi bộ lọc
    placeholderData: keepPreviousData,
    enabled,
  })
}

// Danh mục để chọn sản phẩm (bảng vật tư khảo sát, dòng báo giá): một trang 100 sản phẩm, hằng ở module để khoá cache không đổi
// shortcut: chỉ trang đầu, danh mục quá 100 sản phẩm thì cần ô tìm gọi theo từ khoá
export const CATALOG_PICKER_QUERY = { PageSize: 100, SortBy: 'name', SortDirection: 'asc' } as const
export const useCatalogPickerQuery = () => useProductsQuery(CATALOG_PICKER_QUERY)

export function useProductQuery(id: string | undefined) {
  return useQuery<ProductResponse, ApiError>({
    queryKey: productKeys.detail(id ?? ''),
    queryFn: () => productService.getProduct(id!),
    enabled: Boolean(id),
  })
}

/** Danh sách quản lý (quản trị, quản lý), có cả sản phẩm ngừng bán. Như chi tiết quản trị: không tự làm mới khi quay lại tab */
export function useAdminProductsQuery(params: AdminProductListParams, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<ProductResponsePagedResult, ApiError>({
    queryKey: productKeys.adminList(params),
    queryFn: () => productService.listAdminProducts(params),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled,
  })
}

// Không trả promise để nút bấm không phải chờ tải lại xong
function useInvalidateProducts() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: productKeys.all })
  }
}

export function useCreateProductMutation() {
  const invalidate = useInvalidateProducts()
  return useMutation<ProductResponse, ApiError, CreateProductRequest>({
    mutationFn: (body) => productService.createProduct(body),
    onSettled: invalidate,
  })
}

export function useUpdateProductMutation() {
  const invalidate = useInvalidateProducts()
  return useMutation<ProductResponse, ApiError, { id: string; body: UpdateProductRequest }>({
    mutationFn: ({ id, body }) => productService.updateProduct(id, body),
    onSettled: invalidate,
  })
}

export function useDeleteProductMutation() {
  const invalidate = useInvalidateProducts()
  return useMutation<ProductDeletedResponse, ApiError, string>({
    mutationFn: (id) => productService.deleteProduct(id),
    onSettled: invalidate,
  })
}

export function useChangeProductStatusMutation() {
  const invalidate = useInvalidateProducts()
  return useMutation<ProductResponse, ApiError, { id: string; body: ChangeProductStatusRequest }>({
    mutationFn: ({ id, body }) => productService.changeProductStatus(id, body),
    onSettled: invalidate,
  })
}

/** Chi tiết quản trị: thấy cả sản phẩm ngừng bán. Không tự làm mới khi quay lại tab vì chung giới hạn ghi của danh mục */
export function useAdminProductQuery(id: string | undefined, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<ProductResponse, ApiError>({
    queryKey: productKeys.adminDetail(id ?? ''),
    queryFn: () => productService.getAdminProduct(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

// Ghi ngay sản phẩm backend trả về (ảnh theo thứ tự mới) rồi tải lại danh sách vì ảnh chính là ảnh đại diện trong bảng.
// Lỗi (kể cả 409 ảnh vừa đổi) tải lại chi tiết để người dùng thấy bản mới nhất
function useImageMutation<V extends { id: string }>(mutationFn: (variables: V) => Promise<ProductResponse>) {
  const queryClient = useQueryClient()
  return useMutation<ProductResponse, ApiError, V>({
    mutationFn,
    onSuccess: (product, { id }) => queryClient.setQueryData(productKeys.adminDetail(id), product),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useAddProductImageMutation() {
  return useImageMutation(({ id, body }: { id: string; body: AddProductImageRequest }) =>
    productService.addProductImage(id, body),
  )
}

export function useRemoveProductImageMutation() {
  return useImageMutation(({ id, imageId }: { id: string; imageId: string }) =>
    productService.removeProductImage(id, imageId),
  )
}

export function useReorderProductImagesMutation() {
  return useImageMutation(({ id, imageIds }: { id: string; imageIds: string[] }) =>
    productService.reorderProductImages(id, imageIds),
  )
}

export function useSetPrimaryProductImageMutation() {
  return useImageMutation(({ id, imageId }: { id: string; imageId: string }) =>
    productService.setPrimaryProductImage(id, imageId),
  )
}
