// Viết tay theo record C# của Modules.KnowledgeBase (AiUsageDashboard.cs, RagConfigurationService.cs, nhánh backend
// feat/cloud-rag-security-cost-control 4fb5b95), đối chiếu response thật của server chung: swagger chỉ khai "200 OK".
// Tiền là USD, backend tính tới 8 chữ số lẻ; ngày là UTC `yyyy-MM-dd`

import type { RagConfigurationLimits } from '@/types/res/adminRagConfigTypes'

/** AiBudgetLineView. `period`: DAY | MONTH | INGEST_MONTH; đã dùng = settled + uncertain + reserved */
export type AiBudgetLineView = {
  period: string
  periodStart: string
  limitUsd: number
  settledUsd: number
  uncertainUsd: number
  reservedUsd: number
  remainingUsd: number
  usedPercent: number
  requests: number
  /** Số lượt bị từ chối vì hết ngân sách trong kỳ */
  blocked: number
}

/** AiBudgetAlertView. `message` là câu tiếng Anh của backend, FE dịch theo `code` */
export type AiBudgetAlertView = { code: string; severity: 'info' | 'warning' | 'critical' | string; message: string }

/** GET /admin/rag-budget */
export type AiBudgetView = {
  activeVersion: number
  bootstrap: boolean
  generationEnabled: boolean
  dailyBudgetUsd: number
  monthlyBudgetUsd: number
  monthlyIngestionBudgetUsd: number
  userRequestsPerDay: number
  userConcurrency: number
  globalConcurrency: number
  maxQuestionCharacters: number
  generationTimeoutSeconds: number
  ceilings: RagConfigurationLimits
  today: AiBudgetLineView
  month: AiBudgetLineView
  ingestionMonth: AiBudgetLineView
  alerts: AiBudgetAlertView[]
  activeGenerationModel: string | null
  activeEmbeddingModel: string | null
}

/** GET /admin/rag-usage/summary */
export type AiUsageSummaryView = {
  range: { from: string; to: string }
  today: AiBudgetLineView
  month: AiBudgetLineView
  ingestionMonth: AiBudgetLineView
  rangeCost: { settledUsd: number; uncertainUsd: number; reservedUsd: number; totalUsd: number }
  requests: number
  answered: number
  insufficientContext: number
  failed: number
  uncertain: number
  blockedToday: number
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  reasoningTokens: number
  embeddingTokens: number
  averageLatencyMs: number | null
  p95LatencyMs: number | null
  activeGenerationModel: string | null
  activeEmbeddingModel: string | null
  configVersion: number
  generationEnabled: boolean
}

/** GET /admin/rag-usage/timeseries: một dòng mỗi ngày của khoảng, kể cả ngày không phát sinh */
export type AiUsageDayView = {
  date: string
  costUsd: number
  generationCostUsd: number
  embeddingCostUsd: number
  ingestionCostUsd: number
  requests: number
  failed: number
  inputTokens: number
  outputTokens: number
  embeddingTokens: number
  p95LatencyMs: number | null
}

/** GET /admin/rag-usage/by-model | by-operation | by-role. `key`: tên model, loại chi phí hoặc mã vai trò */
export type AiUsageBreakdownView = {
  key: string
  requests: number
  costUsd: number
  inputTokens: number
  outputTokens: number
  embeddingTokens: number
}

/** GET /admin/rag-usage/top-users */
export type AiTopUserView = {
  userId: string
  fullName: string | null
  role: string | null
  requests: number
  costUsd: number
  tokens: number
}

/** Một dòng sổ chi phí. Sổ không lưu câu hỏi, câu trả lời hay khoá */
export type AiUsageRow = {
  id: string
  /** CHAT | INGESTION */
  operation: string
  /** RESERVED | SETTLED | UNCERTAIN | RELEASED */
  status: string
  outcome: string
  userId: string | null
  userRole: string | null
  embeddingModel: string | null
  embeddingTokens: number
  embeddingCostUsd: number
  generationModel: string | null
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  reasoningTokens: number
  generationCostUsd: number
  reservedUsd: number
  costUsd: number
  usageReported: boolean
  latencyMs: number | null
  configVersion: number | null
  createdAt: string
  settledAt: string | null
  reviewedByUserId: string | null
  reviewedAt: string | null
  reviewNote: string | null
}

/** GET /admin/rag-usage/requests (phân trang ở server) */
export type AiUsagePageView = { items: AiUsageRow[]; total: number; page: number; pageSize: number }
