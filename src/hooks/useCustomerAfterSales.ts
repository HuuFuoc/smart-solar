import type { PurchaseRequest } from '@/types/req/customerAfterSalesReq'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { PAYABLE_ATTEMPT_STATUSES } from '@/common/afterSales'
import { customerContractKeys } from '@/hooks/useCustomerContracts'
import * as afterSalesService from '@/services/customerAfterSalesService'
import type { ApiError } from '@/services/api/errors'
import type {
  PackageView,
  PanelEligibilityView,
  PaymentAttemptView,
  PurchaseView,
  ServicePackageKind,
  SubscriptionView,
} from '@/types/res/customerAfterSalesRes'

// Gói dịch vụ của khách. Không cập nhật lạc quan: mua / huỷ xong (kể cả lỗi) tải lại gói đã mua từ server, vì backend
// có thể đã ghi đơn dù không tạo được link PayOS. Link thanh toán được hỏi lại định kỳ khi còn chờ trả tiền

export const customerAfterSalesKeys = {
  all: ['customer-after-sales'] as const,
  packages: (kind: ServicePackageKind) => [...customerAfterSalesKeys.all, 'packages', kind] as const,
  subscriptions: () => [...customerAfterSalesKeys.all, 'subscriptions'] as const,
  payment: (attemptId: string) => [...customerAfterSalesKeys.all, 'payment', attemptId] as const,
  panelCoverage: (contractId: string) => [...customerAfterSalesKeys.all, 'panel-coverage', contractId] as const,
}

// Backend giới hạn 30 lần xem trạng thái thanh toán mỗi phút, 10 giây một lần là đủ xa
const PAYMENT_POLL_MS = 10_000

const isPayable = (status: string | undefined) => status !== undefined && PAYABLE_ATTEMPT_STATUSES.includes(status)

export function usePackagesQuery(kind: ServicePackageKind) {
  return useQuery<PackageView[], ApiError>({
    queryKey: customerAfterSalesKeys.packages(kind),
    queryFn: () => afterSalesService.listPackages(kind),
  })
}

export function useSubscriptionsQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<SubscriptionView[], ApiError>({
    queryKey: customerAfterSalesKeys.subscriptions(),
    queryFn: afterSalesService.listSubscriptions,
    // Tự tải lại để số đỏ trên menu cập nhật
    refetchInterval: 60_000,
    enabled,
  })
}

export function usePurchaseMutation() {
  const queryClient = useQueryClient()
  return useMutation<PurchaseView, ApiError, PurchaseRequest>({
    mutationFn: afterSalesService.purchase,
    onSuccess: (view) =>
      queryClient.setQueryData(customerAfterSalesKeys.payment(view.checkout.paymentAttemptId), view.checkout),
    // Lỗi gói ngừng bán / hợp đồng đã thanh toán / tấm pin vừa có người mua cũng cần danh sách mới (kể cả số tấm còn mua được)
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: customerAfterSalesKeys.all }),
        queryClient.invalidateQueries({ queryKey: customerContractKeys.all }),
      ]),
  })
}

/**
 * Tấm pin và số tấm còn mua được của một hợp đồng (gói PER_PANEL). Không tự tải lại theo giờ: tải lại khi mua xong, khi link thanh
 * toán đã xong và khi bấm thử lại
 */
export function usePanelCoverageQuery(
  contractId: string | null | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery<PanelEligibilityView, ApiError>({
    queryKey: customerAfterSalesKeys.panelCoverage(contractId ?? ''),
    queryFn: () => afterSalesService.getPanelCoverage(contractId!),
    enabled: enabled && Boolean(contractId),
  })
}

type CancelVars = { subscriptionId: string; reason: string }

export function useCancelSubscriptionMutation() {
  const queryClient = useQueryClient()
  return useMutation<SubscriptionView, ApiError, CancelVars>({
    mutationFn: ({ subscriptionId, reason }) => afterSalesService.cancelSubscription(subscriptionId, { reason }),
    // Huỷ đơn chưa trả tiền cũng huỷ link PayOS của nó
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: customerAfterSalesKeys.subscriptions() }),
        queryClient.invalidateQueries({ queryKey: [...customerAfterSalesKeys.all, 'payment'] }),
      ]),
  })
}

/**
 * Trạng thái một link thanh toán. Hỏi lại mỗi 10 giây khi link còn chờ trả tiền (backend đối soát với PayOS, không tin
 * trang PayOS chuyển về). Link hết chờ thì tải lại gói đã mua và hợp đồng vì backend vừa đổi trạng thái của chúng
 */
export function usePaymentQuery(attemptId: string | null) {
  const queryClient = useQueryClient()
  const query = useQuery<PaymentAttemptView, ApiError>({
    queryKey: customerAfterSalesKeys.payment(attemptId ?? ''),
    queryFn: () => afterSalesService.getPayment(attemptId!),
    enabled: Boolean(attemptId),
    // Tiền mặt chỉ đổi khi nhân viên xác nhận, hỏi thưa hơn để không tốn hạn mức gọi
    refetchInterval: (q) =>
      isPayable(q.state.data?.status) ? (q.state.data?.method === 'CASH' ? 60_000 : PAYMENT_POLL_MS) : false,
  })
  const status = query.data?.status
  const settled = status !== undefined && !isPayable(status)
  useEffect(() => {
    if (!settled) return
    void queryClient.invalidateQueries({ queryKey: customerAfterSalesKeys.subscriptions() })
    void queryClient.invalidateQueries({ queryKey: [...customerAfterSalesKeys.all, 'panel-coverage'] })
    void queryClient.invalidateQueries({ queryKey: customerContractKeys.all })
  }, [settled, status, queryClient])
  return query
}
