import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as adminAfterSalesService from '@/services/adminAfterSalesService'
import type { ApiError } from '@/services/api/errors'
import type { PackageRequest } from '@/types/req/adminAfterSalesReq'
import type { PackageView } from '@/types/res/customerAfterSalesRes'

export const adminAfterSalesKeys = {
  all: ['admin-after-sales'] as const,
  packages: () => [...adminAfterSalesKeys.all, 'packages'] as const,
}

type Options = { enabled?: boolean }

/** Mọi gói của mọi loại, lọc theo loại ở máy (vài chục gói, backend không phân trang) */
export function useAdminPackagesQuery({ enabled = true }: Options = {}) {
  return useQuery<PackageView[], ApiError>({
    queryKey: adminAfterSalesKeys.packages(),
    queryFn: () => adminAfterSalesService.listPackages(),
    enabled,
  })
}

// Ghi ngay gói backend trả về vào danh sách để thao tác kế tiếp (vd. Hoàn tác) gửi đúng revision mới, rồi tải lại
// danh sách. Lỗi (kể cả 409 revision cũ) cũng tải lại để người dùng thấy bản mới nhất
function usePackageMutation<V>(mutationFn: (variables: V) => Promise<PackageView>) {
  const queryClient = useQueryClient()
  return useMutation<PackageView, ApiError, V>({
    mutationFn,
    onSuccess: (view) =>
      queryClient.setQueryData<PackageView[]>(adminAfterSalesKeys.packages(), (list) =>
        list?.some((p) => p.packageId === view.packageId)
          ? list.map((p) => (p.packageId === view.packageId ? view : p))
          : list && [...list, view],
      ),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: adminAfterSalesKeys.all }),
  })
}

export function useCreatePackageMutation() {
  return usePackageMutation((body: PackageRequest) => adminAfterSalesService.createPackage(body))
}

export function useUpdatePackageMutation() {
  return usePackageMutation(({ id, body }: { id: string; body: PackageRequest }) =>
    adminAfterSalesService.updatePackage(id, body),
  )
}
