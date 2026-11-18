import { ROUTES } from '@/routes/paths'

export type PortalKey = 'customer' | 'ops' | 'manage' | 'admin' | 'tech'

export type NavItem = {
  label: string
  to: string
  /** Icon Material Symbols, còn thấy khi rail thu gọn */
  icon: string
  end?: boolean
  badge?: string
  /** Đường dẫn khác cũng tính là đang ở mục này */
  alsoActiveOn?: string[]
}
export type NavGroup = { label?: string; items: NavItem[] }

export type Portal = {
  key: PortalKey
  name: string
  home: string
  groups: NavGroup[]
}

// Menu chỉ có màn đã dùng dữ liệu thật. Màn mock vẫn giữ code nhưng ẩn khỏi menu và route
// Nối API xong thì thêm mục ở đây và route trong routes/protectedRoutes.tsx
export const PORTALS: Record<PortalKey, Portal> = {
  customer: {
    key: 'customer',
    name: 'Cổng khách hàng',
    home: ROUTES.customer.home,
    groups: [
      {
        label: 'Dịch vụ',
        items: [
          { label: 'Tổng quan', to: ROUTES.customer.dashboard, icon: 'dashboard', end: true },
          { label: 'Sản phẩm', to: ROUTES.customer.products, icon: 'solar_power' },
          { label: 'Đánh giá sơ bộ', to: ROUTES.customer.assessment, icon: 'fact_check' },
          {
            label: 'Yêu cầu khảo sát',
            to: ROUTES.customer.requests,
            icon: 'event_available',
            alsoActiveOn: [ROUTES.customer.directBooking],
          },
          { label: 'Hợp đồng', to: ROUTES.customer.contracts, icon: 'history_edu' },
          { label: 'Lắp đặt', to: ROUTES.customer.projects, icon: 'construction' },
          { label: 'Bảo hành, sửa chữa', to: ROUTES.customer.afterSales, icon: 'build' },
          { label: 'Gói dịch vụ', to: ROUTES.customer.packages, icon: 'shield' },
        ],
      },
      {
        label: 'Hỗ trợ',
        items: [{ label: 'Thông báo', to: ROUTES.customer.notifications, icon: 'notifications' }],
      },
    ],
  },
  ops: {
    key: 'ops',
    name: 'Kinh doanh & vận hành',
    home: ROUTES.ops.home,
    groups: [
      {
        items: [{ label: 'Tổng quan', to: ROUTES.ops.dashboard, icon: 'dashboard', end: true }],
      },
      {
        label: 'Yêu cầu khảo sát',
        items: [
          { label: 'Chờ nhận', to: ROUTES.ops.surveys, icon: 'move_to_inbox', end: true },
          // Backend chỉ trả chi tiết cho sales đã nhận yêu cầu, nên trang chi tiết thuộc "Đã nhận"
          // Hợp đồng mở từ trang yêu cầu nên cũng thuộc "Đã nhận"
          {
            label: 'Đã nhận',
            to: ROUTES.ops.surveysMine,
            icon: 'assignment_ind',
            alsoActiveOn: [ROUTES.ops.survey, ROUTES.ops.contract],
          },
        ],
      },
      {
        items: [
          { label: 'Bảo hành, sửa chữa', to: ROUTES.ops.afterSales, icon: 'build' },
          { label: 'Sản phẩm', to: ROUTES.ops.products, icon: 'solar_power' },
        ],
        label: 'Hỗ trợ và danh mục',
      },
    ],
  },
  manage: {
    key: 'manage',
    name: 'Quản lý',
    home: ROUTES.manage.home,
    groups: [
      {
        label: 'Công việc',
        items: [
          { label: 'Điều phối', to: ROUTES.manage.dispatch, icon: 'support_agent' },
          {
            label: 'Hợp đồng',
            to: ROUTES.manage.contracts,
            icon: 'history_edu',
            alsoActiveOn: [ROUTES.manage.contract],
          },
          { label: 'Thu tiền', to: ROUTES.manage.payments, icon: 'payments' },
          { label: 'Lịch thi công', to: ROUTES.manage.installationSchedules, icon: 'event_note' },
          { label: 'Thi công', to: ROUTES.manage.installations, icon: 'construction' },
          { label: 'Bảo hành, sửa chữa', to: ROUTES.manage.afterSales, icon: 'build' },
          { label: 'Việc của kinh doanh', to: ROUTES.manage.salesTasks, icon: 'assignment' },
        ],
      },
      {
        label: 'Đội ngũ và danh mục',
        items: [
          { label: 'Kỹ thuật viên', to: ROUTES.manage.technicians, icon: 'engineering' },
          { label: 'Sản phẩm', to: ROUTES.manage.products, icon: 'solar_power' },
        ],
      },
    ],
  },
  admin: {
    key: 'admin',
    name: 'Quản trị hệ thống',
    home: ROUTES.admin.dashboard,
    groups: [
      {
        label: 'Điều hành',
        items: [
          { label: 'Tổng quan', to: ROUTES.admin.dashboard, icon: 'dashboard', end: true },
          { label: 'Tài khoản', to: ROUTES.admin.users, icon: 'manage_accounts' },
          { label: 'Kỹ thuật viên', to: ROUTES.admin.technicians, icon: 'engineering' },
          { label: 'Khu vực phục vụ', to: ROUTES.admin.zones, icon: 'map' },
          { label: 'Điều phối', to: ROUTES.admin.dispatch, icon: 'support_agent' },
          { label: 'Hợp đồng', to: ROUTES.admin.contracts, icon: 'history_edu', alsoActiveOn: [ROUTES.admin.contract] },
          { label: 'Thu tiền', to: ROUTES.admin.payments, icon: 'payments' },
          { label: 'Lịch thi công', to: ROUTES.admin.installationSchedules, icon: 'event_note' },
          { label: 'Thi công', to: ROUTES.admin.installations, icon: 'construction' },
          { label: 'Bảo hành, sửa chữa', to: ROUTES.admin.afterSales, icon: 'build' },
        ],
      },
      {
        label: 'Sau bán',
        items: [
          { label: 'Gói dịch vụ', to: ROUTES.admin.packages, icon: 'shield' },
          { label: 'Thời hạn bảo hành', to: ROUTES.admin.warrantyOptions, icon: 'verified_user' },
          { label: 'Việc của kinh doanh', to: ROUTES.admin.salesTasks, icon: 'assignment' },
          { label: 'Báo cáo', to: ROUTES.admin.reports, icon: 'monitoring' },
        ],
      },
      {
        label: 'Danh mục, hệ thống',
        items: [
          { label: 'Sản phẩm', to: ROUTES.admin.products, icon: 'solar_power' },
          { label: 'Kho tri thức AI', to: ROUTES.admin.knowledgeBase, icon: 'menu_book' },
          { label: 'Chi phí AI', to: ROUTES.admin.aiUsage, icon: 'paid' },
          { label: 'Cài đặt hệ thống', to: ROUTES.admin.settings, icon: 'settings' },
        ],
      },
    ],
  },
  tech: {
    key: 'tech',
    name: 'Kỹ thuật hiện trường',
    home: ROUTES.tech.home,
    groups: [
      {
        label: 'Tác vụ kỹ thuật',
        items: [
          { label: 'Khảo sát', to: ROUTES.tech.jobs, icon: 'assignment' },
          { label: 'Hẹn lịch thi công', to: ROUTES.tech.installationSchedules, icon: 'event_note' },
          { label: 'Lắp đặt', to: ROUTES.tech.installations, icon: 'construction' },
          { label: 'Bảo hành, sửa chữa', to: ROUTES.tech.afterSales, icon: 'build' },
          { label: 'Lịch làm việc', to: ROUTES.tech.schedule, icon: 'calendar_month' },
        ],
      },
      {
        label: 'Hỗ trợ và kho',
        items: [{ label: 'Kho sản phẩm và vật tư', to: ROUTES.tech.products, icon: 'inventory_2' }],
      },
    ],
  },
}
