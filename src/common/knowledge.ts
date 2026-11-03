import type { Tone } from '@/components/common/ui/badge'

// Enum của kho tri thức chatbot (Modules.KnowledgeBase của backend). Chỉ phiên bản đã công bố được chatbot dùng để trả lời

/** KnowledgeDocumentHandlers.Categories */
export const KNOWLEDGE_CATEGORIES: Record<string, string> = {
  PRODUCT: 'Sản phẩm',
  WARRANTY: 'Bảo hành',
  POLICY: 'Chính sách',
  INSTALLATION_GUIDE: 'Hướng dẫn lắp đặt',
  FAQ: 'Câu hỏi thường gặp',
  MAINTENANCE: 'Bảo trì',
  OTHER: 'Khác',
}

/** DocumentStatuses */
export const KNOWLEDGE_DOCUMENT_STATUSES: Record<string, { label: string; tone: Tone }> = {
  REGISTERED: { label: 'Chờ nạp', tone: 'info' },
  PROCESSING: { label: 'Đang nạp', tone: 'info' },
  READY_FOR_REVIEW: { label: 'Nạp xong, chờ công bố', tone: 'info' },
  PUBLISHED: { label: 'Đang công bố', tone: 'ok' },
  UNPUBLISHED: { label: 'Đã gỡ công bố', tone: 'neutral' },
  FAILED: { label: 'Nạp lỗi', tone: 'danger' },
  ARCHIVED: { label: 'Đã lưu trữ', tone: 'neutral' },
}

/** VersionStatuses */
export const KNOWLEDGE_VERSION_STATUSES: Record<string, { label: string; tone: Tone }> = {
  REGISTERED: { label: 'Chờ nạp', tone: 'info' },
  VERIFYING: { label: 'Đang kiểm tra tệp', tone: 'info' },
  PROCESSING: { label: 'Đang nạp', tone: 'info' },
  READY_FOR_REVIEW: { label: 'Nạp xong, chờ công bố', tone: 'info' },
  PUBLISHED: { label: 'Đang công bố', tone: 'ok' },
  SUPERSEDED: { label: 'Đã thay bằng bản mới', tone: 'neutral' },
  FAILED: { label: 'Nạp lỗi', tone: 'danger' },
  OCR_REQUIRED: { label: 'Tệp là ảnh quét, chưa đọc được chữ', tone: 'warn' },
  UNSUPPORTED_CONTENT: { label: 'Nội dung không đọc được', tone: 'warn' },
  WITHDRAWN: { label: 'Đã gỡ công bố', tone: 'neutral' },
}

/** JobStatuses */
export const KNOWLEDGE_JOB_STATUSES: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Chờ chạy', tone: 'info' },
  RUNNING: { label: 'Đang chạy', tone: 'info' },
  RETRY_WAITING: { label: 'Chờ chạy lại', tone: 'warn' },
  COMPLETED: { label: 'Xong', tone: 'neutral' },
  FAILED: { label: 'Lỗi', tone: 'danger' },
}

/** JobKinds */
export const KNOWLEDGE_JOB_KINDS: Record<string, string> = {
  INGEST: 'Nạp tài liệu',
  DELETE_VECTORS: 'Xoá dữ liệu đã nạp',
}
