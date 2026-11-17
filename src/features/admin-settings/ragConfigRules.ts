import type {
  RagConfigurationLimits,
  RagConfigurationValues,
  RagCostControls,
  RagConfigurationView,
  RagGenerationModel,
  RagModelCatalog,
} from '@/types/res/adminRagConfigTypes'
import { DEFAULT_RAG_TEMPERATURE, DEFAULT_RAG_VALUES } from '../../types/res/adminRagConfigTypes.ts'

// Luật của tab Cấu hình AI, bám RagConfigurationRules + registry model của backend (nhánh cloud RAG 4fb5b95). Không import
// giá trị qua "@/" để chạy được bằng node --test

/** Trần riêng của dịch vụ trả lời (RAG_MAX_CONTEXT_TOKENS, RAG_MAX_OUTPUT_TOKENS mặc định): số lớn hơn vẫn lưu được nhưng không có tác dụng */
export const RAG_SERVICE_CAPS = { maxContextTokens: 2000, maxOutputTokens: 300 } as const

export type ModelOption = { model: RagGenerationModel; disabled: boolean }

/**
 * Model chọn được: chỉ model `usable`. Model đang dùng mà không còn dùng được (hoặc không có trong registry) vẫn đứng đầu
 * danh sách nhưng khoá, để quản trị thấy vì sao phải đổi
 */
export function modelOptions(catalog: RagModelCatalog | undefined, current: string): ModelOption[] {
  const models = catalog?.models ?? []
  const options = models.filter((m) => m.usable !== false).map((model) => ({ model, disabled: false }))
  if (current && !options.some((o) => o.model.id === current)) {
    const known = models.find((m) => m.id === current)
    options.unshift({
      model: known ?? {
        id: current,
        supportsTemperature: false,
        tokenParameter: '',
        maxOutputTokensLimit: 0,
        usable: false,
      },
      disabled: true,
    })
  }
  return options
}

export function findModel(catalog: RagModelCatalog | undefined, id: string) {
  return catalog?.models.find((m) => m.id === id)
}

/** Model đang chọn có dùng được không; registry chưa tải xong thì chưa kết luận */
export function isModelUsable(catalog: RagModelCatalog | undefined, id: string) {
  if (!catalog) return true
  const model = findModel(catalog, id)
  return Boolean(model && model.usable !== false)
}

/**
 * Đổi model: độ ngẫu nhiên chỉ giữ khi model nhận tham số này (không thì gửi null), mức suy luận chỉ lấy trong danh sách
 * của model, số token trả lời không vượt trần của model
 */
export function withModel(values: RagConfigurationValues, model: RagGenerationModel): RagConfigurationValues {
  const efforts = model.reasoningEfforts ?? []
  const keepEffort = values.reasoningEffort != null && efforts.includes(values.reasoningEffort)
  return {
    ...values,
    generationModel: model.id,
    temperature: model.supportsTemperature ? (values.temperature ?? DEFAULT_RAG_TEMPERATURE) : null,
    reasoningEffort:
      efforts.length === 0 ? null : keepEffort ? values.reasoningEffort : (model.defaultReasoningEffort ?? efforts[0]),
    maxOutputTokens:
      model.maxOutputTokensLimit > 0
        ? Math.min(values.maxOutputTokens, model.maxOutputTokensLimit)
        : values.maxOutputTokens,
  }
}

/** "Điền giá trị mặc định": mặc định của backend với model mặc định của registry; registry chưa có model dùng được thì null */
export function defaultRagValues(catalog: RagModelCatalog | undefined): RagConfigurationValues | null {
  const usable = (catalog?.models ?? []).filter((m) => m.usable !== false)
  const model = usable.find((m) => m.isDefault) ?? usable[0]
  if (!model) return null
  return withModel(
    { ...DEFAULT_RAG_VALUES, generationModel: model.id, temperature: DEFAULT_RAG_TEMPERATURE, reasoningEffort: null },
    model,
  )
}

