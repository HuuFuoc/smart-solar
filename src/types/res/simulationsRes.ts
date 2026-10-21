// Viết tay vì swagger không có schema response (tag Simulations)
// Các mã (status, source, reason...) để kiểu string, mã đã biết liệt kê ở simulationDisplay.ts

/** e = Đông, n = Bắc, u = lên (mét), gốc là góc trên-trái mặt lắp */
export type WorldPoint = { e: number; n: number; u: number }

/** Quaternion theo thứ tự thành phần của Three.js. */
export type Quaternion = { x: number; y: number; z: number; w: number }

export type ProductSnapshot = {
  id: string
  sku: string
  name: string
  brand: string
  model: string | null
  ratedPowerW: number
  widthMm: number
  heightMm: number
}

export type ObstacleSnapshot = {
  name: string
  xM: number
  yM: number
  widthM: number
  lengthM: number
  heightM: number | null
  /** 4 góc chân vật cản trên mặt lắp, hệ thế giới. */
  baseCornersWorld: WorldPoint[]
}

export type SurfaceSnapshot = {
  lengthM: number
  widthM: number
  tiltDegree: number
  azimuthDegree: number
  latitude: number | null
  longitude: number | null
  obstacles: ObstacleSnapshot[]
}

export type MountingInfo = {
  /** "FLUSH" | "RACK" */
  type: string
  panelTiltDegree: number
  panelAzimuthDegree: number
  pvgisAspectDegree: number
}

export type InstallationValue = {
  valueMm: number
  /** MANUFACTURER_DOCUMENTED_MINIMUM, MANUFACTURER_DOCUMENTED, SITE_SPECIFIED, PRELIMINARY_DEFAULT, COMPUTED_SHADE_ESTIMATE, NOT_APPLICABLE */
  source: string
  documentedMinimumMm: number | null
  documentRef: string | null
  documentSection: string | null
  documentUrl: string | null
}

export type InstallationInfo = {
  units: string
  panelGapMm: InstallationValue
  rowGapMm: InstallationValue
  edgeSetbackMm: InstallationValue
  obstacleClearanceMm: InstallationValue
  rackLowEdgeClearanceMm: InstallationValue
  moduleThicknessMm: InstallationValue
  shadeEstimateRowGapMm: number | null
  shadingWindow: string
  /** ABSENT | VALID | INVALID */
  productInstallationSpecStatus: string
  productInstallationSpecErrors: string[]
  note: string
}

export type ComputedAreas = {
  grossSurfaceAreaM2: number
  obstacleOccupiedAreaM2: number
  availableSurfaceAreaM2: number
  installableAreaM2: number
  panelCoveredAreaM2: number
  totalModuleAreaM2: number
  note: string
}

/** Hình chiếu tấm pin trên mặt lắp, mét, hệ toạ độ mặt lắp; xoay từ +X về +Y. */
export type PanelFootprint = {
  centerXM: number
  centerYM: number
  widthM: number
  depthM: number
  rotationDegree: number
}

export type PanelPlacement = {
  index: number
  footprint: PanelFootprint
  /** widthM theo cạnh ngang của tấm, lengthM theo chiều dốc của tấm, thicknessM là độ dày. */
  physical: { widthM: number; lengthM: number; thicknessM: number }
  frontCenter: { xM: number; yM: number; heightAboveSurfaceM: number }
  /** Tâm mặt trước của tấm (hệ thế giới). */
  worldCenter: WorldPoint
  worldRotation: Quaternion
  lowEdgeClearanceM: number
  highEdgeHeightM: number
}

export type FrameInfo = {
  localFrame: string
  worldFrame: string
  azimuth: string
  /** x theo bề rộng tấm, y ngược dốc, z pháp tuyến. Mặt trước ở z = 0 */
  panelFrame: string
  note: string
  /** Gốc, +X, +X+Y, +Y của mặt lắp trong hệ thế giới. */
  surfaceCornersWorld: WorldPoint[]
  surfaceXAxisWorld: WorldPoint
  surfaceYAxisWorld: WorldPoint
  surfaceNormalWorld: WorldPoint
  panelRotation: Quaternion
}

export type LayoutDetails = {
  method: string
  /** LANDSCAPE | PORTRAIT; null khi không xếp được tấm nào. */
  orientation: string | null
  rowRotationDegree: number
  footprintWidthM: number | null
  footprintDepthM: number | null
  footprintIsConservativeBoundingBox: boolean
  /** PANEL_LARGER_THAN_INSTALLABLE_REGION, SETBACK_CONSUMES_SURFACE, OBSTACLES_BLOCK_ALL_POSITIONS */
  noPanelsReason: string | null
  placements: PanelPlacement[]
  frame: FrameInfo
}

export type LayoutInfo = {
  panelCount: number
  installedCapacityKwp: number
  computedAreas: ComputedAreas
  details: LayoutDetails
}

export type MonthlyPvEnergy = {
  /** 1..12 */
  month: number
  energyKwh: number
  stdDevKwh: number | null
  inPlaneIrradiationKwhPerM2: number | null
}

export type ProviderFailure = { code: string; message: string }

export type PvProviderMetadata = {
  provider: string
  providerVersion: string
  radiationDatabase: string | null
  meteoDatabase: string | null
  yearMin: number | null
  yearMax: number | null
  horizonDatabase: string | null
  mountingPlace: string
  technology: string
  useHorizon: boolean
  peakPowerKwp: number
  systemLossPercent: number
  angleSentDegree: number
  aspectSentDegree: number
  retrievedAt: string
}

