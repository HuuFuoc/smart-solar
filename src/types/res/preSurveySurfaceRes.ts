// Viết tay vì swagger không có schema response (tag PreSurveySurface)

/** Vật cản hình chữ nhật, đơn vị mét. (xM, yM) là góc trên-trái, heightM chỉ dùng để vẽ 3D */
export type SurfaceObstacle = {
  name: string
  xM: number
  yM: number
  widthM: number
  lengthM: number
  heightM: number | null
}

/** Số liệu khách khai qua PUT /api/pre-surveys/{id} */
export type DeclaredSurveyValues = {
  totalAreaM2: number | null
  usableAreaM2: number | null
  hasObstruction: boolean | null
  note: string
}

/** Quy ước toạ độ (chữ tiếng Anh của backend, chỉ để tham khảo). */
export type SurfaceConventions = {
  units: string
  origin: string
  xAxis: string
  yAxis: string
  azimuth: string
  obstacleHeight: string
}

/** GET /api/pre-surveys/{id}/surface, chỉ khách hàng sở hữu bản đánh giá. */
export type PreSurveySurfaceView = {
  preSurveyId: string
  /** Tên enum PreSurveyStatus viết hoa: "DRAFT", "SUBMITTED". */
  status: string
  /** Tăng mỗi lần ghi bản đánh giá, gửi làm expectedRevision */
  revision: number
  /** Chỉ tăng khi hình học đổi, gửi làm expectedGeometryVersion khi chạy mô phỏng */
  geometryVersion: number
  /** Đã lưu kích thước và danh sách vật cản (có thể rỗng) ít nhất một lần. */
  surfaceDefined: boolean
  surfaceLengthM: number | null
  surfaceWidthM: number | null
  /** Dùng chung cột với tiltDegree / azimuthDegree của form cũ. */
  surfaceTiltDegree: number | null
  surfaceAzimuthDegree: number | null
  /** Mảng rỗng cả khi chưa lưu mặt lắp, xem `surfaceDefined`. */
  obstacles: SurfaceObstacle[]
  declared: DeclaredSurveyValues
  latitude: number | null
  longitude: number | null
  /** Lần mô phỏng khách tạo hoặc dùng lại gần nhất (backend tự chọn khi POST simulation). */
  selectedSimulationId: string | null
  conventions: SurfaceConventions
}

/** PUT /api/pre-surveys/{id}/surface */
export type UpdatePreSurveySurfaceResponse = {
  revision: number
  geometryVersion: number
}
