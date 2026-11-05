import type { OnSiteSurveyAmendmentRequest, OnSiteSurveyRequest } from '@/types/req/technicianOnSiteSurveyReq'
import type { OnSiteSurveyAmendmentView, OnSiteSurveyAttachmentView } from '@/types/res/technicianOnSiteSurveyRes'

// Bổ sung biên bản khảo sát đã hoàn thành, bám OnSiteSurveyHandlers.AmendAsync của backend `main` (7c79fa8):
// - lý do bắt buộc, tối đa 1000 ký tự; `revision` phải là revision đang xem (lệch thì ONSITE_SURVEY_STALE_REVISION)
// - `changes`: ô null giữ nguyên giá trị cũ (Merge), nên chỉ gửi ô đã đổi; ô chữ xoá trắng gửi "" thì backend lưu thành trống;
//   ô số không xoá được. `obstacles` có mặt thì thay cả danh sách vật cản
// - biên bản sau khi gộp vẫn phải đủ ô bắt buộc; không đổi gì và không thêm tệp thì backend từ chối
// - backend ghi { ô: { old, new } } của từng lần bổ sung (vật cản: { old: [...], new: [...] }) và tăng `version`
// Không import giá trị qua "@/" để chạy được bằng node --test

export const AMENDMENT_REASON_MAX = 1000

/**
 * AuthorizeAsync + AmendAsync: biên bản đã hoàn thành, thuộc đúng lịch này, và lịch vẫn là của mình (ACCEPTED / ASSIGNED,
 * hoặc COMPLETED sau khi hoàn thành)
 */
export function canAmend(
  survey: { status: string; appointmentId: string } | null | undefined,
  job: { appointmentId: string; status: string },
) {
  return (
    survey?.status === 'COMPLETED' &&
    survey.appointmentId === job.appointmentId &&
    ['ACCEPTED', 'ASSIGNED', 'COMPLETED'].includes(job.status)
  )
}

/** Giá trị form đã chuẩn hoá: kết quả của toRequest(form, null) */
export type SurveyValues = Omit<OnSiteSurveyRequest, 'revision'>

const TEXT_FIELDS = [
  'roofType',
  'roofMaterial',
  'roofCondition',
  'installationFeasibility',
  'electricalCabinetNotes',
  'electricalConnectionNotes',
  'proposedInverterLocation',
  'proposedPanelLayoutNotes',
  'notes',
] as const
const NUMBER_FIELDS = ['roofLengthM', 'roofWidthM', 'usableAreaM2', 'tiltDegree', 'azimuthDegree'] as const

export type AmendmentDiff = {
  changes: OnSiteSurveyRequest
  /** Tên các ô đã đổi, theo tên trường của backend (vật cản là `obstacles`, toạ độ là `measuredLatitude`) */
  changed: string[]
  /** Ô số hoặc toạ độ bị xoá trắng: bản bổ sung không xoá được giá trị đã ghi */
  uncleared: string[]
}

const blank = (value: unknown) => value === null || value === undefined || value === ''

export function amendmentDiff(current: SurveyValues, original: SurveyValues): AmendmentDiff {
  const changes: OnSiteSurveyRequest = {}
  const changed: string[] = []
  const uncleared: string[] = []

  for (const field of TEXT_FIELDS) {
    const now = current[field] ?? null
    const before = original[field] ?? null
    if (now === before) continue
    if (blank(now) && blank(before)) continue
    changes[field] = now ?? ''
    changed.push(field)
  }
  for (const field of NUMBER_FIELDS) {
    const now = current[field] ?? null
    const before = original[field] ?? null
    if (now === before) continue
    if (now === null) {
      uncleared.push(field)
      continue
    }
    changes[field] = now
    changed.push(field)
  }

  // Backend kiểm "vĩ độ và kinh độ đi cùng nhau" trên chính phần `changes`, nên đổi một thì gửi cả hai
  const lat = current.measuredLatitude ?? null
  const lng = current.measuredLongitude ?? null
  if (lat !== (original.measuredLatitude ?? null) || lng !== (original.measuredLongitude ?? null)) {
    if (lat === null || lng === null) uncleared.push('measuredLatitude')
    else {
      changes.measuredLatitude = lat
      changes.measuredLongitude = lng
      changed.push('measuredLatitude')
    }
  }

  if (JSON.stringify(current.obstacles ?? []) !== JSON.stringify(original.obstacles ?? [])) {
    changes.obstacles = current.obstacles ?? []
    changed.push('obstacles')
  }
  return { changes, changed, uncleared }
}

