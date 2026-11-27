import type { CashReceiptQuery } from '@/types/req/paymentPlanReq'

// Khoá cache của phiếu thu tiền mặt, tách riêng để useRefreshContractWorld tải lại hàng chờ mà không import vòng với useCashReceipts

export const cashReceiptKeys = {
  all: ['cash-receipts'] as const,
  queue: (query: CashReceiptQuery) => [...cashReceiptKeys.all, 'queue', query] as const,
  pendingCount: () => [...cashReceiptKeys.all, 'pending-count'] as const,
  detail: (receiptId: string) => [...cashReceiptKeys.all, 'detail', receiptId] as const,
}
