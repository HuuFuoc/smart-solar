// Viết tay theo record C# RagConfigurationService.cs (backend nhánh cloud RAG 4fb5b95); swagger chỉ khai "200 OK"

export type RagConfigurationValues = {
  generationModel: string
  temperature?: number | null
  /** Chỉ nhận giá trị trong `reasoningEfforts` của model; null khi model không có */
  reasoningEffort?: string | null
  maxOutputTokens: number
  chunkCharacters: number
  chunkOverlap: number
  topK: number
  minScore: number
  maxContextTokens: number
  maxHistoryMessages: number
  promptVersion: string
}

/** Giới hạn chi phí đi kèm mỗi phiên bản cấu hình (đổi riêng bằng PUT /admin/rag-budget) */
export type RagCostControls = {
  generationEnabled: boolean
  userRequestsPerDay: number
  userConcurrency: number
  globalConcurrency: number
  maxQuestionCharacters: number
  generationTimeoutSeconds: number
  dailyBudgetUsd: number
  monthlyBudgetUsd: number
  monthlyIngestionBudgetUsd: number
}

export type RagConfigurationView = RagConfigurationValues &
  Partial<RagCostControls> & {
    version: number
    status: 'DRAFT' | 'ACTIVE' | 'SUPERSEDED'
    supportsTemperature: boolean
    tokenParameter: string
    notes?: string | null
    basedOnVersion?: number | null
    createdBy?: string | null
    createdAt?: string | null
    updatedAt?: string | null
    activatedBy?: string | null
    activatedAt?: string | null
    revision: number
  }

export type RagConfigurationState = {
  bootstrap: boolean
  effective: RagConfigurationView
  active?: RagConfigurationView | null
  draft?: RagConfigurationView | null
}

/** RagGenerationModelView. Giá theo USD / 1 triệu token, null khi registry chưa có giá (vd. model chạy trong máy) */
export type RagGenerationModel = {
  id: string
  displayName?: string
  supportsTemperature: boolean
  tokenParameter: string
  maxOutputTokensLimit: number
  provider?: string
  enabled?: boolean
  /** false: không chọn được (thiếu khoá, chưa bật); cấu hình cũ có thể vẫn đang dùng */
  usable?: boolean
  reasoningEfforts?: string[] | null
  defaultReasoningEffort?: string | null
  inputUsdPerMillion?: number | null
  cachedInputUsdPerMillion?: number | null
  outputUsdPerMillion?: number | null
  pricingSource?: string | null
  pricingEffectiveDate?: string | null
  /** Model rẻ nhất dùng được, là mặc định của backend */
  isDefault?: boolean
}

/** RagConfigurationLimitsView: trần cứng của backend, quản trị không vượt được */
export type RagConfigurationLimits = {
  chunkCharactersMin: number
  chunkCharactersMax: number
  chunkOverlapRule: string
  topKMin: number
  topKMax: number
  minScoreMin: number
  minScoreMax: number
  maxContextTokensMin: number
  maxContextTokensMax: number
  maxOutputTokensMin: number
  maxOutputTokensMax: number
  temperatureMin: number
  temperatureMax: number
  maxHistoryMessagesMin: number
  maxHistoryMessagesMax: number
  userRequestsPerDayMin: number
  userRequestsPerDayMax: number
  userConcurrencyMin: number
  userConcurrencyMax: number
  globalConcurrencyMin: number
  globalConcurrencyMax: number
  maxQuestionCharactersMin: number
  maxQuestionCharactersMax: number
  generationTimeoutSecondsMin: number
  generationTimeoutSecondsMax: number
  dailyBudgetUsdMax: number
  monthlyBudgetUsdMax: number
  monthlyIngestionBudgetUsdMax: number
}

export type RagModelCatalog = {
  models: RagGenerationModel[]
  promptVersions: string[]
  limits?: RagConfigurationLimits
}

export type RagConfigurationHistoryView = {
  items: RagConfigurationView[]
  total: number
  page: number
  pageSize: number
}

export type SaveRagConfigurationDraftRequest = Partial<RagConfigurationValues> &
  Partial<RagCostControls> & {
    notes?: string
    expectedRevision?: number
  }

/**
 * Giá trị mặc định của backend (RagOptions, RagCostDefaults). Model, độ ngẫu nhiên và mức suy luận lấy theo model mặc định của
 * registry (`isDefault`), không ghi sẵn ở đây
 */
export const DEFAULT_RAG_VALUES: Omit<RagConfigurationValues, 'generationModel' | 'temperature' | 'reasoningEffort'> = {
  maxOutputTokens: 300,
  chunkCharacters: 2400,
  chunkOverlap: 300,
  topK: 6,
  minScore: 0.2,
  maxContextTokens: 2000,
  maxHistoryMessages: 6,
  promptVersion: 'v1',
}

/** Độ ngẫu nhiên mặc định của backend cho model nhận tham số này */
export const DEFAULT_RAG_TEMPERATURE = 0.1

/** POST .../draft/validate: kiểm lại bản nháp đã lưu và cho biết số phiên bản tài liệu phải nạp lại nếu áp dụng */
export type RagConfigurationValidationView = {
  version: number
  valid: boolean
  /** Theo tên tham số, mỗi tham số một hay nhiều câu tiếng Anh của backend */
  errors: Record<string, string[]>
  chunkSettingsChanged: boolean
  versionsNeedingReindex: number
}

/** POST .../draft/activate, .../rollback và PUT /admin/rag-budget. Đổi cách cắt đoạn không tự nạp lại tài liệu */
export type RagActivationView = {
  active: RagConfigurationView
  supersededVersion: number | null
  chunkSettingsChanged: boolean
  versionsNeedingReindex: number
}

/** POST .../reindex-stale (202): mới xếp lượt nạp cho các phiên bản cắt theo cấu hình cũ, chưa phải đã nạp xong */
export type RagReindexStaleView = {
  configVersion: number
  stale: number
  queued: number
  /** Phiên bản đang có lượt nạp chờ nên bỏ qua */
  skippedOpenJob: number
  /** Cận trên chi phí nạp của các phiên bản vừa xếp (USD) */
  estimatedCostUsd?: number
  remainingIngestionBudgetUsd?: number
}
