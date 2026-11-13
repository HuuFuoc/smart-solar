// Viết tay vì swagger của tag AdminKnowledgeDocuments chỉ khai "200 OK". Theo KnowledgeDocumentHandlers.cs của backend `main`
// (58f9635)

/** Một phiên bản (một tệp) của tài liệu. `status`: VersionStatuses của backend */
export type KnowledgeVersionView = {
  versionId: string
  versionNumber: number
  fileId: string
  status: string
  pageCount: number | null
  chunkCount: number | null
  extractedCharacters: number | null
  embeddingModel: string | null
  failureReason: string | null
  createdAt: string
  ingestedAt: string | null
  publishedAt: string | null
  /** Cấu hình chatbot lúc nạp: phiên bản và kích thước đoạn cắt */
  indexedConfigVersion: number | null
  indexedChunkCharacters: number | null
  indexedChunkOverlap: number | null
  lastIngestStatus: string | null
  lastIngestError: string | null
}

/** Một lượt nạp (INGEST) hoặc xoá vector (DELETE_VECTORS) chạy nền. `status`: PENDING | RUNNING | COMPLETED | FAILED | RETRY_WAITING */
export type IngestionJobView = {
  jobId: string
  versionId: string
  kind: string
  status: string
  attempts: number
  maxAttempts: number
  nextAttemptAt: string
  lastError: string | null
  createdAt: string
  completedAt: string | null
  configVersion: number | null
  chunkCharacters: number | null
  chunkOverlap: number | null
}

/**
 * Tài liệu của kho tri thức. Danh sách không kèm `versions`, `jobs` (null); chi tiết và mọi lệnh ghi trả đủ.
 * `status`: REGISTERED | PROCESSING | READY_FOR_REVIEW | PUBLISHED | UNPUBLISHED | FAILED | ARCHIVED
 */
export type KnowledgeDocumentView = {
  documentId: string
  title: string
  category: string
  tags: string[]
  status: string
  latestVersionId: string | null
  /** Phiên bản chatbot đang dùng; chỉ tài liệu PUBLISHED mới được đọc khi trả lời */
  publishedVersionId: string | null
  createdAt: string
  updatedAt: string
  revision: number
  versions: KnowledgeVersionView[] | null
  jobs: IngestionJobView[] | null
  /** Ai được chatbot trả lời bằng tài liệu này: INTERNAL chỉ nhân viên (mặc định), CUSTOMER cả khách hàng */
  audience: 'INTERNAL' | 'CUSTOMER' | (string & {})
  /** Tài liệu còn thẻ "audience:customer" của cách phân loại cũ: thẻ không có tác dụng, quản trị xem lại đối tượng đọc */
  legacyAudienceTag: boolean
}
