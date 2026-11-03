import type { IngestionJobView, KnowledgeDocumentView, KnowledgeVersionView } from '@/types/res/knowledgeDocumentsRes'

// Luật của kho tri thức, bám KnowledgeDocumentHandlers của backend; backend vẫn kiểm lại.
// Không import giá trị qua "@/" để chạy được bằng node --test

export const KNOWLEDGE_LIMITS = { titleMax: 200, tagsMax: 20, tagMax: 40 } as const

/** Trạng thái lượt nạp còn đang chạy hoặc chờ chạy */
const OPEN_JOB = new Set(['PENDING', 'RUNNING', 'RETRY_WAITING'])
/** Phiên bản đang trên đường nạp (chưa có kết quả) */
const VERSION_IN_FLIGHT = new Set(['REGISTERED', 'VERIFYING', 'PROCESSING'])

export function titleError(title: string) {
  if (!title.trim()) return 'Nhập tên tài liệu.'
  if (title.trim().length > KNOWLEDGE_LIMITS.titleMax) return `Tên tối đa ${KNOWLEDGE_LIMITS.titleMax} ký tự.`
  return undefined
}

/** Thẻ gõ cách nhau bằng dấu phẩy; backend lưu chữ thường, không trùng */
export function parseTags(text: string) {
  return [
    ...new Set(
      text
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ]
}

export function tagsError(text: string) {
  const tags = parseTags(text)
  if (tags.length > KNOWLEDGE_LIMITS.tagsMax) return `Tối đa ${KNOWLEDGE_LIMITS.tagsMax} thẻ.`
  const long = tags.find((t) => t.length > KNOWLEDGE_LIMITS.tagMax)
  if (long) return `Mỗi thẻ tối đa ${KNOWLEDGE_LIMITS.tagMax} ký tự ("${long}").`
  return undefined
}

/** Tên tệp bỏ đuôi, làm tên gợi ý khi đăng ký */
export function titleFromFileName(name: string) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, KNOWLEDGE_LIMITS.titleMax)
}

export const isArchived = (d: Pick<KnowledgeDocumentView, 'status'>) => d.status === 'ARCHIVED'

export function hasOpenJob(jobs: IngestionJobView[] | null, versionId: string) {
  return (jobs ?? []).some((j) => j.versionId === versionId && OPEN_JOB.has(j.status))
}

/** Backend chỉ công bố phiên bản đã nạp xong (READY_FOR_REVIEW) hoặc từng gỡ công bố (WITHDRAWN) */
export function canPublishVersion(d: KnowledgeDocumentView, v: KnowledgeVersionView) {
  return !isArchived(d) && (v.status === 'READY_FOR_REVIEW' || v.status === 'WITHDRAWN')
}

/** Nạp lại khi không có lượt nạp nào đang chờ của phiên bản đó */
export function canReindexVersion(d: KnowledgeDocumentView, v: KnowledgeVersionView) {
  return !isArchived(d) && !hasOpenJob(d.jobs, v.versionId)
}

export const canUnpublish = (d: Pick<KnowledgeDocumentView, 'status'>) => d.status === 'PUBLISHED'
export const canRetryJob = (j: Pick<IngestionJobView, 'status'>) => j.status === 'FAILED'

/** Còn việc chạy nền: hỏi lại định kỳ để thấy kết quả, không coi 202 là đã xong */
export function needsPolling(d: KnowledgeDocumentView) {
  return (
    (d.jobs ?? []).some((j) => OPEN_JOB.has(j.status)) ||
    (d.versions ?? []).some((v) => VERSION_IN_FLIGHT.has(v.status)) ||
    d.status === 'REGISTERED' ||
    d.status === 'PROCESSING'
  )
}
