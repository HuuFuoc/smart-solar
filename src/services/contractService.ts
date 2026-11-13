import type {
  ContractReviewRequest,
  ContractTermsRequest,
  DiscardContractRequest,
  OfficialDocumentRequest,
} from '@/types/req/salesContractsReq'
import type { RevisionRequest } from '@/types/req/salesQuotationsReq'
import type { ContractDocumentUrlView, ContractView } from '@/types/res/customerContractsRes'
import type { ContractPaymentView } from '@/types/res/staffPaymentsRes'
import { get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Hợp đồng lắp đặt phía nhân viên. Kinh doanh phụ trách yêu cầu khảo sát lập, phát hành, gắn PDF, gửi ký và lập phụ lục;
// kinh doanh phụ trách hoặc quản lý duyệt bản ký; quản trị chỉ đọc. Mỗi lệnh ghi gửi `revision` đang xem (lệch thì 409)
// Giá do backend chép từ báo giá đã đồng ý, FE không gửi tiền

const api = ENDPOINTS.contracts

/** inline: mở xem trong trình duyệt; attachment: tải về */
export type DocumentDisposition = 'inline' | 'attachment'

/** Tài liệu của một hợp đồng: PDF chính thức, hoặc bản ký có mã `submissionId` */
export type ContractDocumentTarget = { contractId: string; submissionId?: string; disposition: DocumentDisposition }

/** Mọi phiên bản hợp đồng của một yêu cầu khảo sát (kể cả bản bị phụ lục thay) */
export function listForSurveyRequest(surveyRequestId: string) {
  return get<ContractView[]>(api.bySurveyRequest(surveyRequestId))
}

/** Một phiên bản, kèm lịch sử thao tác */
export function getContract(contractId: string) {
  return get<ContractView>(api.byId(contractId))
}

/** Lập bản nháp từ báo giá khách đã đồng ý. Bỏ trống điều khoản thì lấy điều khoản của báo giá, bỏ trống thời hạn bảo hành thì lấy mặc định */
export function createFromQuotation(quotationId: string, body: Omit<ContractTermsRequest, 'revision'>) {
  return post<ContractView>(api.fromQuotation(quotationId), body)
}

/** Ghi đè điều khoản của bản nháp; `warrantyMonths` null là giữ thời hạn đang có */
export function updateDraft(contractId: string, body: ContractTermsRequest) {
  return put<ContractView>(api.byId(contractId), body)
}

/** Bản nháp thành ĐÃ PHÁT HÀNH: nội dung đóng băng, backend tính `canonicalHash` */
export function issueContract(contractId: string, body: RevisionRequest) {
  return post<ContractView>(api.issue(contractId), body)
}

/** Gắn PDF chính thức (tệp CONTRACT_DOCUMENT đã xác minh do chính người này tải) cho đúng phiên bản có `canonicalHash` này */
export function attachOfficialDocument(contractId: string, body: OfficialDocumentRequest) {
  return put<ContractView>(api.officialDocument(contractId), body)
}

/** Gửi khách ký: cần đã gắn PDF chính thức */
export function publishContract(contractId: string, body: RevisionRequest) {
  return post<ContractView>(api.publish(contractId), body)
}

/**
 * Huỷ bản nháp đầu tiên chưa phát hành (lý do bắt buộc, tối đa 1000 ký tự) để đóng được yêu cầu khảo sát. Báo giá đó không
 * lập hợp đồng mới được nữa; phụ lục nháp và hợp đồng đã phát hành không huỷ được
 */
export function discardContract(contractId: string, body: DiscardContractRequest) {
  return post<ContractView>(api.discard(contractId), body)
}

/** Duyệt bản khách đã ký: APPROVE thành ĐÃ KÝ, REJECT (bắt buộc lý do) thành BẢN KÝ BỊ TỪ CHỐI */
export function reviewSignature(contractId: string, body: ContractReviewRequest) {
  return post<ContractView>(api.review(contractId), body)
}

/** Phụ lục: phiên bản nháp mới cùng giá; bản cũ chỉ bị thay khi phụ lục được phát hành */
export function createAmendment(contractId: string, body: Omit<ContractTermsRequest, 'revision'>) {
  return post<ContractView>(api.amendments(contractId), body)
}

/** Trạng thái thanh toán của hợp đồng phía nhân viên (Sales, Manager, Admin), kèm lịch sử */
export function getContractPayments(contractId: string) {
  return get<ContractPaymentView>(api.payments(contractId))
}

/**
 * Link ký sẵn của PDF chính thức (cùng phạm vi đọc với GET /contracts/{id}). Link sống vài phút, gắn đúng phiên bản tệp đã xác minh
 * nên tải về đúng tệp có SHA-256 hợp đồng ghi
 */
export function getOfficialDocumentUrl(contractId: string, disposition: DocumentDisposition) {
  return get<ContractDocumentUrlView>(api.officialDocumentUrl(contractId), { params: { disposition } })
}

/** Link ký sẵn của một bản khách đã ký (mã lấy từ `submissions` của hợp đồng) */
export function getSubmissionUrl(contractId: string, submissionId: string, disposition: DocumentDisposition) {
  return get<ContractDocumentUrlView>(api.submissionUrl(contractId, submissionId), { params: { disposition } })
}
