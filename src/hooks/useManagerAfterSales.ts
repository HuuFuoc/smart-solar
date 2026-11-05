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
  PackageCancellationDecisionRequest,
  RefundDecisionRequest,
  ScheduleVisitRequest,
  StopWorkRequest,
} from '@/types/req/managerAfterSalesReq'
import type { WarrantyActivationBody } from '@/services/managerAfterSalesService'
import type {
  InstalledAssetView,
  ServiceRequestSummary,
  ServiceRequestView,
  SubscriptionView,
} from '@/types/res/customerAfterSalesRes'
import type { ManagerSubscriptionView, RefundView, SalesAssigneeView } from '@/types/res/managerAfterSalesRes'
import type { SalesTaskView } from '@/types/res/salesAfterSalesRes'

// Yêu cầu bảo hành, sửa chữa, bảo trì phía quản lý / quản trị. Không tự gửi lại khi bị 409: tải lại rồi để người dùng làm lại

export const managerAfterSalesKeys = {
  all: ['manager-after-sales'] as const,
  requests: () => [...managerAfterSalesKeys.all, 'requests'] as const,
  request: (requestId: string) => [...managerAfterSalesKeys.requests(), requestId] as const,
  refunds: () => [...managerAfterSalesKeys.all, 'refunds'] as const,
  tasks: (status?: string) => [...managerAfterSalesKeys.all, 'tasks', status ?? 'all'] as const,
  subscriptions: () => [...managerAfterSalesKeys.all, 'subscriptions'] as const,
  subscription: (subscriptionId: string) =>
    [...managerAfterSalesKeys.subscriptions(), 'detail', subscriptionId] as const,
  salesAssignees: () => [...managerAfterSalesKeys.all, 'sales-assignees'] as const,
}

type Options = { enabled?: boolean }

/** Mọi khoản hoàn tiền, lọc theo trạng thái ở máy để có số đếm từng nhóm. Dùng chung cho quản lý và quản trị */
export function useRefundsQuery({ enabled = true }: Options = {}) {
  return useQuery<RefundView[], ApiError>({
    queryKey: managerAfterSalesKeys.refunds(),
    queryFn: () => managerService.listRefunds(),
    enabled,
  })
}

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

/**
 * Mutation trên một yêu cầu; xong (kể cả lỗi) thì tải lại danh sách và chi tiết. `touchesRefunds`: lệnh có thể sinh khoản
 * hoàn tiền nên tải lại cả danh sách hoàn tiền
 */
function useRequestMutation<Body>(
  action: (requestId: string, body: Body) => Promise<ServiceRequestView>,
  { touchesRefunds = false } = {},
) {
  const queryClient = useQueryClient()
  return useMutation<ServiceRequestView, ApiError, { requestId: string; body: Body }>({
    mutationFn: ({ requestId, body }) => action(requestId, body),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: managerAfterSalesKeys.requests() })
      if (touchesRefunds) void queryClient.invalidateQueries({ queryKey: managerAfterSalesKeys.refunds() })
    },
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
  return useRequestMutation<CancellationDecisionRequest>(managerService.decideCancellation, { touchesRefunds: true })
}

export function useDecideClaimMutation() {
  return useRequestMutation<DecisionRequest>(managerService.decideClaim)
}

export function useMarkDuplicateMutation() {
  return useRequestMutation<DuplicateRequest>(managerService.markDuplicate)
}

export function useStopWorkMutation() {
  return useRequestMutation<StopWorkRequest>(managerService.stopWork, { touchesRefunds: true })
}

export function useMarkNotFulfilledMutation() {
  return useRequestMutation<AfterSalesReasonRequest>(managerService.markNotFulfilled, { touchesRefunds: true })
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

/** Gói đang chờ xét huỷ, cũ nhất trước. `enabled`: menu chỉ gọi khi đã chắc là quản lý / quản trị */
export function usePackageCancellationsQuery({ enabled = true }: Options = {}) {
  return useQuery<ManagerSubscriptionView[], ApiError>({
    queryKey: managerAfterSalesKeys.subscriptions(),
    queryFn: () => managerService.listSubscriptions('CANCELLATION_REQUESTED'),
    refetchInterval: 60_000,
    enabled,
  })
}

export function useManagerSubscriptionQuery(subscriptionId: string | undefined) {
  return useQuery<ManagerSubscriptionView, ApiError>({
    queryKey: managerAfterSalesKeys.subscription(subscriptionId ?? ''),
    queryFn: () => managerService.getSubscription(subscriptionId!),
    enabled: Boolean(subscriptionId),
  })
}

/** Quyết định xong (kể cả lỗi: người khác vừa quyết định) thì tải lại hàng chờ, chi tiết và hoàn tiền (duyệt huỷ tạo khoản hoàn) */
export function useDecidePackageCancellationMutation() {
  const queryClient = useQueryClient()
  return useMutation<SubscriptionView, ApiError, { subscriptionId: string; body: PackageCancellationDecisionRequest }>({
    mutationFn: ({ subscriptionId, body }) => managerService.decidePackageCancellation(subscriptionId, body),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: managerAfterSalesKeys.subscriptions() })
      void queryClient.invalidateQueries({ queryKey: managerAfterSalesKeys.refunds() })
    },
  })
}

/** Người nhận việc chọn được (kinh doanh đang hoạt động); dùng chung cổng quản lý và quản trị */
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

export function useDecideRefundMutation() {
  const queryClient = useQueryClient()
  return useMutation<RefundView, ApiError, { refundId: string; body: RefundDecisionRequest }>({
    mutationFn: ({ refundId, body }) => managerService.decideRefund(refundId, body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: managerAfterSalesKeys.refunds() }),
  })
}

export function useRecordWarrantyActivationMutation() {
  return useMutation<InstalledAssetView, ApiError, { assetId: string; body: WarrantyActivationBody }>({
    mutationFn: ({ assetId, body }) => managerService.recordWarrantyActivation(assetId, body),
  })
}
