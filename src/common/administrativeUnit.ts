// Enum và giới hạn của danh mục hành chính (Modules.AdministrativeUnits của backend)

/** AdministrativeUnitQueries: q của legacy-lookup tính sau khi bỏ dấu và gộp khoảng trắng */
export const LEGACY_LOOKUP_LIMITS = {
  queryMin: 2,
  queryMax: 100,
  /** Tối đa số đơn vị cũ trả về, quá thì `truncated` */
  matchesMax: 50,
} as const

/** LegacyMatchTypes */
export const LEGACY_MATCH_TYPES = {
  LEGACY_COMMUNE: 'LEGACY_COMMUNE',
  LEGACY_DISTRICT: 'LEGACY_DISTRICT',
} as const

/** LegacyMergeTypes: phường, xã cũ nhập vào phường, xã mới thế nào */
export const LEGACY_MERGE_TYPES: Record<string, { label: string; hint: string | null }> = {
  WHOLE: { label: 'Nhập toàn bộ', hint: null },
  UNCHANGED: { label: 'Giữ nguyên', hint: null },
  PARTIAL: {
    label: 'Một phần',
    hint: 'Địa bàn cũ được chia cho nhiều phường, xã mới: tên cũ chưa đủ để biết, đối chiếu thêm số nhà, tên đường.',
  },
}
