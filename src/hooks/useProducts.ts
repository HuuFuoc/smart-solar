import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as productService from '@/services/productService'
import type { ProductListParams } from '@/services/productService'
import type {
  ChangeProductStatusRequest,
  CreateProductRequest,
  UpdateProductRequest,
} from '@/types/req/adminProductsReq'
import type { ProductDeletedResponse, ProductResponse } from '@/types/res/adminProductsRes'
import type { ProductResponsePagedResult } from '@/types/res/productsRes'
import type { ApiError } from '@/services/api/errors'

// Mọi thao tác ghi (kể cả lỗi) đều làm mới danh sách và chi tiết

export const productKeys = {
  all: ['products'] as const,
  list: (params: ProductListParams) => [...productKeys.all, 'list', params] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
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

export function useProductQuery(id: string | undefined) {
  return useQuery<ProductResponse, ApiError>({
    queryKey: productKeys.detail(id ?? ''),
    queryFn: () => productService.getProduct(id!),
    enabled: Boolean(id),
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
