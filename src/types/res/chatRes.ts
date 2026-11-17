// Viết tay vì swagger của tag Chat chỉ khai "200 OK". Theo Modules/KnowledgeBase/ChatService.cs và Advisor/SolarAdvisor.cs của
// backend `main` (ad10455)

/** Một đoạn tài liệu đã công bố được dùng để trả lời. Không có link tải: tài liệu chỉ quản trị đọc được */
export type CitationView = {
  /** Thứ tự từ 1 */
  rank: number
  documentId: string
  documentTitle: string
  versionId: string
  versionNumber: number
  chunkId: string
  page: number | null
  section: string | null
  score: number
  /** Trích đoạn, tối đa 500 ký tự */
  snippet: string | null
}

/** `role`: USER | ASSISTANT. `status`: COMPLETED | INSUFFICIENT_CONTEXT | FAILED */
export type ChatMessageView = {
  messageId: string
  role: string
  content: string
  status: string
  createdAt: string
  citations: CitationView[]
}

/**
 * POST /api/chat/messages. `grounded` = câu trả lời có tài liệu đã công bố hỗ trợ (answer.status COMPLETED); false thì
 * `answer.content` là câu "chưa có đủ tài liệu" của backend và không có nguồn. `notice` luôn có
 */
export type ChatAnswerView = {
  sessionId: string
  question: ChatMessageView
  answer: ChatMessageView
  grounded: boolean
  notice: string
  /** Có khi câu hỏi là câu hỏi cấu hình (diện tích, ngân sách, điện tiêu thụ) và được trợ lý cấu hình trả lời, không qua tài liệu */
  advisor?: SolarAdvisorView | null
}

/** READY: đã tính được cấu hình; NEEDS_INPUT: thiếu số liệu (xem `missingInputs`); BLOCKED: thiếu dữ liệu để trả lời an toàn */
export type SolarAdvisorStatus = 'READY' | 'NEEDS_INPUT' | 'BLOCKED' | (string & {})

/** Số liệu trợ lý đã dùng (gộp từ câu hỏi, các lượt trước của phiên và ô nhập) */
export type SolarAdvisorInput = {
  roofAreaM2: number | null
  budgetVnd: number | null
  monthlyConsumptionKwh: number | null
  propertySiteId: string | null
  latitude: number | null
  longitude: number | null
  tiltDegree: number | null
  azimuthDegree: number | null
  wantsBattery: boolean
}

/** `question` là câu tiếng Việt của backend */
export type AdvisorMissingInput = { code: string; question: string }

export type AdvisorProductRef = { productId: string; sku: string; name: string; brand: string; unitPrice: number }

export type AdvisorCostLine = {
  code: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  amount: number
  productId: string | null
}

/** Một cấu hình tham khảo. `limitedBy`: CONSUMPTION | AREA | BUDGET. Tiền là VND theo giá danh mục hiện hành, KHÔNG phải báo giá */
export type AdvisorConfiguration = {
  panel: AdvisorProductRef
  panelRatedPowerW: number
  panelCount: number
  systemKwp: number
  moduleFootprintM2: number
  inverter: AdvisorProductRef | null
  inverterRatedAcPowerW: number | null
  inverterMaxDcInputPowerW: number | null
  inverterNote: string | null
  costLines: AdvisorCostLine[]
  subtotal: number
  taxRatePercent: number
  estimatedTax: number
  estimatedTotal: number
  annualProductionKwh: number | null
  averageMonthlyProductionKwh: number | null
  consumptionCoveragePercent: number | null
  limitedBy: string
  withinBudget: boolean
}

export type AdvisorSource = { kind: string; reference: string; detail: string }

/** POST /api/chat/advisor và `advisor` của POST /api/chat/messages. Không lưu gì, không tạo báo giá / lịch hẹn */
export type SolarAdvisorView = {
  status: SolarAdvisorStatus
  input: SolarAdvisorInput
  missingInputs: AdvisorMissingInput[]
  configurations: AdvisorConfiguration[]
  specificYieldKwhPerKwpYear: number | null
  yieldSource: string | null
  requiredKwpForConsumption: number | null
  theoreticalMaxPanelsByArea: number | null
  assumptions: string[]
  limitations: string[]
  blocked: string[]
  sources: AdvisorSource[]
  disclaimer: string
  elapsedMs: number
  providerMs: number
}

/** GET /api/chat/sessions. `title`: 80 ký tự đầu của câu hỏi đầu tiên */
export type ChatSessionView = {
  sessionId: string
  title: string
  createdAt: string
  updatedAt: string
}

/** GET /api/chat/sessions/{sessionId}: tin nhắn theo thời gian, không kèm `grounded` / `notice` */
export type ChatSessionDetailView = {
  session: ChatSessionView
  messages: ChatMessageView[]
}
