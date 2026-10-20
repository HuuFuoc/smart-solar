/*
 * Enum của mô phỏng (khách hàng và sales dùng chung). Backend trả mã ổn định kèm câu tiếng Anh: mã đã biết
 * (SimulationConstants.cs, InstallationModels.cs, EnergyContracts.cs, SimulationDocuments.cs của image 09/10/2026) dịch
 * sang tiếng Việt ở đây; hàm tra nhãn ở features/pre-surveys/components/simulationDisplay.ts, mã lạ in câu gốc của backend.
 */

export type MountingType = 'FLUSH' | 'RACK'

export const MOUNTING_TYPES = [
  { value: 'FLUSH', label: 'Áp mái', hint: 'Tấm nằm song song mặt mái, theo đúng độ dốc và hướng của mái.' },
  { value: 'RACK', label: 'Khung nghiêng', hint: 'Tấm đặt trên khung, có góc nghiêng và hướng riêng.' },
] as const satisfies readonly { value: MountingType; label: string; hint: string }[]

export const ORIENTATIONS: Record<string, string> = { LANDSCAPE: 'Tấm nằm ngang', PORTRAIT: 'Tấm đứng dọc' }

/** Kịch bản thông gió của PVGIS. */
export const SCENARIO_PLACES: Record<string, string> = {
  building: 'Áp sát mái, ít thông gió',
  free: 'Thông gió tự do',
}

/** Lý do không xếp được tấm nào. */
export const NO_PANEL_REASONS: Record<string, string> = {
  PANEL_LARGER_THAN_INSTALLABLE_REGION: 'Tấm pin lớn hơn vùng lắp được (mặt lắp đã trừ khoảng lùi mép).',
  SETBACK_CONSUMES_SURFACE: 'Khoảng lùi mép chiếm hết mặt lắp.',
  OBSTACLES_BLOCK_ALL_POSITIONS: 'Vật cản và khoảng cách quanh vật cản chiếm hết các vị trí đặt tấm.',
}

/** Lỗi của máy chủ dữ liệu ngoài (PVGIS, NASA POWER). */
export const PROVIDER_FAILURES: Record<string, string> = {
  PROVIDER_TIMEOUT: 'máy chủ dữ liệu phản hồi quá chậm',
  PROVIDER_UNAVAILABLE: 'không kết nối được máy chủ dữ liệu',
  PROVIDER_RATE_LIMITED: 'máy chủ dữ liệu đang giới hạn số lần gọi',
  PROVIDER_REJECTED_REQUEST: 'máy chủ dữ liệu từ chối yêu cầu',
  PROVIDER_RESPONSE_INVALID: 'dữ liệu trả về không đọc được',
  LOCATION_NOT_COVERED: 'toạ độ nằm ngoài vùng có dữ liệu',
}

/** Nguồn của từng khoảng cách lắp đặt. */
export const INSTALLATION_SOURCES: Record<string, string> = {
  MANUFACTURER_DOCUMENTED_MINIMUM: 'Tối thiểu theo tài liệu nhà sản xuất',
  MANUFACTURER_DOCUMENTED: 'Theo tài liệu nhà sản xuất',
  SITE_SPECIFIED: 'Nhập khi chạy mô phỏng',
  PRELIMINARY_DEFAULT: 'Mặc định sơ bộ',
  COMPUTED_SHADE_ESTIMATE: 'Tính theo bóng nắng',
  NOT_APPLICABLE: 'Không áp dụng',
}

/** Cảnh báo kỹ thuật câu cố định; cảnh báo có số trong câu dịch ở simulationDisplay.ts (dynamicWarning). */
export const SIMULATION_WARNINGS: Record<string, string> = {
  STRUCTURE_NOT_ASSESSED: 'Chưa đánh giá khả năng chịu lực của mái, cách bắt giá đỡ và kết cấu đỡ.',
  MOUNTING_SYSTEM_REQUIREMENTS_UNAVAILABLE: 'Danh mục chưa có yêu cầu lắp đặt của hệ khung giá đỡ nên chưa áp dụng.',
  BUILDING_FIRE_CODE_NOT_CHECKED: 'Chưa kiểm tra khoảng lùi và lối tiếp cận theo quy chuẩn xây dựng, phòng cháy.',
  PRELIMINARY_INSTALLATION_VALUES: 'Một số khoảng cách là giả định sơ bộ, không phải mức tối thiểu của nhà sản xuất hay quy chuẩn.',
  SITE_VALUES_NOT_VERIFIED: 'Các khoảng cách nhập tay chưa được kỹ sư kiểm tra.',
  MANUFACTURER_VALUES_NOT_INDEPENDENTLY_VERIFIED: 'Số liệu theo tài liệu nhà sản xuất do người nhập danh mục ghi lại, Smart Solar chưa kiểm chứng độc lập.',
  PRODUCT_INSTALLATION_SPEC_INVALID: 'Khối thông số lắp đặt của sản phẩm không hợp lệ nên bị bỏ qua.',
  MODULE_THICKNESS_ASSUMED: 'Tài liệu tấm pin chưa có độ dày; tạm lấy 40 mm để tính và vẽ.',
  RACK_ON_INCLINED_SURFACE: 'Lắp khung nghiêng trên mái dốc cần kỹ sư kiểm tra giá đỡ và cách bắt.',
  FOOTPRINT_CONSERVATIVE_BOUNDING_BOX: 'Hướng tấm khác hướng mái dốc: bố trí dùng khung bao an toàn cho hình chiếu từng tấm.',
  SHADE_SPACING_NOT_EVALUATED: 'Địa điểm chưa có toạ độ nên chưa ước tính bóng đổ giữa các hàng.',
  OBSTACLE_SHADING_NOT_MODELED: 'Chưa tính bóng đổ của vật cản; chiều cao vật cản chỉ dùng để vẽ 3D.',
  LOCATION_MISSING: 'Địa điểm chưa có toạ độ nên chưa ước tính được sản lượng và khí hậu.',
  FLUSH_MOUNT_THERMAL_ASSUMPTION: 'Sản lượng áp mái lấy kịch bản "áp sát mái" của PVGIS làm tham chiếu thận trọng, kèm kịch bản "thông gió tự do" để so sánh.',
}
