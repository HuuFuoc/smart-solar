/*
  Mọi đường dẫn của app. Mỗi portal một nhóm, khoá viết camelCase, trang chủ portal luôn là `home`.
  Trong từng nhóm: phần trên là màn đang có route (protectedRoutes.tsx), phần dưới là màn mock đã ẩn
  (code còn trong pages/<portal>/, chưa có route) – mở lại màn nào thì thêm route và mục menu
  (config/portals.ts) rồi chuyển đường dẫn lên trên.
  Đường có :id dựng bằng withId(ROUTES.admin.user, id).
*/
export const ROUTES = {
  /* ---- Công khai và xác thực (publicRoutes.tsx) ---- */
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
  /** Chỉ có ở dev. */
  styleguide: '/styleguide',

  /* ---- Khách hàng (customer) ---- */
  customer: {
    home: '/customer',
    assessment: '/customer/assessment',
    /** Yêu cầu khảo sát đã gửi: đặt / đổi / huỷ giờ khảo sát (12/10/2026). */
    requests: '/customer/requests',
    request: '/customer/requests/:id',
    products: '/customer/products',
    product: '/customer/products/:id',
    // Màn mock đã ẩn
    estimate: '/customer/assessment/estimate',
    consultations: '/customer/consultations',
    consultation: '/customer/consultations/:id',
    quotations: '/customer/quotations',
    quotation: '/customer/quotations/:id',
    projects: '/customer/projects',
    project: '/customer/projects/:id',
    warranty: '/customer/warranty',
    warrantyRequest: '/customer/warranty/:id',
    assistant: '/customer/assistant',
  },

  /* ---- Kinh doanh (sales) ---- */
  ops: {
    home: '/ops',
    surveys: '/ops/surveys',
    /** Tab "Của tôi" có đường dẫn riêng để mục menu đánh dấu đúng; đường tĩnh nên không đụng :id. */
    surveysMine: '/ops/surveys/mine',
    survey: '/ops/surveys/:id',
    products: '/ops/products',
    product: '/ops/products/:id',
    // Màn mock đã ẩn
    consultations: '/ops/consultations',
    customers: '/ops/customers',
    quotations: '/ops/quotations',
    contracts: '/ops/contracts',
    projects: '/ops/projects',
  },

  /* ---- Kỹ thuật viên (technician) ---- */
  tech: {
    home: '/tech',
    /** Lịch khảo sát được kinh doanh phân công (12/10/2026): danh sách, chi tiết + xác nhận nhận việc. */
    jobs: '/tech/jobs',
    job: '/tech/jobs/:id',
    schedule: '/tech/schedule',
    products: '/tech/products',
    product: '/tech/products/:id',
    // Màn mock đã ẩn
    tasks: '/tech/tasks',
    surveys: '/tech/surveys',
    installations: '/tech/installations',
    maintenance: '/tech/maintenance',
    warranty: '/tech/warranty',
    alerts: '/tech/alerts',
    settings: '/tech/settings',
  },

  /* ---- Quản lý (manager) ---- */
  manage: {
    home: '/manage',
    /** Cấu hình lịch + lịch ngày của kỹ thuật viên (quản lý dùng chung trang với quản trị). */
    technicians: '/manage/technicians',
    technician: '/manage/technicians/:id',
    products: '/manage/products',
    product: '/manage/products/:id',
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

  /* ---- Quản trị (admin) ---- */
  admin: {
    home: '/admin',
    users: '/admin/users',
    user: '/admin/users/:id',
    technicians: '/admin/technicians',
    technician: '/admin/technicians/:id',
    products: '/admin/products',
    // Màn mock đã ẩn
    roles: '/admin/roles',
    services: '/admin/services',
    categories: '/admin/categories',
    knowledgeBase: '/admin/knowledge-base',
    techConfig: '/admin/config',
    reports: '/admin/reports',
    settings: '/admin/settings',
    profile: '/admin/profile',
  },

  /* ---- /field: bản portal kit cũ của kỹ thuật viên, mọi đường chuyển về /tech (08/10/2026) ---- */
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

/* Đường dẫn chi tiết của các màn mock kỹ thuật viên đã ẩn. */

/** /tech/tasks/:id */
export const techTaskPath = (id: string) => `${ROUTES.tech.tasks}/${id}`

/** Luồng khảo sát: /tech/surveys/:id, .../verify, .../photos */
export const surveyPath = (id: string) => `${ROUTES.tech.surveys}/${id}`
export const surveyVerifyPath = (id: string) => `${surveyPath(id)}/verify`
export const surveyPhotosPath = (id: string) => `${surveyPath(id)}/photos`

/** Luồng lắp đặt: /tech/installations/:id và .../checklist */
export const installationPath = (id: string) => `${ROUTES.tech.installations}/${id}`
export const installationChecklistPath = (id: string) => `${installationPath(id)}/checklist`

/** Bảo trì và bảo hành: /tech/maintenance/:id, /tech/warranty/:id */
export const maintenancePath = (id: string) => `${ROUTES.tech.maintenance}/${id}`
export const warrantyPath = (id: string) => `${ROUTES.tech.warranty}/${id}`
