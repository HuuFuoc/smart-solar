import type {
  AddKnowledgeVersionRequest,
  KnowledgeRevisionRequest,
  PublishKnowledgeVersionRequest,
  RegisterKnowledgeDocumentRequest,
  ReindexKnowledgeVersionRequest,
  UpdateKnowledgeMetadataRequest,
} from '@/types/req/adminKnowledgeDocumentsReq'
import type { KnowledgeDocumentView } from '@/types/res/knowledgeDocumentsRes'
import { get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Kho tri thức của chatbot (chỉ ADMIN). Tệp tải lên kho S3 bằng uploadFile (mục đích KNOWLEDGE_DOCUMENT) rồi đăng ký bằng fileId.
// Backend tắt chức năng thì mọi endpoint trả 503 FEATURE_PENDING_MIGRATION.
// Giới hạn mỗi người: đọc 60 / phút; đăng ký, sửa, thêm phiên bản 10 / phút; công bố, gỡ, lưu trữ 10 / phút; nạp lại, chạy lại 3 / 10 phút

const api = ENDPOINTS.knowledgeDocuments

/** Không kèm phiên bản và lượt nạp; `status`, `category` để trống là mọi giá trị */
export function listKnowledgeDocuments(filter: { status?: string; category?: string } = {}) {
  const params = Object.fromEntries(Object.entries(filter).filter(([, v]) => v))
  return get<KnowledgeDocumentView[]>(api.base, { params })
}

export function getKnowledgeDocument(documentId: string) {
  return get<KnowledgeDocumentView>(api.byId(documentId))
}

/** 201, xếp lượt nạp phiên bản 1 ngay */
export function registerKnowledgeDocument(body: RegisterKnowledgeDocumentRequest) {
  return post<KnowledgeDocumentView>(api.base, body)
}

export function updateKnowledgeMetadata(documentId: string, body: UpdateKnowledgeMetadataRequest) {
  return put<KnowledgeDocumentView>(api.byId(documentId), body)
}

/** 201. Phiên bản đang công bố vẫn được dùng tới khi công bố bản mới */
export function addKnowledgeVersion(documentId: string, body: AddKnowledgeVersionRequest) {
  return post<KnowledgeDocumentView>(api.versions(documentId), body)
}

/** Bản đang công bố cũ thành SUPERSEDED cùng lúc */
export function publishKnowledgeVersion(documentId: string, body: PublishKnowledgeVersionRequest) {
  return post<KnowledgeDocumentView>(api.publish(documentId), body)
}

export function unpublishKnowledgeDocument(documentId: string, body: KnowledgeRevisionRequest) {
  return post<KnowledgeDocumentView>(api.unpublish(documentId), body)
}

/** 202: chỉ là đã xếp lượt nạp, kết quả xem ở danh sách lượt nạp */
export function reindexKnowledgeVersion(documentId: string, body: ReindexKnowledgeVersionRequest) {
  return post<KnowledgeDocumentView>(api.reindex(documentId), body)
}

/** 202, không có body. Chỉ lượt nạp FAILED */
export function retryKnowledgeJob(documentId: string, jobId: string) {
  return post<KnowledgeDocumentView>(api.retryJob(documentId, jobId))
}

/** Xoá mềm: gỡ công bố ngay, dữ liệu đã nạp được xoá bằng một lượt chạy nền */
export function archiveKnowledgeDocument(documentId: string, body: KnowledgeRevisionRequest) {
  return post<KnowledgeDocumentView>(api.archive(documentId), body)
}
