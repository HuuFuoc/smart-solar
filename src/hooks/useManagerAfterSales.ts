import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as managerService from '@/services/managerAfterSalesService'
import type { ApiError } from '@/services/api/errors'
import type {
  CancellationDecisionRequest,
  CoverageRequest,
  DisputeReviewRequest,
  ScheduleVisitRequest,
} from '@/types/req/managerAfterSalesReq'
import type { ServiceRequestSummary, ServiceRequestView } from '@/types/res/customerAfterSalesRes'

// Yêu cầu bảo hành, sửa chữa, bảo trì phía quản lý / quản trị. Không tự gửi lại khi bị 409: tải lại rồi để người dùng làm lại

export const managerAfterSalesKeys = {
  all: ['manager-after-sales'] as const,
  requests: () => [...managerAfterSalesKeys.all, 'requests'] as const,
  request: (requestId: string) => [...managerAfterSalesKeys.requests(), requestId] as const,
}

/** `enabled`: menu chỉ gọi khi đã chắc là quản lý / quản trị */
export function useServiceRequestsQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<ServiceRequestSummary[], ApiError>({
    queryKey: managerAfterSalesKeys.requests(),
    queryFn: managerService.listRequests,
    refetchInterval: 60_000,
    enabled,
  })
}

export function useServiceRequestQuery(requestId: string | undefined) {
  return useQuery<ServiceRequestView, ApiError>({
    queryKey: managerAfterSalesKeys.request(requestId ?? ''),
    queryFn: () => managerService.getRequest(requestId!),
    enabled: Boolean(requestId),
  })
}

/** Mutation trên một yêu cầu; xong thì tải lại danh sách và chi tiết */
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
