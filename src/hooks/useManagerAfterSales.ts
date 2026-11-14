import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as managerService from '@/services/managerAfterSalesService'
import type { ApiError } from '@/services/api/errors'
import { managerInstallationKeys } from '@/hooks/useManagerInstallations'
import type { AfterSalesReasonRequest } from '@/types/req/customerAfterSalesReq'
import type {
  AssetCorrectionRequest,
  AssignTaskRequest,
  CancellationDecisionRequest,
  CoverageRequest,
  DecisionRequest,
  DisputeReviewRequest,
  DuplicateRequest,
  ScheduleVisitRequest,
  StopWorkRequest,
} from '@/types/req/managerAfterSalesReq'
import type { WarrantyActivationBody } from '@/services/managerAfterSalesService'
import type { InstalledAssetView, ServiceRequestSummary, ServiceRequestView } from '@/types/res/customerAfterSalesRes'
import type { SalesAssigneeView } from '@/types/res/managerAfterSalesRes'
import type { SalesTaskView } from '@/types/res/salesAfterSalesRes'

// Yêu cầu bảo hành, sửa chữa, bảo trì phía quản lý / quản trị. Không tự gửi lại khi bị 409: tải lại rồi để người dùng làm lại

export const managerAfterSalesKeys = {
  all: ['manager-after-sales'] as const,
  requests: () => [...managerAfterSalesKeys.all, 'requests'] as const,
  request: (requestId: string) => [...managerAfterSalesKeys.requests(), requestId] as const,
  tasks: (status?: string) => [...managerAfterSalesKeys.all, 'tasks', status ?? 'all'] as const,
  salesAssignees: () => [...managerAfterSalesKeys.all, 'sales-assignees'] as const,
}

type Options = { enabled?: boolean }

/** `enabled`: menu chỉ gọi khi đã chắc là quản lý / quản trị */
export function useServiceRequestsQuery({ enabled = true }: Options = {}) {
  return useQuery<ServiceRequestSummary[], ApiError>({
    queryKey: managerAfterSalesKeys.requests(),
    queryFn: managerService.listRequests,
    refetchInterval: 60_000,
    enabled,
  })
}

export function useServiceRequestQuery(requestId: string | undefined | null) {
  return useQuery<ServiceRequestView, ApiError>({
    queryKey: managerAfterSalesKeys.request(requestId ?? ''),
    queryFn: () => managerService.getRequest(requestId!),
    enabled: Boolean(requestId),
  })
}

/** Hàng việc của kinh doanh, `status` gửi thẳng lên backend (không truyền là mọi trạng thái) */
export function useSalesTasksQuery(status?: string, { enabled = true }: Options = {}) {
  return useQuery<SalesTaskView[], ApiError>({
    queryKey: managerAfterSalesKeys.tasks(status),
    queryFn: () => managerService.listTasks(status),
    refetchInterval: 60_000,
    enabled,
  })
}

/** Mutation trên một yêu cầu; xong (kể cả lỗi) thì tải lại danh sách và chi tiết */
function useRequestMutation<Body>(action: (requestId: string, body: Body) => Promise<ServiceRequestView>) {
  const queryClient = useQueryClient()
  return useMutation<ServiceRequestView, ApiError, { requestId: string; body: Body }>({
    mutationFn: ({ requestId, body }) => action(requestId, body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: managerAfterSalesKeys.requests() }),
  })
}

export function useScheduleVisitMutation() {
  return useRequestMutation<ScheduleVisitRequest>(managerService.scheduleVisit)
}

export function useDecideCoverageMutation() {
  return useRequestMutation<CoverageRequest>(managerService.decideCoverage)
}

export function useReviewDisputeMutation() {
  return useRequestMutation<DisputeReviewRequest>(managerService.reviewDispute)
}

export function useDecideCancellationMutation() {
  return useRequestMutation<CancellationDecisionRequest>(managerService.decideCancellation)
}

export function useDecideClaimMutation() {
  return useRequestMutation<DecisionRequest>(managerService.decideClaim)
}

export function useMarkDuplicateMutation() {
  return useRequestMutation<DuplicateRequest>(managerService.markDuplicate)
}

export function useStopWorkMutation() {
  return useRequestMutation<StopWorkRequest>(managerService.stopWork)
}

export function useMarkNotFulfilledMutation() {
  return useRequestMutation<AfterSalesReasonRequest>(managerService.markNotFulfilled)
}

/** Thiết bị đọc từ chi tiết công trình, nên tải lại công trình và yêu cầu */
export function useCorrectAssetMutation() {
  const queryClient = useQueryClient()
  return useMutation<InstalledAssetView, ApiError, { assetId: string; body: AssetCorrectionRequest }>({
    mutationFn: ({ assetId, body }) => managerService.correctAsset(assetId, body),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: managerInstallationKeys.all })
      void queryClient.invalidateQueries({ queryKey: managerAfterSalesKeys.requests() })
    },
  })
}

/**
 * Người nhận việc chọn được (kinh doanh đang hoạt động). Backend chỉ có danh sách tài khoản cho quản trị, nên cổng quản lý
 * không tải (và không giao việc được)
 */
export function useSalesAssigneesQuery({ enabled = true }: Options = {}) {
  return useQuery<SalesAssigneeView[], ApiError>({
    queryKey: managerAfterSalesKeys.salesAssignees(),
    queryFn: managerService.listSalesAssignees,
    enabled,
  })
}

/** Giao / giao lại: tải lại mọi bộ lọc của hàng việc (kể cả khi lỗi, vd. người khác vừa nhận) */
export function useAssignTaskMutation() {
  const queryClient = useQueryClient()
  return useMutation<SalesTaskView, ApiError, { taskId: string; body: AssignTaskRequest }>({
    mutationFn: ({ taskId, body }) => managerService.assignTask(taskId, body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...managerAfterSalesKeys.all, 'tasks'] }),
  })
}

export function useRecordWarrantyActivationMutation() {
  return useMutation<InstalledAssetView, ApiError, { assetId: string; body: WarrantyActivationBody }>({
    mutationFn: ({ assetId, body }) => managerService.recordWarrantyActivation(assetId, body),
  })
}
