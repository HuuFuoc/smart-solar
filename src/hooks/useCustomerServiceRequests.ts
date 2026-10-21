import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { customerAfterSalesKeys, usePaymentQuery } from '@/hooks/useCustomerAfterSales'
import * as afterSalesService from '@/services/customerAfterSalesService'
import type { ApiError } from '@/services/api/errors'
import type { CreateFaultRequest, OneTimeMaintenanceRequest } from '@/types/req/customerAfterSalesReq'
import type {
  PaymentAttemptView,
  ServiceRequestSummary,
  ServiceRequestView,
  WarrantyView,
} from '@/types/res/customerAfterSalesRes'

// Yêu cầu bảo hành, sửa chữa, bảo trì lẻ của khách. Thao tác xong (kể cả lỗi) thì tải lại từ server, không tự sửa dữ liệu

export const customerServiceKeys = {
  all: ['customer-service-requests'] as const,
  warranty: (projectId: string) => [...customerServiceKeys.all, 'warranty', projectId] as const,
  requests: () => [...customerServiceKeys.all, 'requests'] as const,
  request: (requestId: string) => [...customerServiceKeys.requests(), requestId] as const,
}

export function useWarrantyQuery(projectId: string | undefined) {
  return useQuery<WarrantyView, ApiError>({
    queryKey: customerServiceKeys.warranty(projectId ?? ''),
    queryFn: () => afterSalesService.getWarranty(projectId!),
    enabled: Boolean(projectId),
  })
}

export function useMyServiceRequestsQuery() {
  return useQuery<ServiceRequestSummary[], ApiError>({
    queryKey: customerServiceKeys.requests(),
    queryFn: afterSalesService.listRequests,
  })
}

export function useMyServiceRequestQuery(requestId: string | undefined) {
  return useQuery<ServiceRequestView, ApiError>({
    queryKey: customerServiceKeys.request(requestId ?? ''),
    queryFn: () => afterSalesService.getRequest(requestId!),
    enabled: Boolean(requestId),
  })
}

/** Tải lại danh sách và chi tiết yêu cầu */
function useRefreshRequests() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: customerServiceKeys.requests() })
}

export function useCreateFaultMutation() {
  const refresh = useRefreshRequests()
  return useMutation<ServiceRequestView, ApiError, CreateFaultRequest>({
    mutationFn: afterSalesService.createFault,
    onSettled: refresh,
  })
}

export function useOneTimeMaintenanceMutation() {
  const refresh = useRefreshRequests()
  return useMutation<ServiceRequestView, ApiError, OneTimeMaintenanceRequest>({
    mutationFn: afterSalesService.requestOneTimeMaintenance,
    onSettled: refresh,
  })
}

export function useCancelRequestMutation() {
  const refresh = useRefreshRequests()
  return useMutation<ServiceRequestView, ApiError, { requestId: string; reason: string }>({
    mutationFn: ({ requestId, reason }) => afterSalesService.cancelRequest(requestId, { reason }),
    onSettled: refresh,
  })
}

export function useCompletionMutation() {
  const refresh = useRefreshRequests()
  return useMutation<ServiceRequestView, ApiError, { requestId: string; accept: boolean; reason?: string }>({
    mutationFn: ({ requestId, accept, reason }) =>
      afterSalesService.decideCompletion(requestId, { accept, reason: reason ?? null }),
    onSettled: refresh,
  })
}

export function useConfirmAppointmentMutation() {
  const refresh = useRefreshRequests()
  return useMutation<ServiceRequestView, ApiError, string>({
    mutationFn: afterSalesService.confirmAppointment,
    onSettled: refresh,
  })
}

export function useAcceptQuotationMutation() {
  const refresh = useRefreshRequests()
  return useMutation<ServiceRequestView, ApiError, string>({
    mutationFn: afterSalesService.acceptQuotation,
    onSettled: refresh,
  })
}

export function useRejectQuotationMutation() {
  const refresh = useRefreshRequests()
  return useMutation<ServiceRequestView, ApiError, { quotationId: string; reason: string }>({
    mutationFn: ({ quotationId, reason }) => afterSalesService.rejectQuotation(quotationId, { reason }),
    onSettled: refresh,
  })
}

/** Tạo link PayOS cho báo giá; báo giá có thêm currentPaymentAttemptId nên tải lại yêu cầu */
export function useCheckoutQuotationMutation() {
  const queryClient = useQueryClient()
  const refresh = useRefreshRequests()
  return useMutation<PaymentAttemptView, ApiError, string>({
    mutationFn: afterSalesService.checkoutQuotation,
    onSuccess: (attempt) => queryClient.setQueryData(customerAfterSalesKeys.payment(attempt.paymentAttemptId), attempt),
    onSettled: refresh,
  })
}

/** Link thanh toán của báo giá (hỏi lại 10 giây một lần khi còn chờ). PayOS xác nhận xong thì tải lại yêu cầu */
export function useQuotationPaymentQuery(attemptId: string | null) {
  const queryClient = useQueryClient()
  const query = usePaymentQuery(attemptId)
  const status = query.data?.status
  useEffect(() => {
    if (status === 'PAID') void queryClient.invalidateQueries({ queryKey: customerServiceKeys.requests() })
  }, [status, queryClient])
  return query
}
