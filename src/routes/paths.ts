// Mọi đường dẫn của app, mỗi portal một nhóm
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
  /** Cùng vai trò như hai đường trên: backend đã deploy đặt ReturnUrl / CancelUrl là /return, /cancel */
  payosReturn: '/return',
  payosCancel: '/cancel',
  /** Chỉ có ở dev */
  styleguide: '/styleguide',

  customer: {
    home: '/customer',
    dashboard: '/customer/dashboard',
    assessment: '/customer/assessment',
    /** Yêu cầu khảo sát đã gửi: đặt / đổi / huỷ giờ */
    requests: '/customer/requests',
    /** Đặt khảo sát tại công trình cho một địa điểm, không qua đánh giá sơ bộ */
    directBooking: '/customer/requests/new',
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
  },

  ops: {
    home: '/ops',
    dashboard: '/ops/dashboard',
    surveys: '/ops/surveys',
    /** Tab "Của tôi" có đường dẫn riêng để menu đánh dấu đúng */
    surveysMine: '/ops/surveys/mine',
    survey: '/ops/surveys/:id',
    /** Danh sách mọi hợp đồng (chỉ đọc) */
    contracts: '/ops/contracts',
    /** Một phiên bản hợp đồng lắp đặt, chỉ xem */
    contract: '/ops/contracts/:id',
    /** Hồ sơ thu hồi khoản quá hạn của hợp đồng 30/70 */
    collections: '/ops/collections',
    collection: '/ops/collections/:id',
    /** Việc báo giá sửa chữa, bảo trì, việc nhắc khách; chi tiết theo mã yêu cầu */
    afterSales: '/ops/after-sales',
    afterSalesRequest: '/ops/after-sales/:id',
    products: '/ops/products',
    product: '/ops/products/:id',
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
    /** Hợp đồng đã ký của công trình mình khảo sát: ghi ngày thi công đã thống nhất với khách */
    installationSchedules: '/tech/installation-schedules',
    /** Danh sách mọi hợp đồng (chỉ đọc); hợp đồng 30/70 của công trình mình khảo sát thì thu tiền và tải trang ký ở đây */
    contracts: '/tech/contracts',
    contract: '/tech/contracts/:id',
    /** Buổi hẹn bảo hành, sửa chữa, bảo trì; chi tiết theo mã buổi hẹn */
    afterSales: '/tech/after-sales',
    afterSalesVisit: '/tech/after-sales/:id',
    schedule: '/tech/schedule',
    products: '/tech/products',
    product: '/tech/products/:id',
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
    /** Danh sách mọi hợp đồng, lọc và tìm ở server */
    contracts: '/manage/contracts',
    /** Một phiên bản hợp đồng: soạn, phát hành, gửi ký, duyệt bản ký, xác nhận tiền mặt (dùng chung trang với quản trị) */
    contract: '/manage/contracts/:id',
    /** Lịch thi công kỹ thuật viên đã thống nhất với khách: cần hẹn lại, xác nhận lại, huỷ */
    installationSchedules: '/manage/installation-schedules',
    /** Yêu cầu bảo hành, sửa chữa, bảo trì (quản lý dùng chung trang với quản trị) */
    afterSales: '/manage/after-sales',
    afterSalesRequest: '/manage/after-sales/:id',
    /** Xếp kỹ thuật viên cho công trình chưa có người nhận lịch (quản lý dùng chung trang với quản trị) */
    dispatch: '/manage/dispatch',
    dispatchRequest: '/manage/dispatch/:id',
    /** Hàng việc sau bán của kinh doanh: xem, lọc (quản lý dùng chung trang với quản trị) */
    salesTasks: '/manage/sales-tasks',
    /** Bàn thu tiền: xác nhận tiền mặt theo lần thanh toán, sổ tiền chưa áp (chỉ đọc) */
    payments: '/manage/payments',
    collections: '/manage/collections',
    collection: '/manage/collections/:id',
  },

  admin: {
    home: '/admin',
    dashboard: '/admin/dashboard',
    users: '/admin/users',
    user: '/admin/users/:id',
    technicians: '/admin/technicians',
    technician: '/admin/technicians/:id',
    products: '/admin/products',
    product: '/admin/products/:id',
    installations: '/admin/installations',
    installation: '/admin/installations/:id',
    contracts: '/admin/contracts',
    /** Một phiên bản hợp đồng: soạn, phát hành, gửi ký, duyệt bản ký, xác nhận tiền mặt */
    contract: '/admin/contracts/:id',
    installationSchedules: '/admin/installation-schedules',
    payments: '/admin/payments',
    collections: '/admin/collections',
    collection: '/admin/collections/:id',
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
    /** Hàng việc sau bán của kinh doanh: giao / giao lại */
    salesTasks: '/admin/sales-tasks',
    /** Báo cáo thu tiền và hoạt động sau bán, xuất CSV */
    reports: '/admin/reports',
    /** Kho tri thức của chatbot; chi tiết theo mã tài liệu */
    knowledgeBase: '/admin/knowledge-base',
    knowledgeDocument: '/admin/knowledge-base/:id',
    /** Chi phí của trợ lý (sổ chi phí, ngân sách, giới hạn) */
    aiUsage: '/admin/ai-usage',
  },

  // Đường cũ của kỹ thuật viên, mọi đường chuyển về /tech
  field: {
    home: '/field',
  },
} as const

export function withId(pattern: string, id: string) {
  return pattern.replace(':id', id)
}