/** Khoảng của các ô số theo trần backend; trần token trả lời còn theo model đang chọn */
export function fieldBounds(limits: RagConfigurationLimits | undefined, model: RagGenerationModel | undefined) {
  const outputMax = limits?.maxOutputTokensMax ?? 1500
  return {
    maxOutputTokens: {
      min: limits?.maxOutputTokensMin ?? 64,
      max: model && model.maxOutputTokensLimit > 0 ? Math.min(outputMax, model.maxOutputTokensLimit) : outputMax,
    },
    maxContextTokens: { min: limits?.maxContextTokensMin ?? 500, max: limits?.maxContextTokensMax ?? 6000 },
    chunkCharacters: { min: limits?.chunkCharactersMin ?? 400, max: limits?.chunkCharactersMax ?? 8000 },
    topK: { min: limits?.topKMin ?? 1, max: limits?.topKMax ?? 10 },
    minScore: { min: limits?.minScoreMin ?? 0, max: limits?.minScoreMax ?? 1 },
    temperature: { min: limits?.temperatureMin ?? 0, max: limits?.temperatureMax ?? 1 },
    maxHistoryMessages: { min: limits?.maxHistoryMessagesMin ?? 0, max: limits?.maxHistoryMessagesMax ?? 20 },
  }
}

const price = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 6 })

/** "Vào 0,15 USD, đọc lại 0,075 USD, ra 0,6 USD cho 1 triệu token"; registry chưa có giá thì null */
export function modelPriceText(model: RagGenerationModel): string | null {
  const parts = [
    model.inputUsdPerMillion != null && `vào ${price.format(model.inputUsdPerMillion)} USD`,
    model.cachedInputUsdPerMillion != null && `đọc lại ${price.format(model.cachedInputUsdPerMillion)} USD`,
    model.outputUsdPerMillion != null && `ra ${price.format(model.outputUsdPerMillion)} USD`,
  ].filter(Boolean)
  if (parts.length === 0) return null
  const text = parts.join(', ')
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} cho 1 triệu token`
}

/** Giới hạn chi phí đi theo phiên bản cấu hình (trang Chi phí AI đổi riêng, tạo phiên bản mới) */
export const COST_CONTROL_LABELS = {
  generationEnabled: 'Soạn câu trả lời',
  dailyBudgetUsd: 'Ngân sách ngày',
  monthlyBudgetUsd: 'Ngân sách tháng',
  monthlyIngestionBudgetUsd: 'Ngân sách nạp tài liệu tháng',
  userRequestsPerDay: 'Số câu mỗi người mỗi ngày',
  userConcurrency: 'Số câu cùng lúc mỗi người',
  globalConcurrency: 'Số câu cùng lúc toàn hệ thống',
  maxQuestionCharacters: 'Số ký tự mỗi câu hỏi',
  generationTimeoutSeconds: 'Thời gian chờ trả lời',
} as const

export type CostControlField = keyof typeof COST_CONTROL_LABELS

/**
 * Giới hạn chi phí của cấu hình đang dùng, gửi kèm khi lưu bản nháp: tab này không sửa các ô đó, nên bản nháp luôn mang
 * số đang dùng và áp dụng bản nháp không đưa giới hạn về số cũ
 */
export function costControlsOf(view: RagConfigurationView | null | undefined): Partial<RagCostControls> {
  if (!view) return {}
  const out: Partial<Record<CostControlField, unknown>> = {}
  for (const f of Object.keys(COST_CONTROL_LABELS) as CostControlField[]) if (view[f] !== undefined) out[f] = view[f]
  return out as Partial<RagCostControls>
}

/**
 * Ô giới hạn chi phí mà bản nháp khác cấu hình đang dùng. Bản nháp chép các ô này lúc tạo, nên nếu trang Chi phí AI đổi giới
 * hạn sau đó thì áp dụng bản nháp sẽ đưa giới hạn về số cũ
 */
export function costControlChanges(
  draft: RagConfigurationView | null | undefined,
  active: RagConfigurationView | null | undefined,
): CostControlField[] {
  if (!draft || !active) return []
  return (Object.keys(COST_CONTROL_LABELS) as CostControlField[]).filter(
    (f) => draft[f] !== undefined && active[f] !== undefined && draft[f] !== active[f],
  )
}
