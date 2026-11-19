import type { InstallmentActor } from '@/services/installmentService'
import type { ContractDirectoryQuery } from '@/types/req/paymentPlanReq'

// Khoá cache của gói thanh toán 30/70, tách riêng để bàn thu tiền tải lại được mà không import vòng với usePaymentPlan

export const paymentPlanKeys = {
  all: ['payment-plan'] as const,
  installment: (actor: InstallmentActor, contractId: string, sequence: number) =>
    [...paymentPlanKeys.all, 'installment', actor, contractId, sequence] as const,
  signatureSets: (reader: 'staff' | 'customer', contractId: string) =>
    [...paymentPlanKeys.all, 'signature-sets', reader, contractId] as const,
  directory: (query: ContractDirectoryQuery) => [...paymentPlanKeys.all, 'directory', query] as const,
}
