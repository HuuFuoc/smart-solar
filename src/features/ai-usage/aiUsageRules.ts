import type { UpdateRagBudgetRequest } from '@/types/req/adminRagBudgetReq'
import type { AiBudgetView } from '@/types/res/adminRagUsageRes'
import type { RagConfigurationLimits } from '@/types/res/adminRagConfigTypes'

// Luật của trang Chi phí AI, bám AiUsageDashboardService + RagConfigurationRules.Validate của backend (nhánh cloud RAG 4fb5b95).
// Chỉ để báo trước khi gửi; backend vẫn kiểm lại. Không import giá trị qua "@/" để chạy được bằng node --test

/** Khoảng ngày tối đa của mọi API thống kê (MaxRangeDays) */
export const AI_USAGE_MAX_RANGE_DAYS = 92
export const AI_USAGE_PAGE_SIZE = 20
const DAY_MS = 86_400_000
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Sổ chi phí tính ngày theo UTC (khác các màn khác tính theo giờ Việt Nam) */
export function todayUtc(now: Date = new Date()) {
  return now.toISOString().slice(0, 10)
}

/** Mặc định như backend: ngày 1 của tháng (UTC) tới hôm nay */
export function defaultUsageRange(now: Date = new Date()) {
  const to = todayUtc(now)
  return { from: `${to.slice(0, 8)}01`, to }
}

/** Số ngày kể cả hai đầu */
export function rangeDays(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1
}

export function usageRangeError(from: string, to: string): string | null {
  if (!DATE.test(from) || !DATE.test(to) || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to)))
    return 'Chọn đủ ngày bắt đầu và ngày kết thúc.'
  if (from > to) return 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.'
  const days = rangeDays(from, to)
  if (days > AI_USAGE_MAX_RANGE_DAYS)
    return `Mỗi lần xem tối đa ${AI_USAGE_MAX_RANGE_DAYS} ngày (đang chọn ${days} ngày). Thu hẹp khoảng ngày.`
  return null
}

const usd = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 6 })

/** Tiền USD tối đa 6 chữ số lẻ; số dương nhỏ hơn 0,000001 không làm tròn thành 0 */
export function formatUsd(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—'
  if (value > 0 && value < 0.000001) return '< 0,000001 USD'
  return `${usd.format(value)} USD`
}

/** Số tiền người dùng gõ (nhận cả dấu phẩy); null khi không phải số không âm có tối đa `decimals` chữ số lẻ */
export function parseUsd(text: string, decimals: number): number | null {
  const value = text.trim().replace(',', '.')
  if (!new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(value)) return null
  return Number(value)
}

export const REVIEW_NOTE_MAX = 500
const REVIEW_COST_MAX = 100

/** POST .../review: chi phí 0–100 USD, tối đa 6 chữ số lẻ; ghi chú 1–500 ký tự */
export function reviewProblems(costText: string, note: string): { cost?: string; note?: string } {
  const problems: { cost?: string; note?: string } = {}
  const cost = parseUsd(costText, 6)
  if (cost === null) problems.cost = 'Nhập số tiền USD, tối đa 6 chữ số lẻ (vd. 0,00031). Không bị tính thì nhập 0.'
  else if (cost > REVIEW_COST_MAX) problems.cost = `Tối đa ${REVIEW_COST_MAX} USD.`
  const length = note.trim().length
  if (length === 0) problems.note = 'Ghi nguồn đối chiếu, vd. hoá đơn của nhà cung cấp ngày nào.'
  else if (length > REVIEW_NOTE_MAX) problems.note = `Tối đa ${REVIEW_NOTE_MAX} ký tự.`
  return problems
}

/** Các ô của PUT /admin/rag-budget (trừ công tắc, phiên bản và ghi chú) */
export const BUDGET_FIELDS = [
  'dailyBudgetUsd',
  'monthlyBudgetUsd',
  'monthlyIngestionBudgetUsd',
  'userRequestsPerDay',
  'userConcurrency',
  'globalConcurrency',
  'maxQuestionCharacters',
  'generationTimeoutSeconds',
] as const

