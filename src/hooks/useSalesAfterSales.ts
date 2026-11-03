import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as salesService from '@/services/salesAfterSalesService'
import type { ApiError } from '@/services/api/errors'
import type { FollowUpRequest, IssueQuotationRequest } from '@/types/req/salesAfterSalesReq'
import type { ServiceRequestView } from '@/types/res/customerAfterSalesRes'
import type { SalesTaskView, WarrantyOptionView } from '@/types/res/salesAfterSalesRes'

// Việc sau bán hàng của kinh doanh. Thao tác xong (kể cả lỗi 409 khi người khác nhận trước) thì tải lại từ server

export const salesAfterSalesKeys = {
  all: ['sales-after-sales'] as const,
  openTasks: () => [...salesAfterSalesKeys.all, 'tasks', 'open'] as const,
  myTasks: () => [...salesAfterSalesKeys.all, 'tasks', 'mine'] as const,
  request: (requestId: string) => [...salesAfterSalesKeys.all, 'request', requestId] as const,
  warrantyOptions: (kind: 'REPAIR' | 'INSTALLATION') => [...salesAfterSalesKeys.all, 'warranty-options', kind] as const,
}

const QUEUE_REFRESH_MS = 60_000

/** `enabled`: menu chỉ gọi khi đã chắc là kinh doanh */
export function useOpenTasksQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<SalesTaskView[], ApiError>({
    queryKey: salesAfterSalesKeys.openTasks(),
    queryFn: salesService.listOpenTasks,
    refetchInterval: QUEUE_REFRESH_MS,
    enabled,
  })
}

export function useMyTasksQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<SalesTaskView[], ApiError>({
    queryKey: salesAfterSalesKeys.myTasks(),
    queryFn: salesService.listMyTasks,
    refetchInterval: QUEUE_REFRESH_MS,
    enabled,
  })
}

export function useSalesServiceRequestQuery(requestId: string | undefined) {
  return useQuery<ServiceRequestView, ApiError>({
    queryKey: salesAfterSalesKeys.request(requestId ?? ''),
    queryFn: () => salesService.getRequest(requestId!),
    enabled: Boolean(requestId),
  })
}

export function useRepairWarrantyOptionsQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<WarrantyOptionView[], ApiError>({
    queryKey: salesAfterSalesKeys.warrantyOptions('REPAIR'),
    queryFn: () => salesService.listWarrantyOptions('REPAIR'),
    enabled,
  })
}

/** Thời hạn bảo hành lắp đặt đang bật, cho hợp đồng. Chỉ kinh doanh gọi được (quản lý, quản trị bị 403) */
export function useInstallationWarrantyOptionsQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<WarrantyOptionView[], ApiError>({
    queryKey: salesAfterSalesKeys.warrantyOptions('INSTALLATION'),
    queryFn: () => salesService.listWarrantyOptions('INSTALLATION'),
    enabled,
  })
}

export function useClaimTaskMutation() {
  const queryClient = useQueryClient()
  return useMutation<SalesTaskView, ApiError, string>({
    mutationFn: salesService.claimTask,
    onSettled: () => queryClient.invalidateQueries({ queryKey: salesAfterSalesKeys.all }),
  })
}

export function useIssueQuotationMutation() {
  const queryClient = useQueryClient()
  return useMutation<ServiceRequestView, ApiError, { requestId: string; body: IssueQuotationRequest }>({
    mutationFn: ({ requestId, body }) => salesService.issueQuotation(requestId, body),
    // Gửi báo giá xong thì việc báo giá cũng xong
    onSettled: () => queryClient.invalidateQueries({ queryKey: salesAfterSalesKeys.all }),
  })
}

/** Bắt đầu việc đã nhận */
export function useStartTaskMutation() {
  const queryClient = useQueryClient()
  return useMutation<SalesTaskView, ApiError, string>({
    mutationFn: salesService.startTask,
    onSettled: () => queryClient.invalidateQueries({ queryKey: salesAfterSalesKeys.all }),
  })
}

/** Ghi một lần liên hệ khách; kết quả cuối thì việc rời danh sách "Của tôi" */
export function useFollowUpMutation() {
  const queryClient = useQueryClient()
  return useMutation<SalesTaskView, ApiError, { taskId: string; body: FollowUpRequest }>({
    mutationFn: ({ taskId, body }) => salesService.recordFollowUp(taskId, body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: salesAfterSalesKeys.all }),
  })
}
