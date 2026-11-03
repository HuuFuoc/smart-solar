// Luật của khu vực phục vụ, bám ZoneHandlers và các validator của backend (Modules.Scheduling.Zones); backend vẫn kiểm lại.
// Không import giá trị qua "@/" để chạy được bằng node --test

export const ZONE_LIMITS = {
  codeMax: 50,
  nameMax: 150,
  reasonMax: 500,
  communesMax: 500,
} as const

/** Mẫu mã khu của backend (ZoneCodeFormat), so sau khi đã viết hoa */
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,49}$/
/** Mã phường, xã chính thức: 5 chữ số */
const COMMUNE_CODE = /^\d{5}$/

/** Backend cắt khoảng trắng và viết hoa trước khi lưu */
export function normalizeZoneCode(text: string) {
  return text.trim().toUpperCase()
}

export function zoneCodeError(text: string) {
  const code = normalizeZoneCode(text)
  if (!code) return 'Nhập mã khu.'
  if (!CODE_PATTERN.test(code))
    return 'Mã dài 2–50 ký tự, chỉ gồm chữ A–Z, số và dấu gạch ngang, không bắt đầu bằng dấu gạch ngang. Ví dụ KHU-THU-DUC.'
  return undefined
}

export function zoneNameError(text: string) {
  if (!text.trim()) return 'Nhập tên khu.'
  if (text.trim().length > ZONE_LIMITS.nameMax) return `Tên tối đa ${ZONE_LIMITS.nameMax} ký tự.`
  return undefined
}

/** Phần thêm và phần gỡ khi thay cả danh sách phường, xã của khu */
export function communeDiff(current: readonly string[], next: readonly string[]) {
  const before = new Set(current)
  const after = new Set(next)
  return {
    added: [...after].filter((code) => !before.has(code)),
    removed: [...before].filter((code) => !after.has(code)),
  }
}

/** Lỗi của cả danh sách trước khi gửi; undefined khi gửi được */
export function communeSetError(codes: readonly string[]) {
  if (codes.length > ZONE_LIMITS.communesMax) return `Mỗi khu tối đa ${ZONE_LIMITS.communesMax} phường, xã.`
  const bad = codes.filter((c) => !COMMUNE_CODE.test(c))
  return bad.length ? `Mã phường, xã không hợp lệ: ${bad.join(', ')}.` : undefined
}

export type ZoneFlags = { isActive: boolean; isServiceable: boolean }

/** Thay đổi làm khu ngừng nhận việc mới: backend từ chối (ZONE_IN_USE) khi khu còn lịch / công trình chưa xong */
export function stopsNewWork(before: ZoneFlags, after: ZoneFlags) {
  return (before.isActive && !after.isActive) || (before.isServiceable && !after.isServiceable)
}

/** Nhãn trạng thái của khu: ngừng hoạt động khác tạm ngừng nhận lịch */
export function zoneState(z: ZoneFlags) {
  if (!z.isActive) return 'inactive' as const
  if (!z.isServiceable) return 'paused' as const
  return 'open' as const
}
