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
        items: [
          { label: 'Tổng quan', to: ROUTES.customer.dashboard, icon: 'dashboard', end: true },
          { label: 'Đánh giá sơ bộ', to: ROUTES.customer.assessment, icon: 'fact_check' },
          { label: 'Yêu cầu khảo sát', to: ROUTES.customer.requests, icon: 'event_available' },
          { label: 'Báo giá', to: ROUTES.customer.quotations, icon: 'request_quote' },
          { label: 'Lắp đặt', to: ROUTES.customer.projects, icon: 'construction' },
          { label: 'Bảo hành, sửa chữa', to: ROUTES.customer.afterSales, icon: 'build' },
          { label: 'Gói dịch vụ', to: ROUTES.customer.packages, icon: 'shield' },
          { label: 'Sản phẩm', to: ROUTES.customer.products, icon: 'solar_power' },
        ],
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
          // Backend chỉ trả chi tiết cho sales đã nhận yêu cầu, nên trang chi tiết thuộc "Của tôi"
          { label: 'Của tôi', to: ROUTES.ops.surveysMine, icon: 'assignment_ind', alsoActiveOn: [ROUTES.ops.survey] },
        ],
      },
      {
        items: [
          { label: 'Bảo hành, sửa chữa', to: ROUTES.ops.afterSales, icon: 'build' },
          { label: 'Sản phẩm', to: ROUTES.ops.products, icon: 'solar_power' },
        ],
      },
    ],
  },
  manage: {
    key: 'manage',
    name: 'Quản lý',
    home: ROUTES.manage.home,
    groups: [
      {
        items: [
          { label: 'Thi công', to: ROUTES.manage.installations, icon: 'construction' },
          { label: 'Bảo hành, sửa chữa', to: ROUTES.manage.afterSales, icon: 'build' },
          { label: 'Kỹ thuật viên', to: ROUTES.manage.technicians, icon: 'engineering' },
          { label: 'Sản phẩm', to: ROUTES.manage.products, icon: 'solar_power' },
        ],
      },
    ],
  },
  admin: {
    key: 'admin',
    name: 'Quản trị hệ thống',
    home: ROUTES.admin.home,
    groups: [
      {
        items: [
          { label: 'Tài khoản', to: ROUTES.admin.users, icon: 'manage_accounts' },
          { label: 'Kỹ thuật viên', to: ROUTES.admin.technicians, icon: 'engineering' },
          { label: 'Thi công', to: ROUTES.admin.installations, icon: 'construction' },
          { label: 'Bảo hành, sửa chữa', to: ROUTES.admin.afterSales, icon: 'build' },
          { label: 'Sản phẩm', to: ROUTES.admin.products, icon: 'solar_power' },
          { label: 'Gói dịch vụ', to: ROUTES.admin.packages, icon: 'shield' },
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
        items: [
          { label: 'Việc của tôi', to: ROUTES.tech.jobs, icon: 'assignment' },
          { label: 'Lắp đặt', to: ROUTES.tech.installations, icon: 'construction' },
          { label: 'Bảo hành, sửa chữa', to: ROUTES.tech.afterSales, icon: 'build' },
          { label: 'Lịch làm việc', to: ROUTES.tech.schedule, icon: 'calendar_month' },
          { label: 'Sản phẩm', to: ROUTES.tech.products, icon: 'solar_power' },
        ],
      },
    ],
  },
}
