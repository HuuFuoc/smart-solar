import type {
  ContinueRepairRequest,
  DiagnosedItemRequest,
  FinishOnSiteRequest,
  InspectionReportRequest,
} from '@/types/req/technicianAfterSalesReq'
import type { ServiceItemView } from '@/types/res/customerAfterSalesRes'
import type { TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'

// Luật buổi hẹn phía kỹ thuật viên: báo cáo kiểm tra (kể cả ở lại sửa luôn), sửa luôn trong buổi kiểm tra, kết thúc buổi
// chờ, hạng mục phát sinh khi sửa. Bám TechnicianServiceHandlers và AfterSalesWorkflow.NextStatus của backend `main`
// (7c79fa8). Chỉ để bật / tắt nút và báo lỗi trước khi gửi; backend vẫn kiểm lại. Không import giá trị qua "@/" để chạy
// được bằng node --test

/** Text.Trim của backend: phần dài hơn bị cắt, nên chặn ở ô nhập */
export const REPORT_MAX = 4000
export const ITEM_DESCRIPTION_MAX = 500
export const ITEM_DIAGNOSIS_MAX = 2000
export const ITEM_PARTS_MAX = 1000
export const FINISH_NOTE_MAX = 500
/** ContinueWithRepairAsync nhận 1–480 phút */
export const ESTIMATE_MIN = 1
export const ESTIMATE_MAX = 480

export type ItemDraft = { assetId: string; description: string; diagnosis: string; requiredParts: string }

export const emptyItemDraft = (): ItemDraft => ({ assetId: '', description: '', diagnosis: '', requiredParts: '' })

// ---- điều kiện theo trạng thái buổi hẹn

/** Buổi kiểm tra đang làm và chưa gửi kết quả (gửi với stayOnSite thì buổi vẫn IN_PROGRESS nhưng đã có kết quả) */
export const canReportInspection = (v: TechnicianVisitView) =>
  v.purpose === 'INSPECTION' && v.status === 'IN_PROGRESS' && !v.waitingOnSite

/** Đã gửi kết quả kiểm tra kèm stayOnSite, buổi và khung giờ vẫn giữ: chỉ người đã nhận mới sửa luôn được */
export const canContinueRepair = (v: TechnicianVisitView) => v.waitingOnSite && v.assignmentStatus === 'ACCEPTED'

export const canFinishOnSite = (v: TechnicianVisitView) => v.waitingOnSite

/** AddSupplementaryItemAsync: chỉ trong buổi sửa / làm lại đang làm */
export const canAddSupplementary = (v: TechnicianVisitView) =>
  (v.purpose === 'REPAIR' || v.purpose === 'REWORK') && v.status === 'IN_PROGRESS'

/** ReportWorkAsync: buổi sửa, bảo trì, làm lại đang làm */
export const canReportWork = (v: TechnicianVisitView) => v.purpose !== 'INSPECTION' && v.status === 'IN_PROGRESS'

// ---- báo cáo kiểm tra

export type InspectionDraft = { report: string; noFault: boolean; stayOnSite: boolean; items: ItemDraft[] }

export function itemDraftError(item: ItemDraft): string | null {
  if (!item.description.trim() || !item.diagnosis.trim()) return 'Mỗi hạng mục cần ghi tên và chẩn đoán.'
  if (item.description.trim().length > ITEM_DESCRIPTION_MAX) return `Tên hạng mục tối đa ${ITEM_DESCRIPTION_MAX} ký tự.`
  if (item.diagnosis.trim().length > ITEM_DIAGNOSIS_MAX) return `Chẩn đoán tối đa ${ITEM_DIAGNOSIS_MAX} ký tự.`
  if (item.requiredParts.trim().length > ITEM_PARTS_MAX) return `Vật tư cần tối đa ${ITEM_PARTS_MAX} ký tự.`
  return null
}

/** ReportInspectionAsync: cần mô tả; hoặc không lỗi, hoặc ít nhất một hạng mục đủ tên và chẩn đoán */
export function inspectionError(d: InspectionDraft): string | null {
  if (!d.report.trim()) return 'Ghi bạn đã kiểm tra gì và thấy gì.'
  if (d.report.trim().length > REPORT_MAX) return `Kết quả kiểm tra tối đa ${REPORT_MAX} ký tự.`
  if (d.noFault) return null
  if (d.items.length === 0) return 'Thêm ít nhất một hạng mục hỏng, hoặc đánh dấu Không phát hiện lỗi.'
  for (const item of d.items) {
    const problem = itemDraftError(item)
    if (problem) return problem
  }
  return null
}

const itemBody = (i: ItemDraft): DiagnosedItemRequest => ({
  assetId: i.assetId || null,
  description: i.description.trim(),
  diagnosis: i.diagnosis.trim(),
  requiredParts: i.requiredParts.trim() || null,
})

/** Backend từ chối không lỗi kèm stayOnSite ("Nothing to repair"), nên chỉ gửi true khi có hạng mục */
export function inspectionBody(d: InspectionDraft): InspectionReportRequest {
  return {
    report: d.report.trim(),
    noFaultFound: d.noFault,
    items: d.noFault ? [] : d.items.map(itemBody),
    stayOnSite: !d.noFault && d.stayOnSite,
  }
}

// ---- chờ tại công trình, sửa luôn

/** Số nguyên phút; null khi trống, NaN khi gõ không phải số nguyên dương */
export function parseMinutes(text: string): number | null {
  const t = text.trim()
  if (!t) return null
  return /^\d+$/.test(t) ? Number(t) : Number.NaN
}

export type ContinueDraft = { minutes: string; partsAvailable: boolean | null }
export type ContinueErrors = { minutes?: string; parts?: string }

export function continueRepairErrors(d: ContinueDraft): ContinueErrors {
  const errors: ContinueErrors = {}
  const minutes = parseMinutes(d.minutes)
  if (minutes === null) errors.minutes = 'Ước tính số phút cần để sửa.'
  else if (!Number.isInteger(minutes) || minutes < ESTIMATE_MIN || minutes > ESTIMATE_MAX)
    errors.minutes = `Nhập số phút nguyên từ ${ESTIMATE_MIN} đến ${ESTIMATE_MAX}.`
  if (d.partsAvailable === null) errors.parts = 'Chọn có đủ linh kiện hay không.'
  return errors
}

export function continueRepairBody(d: ContinueDraft): ContinueRepairRequest {
  return { estimatedMinutes: parseMinutes(d.minutes) ?? 0, partsAvailable: d.partsAvailable === true }
}

/** Số phút còn lại của khung giờ đã giữ cho buổi này (giờ máy, chỉ để gợi ý) */
export function minutesLeft(v: TechnicianVisitView, now = Date.now()) {
  return Math.max(0, Math.floor((new Date(v.endsAt).getTime() - now) / 60_000))
}

/** Gợi ý trước khi gửi: theo giờ máy thì ước tính vượt khung giờ. Backend tính theo giờ của nó và quyết định */
export function repairTimeWarning(v: TechnicianVisitView, minutes: number | null, now = Date.now()): string | null {
  if (minutes === null || !Number.isInteger(minutes) || minutes < ESTIMATE_MIN) return null
  const left = minutesLeft(v, now)
  if (minutes <= left) return null
  return left === 0
    ? 'Khung giờ của buổi này đã hết, hệ thống sẽ không cho sửa luôn.'
    : `Khung giờ của buổi này chỉ còn khoảng ${left} phút, có thể không đủ để sửa luôn.`
}

/**
 * Tình hình các hạng mục theo AfterSalesWorkflow.NextStatus: còn chờ quản lý quyết định, chờ báo giá, chờ khách đồng ý và
 * trả tiền, hay đã có việc được phép làm. Chỉ để kỹ thuật viên biết đang chờ gì; nút Sửa luôn vẫn để backend quyết định
 */
export type Readiness = 'decision' | 'quotation' | 'payment' | 'ready' | 'none'

const needsQuotation = (coverage: string) => coverage === 'CHARGEABLE' || coverage === 'DISASTER_PROTECTION'

export function readiness(items: ServiceItemView[]): { state: Readiness; count: number } {
  const count = (test: (i: ServiceItemView) => boolean) => items.filter(test).length
  const undecided = count((i) => i.coverage === 'PENDING' && i.status === 'OPEN')
  if (undecided > 0) return { state: 'decision', count: undecided }
  const toQuote = count((i) => needsQuotation(i.coverage) && i.status === 'OPEN')
  if (toQuote > 0) return { state: 'quotation', count: toQuote }
  const quoted = count((i) => i.status === 'QUOTED')
  if (quoted > 0) return { state: 'payment', count: quoted }
  const authorized = count((i) => i.status === 'AUTHORIZED')
  if (authorized > 0) return { state: 'ready', count: authorized }
  return { state: 'none', count: 0 }
}

/** Ba lỗi của ContinueWithRepairAsync khi chưa sửa luôn được: báo lý do và chỉ cách kết thúc buổi chờ */
export function onSiteBlock(code: string | null | undefined): { title: string; body: string } | null {
  if (code === 'AFTER_SALES_PAYMENT_REQUIRED')
    return {
      title: 'Chưa được phép sửa',
      body: 'Quản lý chưa quyết định hết các hạng mục, hoặc khách chưa đồng ý và thanh toán phần phải trả. Chờ thêm, hoặc kết thúc buổi chờ để quản lý xếp buổi sửa riêng.',
    }
  if (code === 'AFTER_SALES_PARTS_UNAVAILABLE')
    return {
      title: 'Thiếu linh kiện',
      body: 'Không sửa luôn được khi chưa đủ linh kiện. Kết thúc buổi chờ, quản lý sẽ xếp buổi sửa khi có linh kiện.',
    }
  if (code === 'AFTER_SALES_REPAIR_TIME_INSUFFICIENT')
    return {
      title: 'Không đủ thời gian trong buổi này',
      body: 'Thời gian sửa ước tính vượt khung giờ đã giữ cho buổi kiểm tra. Kết thúc buổi chờ, quản lý sẽ xếp buổi sửa riêng.',
    }
  return null
}

export function finishBody(note: string): FinishOnSiteRequest {
  return { note: note.trim() || null }
}

// ---- hạng mục phát sinh khi sửa

export type SupplementaryErrors = { description?: string; diagnosis?: string; requiredParts?: string }

export function supplementaryErrors(d: ItemDraft): SupplementaryErrors {
  const errors: SupplementaryErrors = {}
  const description = d.description.trim()
  const diagnosis = d.diagnosis.trim()
  if (!description) errors.description = 'Ghi tên hạng mục.'
  else if (description.length > ITEM_DESCRIPTION_MAX) errors.description = `Tối đa ${ITEM_DESCRIPTION_MAX} ký tự.`
  if (!diagnosis) errors.diagnosis = 'Ghi chẩn đoán.'
  else if (diagnosis.length > ITEM_DIAGNOSIS_MAX) errors.diagnosis = `Tối đa ${ITEM_DIAGNOSIS_MAX} ký tự.`
  if (d.requiredParts.trim().length > ITEM_PARTS_MAX) errors.requiredParts = `Tối đa ${ITEM_PARTS_MAX} ký tự.`
  return errors
}

export const supplementaryBody = (d: ItemDraft): DiagnosedItemRequest => itemBody(d)
