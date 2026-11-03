import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as adminAfterSalesService from '@/services/adminAfterSalesService'
import type { DashboardParams } from '@/services/adminAfterSalesService'
import type { ApiError } from '@/services/api/errors'
import { managerAfterSalesKeys } from '@/hooks/useManagerAfterSales'
import type { PackageRequest, RecordRefundRequest, WarrantyOptionRequest } from '@/types/req/adminAfterSalesReq'
import type { DashboardView, WarrantyOptionView } from '@/types/res/adminAfterSalesRes'
import type { PackageView } from '@/types/res/customerAfterSalesRes'
import type { RefundView } from '@/types/res/managerAfterSalesRes'

export const adminAfterSalesKeys = {
  all: ['admin-after-sales'] as const,
  packages: () => [...adminAfterSalesKeys.all, 'packages'] as const,
  warrantyOptions: () => [...adminAfterSalesKeys.all, 'warranty-options'] as const,
  dashboard: (params: DashboardParams) => [...adminAfterSalesKeys.all, 'dashboard', params] as const,
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

/** Thời hạn bảo hành của cả hai loại, lọc theo loại ở máy */
export function useWarrantyOptionsQuery({ enabled = true }: Options = {}) {
  return useQuery<WarrantyOptionView[], ApiError>({
    queryKey: adminAfterSalesKeys.warrantyOptions(),
    queryFn: () => adminAfterSalesService.listWarrantyOptions(),
    enabled,
  })
}

// Đặt mặc định đổi cả tuỳ chọn khác nên luôn tải lại cả danh sách, kể cả khi lỗi
export function useSaveWarrantyOptionMutation() {
  const queryClient = useQueryClient()
  return useMutation<WarrantyOptionView, ApiError, WarrantyOptionRequest>({
    mutationFn: (body) => adminAfterSalesService.saveWarrantyOption(body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: adminAfterSalesKeys.warrantyOptions() }),
  })
}

// Danh sách hoàn tiền dùng chung với quản lý, báo cáo có số tiền đã hoàn nên cũng tải lại
export function useRecordRefundMutation() {
  const queryClient = useQueryClient()
  return useMutation<RefundView, ApiError, { refundId: string; body: RecordRefundRequest }>({
    mutationFn: ({ refundId, body }) => adminAfterSalesService.recordRefund(refundId, body),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: managerAfterSalesKeys.refunds() })
      void queryClient.invalidateQueries({ queryKey: [...adminAfterSalesKeys.all, 'dashboard'] })
    },
  })
}

/** `enabled` false khi bộ lọc đang sai, để không gọi API với khoảng ngày hỏng. Giữ số liệu cũ trong lúc tải bộ lọc mới */
export function useAfterSalesDashboardQuery(params: DashboardParams, { enabled = true }: Options = {}) {
  return useQuery<DashboardView, ApiError>({
    queryKey: adminAfterSalesKeys.dashboard(params),
    queryFn: () => adminAfterSalesService.getDashboard(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useExportDashboardMutation() {
  return useMutation<string, ApiError, DashboardParams>({
    mutationFn: (params) => adminAfterSalesService.exportDashboard(params),
  })
}
