import type { Tone } from '@/components/common/ui/badge'
import { AI_ALERTS, AI_ALERT_PERIODS, AI_COST_KINDS, AI_USAGE_OUTCOMES, AI_USAGE_STATUSES } from '@/common/aiUsage'
import { ROLE_ALIASES, ROLE_LABELS } from '@/common/role'
import type { AiBudgetAlertView, AiUsageRow } from '@/types/res/adminRagUsageRes'

// Nhãn và định dạng của trang Chi phí AI

const number = new Intl.NumberFormat('vi-VN')
const oneDecimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

export const formatCount = (n: number | null | undefined) => (n == null ? '—' : number.format(n))

/** "850 ms", "4,4 giây" */
export function formatLatency(ms: number | null | undefined) {
  if (ms == null) return '—'
  return ms < 1000 ? `${number.format(ms)} ms` : `${oneDecimal.format(ms / 1000)} giây`
}

/** Mã vai trò của backend (ADMIN, CUSTOMER…) sang nhãn tiếng Việt */
export function roleLabel(code: string | null | undefined) {
  if (!code) return '—'
  const role = ROLE_ALIASES[code.toLowerCase()]
  return role ? ROLE_LABELS[role] : code
}

export const statusMeta = (code: string): { label: string; tone: Tone } =>
  AI_USAGE_STATUSES[code] ?? { label: code, tone: 'neutral' }
export const outcomeLabel = (code: string) => AI_USAGE_OUTCOMES[code] ?? code
export const costKindLabel = (key: string) => AI_COST_KINDS[key] ?? key

/** Token của một dòng sổ: "vào 1.200, ra 80, đọc câu hỏi 14" */
export function rowTokens(row: AiUsageRow) {
  const parts = [
    row.inputTokens > 0 && `vào ${number.format(row.inputTokens)}`,
    row.cachedInputTokens > 0 && `đọc lại ${number.format(row.cachedInputTokens)}`,
    row.outputTokens > 0 && `ra ${number.format(row.outputTokens)}`,
    row.reasoningTokens > 0 && `suy luận ${number.format(row.reasoningTokens)}`,
    row.embeddingTokens > 0 &&
      `${row.operation === 'INGESTION' ? 'nạp' : 'đọc câu hỏi'} ${number.format(row.embeddingTokens)}`,
  ].filter(Boolean)
  return parts.length > 0 ? `${parts.join(', ')} token` : 'Không dùng token'
}

/** Câu cảnh báo ngân sách theo mã (câu của backend là tiếng Anh); mã lạ thì giữ câu của backend */
export function budgetAlertText(alert: AiBudgetAlertView) {
  const fixed = AI_ALERTS[alert.code]
  if (fixed) return fixed
  const match = /^(DAILY|MONTHLY|INGESTION)_(BUDGET_EXHAUSTED|BUDGET_80|UNCERTAIN)$/.exec(alert.code)
  if (!match) return alert.message
  const period = AI_ALERT_PERIODS[match[1]!]
  const refused =
    match[1] === 'INGESTION' ? 'việc nạp tài liệu đang bị từ chối' : 'các câu hỏi cần trả phí đang bị từ chối'
  if (match[2] === 'BUDGET_EXHAUSTED') return `Đã dùng hết ${period}: ${refused}.`
  if (match[2] === 'BUDGET_80') return `Đã dùng từ 80% ${period}.`
  return `Có chi phí chưa rõ trong ${period}, chờ đối soát ở sổ chi phí bên dưới.`
}

export function alertTone(severity: string): 'danger' | 'warn' | 'neutral' {
  if (severity === 'critical') return 'danger'
  return severity === 'warning' ? 'warn' : 'neutral'
}
