// Viết tay theo record C# của backend vì swagger chỉ khai "200 OK": Modules/AdministrativeUnits/AdministrativeUnitQueries.cs của
// backend `main` (7c79fa8), cùng bản với image smartsolar-api build 21/10/2026

/** Tỉnh, thành phố đang hiệu lực (GET /api/administrative-units/provinces). `unitType`: PROVINCE | MUNICIPALITY */
export type ProvinceView = {
  /** 2 chữ số, giữ số 0 ở đầu */
  code: string
  name: string
  unitType: string
}

/** Một phường, xã hoặc đặc khu đang hiệu lực (GET /api/administrative-units/communes) */
export type Commune = {
  /** 5 chữ số, giữ số 0 ở đầu */
  code: string
  name: string
  /** WARD | COMMUNE | SPECIAL_ZONE */
  unitType: string
  provinceCode: string
}

/** Đơn vị hành chính cũ (trước 01/07/2025). `code` null khi danh mục không ghi mã */
export type LegacyUnitView = {
  code: string | null
  name: string
}

/**
 * Một phường, xã hiện tại đã nhận (toàn bộ hoặc một phần) đơn vị cũ. `code` là mã phường, xã MỚI, khác `legacyCommune.code`
 * (có khi trùng số). `mergeType`: WHOLE | PARTIAL (đơn vị cũ bị chia cho nhiều phường mới) | UNCHANGED
 */
export type LegacyCandidateView = {
  code: string
  name: string
  unitType: string
  provinceCode: string
  mergeType: string
  legacyDistrict: LegacyUnitView
  legacyCommune: LegacyUnitView | null
}

/** Một đơn vị cũ khớp từ khoá. `matchType`: LEGACY_COMMUNE (phường, xã cũ) | LEGACY_DISTRICT (cả quận, huyện cũ) */
export type LegacyMatchView = {
  matchType: string
  legacyCommune: LegacyUnitView | null
  legacyDistrict: LegacyUnitView
  legacyProvince: LegacyUnitView
  candidates: LegacyCandidateView[]
  /** Hơn một phường, xã mới khác nhau */
  ambiguous: boolean
  /** Luôn true: backend không chọn hộ, người dùng phải tự chọn */
  requiresConfirmation: boolean
}

/** GET /api/administrative-units/legacy-lookup. Tối đa 50 kết quả, `truncated` khi còn nữa */
export type LegacyLookupView = {
  query: string
  provinceCode: string | null
  matches: LegacyMatchView[]
  ambiguous: boolean
  requiresConfirmation: boolean
  truncated: boolean
}
