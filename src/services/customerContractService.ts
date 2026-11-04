import type { SignedDocumentRequest } from '@/types/req/customerContractsReq'
import type { DocumentDisposition } from '@/services/contractService'
import type { ContractDocumentUrlView, ContractView } from '@/types/res/customerContractsRes'
import type { PaymentAttemptView } from '@/types/res/customerAfterSalesRes'
import type { ContractPaymentView } from '@/types/res/staffPaymentsRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Hợp đồng lắp đặt của khách: xem, gửi bản đã ký tay, thanh toán 100% qua PayOS khi bản ký đã được duyệt.
// Chỉ backend xác nhận đã nhận tiền (webhook có chữ ký hoặc đối soát với PayOS); trang PayOS chuyển về không tính

/** GET /api/customers/me/contracts: hợp đồng từ lúc chờ ký trở đi, mới nhất trước */
export function listMyContracts() {
  return get<ContractView[]>(ENDPOINTS.customerContracts.base)
}

/** GET .../contracts/{id}. Không có link tải PDF: chỉ có fileId và SHA-256 của PDF chính thức */
export function getMyContract(contractId: string) {
  return get<ContractView>(ENDPOINTS.customerContracts.byId(contractId))
}

/**
 * POST .../signed-document: tệp SIGNED_CONTRACT đã xác minh do chính khách tải lên, kèm SHA-256 của PDF chính thức khách đã
 * ký. SHA-256 lệch PDF hiện tại thì 409 CONTRACT_WRONG_DOCUMENT_VERSION
 */
export function submitSignedDocument(contractId: string, body: SignedDocumentRequest) {
  return post<ContractView>(ENDPOINTS.customerContracts.signedDocument(contractId), body)
}

/**
 * Link ký sẵn của PDF chính thức của hợp đồng khách đang xem (chỉ hợp đồng của chính khách, từ lúc chờ ký trở đi). Link sống vài
 * phút và gắn đúng phiên bản tệp đã xác minh: tải về là đúng tệp có SHA-256 hợp đồng ghi
 */
export function getOfficialDocumentUrl(contractId: string, disposition: DocumentDisposition) {
  return get<ContractDocumentUrlView>(ENDPOINTS.customerContracts.officialDocumentUrl(contractId), { params: { disposition } })
}

/** Link ký sẵn của một bản ký khách đã gửi (mã lấy từ `submissions`) */
export function getSubmissionUrl(contractId: string, submissionId: string, disposition: DocumentDisposition) {
  return get<ContractDocumentUrlView>(ENDPOINTS.customerContracts.submissionUrl(contractId, submissionId), {
    params: { disposition },
  })
}

/** POST .../payments: tạo link PayOS, hoặc trả lại link còn trả được (không bao giờ hai link cùng lúc) */
export function createContractPayment(contractId: string) {
  return post<PaymentAttemptView>(ENDPOINTS.customerPayments.base(contractId))
}

/**
 * GET .../payments: trạng thái thanh toán, backend đối soát với PayOS khi link còn chờ. `history` luôn null với khách.
 * `current` là link đã trả tiền, nếu không thì link còn trả được (kể cả link mua gói kèm hợp đồng)
 */
export function getContractPayments(contractId: string) {
  return get<ContractPaymentView>(ENDPOINTS.customerPayments.base(contractId))
}

/** POST .../payments/cancel: huỷ link đang chờ. PayOS báo đã nhận tiền thì backend xác nhận thay vì huỷ */
export function cancelContractPayment(contractId: string) {
  return post<PaymentAttemptView>(ENDPOINTS.customerPayments.cancel(contractId))
}
