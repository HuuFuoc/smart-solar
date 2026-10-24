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
    /** Gói bảo vệ thiên tai: mua, thanh toán PayOS, huỷ trước khi hiệu lực */
    packages: '/customer/packages',
    /** Bảo hành, sửa chữa, bảo trì lẻ: yêu cầu đã gửi */
    afterSales: '/customer/after-sales',
    afterSalesRequest: '/customer/after-sales/:id',
    products: '/customer/products',
    product: '/customer/products/:id',
    /** Báo giá lắp đặt; chi tiết theo mã báo giá (mỗi bản một mã) */
    quotations: '/customer/quotations',
    quotation: '/customer/quotations/:id',
    // Màn mock đã ẩn
    estimate: '/customer/assessment/estimate',
    consultations: '/customer/consultations',
    consultation: '/customer/consultations/:id',
    warranty: '/customer/warranty',
    warrantyRequest: '/customer/warranty/:id',
    assistant: '/customer/assistant',
  },

  ops: {
    home: '/ops',
    dashboard: '/ops/dashboard',
    surveys: '/ops/surveys',
    /** Tab "Của tôi" có đường dẫn riêng để menu đánh dấu đúng */
    surveysMine: '/ops/surveys/mine',
    survey: '/ops/surveys/:id',
    /** Việc báo giá sửa chữa, bảo trì; chi tiết theo mã yêu cầu */
    afterSales: '/ops/after-sales',
    afterSalesRequest: '/ops/after-sales/:id',
    products: '/ops/products',
    product: '/ops/products/:id',
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
    /** Công trình lắp đặt quản lý giao */
    installations: '/tech/installations',
    installation: '/tech/installations/:id',
    /** Buổi hẹn bảo hành, sửa chữa, bảo trì; chi tiết theo mã buổi hẹn */
    afterSales: '/tech/after-sales',
    afterSalesVisit: '/tech/after-sales/:id',
    schedule: '/tech/schedule',
    products: '/tech/products',
    product: '/tech/products/:id',
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
    /** Yêu cầu bảo hành, sửa chữa, bảo trì (quản lý dùng chung trang với quản trị) */
    afterSales: '/manage/after-sales',
    afterSalesRequest: '/manage/after-sales/:id',
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
    packages: '/admin/packages',
    afterSales: '/admin/after-sales',
    afterSalesRequest: '/admin/after-sales/:id',
    settings: '/admin/settings',
    // Màn mock đã ẩn
    roles: '/admin/roles',
    services: '/admin/services',
    categories: '/admin/categories',
    knowledgeBase: '/admin/knowledge-base',
    techConfig: '/admin/config',
    reports: '/admin/reports',
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
