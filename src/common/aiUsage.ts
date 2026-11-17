import type { Tone } from '@/components/common/ui/badge'

// Mã của sổ chi phí AI (AiUsageDashboard, AiCost của Modules.KnowledgeBase) và nhãn trên trang Chi phí AI

/** Lọc `operation` của sổ */
export const AI_USAGE_OPERATIONS: Record<string, string> = {
  CHAT: 'Hỏi đáp',
  INGESTION: 'Nạp tài liệu',
}

/** Khoá của GET /admin/rag-usage/by-operation */
export const AI_COST_KINDS: Record<string, string> = {
  QUERY_EMBEDDING: 'Đọc câu hỏi',
  GENERATION: 'Soạn câu trả lời',
  INGESTION: 'Nạp tài liệu',
  UNCERTAIN: 'Chưa rõ chi phí',
}

/** Lọc `status` của sổ. UNCERTAIN chờ quản trị đối soát với hoá đơn của nhà cung cấp */
export const AI_USAGE_STATUSES: Record<string, { label: string; tone: Tone }> = {
  RESERVED: { label: 'Đang giữ tiền', tone: 'info' },
  SETTLED: { label: 'Đã chốt', tone: 'neutral' },
  UNCERTAIN: { label: 'Chờ đối soát', tone: 'danger' },
  RELEASED: { label: 'Không tính tiền', tone: 'neutral' },
}

/** Lọc `outcome` của sổ */
export const AI_USAGE_OUTCOMES: Record<string, string> = {
  PENDING: 'Đang chạy',
  ANSWERED: 'Đã trả lời',
  INSUFFICIENT_CONTEXT: 'Không đủ tài liệu',
  PROVIDER_ERROR: 'Nhà cung cấp lỗi',
  PROVIDER_RATE_LIMITED: 'Nhà cung cấp giới hạn',
  TIMEOUT: 'Quá giờ',
  BUSY: 'Đang bận',
  EXPIRED: 'Hết hạn giữ tiền',
  INDEXED: 'Đã nạp',
  INGEST_FAILED: 'Nạp lỗi',
  REVIEWED: 'Đã đối soát',
}

/** `period` của dòng ngân sách */
export const AI_BUDGET_PERIODS: Record<string, string> = {
  DAY: 'Hôm nay',
  MONTH: 'Tháng này',
  INGEST_MONTH: 'Nạp tài liệu tháng này',
}

/** Tên kỳ trong mã cảnh báo ngân sách (`<KỲ>_BUDGET_80`, `<KỲ>_BUDGET_EXHAUSTED`, `<KỲ>_UNCERTAIN`) */
export const AI_ALERT_PERIODS: Record<string, string> = {
  DAILY: 'ngân sách hôm nay',
  MONTHLY: 'ngân sách tháng này',
  INGESTION: 'ngân sách nạp tài liệu tháng này',
}

/** Cảnh báo không theo kỳ */
export const AI_ALERTS: Record<string, string> = {
  GENERATION_DISABLED: 'Đang tắt soạn câu trả lời: trợ lý chỉ trả lời các câu tư vấn cấu hình.',
  MODEL_NOT_USABLE:
    'Model đang dùng không có trong danh sách dùng được nên chi phí bị tính theo giá cao nhất. Chọn model khác ở Cài đặt hệ thống.',
}
