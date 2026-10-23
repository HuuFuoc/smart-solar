// Endpoint của backend, tính từ /api: '/products' là GET /api/products. Khác ROUTES là đường dẫn trang trên trình duyệt
// Mỗi tag swagger một nhóm, method nằm ở service. Tham số đã được encodeURIComponent ở đây

const encode = (value: string) => encodeURIComponent(value)

export const ENDPOINTS = {
  // Xác thực
  auth: {
    register: '/auth/register',
    verifyEmail: '/auth/verify-email',
    resendVerification: '/auth/resend-verification',
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    changePassword: '/auth/change-password',
  },

  // Sản phẩm
  products: {
    base: '/products',
    byId: (id: string) => `/products/${encode(id)}`,
  },
  adminProducts: {
    base: '/admin/products',
    byId: (id: string) => `/admin/products/${encode(id)}`,
    status: (id: string) => `/admin/products/${encode(id)}/status`,
  },

  // Khách hàng: hồ sơ, địa điểm, đánh giá sơ bộ, mặt lắp, mô phỏng, đặt giờ khảo sát, theo dõi lắp đặt, hợp đồng, gói dịch vụ
  customers: {
    base: '/customers/me',
    sites: '/customers/me/sites',
  },
  administrativeUnits: {
    communes: '/administrative-units/communes',
  },
  preSurveys: {
    base: '/pre-surveys',
    byId: (preSurveyId: string) => `/pre-surveys/${encode(preSurveyId)}`,
    submit: (preSurveyId: string) => `/pre-surveys/${encode(preSurveyId)}/submit`,
  },
  preSurveySurface: {
    surface: (preSurveyId: string) => `/pre-surveys/${encode(preSurveyId)}/surface`,
  },
  simulations: {
    base: (preSurveyId: string) => `/pre-surveys/${encode(preSurveyId)}/simulations`,
    byId: (preSurveyId: string, simulationId: string) =>
      `/pre-surveys/${encode(preSurveyId)}/simulations/${encode(simulationId)}`,
    select: (preSurveyId: string, simulationId: string) =>
      `/pre-surveys/${encode(preSurveyId)}/simulations/${encode(simulationId)}/select`,
    selection: (preSurveyId: string) => `/pre-surveys/${encode(preSurveyId)}/simulations/selection`,
  },
  surveySlots: {
    base: '/survey-slots',
  },
  customerSurveyRequests: {
    base: '/customers/me/survey-requests',
    byId: (surveyRequestId: string) => `/customers/me/survey-requests/${encode(surveyRequestId)}`,
    booking: (surveyRequestId: string) => `/customers/me/survey-requests/${encode(surveyRequestId)}/booking`,
    bookingCancel: (surveyRequestId: string) =>
      `/customers/me/survey-requests/${encode(surveyRequestId)}/booking/cancel`,
  },
  customerInstallations: {
    base: '/customers/me/installation-projects',
    byId: (projectId: string) => `/customers/me/installation-projects/${encode(projectId)}`,
    evidence: (projectId: string) => `/customers/me/installation-projects/${encode(projectId)}/evidence`,
    evidenceUrl: (projectId: string, evidenceId: string) =>
      `/customers/me/installation-projects/${encode(projectId)}/evidence/${encode(evidenceId)}/url`,
    acceptance: (projectId: string) => `/customers/me/installation-projects/${encode(projectId)}/acceptance`,
    handover: (projectId: string) => `/customers/me/installation-projects/${encode(projectId)}/handover`,
  },
  customerContracts: {
    base: '/customers/me/contracts',
  },
  // Báo giá lắp đặt: khách không thấy bản nháp
  customerQuotations: {
    base: '/customers/me/quotations',
    byId: (quotationId: string) => `/customers/me/quotations/${encode(quotationId)}`,
    accept: (quotationId: string) => `/customers/me/quotations/${encode(quotationId)}/accept`,
    revisionRequest: (quotationId: string) => `/customers/me/quotations/${encode(quotationId)}/revision-request`,
  },
  customerAfterSales: {
    packages: '/customers/me/after-sales/packages',
    purchases: '/customers/me/after-sales/purchases',
    subscriptions: '/customers/me/after-sales/subscriptions',
    cancelSubscription: (subscriptionId: string) =>
      `/customers/me/after-sales/subscriptions/${encode(subscriptionId)}/cancel`,
    payment: (attemptId: string) => `/customers/me/after-sales/payments/${encode(attemptId)}`,
    // Bảo hành, sửa chữa, bảo trì lẻ
    warranty: (projectId: string) => `/customers/me/after-sales/installations/${encode(projectId)}/warranty`,
    faultRequests: '/customers/me/after-sales/fault-requests',
    oneTimeMaintenance: '/customers/me/after-sales/one-time-maintenance',
    requests: '/customers/me/after-sales/requests',
    request: (requestId: string) => `/customers/me/after-sales/requests/${encode(requestId)}`,
    cancelRequest: (requestId: string) => `/customers/me/after-sales/requests/${encode(requestId)}/cancel`,
    completion: (requestId: string) => `/customers/me/after-sales/requests/${encode(requestId)}/completion`,
    confirmAppointment: (requestId: string) =>
      `/customers/me/after-sales/requests/${encode(requestId)}/confirm-appointment`,
    acceptQuotation: (quotationId: string) => `/customers/me/after-sales/quotations/${encode(quotationId)}/accept`,
    rejectQuotation: (quotationId: string) => `/customers/me/after-sales/quotations/${encode(quotationId)}/reject`,
    checkoutQuotation: (quotationId: string) => `/customers/me/after-sales/quotations/${encode(quotationId)}/checkout`,
    evidenceUrl: (requestId: string, evidenceId: string) =>
      `/customers/me/after-sales/requests/${encode(requestId)}/evidence/${encode(evidenceId)}/url`,
  },

  // Kinh doanh
  surveyRequests: {
    pending: '/survey-requests/pending',
    my: '/survey-requests/my',
    escalated: '/survey-requests/escalated',
    byId: (surveyRequestId: string) => `/survey-requests/${encode(surveyRequestId)}`,
    claim: (surveyRequestId: string) => `/survey-requests/${encode(surveyRequestId)}/claim`,
    assignTechnician: (surveyRequestId: string) => `/survey-requests/${encode(surveyRequestId)}/assign-technician`,
    reassignTechnician: (surveyRequestId: string) => `/survey-requests/${encode(surveyRequestId)}/reassign-technician`,
    reschedule: (surveyRequestId: string) => `/survey-requests/${encode(surveyRequestId)}/reschedule`,
  },
  technicianAvailability: {
    base: '/technicians/availability',
  },
  salesAfterSales: {
    warrantyOptions: '/sales/after-sales/warranty-options',
    openTasks: '/sales/after-sales/tasks/open',
    myTasks: '/sales/after-sales/tasks/mine',
    claimTask: (taskId: string) => `/sales/after-sales/tasks/${encode(taskId)}/claim`,
    request: (requestId: string) => `/sales/after-sales/requests/${encode(requestId)}`,
    quotations: (requestId: string) => `/sales/after-sales/requests/${encode(requestId)}/quotations`,
  },
  // Báo giá lắp đặt của yêu cầu khảo sát kinh doanh đã nhận; quản lý / quản trị chỉ đọc
  salesQuotations: {
    bySurveyRequest: (surveyRequestId: string) => `/survey-requests/${encode(surveyRequestId)}/quotations`,
    byId: (quotationId: string) => `/quotations/${encode(quotationId)}`,
    lines: (quotationId: string) => `/quotations/${encode(quotationId)}/lines`,
    line: (quotationId: string, lineId: string) => `/quotations/${encode(quotationId)}/lines/${encode(lineId)}`,
    issue: (quotationId: string) => `/quotations/${encode(quotationId)}/issue`,
    revisions: (quotationId: string) => `/quotations/${encode(quotationId)}/revisions`,
  },

  // Kỹ thuật viên
  technicianAppointments: {
    base: '/technicians/me/appointments',
    byId: (appointmentId: string) => `/technicians/me/appointments/${encode(appointmentId)}`,
    open: '/technicians/me/open-appointments',
    accept: (appointmentId: string) => `/technicians/me/appointments/${encode(appointmentId)}/accept`,
    release: (appointmentId: string) => `/technicians/me/appointments/${encode(appointmentId)}/release`,
    schedule: '/technicians/me/schedule',
  },
  // Khảo sát tại công trình: kỹ thuật viên ghi theo lịch đã nhận, kinh doanh / quản lý đọc theo yêu cầu khảo sát
  technicianOnSiteSurvey: {
    base: (appointmentId: string) => `/technicians/me/appointments/${encode(appointmentId)}/onsite-survey`,
    start: (appointmentId: string) => `/technicians/me/appointments/${encode(appointmentId)}/onsite-survey/start`,
    attachments: (appointmentId: string) =>
      `/technicians/me/appointments/${encode(appointmentId)}/onsite-survey/attachments`,
    attachment: (appointmentId: string, attachmentId: string) =>
      `/technicians/me/appointments/${encode(appointmentId)}/onsite-survey/attachments/${encode(attachmentId)}`,
    attachmentUrl: (appointmentId: string, attachmentId: string) =>
      `/technicians/me/appointments/${encode(appointmentId)}/onsite-survey/attachments/${encode(attachmentId)}/url`,
    complete: (appointmentId: string) => `/technicians/me/appointments/${encode(appointmentId)}/onsite-survey/complete`,
  },
  staffOnSiteSurvey: {
    base: (surveyRequestId: string) => `/survey-requests/${encode(surveyRequestId)}/onsite-survey`,
    attachmentUrl: (surveyRequestId: string, attachmentId: string) =>
      `/survey-requests/${encode(surveyRequestId)}/onsite-survey/attachments/${encode(attachmentId)}/url`,
  },
  technicianSchedule: {
    schedule: (technicianUserId: string) => `/technicians/${encode(technicianUserId)}/schedule`,
  },
  technicianInstallations: {
    base: '/technicians/me/installation-projects',
    byId: (projectId: string) => `/technicians/me/installation-projects/${encode(projectId)}`,
    accept: (projectId: string) => `/technicians/me/installation-projects/${encode(projectId)}/accept`,
    decline: (projectId: string) => `/technicians/me/installation-projects/${encode(projectId)}/decline`,
    start: (projectId: string) => `/technicians/me/installation-projects/${encode(projectId)}/start`,
    evidence: (projectId: string) => `/technicians/me/installation-projects/${encode(projectId)}/evidence`,
    evidenceUrl: (projectId: string, evidenceId: string) =>
      `/technicians/me/installation-projects/${encode(projectId)}/evidence/${encode(evidenceId)}/url`,
    assets: (projectId: string) => `/technicians/me/installation-projects/${encode(projectId)}/assets`,
    completionReport: (projectId: string) =>
      `/technicians/me/installation-projects/${encode(projectId)}/completion-report`,
  },
  technicianAfterSales: {
    visits: '/technicians/me/after-sales/visits',
    visit: (visitId: string) => `/technicians/me/after-sales/visits/${encode(visitId)}`,
    respond: (visitId: string) => `/technicians/me/after-sales/visits/${encode(visitId)}/respond`,
    start: (visitId: string) => `/technicians/me/after-sales/visits/${encode(visitId)}/start`,
    evidence: (visitId: string) => `/technicians/me/after-sales/visits/${encode(visitId)}/evidence`,
    evidenceUrl: (visitId: string, evidenceId: string) =>
      `/technicians/me/after-sales/visits/${encode(visitId)}/evidence/${encode(evidenceId)}/url`,
    inspection: (visitId: string) => `/technicians/me/after-sales/visits/${encode(visitId)}/inspection`,
    workReport: (visitId: string) => `/technicians/me/after-sales/visits/${encode(visitId)}/work-report`,
    absence: (visitId: string) => `/technicians/me/after-sales/visits/${encode(visitId)}/absence`,
  },

  // Thi công, phía quản lý và quản trị
  managerInstallations: {
    readyContracts: '/installations/ready-contracts',
    createFromContract: (contractId: string) => `/contracts/${encode(contractId)}/installation-project`,
    projects: '/installation-projects',
    byId: (projectId: string) => `/installation-projects/${encode(projectId)}`,
    candidates: (projectId: string) => `/installation-projects/${encode(projectId)}/technician-candidates`,
    assignment: (projectId: string) => `/installation-projects/${encode(projectId)}/assignment`,
    checklistItem: (projectId: string, itemId: string) =>
      `/installation-projects/${encode(projectId)}/checklist/${encode(itemId)}`,
    cancel: (projectId: string) => `/installation-projects/${encode(projectId)}/cancel`,
    returnToRework: (projectId: string) => `/installation-projects/${encode(projectId)}/return-to-rework`,
    evidence: (projectId: string) => `/installation-projects/${encode(projectId)}/evidence`,
    evidenceUrl: (projectId: string, evidenceId: string) =>
      `/installation-projects/${encode(projectId)}/evidence/${encode(evidenceId)}/url`,
    handover: (projectId: string) => `/installation-projects/${encode(projectId)}/handover`,
  },
  // Bảo hành, sửa chữa, bảo trì (quản lý và quản trị)
  managerAfterSales: {
    requests: '/manager/after-sales/requests',
    request: (requestId: string) => `/manager/after-sales/requests/${encode(requestId)}`,
    visits: (requestId: string) => `/manager/after-sales/requests/${encode(requestId)}/visits`,
    coverage: (requestId: string) => `/manager/after-sales/requests/${encode(requestId)}/coverage`,
    disputeReview: (requestId: string) => `/manager/after-sales/requests/${encode(requestId)}/dispute-review`,
    cancellationDecision: (requestId: string) =>
      `/manager/after-sales/requests/${encode(requestId)}/cancellation-decision`,
    evidenceUrl: (requestId: string, evidenceId: string) =>
      `/manager/after-sales/requests/${encode(requestId)}/evidence/${encode(evidenceId)}/url`,
  },

  // Quản trị
  adminUsers: {
    base: '/admin/users',
    byId: (userId: string) => `/admin/users/${encode(userId)}`,
    status: (userId: string) => `/admin/users/${encode(userId)}/status`,
    roles: (userId: string) => `/admin/users/${encode(userId)}/roles`,
    sendPasswordReset: (userId: string) => `/admin/users/${encode(userId)}/send-password-reset`,
  },
  adminTechnicians: {
    base: '/admin/technicians',
    profile: (technicianUserId: string) => `/admin/technicians/${encode(technicianUserId)}/profile`,
    zones: (technicianUserId: string) => `/admin/technicians/${encode(technicianUserId)}/zones`,
    workingSchedule: (technicianUserId: string) => `/admin/technicians/${encode(technicianUserId)}/working-schedule`,
    unavailablePeriods: (technicianUserId: string) =>
      `/admin/technicians/${encode(technicianUserId)}/unavailable-periods`,
    unavailablePeriod: (technicianUserId: string, periodId: string) =>
      `/admin/technicians/${encode(technicianUserId)}/unavailable-periods/${encode(periodId)}`,
  },
  operationalZones: {
    base: '/admin/operational-zones',
  },
  adminAfterSales: {
    packages: '/admin/after-sales/packages',
    package: (packageId: string) => `/admin/after-sales/packages/${encode(packageId)}`,
  },
  adminSystemSettings: {
    scheduling: '/admin/system-settings/scheduling',
    history: '/admin/system-settings/scheduling/history',
  },
  adminRagConfig: {
    base: '/admin/rag-configuration',
    models: '/admin/rag-configuration/models',
    versions: '/admin/rag-configuration/versions',
    draft: '/admin/rag-configuration/draft',
    validate: '/admin/rag-configuration/draft/validate',
    activate: '/admin/rag-configuration/draft/activate',
    rollback: '/admin/rag-configuration/rollback',
  },

  // Tệp tải lên kho S3, mọi vai trò
  files: {
    presignedUpload: '/files/presigned-upload',
    base: '/files',
    byId: (fileId: string) => `/files/${encode(fileId)}`,
    verify: (fileId: string) => `/files/${encode(fileId)}/verify`,
  },
} as const
