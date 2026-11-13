import {
  KNOWLEDGE_AUDIENCES,
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_DOCUMENT_STATUSES,
  KNOWLEDGE_JOB_KINDS,
  KNOWLEDGE_JOB_STATUSES,
  KNOWLEDGE_VERSION_STATUSES,
} from '@/common/knowledge'
import type { Tone } from '@/components/common/ui/badge'

// Nhãn của kho tri thức. Mã lạ (backend thêm trạng thái mới) in nguyên mã, nền xám

const fallback = (code: string): { label: string; tone: Tone } => ({ label: code, tone: 'neutral' })

export const categoryLabel = (code: string) => KNOWLEDGE_CATEGORIES[code] ?? code
export const audienceLabel = (code: string) => KNOWLEDGE_AUDIENCES[code] ?? code
export const documentStatusMeta = (code: string) => KNOWLEDGE_DOCUMENT_STATUSES[code] ?? fallback(code)
export const versionStatusMeta = (code: string) => KNOWLEDGE_VERSION_STATUSES[code] ?? fallback(code)
export const jobStatusMeta = (code: string) => KNOWLEDGE_JOB_STATUSES[code] ?? fallback(code)
export const jobKindLabel = (code: string) => KNOWLEDGE_JOB_KINDS[code] ?? code

/** Câu khi kho tri thức đang tắt trên hệ thống (503 FEATURE_PENDING_MIGRATION) */
export const KNOWLEDGE_UNAVAILABLE =
  'Kho tri thức và chatbot đang tắt trên hệ thống nên chưa xem hay sửa được tài liệu. Báo người quản lý hệ thống bật chức năng này.'
