/*
  Mọi endpoint của backend (docs/api/swagger.json), tính từ địa chỉ gốc /api của client axios: '/products' ở đây
  là GET /api/products. KHÁC với ROUTES (routes/paths.ts): ROUTES là đường dẫn trang trên trình duyệt, không gửi lên backend.

  - Mỗi tag swagger một nhóm, tên nhóm là tag viết camelCase (AdminUsers → adminUsers), giống tên file types/req|res.
  - `base`: đường dẫn gốc của nhóm, không có tham số; `byId(id)`: thêm /{id}; các khoá khác là đoạn cuối của đường
    dẫn viết camelCase (…/send-password-reset → sendPasswordReset).
  - Một đường dẫn dùng cho nhiều method (GET + PUT …/surface) chỉ có một khoá; method nằm ở service.
  - Tham số tự encodeURIComponent, service chỉ truyền giá trị thô.
  Backend thêm endpoint: thêm vào đúng nhóm ở đây rồi mới gọi trong services/<tên>Service.ts.
*/

const encode = (value: string) => encodeURIComponent(value)

export const ENDPOINTS = {
  /* ---- Xác thực ---- */
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

  /* ---- Sản phẩm ---- */
  products: {
    base: '/products',
    byId: (id: string) => `/products/${encode(id)}`,
  },
  adminProducts: {
    base: '/admin/products',
    byId: (id: string) => `/admin/products/${encode(id)}`,
    status: (id: string) => `/admin/products/${encode(id)}/status`,
  },

  /* ---- Khách hàng: hồ sơ → địa điểm → đánh giá sơ bộ → mặt lắp → mô phỏng → đặt giờ khảo sát ---- */
  customers: {
    base: '/customers/me',
    sites: '/customers/me/sites',
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
  },
  surveySlots: {
    base: '/survey-slots',
  },
  customerSurveyRequests: {
    base: '/customers/me/survey-requests',
    byId: (surveyRequestId: string) => `/customers/me/survey-requests/${encode(surveyRequestId)}`,
    booking: (surveyRequestId: string) => `/customers/me/survey-requests/${encode(surveyRequestId)}/booking`,
    bookingCancel: (surveyRequestId: string) => `/customers/me/survey-requests/${encode(surveyRequestId)}/booking/cancel`,
  },

  /* ---- Kinh doanh ---- */
  surveyRequests: {
    pending: '/survey-requests/pending',
    my: '/survey-requests/my',
    byId: (surveyRequestId: string) => `/survey-requests/${encode(surveyRequestId)}`,
    claim: (surveyRequestId: string) => `/survey-requests/${encode(surveyRequestId)}/claim`,
    assignTechnician: (surveyRequestId: string) => `/survey-requests/${encode(surveyRequestId)}/assign-technician`,
    reassignTechnician: (surveyRequestId: string) => `/survey-requests/${encode(surveyRequestId)}/reassign-technician`,
    reschedule: (surveyRequestId: string) => `/survey-requests/${encode(surveyRequestId)}/reschedule`,
  },
  technicianAvailability: {
    base: '/technicians/availability',
  },

  /* ---- Kỹ thuật viên ---- */
  technicianAppointments: {
    base: '/technicians/me/appointments',
    byId: (appointmentId: string) => `/technicians/me/appointments/${encode(appointmentId)}`,
    acknowledge: (appointmentId: string) => `/technicians/me/appointments/${encode(appointmentId)}/acknowledge`,
    schedule: '/technicians/me/schedule',
  },
  technicianSchedule: {
    schedule: (technicianUserId: string) => `/technicians/${encode(technicianUserId)}/schedule`,
  },

  /* ---- Quản trị ---- */
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
    workingSchedule: (technicianUserId: string) => `/admin/technicians/${encode(technicianUserId)}/working-schedule`,
    unavailablePeriods: (technicianUserId: string) => `/admin/technicians/${encode(technicianUserId)}/unavailable-periods`,
    unavailablePeriod: (technicianUserId: string, periodId: string) =>
      `/admin/technicians/${encode(technicianUserId)}/unavailable-periods/${encode(periodId)}`,
  },
} as const
