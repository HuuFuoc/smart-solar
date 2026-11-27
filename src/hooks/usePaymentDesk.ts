import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { adminFinanceKeys } from '@/hooks/useAdminFinance'
import { contractKeys } from '@/hooks/useContracts'
import { installationScheduleKeys } from '@/hooks/useInstallationSchedules'
import { managerAfterSalesKeys } from '@/hooks/useManagerAfterSales'
import { paymentPlanKeys } from '@/hooks/paymentPlanKeys'
import * as desk from '@/services/paymentDeskService'
import type { CashReceiptFilter, PaymentDeskFilter } from '@/services/paymentDeskService'
import type { ApiError } from '@/services/api/errors'
import type { CashReceiptReviewRequest } from '@/types/req/cashReceiptsReq'
import type { CashConfirmationRequest } from '@/types/req/staffPaymentsReq'
import type { PagedResult } from '@/types/res/adminSystemSettingsRes'
import type { StaffCashReceiptDetail, StaffCashReceiptView } from '@/types/res/cashReceiptsRes'
import type { UnappliedMoneyView } from '@/types/res/managerAfterSalesRes'
import type { StaffPaymentAttemptView } from '@/types/res/staffPaymentsRes'

const PENDING_CASH: PaymentDeskFilter = {
  method: 'CASH',
  status: 'PENDING',
  from: null,
  to: null,
  page: 1,
  pageSize: 1,
}

export const paymentDeskKeys = {
  all: ['payment-desk'] as const,
  list: (f: PaymentDeskFilter) => [...paymentDeskKeys.all, 'list', f] as const,
  unapplied: (status: string | null, page: number, pageSize: number) =>
    [...paymentDeskKeys.all, 'unapplied', status ?? 'ALL', page, pageSize] as const,
  receipts: (f: CashReceiptFilter) => [...paymentDeskKeys.all, 'cash-receipts', f] as const,
  receipt: (receiptId: string) => [...paymentDeskKeys.all, 'cash-receipt', receiptId] as const,
}

/** Phiếu chờ duyệt; một trang 100 dòng (tối đa của backend) đủ để biết lần tiền mặt nào đang có phiếu */
const SUBMITTED_RECEIPTS: CashReceiptFilter = { status: 'SUBMITTED', kind: null, page: 1, pageSize: 100 }

/** Giữ trang cũ trong lúc tải trang mới để bảng không nháy; hỏi lại mỗi phút vì khách chọn tiền mặt lúc nào cũng được */
export function usePaymentDeskQuery(filter: PaymentDeskFilter, { enabled = true } = {}) {
  return useQuery<PagedResult<StaffPaymentAttemptView>, ApiError>({
    queryKey: paymentDeskKeys.list(filter),
    queryFn: () => desk.listPayments(filter),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
    enabled,
  })
}

/** Số lần trả tiền mặt chờ xác nhận (số đỏ ở menu): một dòng là đủ vì backend trả `totalItems`, hỏi lại mỗi phút */
export function usePendingCashCount({ enabled = true } = {}) {
  return useQuery<PagedResult<StaffPaymentAttemptView>, ApiError, number>({
    queryKey: paymentDeskKeys.list(PENDING_CASH),
    queryFn: () => desk.listPayments(PENDING_CASH),
    select: (d) => d.totalItems,
    refetchInterval: 60_000,
    enabled,
  })
}

export function useUnappliedMoneyQuery(status: string | null, page: number, pageSize: number) {
  return useQuery<PagedResult<UnappliedMoneyView>, ApiError>({
    queryKey: paymentDeskKeys.unapplied(status, page, pageSize),
    queryFn: () => desk.listUnappliedMoney(status, page, pageSize),
    placeholderData: keepPreviousData,
  })
}

/** Tiền đã thu thì bàn thu tiền, hợp đồng, lịch thi công, khoản 30/70, báo cáo tài chính và yêu cầu hậu mãi đều đổi theo */
function invalidateAfterCash(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: paymentDeskKeys.all }),
    queryClient.invalidateQueries({ queryKey: contractKeys.all }),
    queryClient.invalidateQueries({ queryKey: installationScheduleKeys.all }),
    queryClient.invalidateQueries({ queryKey: paymentPlanKeys.all }),
    queryClient.invalidateQueries({ queryKey: adminFinanceKeys.all }),
    queryClient.invalidateQueries({ queryKey: managerAfterSalesKeys.all }),
  ])
}

/** Xác nhận xong (kể cả lỗi lần thanh toán đã đổi) thì tải lại mọi thứ phụ thuộc tiền */
export function useConfirmAttemptCashMutation() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, { attemptId: string; body: CashConfirmationRequest }>({
    mutationFn: ({ attemptId, body }) => desk.confirmCash(attemptId, body),
    onSettled: () => invalidateAfterCash(queryClient),
  })
}

/** Hàng đợi phiếu thu theo bộ lọc; hỏi lại mỗi phút vì kỹ thuật viên gửi phiếu lúc nào cũng được */
export function useCashReceiptsQuery(filter: CashReceiptFilter) {
  return useQuery<PagedResult<StaffCashReceiptView>, ApiError>({
    queryKey: paymentDeskKeys.receipts(filter),
    queryFn: () => desk.listCashReceipts(filter),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })
}

/** Lần tiền mặt đang có phiếu chờ duyệt (mã lần thanh toán → mã phiếu): bàn thu tiền mở phiếu thay vì xác nhận thẳng */
export function useSubmittedReceiptByAttempt({ enabled = true } = {}) {
  return useQuery<PagedResult<StaffCashReceiptView>, ApiError, Map<string, string>>({
    queryKey: paymentDeskKeys.receipts(SUBMITTED_RECEIPTS),
    queryFn: () => desk.listCashReceipts(SUBMITTED_RECEIPTS),
    select: (d) => new Map(d.items.map((r) => [r.receipt.paymentAttemptId, r.receipt.cashReceiptId])),
    refetchInterval: 60_000,
    enabled,
  })
}

/** Số phiếu chờ duyệt (số đỏ của mục Phiếu thu) */
export function useSubmittedReceiptCount() {
  return useQuery<PagedResult<StaffCashReceiptView>, ApiError, number>({
    queryKey: paymentDeskKeys.receipts(SUBMITTED_RECEIPTS),
    queryFn: () => desk.listCashReceipts(SUBMITTED_RECEIPTS),
    select: (d) => d.totalItems,
    refetchInterval: 60_000,
  })
}

/** Chi tiết luôn đọc mới (revision dùng để duyệt) */
export function useCashReceiptQuery(receiptId: string) {
  return useQuery<StaffCashReceiptDetail, ApiError>({
    queryKey: paymentDeskKeys.receipt(receiptId),
    queryFn: () => desk.getCashReceipt(receiptId),
    staleTime: 0,
  })
}

/** Duyệt / yêu cầu bổ sung: xong (kể cả lỗi bản đã cũ) thì tải lại phiếu, hàng đợi và mọi thứ phụ thuộc tiền */
export function useReviewCashReceiptMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    unknown,
    ApiError,
    { receiptId: string; action: 'accept' | 'reject'; body: CashReceiptReviewRequest }
  >({
    mutationFn: ({ receiptId, action, body }) =>
      action === 'accept' ? desk.acceptCashReceipt(receiptId, body) : desk.rejectCashReceipt(receiptId, body),
    onSettled: () => invalidateAfterCash(queryClient),
  })
}
