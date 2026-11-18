import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { contractKeys } from '@/hooks/useContracts'
import { installationScheduleKeys } from '@/hooks/useInstallationSchedules'
import * as desk from '@/services/paymentDeskService'
import type { PaymentDeskFilter } from '@/services/paymentDeskService'
import type { ApiError } from '@/services/api/errors'
import type { CashConfirmationRequest } from '@/types/req/staffPaymentsReq'
import type { PagedResult } from '@/types/res/adminSystemSettingsRes'
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
}

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

/** Xác nhận xong (kể cả lỗi lần thanh toán đã đổi) thì tải lại bàn thu tiền, hợp đồng và lịch thi công */
export function useConfirmAttemptCashMutation() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, { attemptId: string; body: CashConfirmationRequest }>({
    mutationFn: ({ attemptId, body }) => desk.confirmCash(attemptId, body),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: paymentDeskKeys.all }),
        queryClient.invalidateQueries({ queryKey: contractKeys.all }),
        queryClient.invalidateQueries({ queryKey: installationScheduleKeys.all }),
      ]),
  })
}
