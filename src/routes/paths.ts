// Mọi đường dẫn của app, mỗi portal một nhóm. Trong nhóm, màn mock đã ẩn nằm dưới dòng "Màn mock đã ẩn"
export const ROUTES = {
  // Công khai và xác thực
  home: '/',
  comingSoon: '/coming-soon',
  /** Danh mục sản phẩm công khai (GET /api/products) */
  products: '/products',
  product: '/products/:id',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  forbidden: '/403',
  /** ReturnUrl / CancelUrl của PayOS do backend cấu hình; chỉ chuyển khách về trang đã mở link thanh toán */
  paymentReturn: '/payments/return',
  paymentCancel: '/payments/cancel',
  /** Chỉ có ở dev */
  styleguide: '/styleguide',

  customer: {
    home: '/customer',
    dashboard: '/customer/dashboard',
    assessment: '/customer/assessment',
    /** Yêu cầu khảo sát đã gửi: đặt / đổi / huỷ giờ */
    requests: '/customer/requests',
    request: '/customer/requests/:id',
    /** Công trình lắp đặt: tiến độ, ảnh thi công, nghiệm thu, bàn giao */
    projects: '/customer/projects',
    project: '/customer/projects/:id',
    /** Hợp đồng lắp đặt: ký (gửi bản ký tay), thanh toán PayOS */
    contracts: '/customer/contracts',
    contract: '/customer/contracts/:id',
    /** Gói bảo vệ thiên tai, bảo trì định kỳ: mua, thanh toán PayOS, huỷ trước khi hiệu lực, đặt lượt bảo trì */
    packages: '/customer/packages',
    /** Thông báo trong ứng dụng của bảo hành, sửa chữa, gói dịch vụ */
    notifications: '/customer/notifications',
    /** Bảo hành, sửa chữa, bảo trì lẻ: yêu cầu đã gửi */
    afterSales: '/customer/after-sales',
    afterSalesRequest: '/customer/after-sales/:id',
    products: '/customer/products',
    product: '/customer/products/:id',
    /** Báo giá lắp đặt; chi tiết theo mã báo giá (mỗi bản một mã) */
    quotations: '/customer/quotations',
    quotation: '/customer/quotations/:id',
    /** Trợ lý hỏi đáp theo tài liệu đã công bố; mở lại một cuộc trò chuyện bằng ?phien=<mã> */
    assistant: '/customer/assistant',
    // Màn mock đã ẩn
    estimate: '/customer/assessment/estimate',
    consultations: '/customer/consultations',
    consultation: '/customer/consultations/:id',
    warranty: '/customer/warranty',
    warrantyRequest: '/customer/warranty/:id',
  },

  ops: {
    home: '/ops',
    dashboard: '/ops/dashboard',
    surveys: '/ops/surveys',
    /** Tab "Của tôi" có đường dẫn riêng để menu đánh dấu đúng */
    surveysMine: '/ops/surveys/mine',
    survey: '/ops/surveys/:id',
    /** Một phiên bản hợp đồng lắp đặt; mở từ khối Hợp đồng của yêu cầu khảo sát (backend không có danh sách mọi hợp đồng) */
    contract: '/ops/contracts/:id',
    /** Việc báo giá sửa chữa, bảo trì, việc nhắc khách; chi tiết theo mã yêu cầu */
    afterSales: '/ops/after-sales',
    afterSalesRequest: '/ops/after-sales/:id',
    products: '/ops/products',
    product: '/ops/products/:id',
    /** Trợ lý hỏi đáp theo tài liệu đã công bố; mở lại một cuộc trò chuyện bằng ?phien=<mã> */
    assistant: '/ops/assistant',
    // Màn mock đã ẩn
    consultations: '/ops/consultations',
    customers: '/ops/customers',
    quotations: '/ops/quotations',
    contracts: '/ops/contracts',
    projects: '/ops/projects',
  },

  tech: {
    home: '/tech',
    /** Lịch khảo sát được phân công */
    jobs: '/tech/jobs',
    job: '/tech/jobs/:id',
    /** Một lịch trong khu vực đang chờ người nhận (chưa là việc của mình) */
    openJob: '/tech/jobs/open/:id',
    /** Công trình lắp đặt quản lý giao */
    installations: '/tech/installations',
    installation: '/tech/installations/:id',
    /** Buổi hẹn bảo hành, sửa chữa, bảo trì; chi tiết theo mã buổi hẹn */
    afterSales: '/tech/after-sales',
    afterSalesVisit: '/tech/after-sales/:id',
    schedule: '/tech/schedule',
    products: '/tech/products',
    product: '/tech/products/:id',
    /** Trợ lý hỏi đáp theo tài liệu đã công bố; mở lại một cuộc trò chuyện bằng ?phien=<mã> */
    assistant: '/tech/assistant',
    // Màn mock đã ẩn
    tasks: '/tech/tasks',
    surveys: '/tech/surveys',
    maintenance: '/tech/maintenance',
    warranty: '/tech/warranty',
    alerts: '/tech/alerts',
    settings: '/tech/settings',
  },

  manage: {
    home: '/manage',
    /** Cấu hình lịch + lịch ngày của kỹ thuật viên (quản lý dùng chung trang với quản trị) */
    technicians: '/manage/technicians',
    technician: '/manage/technicians/:id',
    products: '/manage/products',
    product: '/manage/products/:id',
    /** Dự án thi công + hợp đồng chờ tạo dự án (quản lý dùng chung trang với quản trị) */
    installations: '/manage/installations',
    installation: '/manage/installations/:id',
    /** Một phiên bản hợp đồng: thanh toán, duyệt bản ký (quản lý dùng chung trang với kinh doanh, quản trị) */
    contract: '/manage/contracts/:id',
    /** Yêu cầu bảo hành, sửa chữa, bảo trì (quản lý dùng chung trang với quản trị) */
    afterSales: '/manage/after-sales',
    afterSalesRequest: '/manage/after-sales/:id',
    /** Xếp kỹ thuật viên cho công trình chưa có người nhận lịch (quản lý dùng chung trang với quản trị) */
    dispatch: '/manage/dispatch',
    dispatchRequest: '/manage/dispatch/:id',
    /** Hàng việc sau bán của kinh doanh: xem, lọc (quản lý dùng chung trang với quản trị) */
    salesTasks: '/manage/sales-tasks',
    /** Khoản hoàn tiền làm tay: duyệt / từ chối (quản lý dùng chung trang với quản trị) */
    refunds: '/manage/refunds',
    /** Gói khách xin huỷ trước khi bắt đầu kỳ: hàng chờ → chi tiết → duyệt / từ chối */
    packageCancellations: '/manage/package-cancellations',
    packageCancellation: '/manage/package-cancellations/:id',
    /** Trợ lý hỏi đáp theo tài liệu đã công bố; mở lại một cuộc trò chuyện bằng ?phien=<mã> */
    assistant: '/manage/assistant',
    // Màn mock đã ẩn
    projects: '/manage/projects',
    project: '/manage/projects/:id',
    approvals: '/manage/approvals',
    approval: '/manage/approvals/:id',
    operations: '/manage/operations',
    revenue: '/manage/revenue',
    alerts: '/manage/alerts',
    notifications: '/manage/notifications',
    profile: '/manage/profile',
  },

  admin: {
    home: '/admin',
    users: '/admin/users',
    user: '/admin/users/:id',
    technicians: '/admin/technicians',
    technician: '/admin/technicians/:id',
    products: '/admin/products',
    installations: '/admin/installations',
    installation: '/admin/installations/:id',
    /** Một phiên bản hợp đồng, chỉ xem (thanh toán, bản ký) */
    contract: '/admin/contracts/:id',
    packages: '/admin/packages',
    afterSales: '/admin/after-sales',
    afterSalesRequest: '/admin/after-sales/:id',
    dispatch: '/admin/dispatch',
    dispatchRequest: '/admin/dispatch/:id',
    settings: '/admin/settings',
    /** Khu vực phục vụ: phường, xã của khu, kỹ thuật viên thuộc khu */
    zones: '/admin/zones',
    zone: '/admin/zones/:id',
    /** Thời hạn bảo hành lắp đặt / sửa chữa cho kinh doanh chọn */
    warrantyOptions: '/admin/warranty-options',
    /** Duyệt khoản hoàn tiền và ghi nhận đã chuyển cho khách */
    refunds: '/admin/refunds',
    /** Hàng việc sau bán của kinh doanh: giao / giao lại */
    salesTasks: '/admin/sales-tasks',
    /** Báo cáo thu tiền và hoạt động sau bán, xuất CSV */
    reports: '/admin/reports',
    /** Kho tri thức của chatbot; chi tiết theo mã tài liệu */
    knowledgeBase: '/admin/knowledge-base',
    knowledgeDocument: '/admin/knowledge-base/:id',
    /** Trợ lý hỏi đáp theo tài liệu đã công bố; mở lại một cuộc trò chuyện bằng ?phien=<mã> */
    assistant: '/admin/assistant',
    // Màn mock đã ẩn
    roles: '/admin/roles',
    services: '/admin/services',
    categories: '/admin/categories',
    techConfig: '/admin/config',
    profile: '/admin/profile',
  },

  // Đường cũ của kỹ thuật viên, mọi đường chuyển về /tech
  field: {
    home: '/field',
    // Màn mock đã ẩn
    tasks: '/field/tasks',
    surveys: '/field/surveys',
    survey: '/field/surveys/:id',
    installations: '/field/installations',
    installation: '/field/installations/:id',
    warranty: '/field/warranty',
    schedule: '/field/schedule',
    notifications: '/field/notifications',
    profile: '/field/profile',
  },
} as const

export function withId(pattern: string, id: string) {
  return pattern.replace(':id', id)
}

// Đường dẫn chi tiết của các màn mock kỹ thuật viên đã ẩn

/** /tech/tasks/:id */
export const techTaskPath = (id: string) => `${ROUTES.tech.tasks}/${id}`

/** Luồng khảo sát: /tech/surveys/:id, .../verify, .../photos */
export const surveyPath = (id: string) => `${ROUTES.tech.surveys}/${id}`
export const surveyVerifyPath = (id: string) => `${surveyPath(id)}/verify`
export const surveyPhotosPath = (id: string) => `${surveyPath(id)}/photos`

/** Bảo trì và bảo hành: /tech/maintenance/:id, /tech/warranty/:id */
export const maintenancePath = (id: string) => `${ROUTES.tech.maintenance}/${id}`
export const warrantyPath = (id: string) => `${ROUTES.tech.warranty}/${id}`