export type BudgetField = (typeof BUDGET_FIELDS)[number]
export type BudgetForm = Record<BudgetField, string>

const MONEY_FIELDS: readonly BudgetField[] = ['dailyBudgetUsd', 'monthlyBudgetUsd', 'monthlyIngestionBudgetUsd']

export function budgetFormOf(budget: AiBudgetView): BudgetForm {
  return Object.fromEntries(BUDGET_FIELDS.map((f) => [f, String(budget[f]).replace('.', ',')])) as BudgetForm
}

/** Khoảng cho phép của từng ô, theo trần backend trả (`ceilings`) */
export function budgetBounds(field: BudgetField, c: RagConfigurationLimits): { min: number; max: number } {
  switch (field) {
    case 'dailyBudgetUsd':
      return { min: 0, max: c.dailyBudgetUsdMax }
    case 'monthlyBudgetUsd':
      return { min: 0, max: c.monthlyBudgetUsdMax }
    case 'monthlyIngestionBudgetUsd':
      return { min: 0, max: c.monthlyIngestionBudgetUsdMax }
    case 'userRequestsPerDay':
      return { min: c.userRequestsPerDayMin, max: c.userRequestsPerDayMax }
    case 'userConcurrency':
      return { min: c.userConcurrencyMin, max: c.userConcurrencyMax }
    case 'globalConcurrency':
      return { min: c.globalConcurrencyMin, max: c.globalConcurrencyMax }
    case 'maxQuestionCharacters':
      return { min: c.maxQuestionCharactersMin, max: c.maxQuestionCharactersMax }
    case 'generationTimeoutSeconds':
      return { min: c.generationTimeoutSecondsMin, max: c.generationTimeoutSecondsMax }
  }
}

function parseField(field: BudgetField, text: string) {
  if (MONEY_FIELDS.includes(field)) return parseUsd(text, 2)
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : null
}

/** Lỗi theo ô; rỗng là gửi được */
export function budgetFormProblems(
  form: BudgetForm,
  ceilings: RagConfigurationLimits,
): Partial<Record<BudgetField, string>> {
  const problems: Partial<Record<BudgetField, string>> = {}
  for (const field of BUDGET_FIELDS) {
    const value = parseField(field, form[field])
    const { min, max } = budgetBounds(field, ceilings)
    const money = MONEY_FIELDS.includes(field)
    if (value === null) problems[field] = money ? 'Nhập số USD, tối đa 2 chữ số lẻ.' : 'Nhập số nguyên.'
    else if (value < min || value > max)
      problems[field] =
        `Trong khoảng ${String(min).replace('.', ',')}–${String(max).replace('.', ',')}${money ? ' USD' : ''}.`
  }
  const daily = parseField('dailyBudgetUsd', form.dailyBudgetUsd)
  const monthly = parseField('monthlyBudgetUsd', form.monthlyBudgetUsd)
  if (!problems.dailyBudgetUsd && daily !== null && monthly !== null && daily > monthly)
    problems.dailyBudgetUsd = 'Không lớn hơn ngân sách tháng.'
  return problems
}

/**
 * Thân PUT /admin/rag-budget: chỉ các ô đã đổi (backend giữ nguyên ô không gửi) + `expectedActiveVersion` của lần tải.
 * null khi không có gì đổi
 */
export function budgetUpdate(
  budget: AiBudgetView,
  form: BudgetForm,
  generationEnabled: boolean,
  notes: string,
): UpdateRagBudgetRequest | null {
  const body: UpdateRagBudgetRequest = { expectedActiveVersion: budget.activeVersion }
  let changed = false
  for (const field of BUDGET_FIELDS) {
    const value = parseField(field, form[field])
    if (value !== null && value !== budget[field]) {
      body[field] = value
      changed = true
    }
  }
  if (generationEnabled !== budget.generationEnabled) {
    body.generationEnabled = generationEnabled
    changed = true
  }
  if (!changed) return null
  if (notes.trim()) body.notes = notes.trim()
  return body
}
