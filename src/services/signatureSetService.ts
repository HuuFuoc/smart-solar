import type {
  FinalizeSignatureSetRequest,
  SignedPageRequest,
  StartSignatureSetRequest,
} from '@/types/req/paymentPlanReq'
import type { AttachedFileUrlView, SignatureSetView } from '@/types/res/paymentPlanRes'
import { get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Ảnh chụp từng trang hợp đồng giấy 30/70 khách đã ký (sau khi khoản 30% được xác minh). Kỹ thuật viên đã khảo sát tải lên;
// quản lý / quản trị hỗ trợ bằng đường riêng; kinh doanh và kỹ thuật viên khác chỉ đọc. Chốt xong là khoá, hợp đồng thành SIGNED.
// Link xem trang là link ký sẵn sống vài phút: chỉ xin khi xem, không lưu

const api = ENDPOINTS.signatureSets

/** technician: kỹ thuật viên đã khảo sát; support: quản lý / quản trị */
export type SignatureWriter = 'technician' | 'support'

export function startSignatureSet(writer: SignatureWriter, contractId: string, body: StartSignatureSetRequest) {
  return post<SignatureSetView>(
    writer === 'technician' ? api.technicianStart(contractId) : api.supportStart(contractId),
    body,
  )
}

/** Gắn hoặc thay (khi chưa chốt) trang `pageNumber` bằng tệp SIGNED_CONTRACT_PAGE đã xác minh của chính người gọi */
export function putSignedPage(writer: SignatureWriter, contractId: string, pageNumber: number, fileId: string) {
  const body: SignedPageRequest = { fileId }
  return put<SignatureSetView>(
    writer === 'technician' ? api.technicianPage(contractId, pageNumber) : api.supportPage(contractId, pageNumber),
    body,
  )
}

/** Chốt khi đủ trang 1..N; backend kiểm lại từng tệp trên kho */
export function finalizeSignatureSet(writer: SignatureWriter, contractId: string, expectedRevision: number) {
  const body: FinalizeSignatureSetRequest = { expectedRevision }
  return post<SignatureSetView>(
    writer === 'technician' ? api.technicianFinalize(contractId) : api.supportFinalize(contractId),
    body,
  )
}

/** Mọi lần tải (đang tải, đã chốt, bị thay) */
export function listSignatureSets(reader: 'staff' | 'customer', contractId: string) {
  return get<SignatureSetView[]>(reader === 'staff' ? api.staffList(contractId) : api.customerList(contractId))
}

export function getSignedPageUrl(
  reader: 'staff' | 'customer',
  contractId: string,
  fileId: string,
  disposition: 'inline' | 'attachment',
) {
  return get<AttachedFileUrlView>(
    reader === 'staff' ? api.staffPageUrl(contractId, fileId) : api.customerPageUrl(contractId, fileId),
    { params: { disposition } },
  )
}
