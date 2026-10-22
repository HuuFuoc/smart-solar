// Viết tay vì swagger chỉ khai "200 OK" (tag TechnicianOnSiteSurvey, StaffOnSiteSurvey)
// Theo record C# của Modules.OnSiteSurveys trong image smartsolar-api đang chạy (dịch ngược DLL)
// Kinh doanh / quản lý đọc cùng kiểu này qua GET /api/survey-requests/{id}/onsite-survey

/** Số đo và nhận xét tại công trình (OnSiteSurveyData). Số thập phân của BE trả về là số JSON */
export type OnSiteSurveyData = {
  roofType: string | null
  roofMaterial: string | null
  roofLengthM: number | null
  roofWidthM: number | null
  usableAreaM2: number | null
  tiltDegree: number | null
  azimuthDegree: number | null
  /** GOOD | FAIR | POOR */
  roofCondition: string | null
  electricalCabinetNotes: string | null
  electricalConnectionNotes: string | null
  /** FEASIBLE | FEASIBLE_WITH_CONDITIONS | NOT_FEASIBLE */
  installationFeasibility: string | null
  proposedInverterLocation: string | null
  proposedPanelLayoutNotes: string | null
  measuredLatitude: number | null
  measuredLongitude: number | null
  notes: string | null
  /** Cùng danh sách với `obstacles` của view */
  obstacles: OnSiteSurveyObstacleView[] | null
}

export type OnSiteSurveyObstacleView = {
  /** CHIMNEY | WATER_TANK | SKYLIGHT | ANTENNA | VENT | TREE_SHADE | BUILDING_SHADE | OTHER */
  kind: string
  description: string | null
  heightM: number | null
  areaM2: number | null
}

export type OnSiteSurveyAttachmentView = {
  attachmentId: string
  fileId: string
  /** ROOF | ELECTRICAL | OBSTACLE | SITE | DOCUMENT */
  category: string
  caption: string | null
  addedAt: string
  /** Có khi tệp được gắn qua một lần bổ sung sau khi đã hoàn thành */
  amendmentId: string | null
}

export type OnSiteSurveyAmendmentView = {
  amendmentNumber: number
  authorUserId: string
  reason: string
  /** { tênTrường: { old, new } } */
  changes: unknown
  createdAt: string
}

/** GET/PUT .../onsite-survey, start, attachments, complete đều trả bản này */
export type OnSiteSurveyView = {
  reportId: string
  surveyRequestId: string
  appointmentId: string
  technicianUserId: string
  /** DRAFT | IN_PROGRESS | COMPLETED */
  status: string
  /** 0 khi chưa hoàn thành, 1 khi hoàn thành, tăng mỗi lần bổ sung */
  version: number
  /** Gửi làm `revision` khi lưu / hoàn thành */
  revision: number
  startedAt: string | null
  completedAt: string | null
  data: OnSiteSurveyData
  obstacles: OnSiteSurveyObstacleView[]
  attachments: OnSiteSurveyAttachmentView[]
  amendments: OnSiteSurveyAmendmentView[]
  updatedAt: string
}

/** GET .../attachments/{attachmentId}/url (AttachedFileUrlView) */
export type OnSiteSurveyAttachmentUrlView = {
  id: string
  url: string
  expiresAt: string
  /** inline | attachment */
  disposition: string
  contentType: string
  fileName: string
}