export type EnergyScenario = {
  /** PRIMARY_CONSERVATIVE_REFERENCE | COMPARISON | PRIMARY */
  role: string
  /** "building" | "free" (PVGIS) */
  mountingPlace: string
  status: string
  failure: ProviderFailure | null
  annualEnergyKwh: number | null
  annualStdDevKwh: number | null
  specificYieldKwhPerKwpYear: number | null
  monthly: MonthlyPvEnergy[]
  provider: PvProviderMetadata | null
}

export type EnergyInfo = {
  /** SUCCEEDED | NOT_APPLICABLE | UNAVAILABLE | FAILED */
  status: string
  /** NO_PANELS | LOCATION_MISSING ... */
  reason: string | null
  estimateType: string
  /** null khi chưa ước tính được, hiển thị "chưa có dữ liệu", không phải 0. */
  annualEnergyKwh: number | null
  specificYieldKwhPerKwpYear: number | null
  monthly: MonthlyPvEnergy[]
  primaryMountingPlace: string | null
  scenarios: EnergyScenario[]
  assumptions: string[]
  disclaimer: string
}

export type ClimateMonth = {
  month: number
  daysInMonthUsed: number
  irradiationKwhPerM2PerDay: number | null
  irradiationKwhPerM2: number | null
  temperatureC: number | null
  precipitationMmPerDay: number | null
  precipitationMm: number | null
}

export type ClimateContext = {
  monthly: ClimateMonth[]
  annualIrradiationKwhPerM2: number | null
  annualPrecipitationMm: number | null
  annualMeanTemperatureC: number | null
  metadata: {
    provider: string
    apiVersion: string | null
    startYear: number
    endYear: number
    community: string
    sources: string[]
    requestedLatitude: number
    requestedLongitude: number
    parameterUnits: Record<string, string>
    retrievedAt: string
  }
}

export type ClimateInfo = {
  /** SUCCEEDED | UNAVAILABLE | FAILED */
  status: string
  reason: string | null
  failure: ProviderFailure | null
  context: ClimateContext | null
  disclaimer: string
}

export type SimulationWarning = { code: string; message: string }

/**
 * POST /api/pre-surveys/{id}/simulations (201 tạo mới, 200 dùng lại) và GET .../simulations/{simulationId}.
 * Kết quả chỉ được giữ tạm (mặc định 24 giờ), riêng mô phỏng khách đã chọn được lưu lại.
 */
export type SimulationDetail = {
  simulationId: string
  preSurveyId: string
  /** COMPLETED | PARTIALLY_COMPLETED, cả hai đều là kết quả đã lưu; xem riêng energy.status, climate.status. */
  status: string
  /** Tính theo hình học cũ (geometryVersion đã đổi). */
  isStale: boolean
  isSelected: boolean
  preSurveyGeometryVersion: number
  algorithmVersion: string
  createdAt: string
  engineeringReviewRequired: boolean
  product: ProductSnapshot
  surface: SurfaceSnapshot
  mounting: MountingInfo
  installation: InstallationInfo
  layout: LayoutInfo
  energy: EnergyInfo
  climate: ClimateInfo
  warnings: SimulationWarning[]
  limitations: string[]
  /** Lúc kết quả bị xoá khỏi bộ nhớ tạm, null nếu là bản lưu lâu dài */
  expiresAt: string | null
  /** CACHE (bộ nhớ tạm) | SNAPSHOT (bản lưu đầy đủ của mô phỏng đã chọn) */
  source: string
}

/** Một lần chạy còn trong bộ nhớ tạm, hết hạn thì tự biến khỏi danh sách */
export type SimulationListItem = {
  simulationId: string
  status: string
  energyStatus: string
  climateStatus: string
  isStale: boolean
  isSelected: boolean
  preSurveyGeometryVersion: number
  mountingType: string
  productId: string
  productSku: string
  productName: string
  panelCount: number
  installedCapacityKwp: number
  annualEnergyKwh: number | null
  createdAt: string
  expiresAt: string
}

/**
 * Bản tóm tắt của mô phỏng khách đã chọn, lưu lâu dài trong database.
 * Trả về khi chọn, trong danh sách, và ở GET .../{simulationId} khi kết quả đầy đủ đã hết hạn.
 */
export type SelectedSimulation = {
  simulationId: string
  preSurveyId: string
  isStale: boolean
  preSurveyGeometryVersion: number
  algorithmVersion: string
  status: string
  energyStatus: string
  mountingType: string
  productId: string
  productSku: string
  productName: string
  panelCount: number
  installedCapacityKwp: number
  annualEnergyKwh: number | null
  specificYieldKwhPerKwpYear: number | null
  panelTiltDegree: number
  panelAzimuthDegree: number
  createdAt: string
  selectedAt: string
  snapshotStored: boolean
  /** NONE | STORED | VERIFIED | MISSING | UNAVAILABLE | INTEGRITY_FAILED */
  snapshotStatus: string
  /** Luôn là SUMMARY */
  source: string
}

/** GET /api/pre-surveys/{id}/simulations */
export type SimulationList = {
  /** Các lần chạy còn trong bộ nhớ tạm, mới nhất trước */
  items: SimulationListItem[]
  /** Mô phỏng khách đã chọn, null khi chưa chọn */
  selected: SelectedSimulation | null
  /** false khi không đọc được bộ nhớ tạm: items rỗng nhưng không có nghĩa là đã hết hạn */
  cacheAvailable: boolean
}

/** GET .../{simulationId} trả bản đầy đủ, hoặc chỉ bản tóm tắt khi kết quả đầy đủ đã hết hạn */
export type SimulationView = SimulationDetail | SelectedSimulation
