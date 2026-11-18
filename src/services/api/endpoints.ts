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
    images: (id: string) => `/admin/products/${encode(id)}/images`,
    image: (id: string, imageId: string) => `/admin/products/${encode(id)}/images/${encode(imageId)}`,
    imageOrder: (id: string) => `/admin/products/${encode(id)}/images/order`,
    imagePrimary: (id: string, imageId: string) => `/admin/products/${encode(id)}/images/${encode(imageId)}/primary`,
  },

  // Khách hàng: hồ sơ, địa điểm, đánh giá sơ bộ, mặt lắp, mô phỏng, đặt giờ khảo sát, theo dõi lắp đặt, hợp đồng, gói dịch vụ
  customers: {
    base: '/customers/me',
    sites: '/customers/me/sites',
    preSurveys: '/customers/me/pre-surveys',
  },
  customerSiteLocation: {
    administrativeLocation: (siteId: string) => `/customers/me/sites/${encode(siteId)}/administrative-location`,
  },
  administrativeUnits: {
    provinces: '/administrative-units/provinces',
    communes: '/administrative-units/communes',
    legacyLookup: '/administrative-units/legacy-lookup',
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
    // Đặt khảo sát thẳng cho một địa điểm của khách, không qua đánh giá sơ bộ
    direct: '/customers/me/survey-requests/direct',
    byId: (surveyRequestId: string) => `/customers/me/survey-requests/${encode(surveyRequestId)}`,
    booking: (surveyRequestId: string) => `/customers/me/survey-requests/${encode(surveyRequestId)}/booking`,
    bookingCancel: (surveyRequestId: string) =>
      `/customers/me/survey-requests/${encode(surveyRequestId)}/booking/cancel`,
    withdraw: (surveyRequestId: string) => `/customers/me/survey-requests/${encode(surveyRequestId)}/withdraw`,
  },
  customerDispatch: {
    base: (surveyRequestId: string) => `/customers/me/survey-requests/${encode(surveyRequestId)}/dispatch-request`,
    accept: (surveyRequestId: string, proposalId: string) =>
      `/customers/me/survey-requests/${encode(surveyRequestId)}/dispatch-request/proposals/${encode(proposalId)}/accept`,
    decline: (surveyRequestId: string, proposalId: string) =>
      `/customers/me/survey-requests/${encode(surveyRequestId)}/dispatch-request/proposals/${encode(proposalId)}/decline`,
    cancel: (surveyRequestId: string) =>
      `/customers/me/survey-requests/${encode(surveyRequestId)}/dispatch-request/cancel`,
  },
  customerInstallations: {
    base: '/customers/me/installation-projects',
    byId: (projectId: string) => `/customers/me/installation-projects/${encode(projectId)}`,
    evidence: (projectId: string) => `/customers/me/installation-projects/${encode(projectId)}/evidence`,
    evidenceUrl: (projectId: string, evidenceId: string) =>
      `/customers/me/installation-projects/${encode(projectId)}/evidence/${encode(evidenceId)}/url`,
    acceptance: (projectId: string) => `/customers/me/installation-projects/${encode(projectId)}/acceptance`,
    handover: (projectId: string) => `/customers/me/installation-projects/${encode(projectId)}/handover`,
    approveSubstitution: (projectId: string) =>
      `/customers/me/installation-projects/${encode(projectId)}/equipment-substitution/approve`,
    energyMonitoring: (projectId: string) =>
      `/customers/me/installation-projects/${encode(projectId)}/energy-monitoring`,
  },
  customerContracts: {
    base: '/customers/me/contracts',
    byId: (contractId: string) => `/customers/me/contracts/${encode(contractId)}`,
    signedDocument: (contractId: string) => `/customers/me/contracts/${encode(contractId)}/signed-document`,
    officialDocumentUrl: (contractId: string) => `/customers/me/contracts/${encode(contractId)}/official-document/url`,
    submissionUrl: (contractId: string, submissionId: string) =>
      `/customers/me/contracts/${encode(contractId)}/submissions/${encode(submissionId)}/url`,
  },
  // Thanh toán 100% hợp đồng đã ký: PayOS hoặc tiền mặt (quản lý / quản trị xác nhận đã nhận)
  customerPayments: {
    base: (contractId: string) => `/customers/me/contracts/${encode(contractId)}/payments`,
    cash: (contractId: string) => `/customers/me/contracts/${encode(contractId)}/payments/cash`,
    cancel: (contractId: string) => `/customers/me/contracts/${encode(contractId)}/payments/cancel`,
  },
  // Lịch thi công kỹ thuật viên đã thống nhất với khách
  customerInstallationSchedules: {
    base: '/customers/me/installation-schedules',
    byContract: (contractId: string) => `/customers/me/contracts/${encode(contractId)}/installation-schedule`,
    changeRequest: (scheduleId: string) => `/customers/me/installation-schedules/${encode(scheduleId)}/change-request`,
    // Khung giờ kỹ thuật viên đề xuất: khách chọn một, thành lịch dự kiến
    offers: (contractId: string) => `/customers/me/contracts/${encode(contractId)}/installation-slot-offers`,
    selectOffer: (offerId: string) => `/customers/me/installation-slot-offers/${encode(offerId)}/select`,
  },
  // Báo giá lắp đặt: khách không thấy bản nháp
  customerQuotations: {
    base: '/customers/me/quotations',
    byId: (quotationId: string) => `/customers/me/quotations/${encode(quotationId)}`,
    accept: (quotationId: string) => `/customers/me/quotations/${encode(quotationId)}/accept`,
    reject: (quotationId: string) => `/customers/me/quotations/${encode(quotationId)}/reject`,
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
    cashQuotation: (quotationId: string) => `/customers/me/after-sales/quotations/${encode(quotationId)}/cash`,
    cancelCashQuotation: (quotationId: string) =>
      `/customers/me/after-sales/quotations/${encode(quotationId)}/cash/cancel`,
    evidenceUrl: (requestId: string, evidenceId: string) =>
      `/customers/me/after-sales/requests/${encode(requestId)}/evidence/${encode(evidenceId)}/url`,
    // Lượt bảo trì của gói, đổi giờ, xin xét lại hỗ trợ thiên tai, báo lỗi từ lần bảo trì, thông báo
    bookMaintenance: (entitlementId: string) => `/customers/me/after-sales/maintenance/${encode(entitlementId)}/book`,
    reschedule: (requestId: string) => `/customers/me/after-sales/requests/${encode(requestId)}/reschedule`,
    reconsideration: (requestId: string) => `/customers/me/after-sales/requests/${encode(requestId)}/reconsideration`,
    reportFault: (requestId: string) => `/customers/me/after-sales/requests/${encode(requestId)}/report-fault`,
    notifications: '/customers/me/after-sales/notifications',
    notificationRead: (notificationId: string) =>
      `/customers/me/after-sales/notifications/${encode(notificationId)}/read`,
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
    close: (surveyRequestId: string) => `/survey-requests/${encode(surveyRequestId)}/close`,
  },
  technicianAvailability: {
    base: '/technicians/availability',
  },
  salesAfterSales: {
    warrantyOptions: '/sales/after-sales/warranty-options',
    openTasks: '/sales/after-sales/tasks/open',
    myTasks: '/sales/after-sales/tasks/mine',
    claimTask: (taskId: string) => `/sales/after-sales/tasks/${encode(taskId)}/claim`,
    startTask: (taskId: string) => `/sales/after-sales/tasks/${encode(taskId)}/start`,
    followUp: (taskId: string) => `/sales/after-sales/tasks/${encode(taskId)}/follow-up`,
    request: (requestId: string) => `/sales/after-sales/requests/${encode(requestId)}`,
    quotations: (requestId: string) => `/sales/after-sales/requests/${encode(requestId)}/quotations`,
  },
  // Báo giá lắp đặt, chỉ đọc: kinh doanh xem yêu cầu mình phụ trách, quản lý / quản trị xem mọi yêu cầu. Lệnh ghi cũ của kinh
  // doanh (lập, sửa, gửi, tự tạo, hàng chờ xem lại, duyệt giá) backend trả 410 ENDPOINT_RETIRED
  salesQuotations: {
    bySurveyRequest: (surveyRequestId: string) => `/survey-requests/${encode(surveyRequestId)}/quotations`,
    byId: (quotationId: string) => `/quotations/${encode(quotationId)}`,
  },
  // Hợp đồng lắp đặt phía nhân viên (tag SalesContracts): kinh doanh chỉ đọc, quản lý / quản trị soạn, phát hành, gửi ký, duyệt
  // bản ký. Thanh toán của hợp đồng (tag StaffPayments) chỉ quản lý / quản trị
  contracts: {
    fromQuotation: (quotationId: string) => `/quotations/${encode(quotationId)}/contracts`,
    bySurveyRequest: (surveyRequestId: string) => `/survey-requests/${encode(surveyRequestId)}/contracts`,
    byId: (contractId: string) => `/contracts/${encode(contractId)}`,
    issue: (contractId: string) => `/contracts/${encode(contractId)}/issue`,
    officialDocument: (contractId: string) => `/contracts/${encode(contractId)}/official-document`,
    officialDocumentUrl: (contractId: string) => `/contracts/${encode(contractId)}/official-document/url`,
    submissionUrl: (contractId: string, submissionId: string) =>
      `/contracts/${encode(contractId)}/submissions/${encode(submissionId)}/url`,
    publish: (contractId: string) => `/contracts/${encode(contractId)}/publish`,
    discard: (contractId: string) => `/contracts/${encode(contractId)}/discard`,
    review: (contractId: string) => `/contracts/${encode(contractId)}/review`,
    // Bản hợp đồng giấy đã ký do kinh doanh phụ trách / quản lý / quản trị tải lên
    signedDocument: (contractId: string) => `/contracts/${encode(contractId)}/signed-document`,
    amendments: (contractId: string) => `/contracts/${encode(contractId)}/amendments`,
    payments: (contractId: string) => `/contracts/${encode(contractId)}/payments`,
    cashConfirm: (contractId: string) => `/contracts/${encode(contractId)}/payments/cash/confirm`,
  },

  // Kỹ thuật viên
  technicianAppointments: {
    base: '/technicians/me/appointments',
    byId: (appointmentId: string) => `/technicians/me/appointments/${encode(appointmentId)}`,
    open: '/technicians/me/open-appointments',
    openById: (appointmentId: string) => `/technicians/me/open-appointments/${encode(appointmentId)}`,
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
    amendments: (appointmentId: string) =>
      `/technicians/me/appointments/${encode(appointmentId)}/onsite-survey/amendments`,
  },
  staffOnSiteSurvey: {
    base: (surveyRequestId: string) => `/survey-requests/${encode(surveyRequestId)}/onsite-survey`,
    attachmentUrl: (surveyRequestId: string, attachmentId: string) =>
      `/survey-requests/${encode(surveyRequestId)}/onsite-survey/attachments/${encode(attachmentId)}/url`,
  },
  technicianSchedule: {
    schedule: (technicianUserId: string) => `/technicians/${encode(technicianUserId)}/schedule`,
  },
  // Giỏ báo giá của kỹ thuật viên đã khảo sát xong: sản phẩm danh mục + số lượng, giá và tổng do backend tính
  technicianQuotations: {
    create: (surveyRequestId: string) => `/technician/survey-requests/${encode(surveyRequestId)}/quotation`,
    bySurveyRequest: (surveyRequestId: string) => `/technician/survey-requests/${encode(surveyRequestId)}/quotations`,
    byId: (quotationId: string) => `/technician/quotations/${encode(quotationId)}`,
    lines: (quotationId: string) => `/technician/quotations/${encode(quotationId)}/lines`,
    line: (quotationId: string, lineId: string) =>
      `/technician/quotations/${encode(quotationId)}/lines/${encode(lineId)}`,
    issue: (quotationId: string) => `/technician/quotations/${encode(quotationId)}/issue`,
    revisions: (quotationId: string) => `/technician/quotations/${encode(quotationId)}/revisions`,
  },
  // Lịch thi công: kỹ thuật viên đã khảo sát ghi ngày thống nhất với khách sau khi hợp đồng được ký
  technicianInstallationSchedules: {
    base: '/technicians/me/installation-schedules',
    byContract: (contractId: string) => `/technicians/me/contracts/${encode(contractId)}/installation-schedule`,
    cancel: (scheduleId: string) => `/technicians/me/installation-schedules/${encode(scheduleId)}/cancel`,
    availability: (contractId: string) => `/technicians/me/contracts/${encode(contractId)}/installation-availability`,
    offers: (contractId: string) => `/technicians/me/contracts/${encode(contractId)}/installation-slot-offers`,
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
    continueRepair: (visitId: string) => `/technicians/me/after-sales/visits/${encode(visitId)}/continue-repair`,
    finish: (visitId: string) => `/technicians/me/after-sales/visits/${encode(visitId)}/finish`,
    supplementaryItems: (visitId: string) =>
      `/technicians/me/after-sales/visits/${encode(visitId)}/supplementary-items`,
    workReport: (visitId: string) => `/technicians/me/after-sales/visits/${encode(visitId)}/work-report`,
    absence: (visitId: string) => `/technicians/me/after-sales/visits/${encode(visitId)}/absence`,
    // Kỹ thuật viên của buổi hẹn lập báo giá sửa chữa / bảo trì lẻ đã kiểm tra từ sản phẩm danh mục
    quotations: (requestId: string) => `/technicians/me/after-sales/requests/${encode(requestId)}/quotations`,
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
    approveSubstitution: (projectId: string) =>
      `/installation-projects/${encode(projectId)}/equipment-substitution/approve`,
    energyMonitoring: (projectId: string) => `/installation-projects/${encode(projectId)}/energy-monitoring`,
  },
  // Lịch thi công phía quản lý / quản trị: hàng chờ hẹn lại, xác nhận lại, ghi lịch cho kỹ thuật viên khác, huỷ
  managerInstallationSchedules: {
    base: '/manager/installation-schedules',
    byContract: (contractId: string) => `/manager/contracts/${encode(contractId)}/installation-schedule`,
    confirm: (contractId: string) => `/manager/contracts/${encode(contractId)}/installation-schedule/confirm`,
    cancel: (scheduleId: string) => `/manager/installation-schedules/${encode(scheduleId)}/cancel`,
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
    claimDecision: (requestId: string) => `/manager/after-sales/requests/${encode(requestId)}/claim-decision`,
    duplicate: (requestId: string) => `/manager/after-sales/requests/${encode(requestId)}/duplicate`,
    stop: (requestId: string) => `/manager/after-sales/requests/${encode(requestId)}/stop`,
    notFulfilled: (requestId: string) => `/manager/after-sales/requests/${encode(requestId)}/not-fulfilled`,
    evidenceUrl: (requestId: string, evidenceId: string) =>
      `/manager/after-sales/requests/${encode(requestId)}/evidence/${encode(evidenceId)}/url`,
    asset: (assetId: string) => `/manager/after-sales/assets/${encode(assetId)}`,
    warrantyActivation: (assetId: string) => `/manager/after-sales/assets/${encode(assetId)}/warranty-activation`,
    tasks: '/manager/after-sales/tasks',
    assignTask: (taskId: string) => `/manager/after-sales/tasks/${encode(taskId)}/assign`,
    // Sổ tiền đã nhận nhưng không áp vào khoản nào, chỉ đọc
    unappliedMoney: '/manager/after-sales/unapplied-money',
  },
  // Bàn thu tiền: mọi lần thanh toán (lọc cách trả, trạng thái, ngày), xác nhận tiền mặt theo lần thanh toán
  managerPayments: {
    base: '/manager/payments',
    cashConfirm: (attemptId: string) => `/manager/payments/${encode(attemptId)}/cash/confirm`,
  },

  // Điều phối kỹ thuật viên cho công trình chưa có người nhận lịch (quản lý và quản trị)
  adminDispatch: {
    base: '/admin/dispatch-requests',
    byId: (id: string) => `/admin/dispatch-requests/${encode(id)}`,
    candidates: (id: string) => `/admin/dispatch-requests/${encode(id)}/candidates`,
    assign: (id: string) => `/admin/dispatch-requests/${encode(id)}/assign`,
    proposals: (id: string) => `/admin/dispatch-requests/${encode(id)}/proposals`,
    withdraw: (id: string, proposalId: string) =>
      `/admin/dispatch-requests/${encode(id)}/proposals/${encode(proposalId)}/withdraw`,
    unserviceable: (id: string) => `/admin/dispatch-requests/${encode(id)}/unserviceable`,
    close: (id: string) => `/admin/dispatch-requests/${encode(id)}/close`,
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
  // Khu vực phục vụ: quản trị ghi, quản lý đọc
  operationalZones: {
    base: '/admin/operational-zones',
    coverage: '/admin/operational-zones/coverage',
    byId: (zoneId: string) => `/admin/operational-zones/${encode(zoneId)}`,
    communes: (zoneId: string) => `/admin/operational-zones/${encode(zoneId)}/communes`,
    technicians: (zoneId: string) => `/admin/operational-zones/${encode(zoneId)}/technicians`,
  },
  // Phân công thẳng kỹ thuật viên và đổi kinh doanh phụ trách (quản lý và quản trị)
  adminSurvey: {
    assignTechnician: (appointmentId: string) =>
      `/admin/survey-appointments/${encode(appointmentId)}/assign-technician`,
    salesOwner: (surveyRequestId: string) => `/admin/survey-requests/${encode(surveyRequestId)}/sales-owner`,
    reschedule: (surveyRequestId: string) => `/admin/survey-requests/${encode(surveyRequestId)}/reschedule`,
  },
  adminAfterSales: {
    packages: '/admin/after-sales/packages',
    package: (packageId: string) => `/admin/after-sales/packages/${encode(packageId)}`,
    warrantyOptions: '/admin/after-sales/warranty-options',
    dashboard: '/admin/after-sales/dashboard',
    dashboardExport: '/admin/after-sales/dashboard/export',
    overview: '/admin/after-sales/dashboard/overview',
  },
  // Chatbot hỏi đáp theo tài liệu đã công bố (mọi người đăng nhập, chỉ đọc phiên của mình)
  chat: {
    messages: '/chat/messages',
    // Tư vấn cấu hình theo số liệu nhập, không lưu vào phiên
    advisor: '/chat/advisor',
    sessions: '/chat/sessions',
    session: (sessionId: string) => `/chat/sessions/${encode(sessionId)}`,
  },
  // Kho tri thức của chatbot (chỉ quản trị)
  knowledgeDocuments: {
    base: '/admin/knowledge-documents',
    byId: (documentId: string) => `/admin/knowledge-documents/${encode(documentId)}`,
    versions: (documentId: string) => `/admin/knowledge-documents/${encode(documentId)}/versions`,
    publish: (documentId: string) => `/admin/knowledge-documents/${encode(documentId)}/publish`,
    unpublish: (documentId: string) => `/admin/knowledge-documents/${encode(documentId)}/unpublish`,
    reindex: (documentId: string) => `/admin/knowledge-documents/${encode(documentId)}/reindex`,
    retryJob: (documentId: string, jobId: string) =>
      `/admin/knowledge-documents/${encode(documentId)}/jobs/${encode(jobId)}/retry`,
    archive: (documentId: string) => `/admin/knowledge-documents/${encode(documentId)}/archive`,
    audience: (documentId: string) => `/admin/knowledge-documents/${encode(documentId)}/audience`,
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
    reindexStale: '/admin/rag-configuration/reindex-stale',
  },
  // Sổ chi phí AI và ngân sách, chỉ quản trị
  adminRagUsage: {
    summary: '/admin/rag-usage/summary',
    timeseries: '/admin/rag-usage/timeseries',
    byModel: '/admin/rag-usage/by-model',
    byOperation: '/admin/rag-usage/by-operation',
    byRole: '/admin/rag-usage/by-role',
    topUsers: '/admin/rag-usage/top-users',
    requests: '/admin/rag-usage/requests',
    review: (ledgerId: string) => `/admin/rag-usage/${encode(ledgerId)}/review`,
  },
  adminRagBudget: '/admin/rag-budget',

  // Tệp tải lên kho S3, mọi vai trò
  files: {
    presignedUpload: '/files/presigned-upload',
    base: '/files',
    byId: (fileId: string) => `/files/${encode(fileId)}`,
    verify: (fileId: string) => `/files/${encode(fileId)}/verify`,
  },
} as const
