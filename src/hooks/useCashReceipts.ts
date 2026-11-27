import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import {
  pollWithBackoff,
  RECEIPT_QUEUE_POLL_MS,
  retryDelayMs,
  retryReceiptRead,
} from '@/features/cash-receipts/cashReceiptRules'
import { adminFinanceKeys } from '@/hooks/useAdminFinance'
import { cashReceiptKeys } from '@/hooks/cashReceiptKeys'
import { paymentPlanKeys } from '@/hooks/paymentPlanKeys'
import { useRefreshContractWorld } from '@/hooks/usePaymentPlan'
import type { ApiError } from '@/services/api/errors'
import * as service from '@/services/cashReceiptService'
import type { InstallmentTarget } from '@/services/installmentService'
import type {
  CashReceiptAcceptRequest,
  CashReceiptQuery,
  CashReceiptRejectRequest,
  CashReceiptSubmitRequest,
} from '@/types/req/paymentPlanReq'
import type { PaymentAttemptView } from '@/types/res/customerAfterSalesRes'
import type {
  CashReceiptView,
  InstallmentPaymentView,
  PagedResult,
  StaffCashReceiptDetail,
  StaffCashReceiptView,
} from '@/types/res/paymentPlanRes'

// Phiếu thu tiền mặt (backend 147c66e). Không cập nhật lạc quan: khoản chỉ thành đã trả khi backend trả PAID. Mọi lệnh ghi xong (kể
// cả lỗi, vì trạng thái có thể đã đổi) thì tải lại khoản, hợp đồng, bàn thu tiền, hàng chờ phiếu thu. Rời trang hoặc ẩn tab thì
// react-query tự dừng hỏi lại; hai lần hỏi cùng khoá không chồng nhau

export { cashReceiptKeys }

/** Khoá chung của hai lệnh xét duyệt: đang gửi lệnh nào thì khoá cả hai nút */
export const REVIEW_MUTATION_KEY = [...cashReceiptKeys.all, 'review'] as const

const PENDING_COUNT_QUERY: CashReceiptQuery = { status: 'SUBMITTED', page: 1, pageSize: 1 }
const PENDING_COUNT_POLL_MS = 60_000

/** Tải lại mọi thứ đổi theo một phiếu thu (hàm ổn định giữa các lần vẽ) */
function useRefreshReceiptWorld() {
  const queryClient = useQueryClient()
  const refreshContract = useRefreshContractWorld()
  return useCallback(
    () =>
      Promise.all([
        refreshContract(),
        queryClient.invalidateQueries({ queryKey: cashReceiptKeys.all }),
        queryClient.invalidateQueries({ queryKey: adminFinanceKeys.all }),
      ]),
    [queryClient, refreshContract],
  )
}

/** Hàng chờ phân trang ở backend; giữ trang cũ trong lúc tải trang mới để bảng không nháy */
export function useCashReceiptQueueQuery(query: CashReceiptQuery, { enabled = true, poll = true } = {}) {
  return useQuery<PagedResult<StaffCashReceiptView>, ApiError>({
    queryKey: cashReceiptKeys.queue(query),
    queryFn: () => service.listCashReceipts(query),
    placeholderData: keepPreviousData,
    enabled,
    refetchInterval: (q) => pollWithBackoff(poll ? RECEIPT_QUEUE_POLL_MS : false, q.state.error),
    retry: retryReceiptRead,
    retryDelay: retryDelayMs,
  })
}

/** Số phiếu chờ xác nhận (số đỏ ở menu): một dòng là đủ vì backend trả `totalItems`. Máy chủ cũ (404) thì không hiện số */
export function usePendingCashReceiptCount({ enabled = true } = {}) {
  return useQuery<PagedResult<StaffCashReceiptView>, ApiError, number>({
    queryKey: cashReceiptKeys.pendingCount(),
    queryFn: () => service.listCashReceipts(PENDING_COUNT_QUERY),
    select: (d) => d.totalItems,
    enabled,
    refetchInterval: (q) => pollWithBackoff(PENDING_COUNT_POLL_MS, q.state.error),
    retry: false,
  })
}

/** Chi tiết một phiếu; còn chờ xác nhận thì hỏi lại để thấy người khác vừa xét duyệt */
export function useCashReceiptDetailQuery(receiptId: string | undefined) {
  return useQuery<StaffCashReceiptDetail, ApiError>({
    queryKey: cashReceiptKeys.detail(receiptId ?? ''),
    queryFn: () => service.getCashReceipt(receiptId!),
    enabled: Boolean(receiptId),
    refetchInterval: (q) =>
      pollWithBackoff(
        q.state.data?.current.receipt.status === 'SUBMITTED' ? RECEIPT_QUEUE_POLL_MS : false,
        q.state.error,
      ),
    retry: retryReceiptRead,
    retryDelay: retryDelayMs,
  })
}

/** Kỹ thuật viên gửi phiếu thu. Thành công thì vẽ ngay khoản backend trả về (SUBMITTED), rồi tải lại phần liên quan */
export function useSubmitCashReceiptMutation() {
  const queryClient = useQueryClient()
  const refresh = useRefreshReceiptWorld()
  return useMutation<InstallmentPaymentView, ApiError, { target: InstallmentTarget; body: CashReceiptSubmitRequest }>({
    mutationFn: ({ target, body }) => service.submitCashReceipt(target, body),
    onSuccess: (view, { target }) =>
      queryClient.setQueryData(paymentPlanKeys.installment('technician', target.contractId, target.sequence), view),
    onSettled: refresh,
  })
}

export function useAcceptCashReceiptMutation() {
  const refresh = useRefreshReceiptWorld()
  return useMutation<PaymentAttemptView, ApiError, { receiptId: string; body: CashReceiptAcceptRequest }>({
    mutationKey: REVIEW_MUTATION_KEY,
    mutationFn: ({ receiptId, body }) => service.acceptCashReceipt(receiptId, body),
    onSettled: refresh,
  })
}

export function useRejectCashReceiptMutation() {
  const refresh = useRefreshReceiptWorld()
  return useMutation<CashReceiptView, ApiError, { receiptId: string; body: CashReceiptRejectRequest }>({
    mutationKey: REVIEW_MUTATION_KEY,
    mutationFn: ({ receiptId, body }) => service.rejectCashReceipt(receiptId, body),
    onSettled: refresh,
  })
}