export function amendmentErrors({
  reason,
  diff,
  fileCount,
}: {
  reason: string
  diff: AmendmentDiff
  fileCount: number
}): { reason?: string; form?: string } {
  const errors: { reason?: string; form?: string } = {}
  if (!reason.trim()) errors.reason = 'Ghi lý do bổ sung.'
  else if (reason.trim().length > AMENDMENT_REASON_MAX) errors.reason = `Lý do tối đa ${AMENDMENT_REASON_MAX} ký tự.`
  if (diff.uncleared.length > 0)
    errors.form = 'Bản bổ sung không xoá được số đo hay toạ độ đã ghi. Nhập giá trị mới hoặc giữ giá trị cũ.'
  else if (diff.changed.length === 0 && fileCount === 0)
    errors.form = 'Chưa có gì thay đổi. Sửa ít nhất một ô hoặc thêm tệp.'
  return errors
}

export function amendmentBody({
  revision,
  reason,
  diff,
  fileIds,
}: {
  revision: number
  reason: string
  diff: AmendmentDiff
  fileIds: string[]
}): OnSiteSurveyAmendmentRequest {
  return { revision, reason: reason.trim(), changes: diff.changes, additionalFileIds: fileIds }
}

// ---- lịch sử bổ sung (đọc từ `amendments` của biên bản)

export type AmendmentValue = string | number | boolean | null
export type ObstacleSnapshot = {
  kind: string
  description: string | null
  heightM: number | null
  areaM2: number | null
}
export type AmendmentEntry =
  | { field: string; kind: 'value'; old: AmendmentValue; new: AmendmentValue }
  | { field: 'obstacles'; kind: 'obstacles'; old: ObstacleSnapshot[]; new: ObstacleSnapshot[] }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const scalar = (v: unknown): AmendmentValue =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : null
const obstacleList = (v: unknown): ObstacleSnapshot[] =>
  Array.isArray(v)
    ? v.filter(isRecord).map((o) => ({
        kind: typeof o.kind === 'string' ? o.kind : '',
        description: typeof o.description === 'string' ? o.description : null,
        heightM: typeof o.heightM === 'number' ? o.heightM : null,
        areaM2: typeof o.areaM2 === 'number' ? o.areaM2 : null,
      }))
    : []

/** Các ô đã đổi của một lần bổ sung. Dạng lạ (backend đổi cấu trúc) thì bỏ qua ô đó, không đoán */
export function amendmentEntries(changes: unknown): AmendmentEntry[] {
  if (!isRecord(changes)) return []
  const entries: AmendmentEntry[] = []
  for (const [field, value] of Object.entries(changes)) {
    if (!isRecord(value) || !('old' in value || 'new' in value)) continue
    if (field === 'obstacles')
      entries.push({ field, kind: 'obstacles', old: obstacleList(value.old), new: obstacleList(value.new) })
    else entries.push({ field, kind: 'value', old: scalar(value.old), new: scalar(value.new) })
  }
  return entries
}

/** Mới nhất lên đầu */
export const amendmentsNewestFirst = (list: OnSiteSurveyAmendmentView[]) =>
  [...list].sort((a, b) => b.amendmentNumber - a.amendmentNumber)

/**
 * Tệp gắn qua một lần bổ sung. View của lần bổ sung không có id, nhưng backend ghi tệp và lần bổ sung trong cùng giao
 * dịch với cùng một mốc giờ, nên ghép theo mốc giờ
 */
export const amendmentFiles = (amendment: OnSiteSurveyAmendmentView, attachments: OnSiteSurveyAttachmentView[]) =>
  attachments.filter((a) => a.amendmentId !== null && a.addedAt === amendment.createdAt)
