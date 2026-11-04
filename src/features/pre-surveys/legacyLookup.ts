import type { Commune, LegacyLookupView, LegacyMatchView } from '@/types/res/administrativeUnitsRes'
import { LEGACY_LOOKUP_LIMITS, LEGACY_MATCH_TYPES } from '../../common/administrativeUnit.ts'

// Tra phường, xã mới từ địa chỉ trước 01/07/2025 (GET /api/administrative-units/legacy-lookup), bám AdministrativeUnitQueries
// của backend `main` (7c79fa8). Backend không bao giờ chọn hộ (requiresConfirmation luôn true): người dùng tự bấm chọn một
// phường, xã, kể cả khi chỉ có một kết quả. Không import giá trị qua "@/" để chạy được bằng node --test

/** Như VietnameseText.Normalize: bỏ dấu (đ → d), chữ thường, gộp khoảng trắng. Dùng làm khoá cache để "Gò Vấp" = "go vap" */
export function legacySearchKey(q: string) {
  return q
    .trim()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFC')
}

/** Lý do chưa gọi API; null là gọi được */
export function legacyQueryProblem(q: string): string | null {
  if (legacySearchKey(q).length < LEGACY_LOOKUP_LIMITS.queryMin)
    return `Gõ ít nhất ${LEGACY_LOOKUP_LIMITS.queryMin} ký tự.`
  if (q.trim().length > LEGACY_LOOKUP_LIMITS.queryMax) return `Tối đa ${LEGACY_LOOKUP_LIMITS.queryMax} ký tự.`
  return null
}

export type LegacyChoice = {
  /** Mã phường, xã MỚI (candidate.code), không phải mã cũ */
  code: string
  name: string
  /** Địa bàn cũ bị chia cho nhiều phường, xã mới */
  partial: boolean
  /** Phường, xã cũ nhập vào phường mới này (khi tra theo quận, huyện cũ) */
  fromLegacy: string[]
}

export type LegacyGroup = {
  key: string
  /** "Phường 9, Quận 3" hoặc "Quận Gò Vấp" */
  title: string
  /** Tỉnh cũ khi khác tỉnh đang tra (vd. Tỉnh Bình Dương đã nhập vào TP.HCM) */
  province: string | null
  choices: LegacyChoice[]
}

/**
 * Gom kết quả để hiển thị: mỗi đơn vị cũ một nhóm, mỗi phường, xã mới một dòng. Tra theo quận cũ thì backend trả mỗi phường
 * cũ một dòng nên cùng một phường mới lặp lại: gộp theo mã mới, giữ danh sách phường cũ
 */
export function legacyGroups(view: LegacyLookupView, provinceCode: string): LegacyGroup[] {
  return view.matches.map((match, index) => ({
    key: `${match.matchType}:${match.legacyProvince.code}:${match.legacyDistrict.code}:${match.legacyCommune?.code ?? match.legacyCommune?.name ?? '-'}:${index}`,
    title: groupTitle(match),
    province: match.legacyProvince.code === provinceCode ? null : match.legacyProvince.name,
    choices: choicesOf(match),
  }))
}

function groupTitle(match: LegacyMatchView) {
  if (match.matchType === LEGACY_MATCH_TYPES.LEGACY_COMMUNE && match.legacyCommune)
    return `${match.legacyCommune.name}, ${match.legacyDistrict.name}`
  return match.legacyDistrict.name
}

function choicesOf(match: LegacyMatchView): LegacyChoice[] {
  const byCode = new Map<string, LegacyChoice>()
  for (const c of match.candidates) {
    const choice = byCode.get(c.code) ?? { code: c.code, name: c.name, partial: false, fromLegacy: [] }
    if (c.mergeType === 'PARTIAL') choice.partial = true
    const legacyName = c.legacyCommune?.name
    if (match.matchType === LEGACY_MATCH_TYPES.LEGACY_DISTRICT && legacyName && !choice.fromLegacy.includes(legacyName))
      choice.fromLegacy.push(legacyName)
    byCode.set(c.code, choice)
  }
  return [...byCode.values()]
}

/**
 * Đối chiếu lựa chọn với danh mục phường, xã đang hiệu lực trước khi đổ vào form: chỉ nhận khi mã mới có trong danh mục, lấy tên
 * theo danh mục. Danh mục chưa tải xong / lỗi hoặc không có mã đó thì trả null, không đổ mã chưa xác minh
 */
export function verifiedChoice(choice: Pick<LegacyChoice, 'code'>, communes: readonly Commune[] | undefined) {
  const commune = communes?.find((c) => c.code === choice.code)
  return commune ? { ward: commune.name, communeCode: commune.code } : null
}
