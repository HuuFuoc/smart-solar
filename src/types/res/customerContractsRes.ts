// Viết tay vì swagger của tag CustomerContracts chỉ khai "200 OK". Theo record C# của backend `main` (6025bc1):
// Modules.CustomerContracts (ContractView, ContractDocumentView, SignatureSubmissionView, ContractEventView)
// Khách chỉ thấy hợp đồng từ lúc chờ ký trở đi (AWAITING_SIGNATURE, UNDER_REVIEW, SIGNATURE_REJECTED, SIGNED, PAID, SUPERSEDED)

export type ContractStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'AWAITING_SIGNATURE'
  | 'UNDER_REVIEW'
  | 'SIGNATURE_REJECTED'
  | 'SIGNED'
  | 'PAID'
  | 'SUPERSEDED'
  | (string & {})

export type ContractDocumentView = {
  fileId: string
  sha256: string | null
  confirmedAt: string | null
}

export type SignatureSubmissionView = {
  submissionId: string
  fileId: string
  fileSha256: string
  officialDocumentSha256: string
  submittedAt: string
  outcome: string
  reviewedAt: string | null
  rejectionReason: string | null
}

export type ContractEventView = {
  eventType: string
  fromStatus: string | null
  toStatus: string | null
  actorUserId: string
  detail: string | null
  createdAt: string
}

/** GET /api/customers/me/contracts(/{contractId}) */
export type ContractView = {
  contractId: string
  contractNumber: string
  version: number
  previousContractId: string | null
  quotationId: string
  quotationVersion: number
  surveyRequestId: string
  status: ContractStatus
  currency: string
  totalAmount: number
  /** JsonElement của backend, hình dạng không cố định */
  pricingSnapshot: unknown
  customerSnapshot: unknown
  terms: string | null
  canonicalHash: string | null
  officialDocument: ContractDocumentView | null
  signedDocument: ContractDocumentView | null
  rejectionReason: string | null
  issuedAt: string | null
  publishedAt: string | null
  signedAt: string | null
  paidAt: string | null
  revision: number
  submissions: SignatureSubmissionView[] | null
  events: ContractEventView[] | null
  /** Số tháng bảo hành lắp đặt; null với hợp đồng cũ */
  warrantyMonths: number | null
}
