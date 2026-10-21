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
  customerAfterSales: {
    packages: '/customers/me/after-sales/packages',
    purchases: '/customers/me/after-sales/purchases',
    subscriptions: '/customers/me/after-sales/subscriptions',
    cancelSubscription: (subscriptionId: string) =>
      `/customers/me/after-sales/subscriptions/${encode(subscriptionId)}/cancel`,
    payment: (attemptId: string) => `/customers/me/after-sales/payments/${encode(attemptId)}`,
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

  // Kỹ thuật viên
  technicianAppointments: {
    base: '/technicians/me/appointments',
    byId: (appointmentId: string) => `/technicians/me/appointments/${encode(appointmentId)}`,
    open: '/technicians/me/open-appointments',
    accept: (appointmentId: string) => `/technicians/me/appointments/${encode(appointmentId)}/accept`,
    release: (appointmentId: string) => `/technicians/me/appointments/${encode(appointmentId)}/release`,
    schedule: '/technicians/me/schedule',
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

  // Tệp tải lên kho S3, mọi vai trò
  files: {
    presignedUpload: '/files/presigned-upload',
    base: '/files',
    byId: (fileId: string) => `/files/${encode(fileId)}`,
    verify: (fileId: string) => `/files/${encode(fileId)}/verify`,
  },
} as const
