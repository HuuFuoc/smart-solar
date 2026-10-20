import { ROUTES } from '@/routes/paths'

export type PortalKey = 'customer' | 'ops' | 'manage' | 'admin' | 'tech'

export type NavItem = {
  label: string
  to: string
  /** Tên icon Material Symbols: hiện trước nhãn, và là thứ duy nhất còn thấy khi rail thu gọn. */
  icon: string
  end?: boolean
  badge?: string
  /** Mẫu đường dẫn khác cũng tính là đang ở mục này, khi trang con không nằm dưới `to` (vd. chi tiết yêu cầu thuộc "Của tôi"). */
  alsoActiveOn?: string[]
}
export type NavGroup = { label?: string; items: NavItem[] }

export type Portal = {
  key: PortalKey
  name: string
  home: string
  groups: NavGroup[]
}

/*
  Menu chỉ liệt kê màn đã đổ dữ liệu thật từ backend (quyết định 05/10/2026). Màn còn dùng mock
  (pages/<portal>/*, data/*.ts) vẫn giữ trong code nhưng ẩn khỏi menu và route; nối API xong thì
  thêm lại mục ở đây và route trong routes/protectedRoutes.tsx.
  Từ 08/10/2026 mọi portal (kể cả admin và kỹ thuật viên /tech) dùng chung shell của portal kit, và không còn
  trang giữ chỗ "chưa có chức năng". /field gộp về /tech.
  Luồng 1 (12/10/2026): khách đặt giờ khảo sát (Yêu cầu khảo sát), kỹ thuật viên xem việc được giao + lịch làm việc,
  quản trị có Tài khoản + Kỹ thuật viên, quản lý có Kỹ thuật viên (cấu hình lịch dùng chung trang với quản trị).
*/
export const PORTALS: Record<PortalKey, Portal> = {
  customer: {
    key: 'customer',
    name: 'Cổng khách hàng',
    home: ROUTES.customer.home,
    groups: [
      {
        items: [
          { label: 'Đánh giá sơ bộ', to: ROUTES.customer.assessment, icon: 'fact_check' },
          { label: 'Yêu cầu khảo sát', to: ROUTES.customer.requests, icon: 'event_available' },
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
        label: 'Yêu cầu khảo sát',
        items: [
          { label: 'Chờ nhận', to: ROUTES.ops.surveys, icon: 'move_to_inbox', end: true },
          // Backend chỉ trả chi tiết cho sales đã nhận yêu cầu, nên mọi trang chi tiết đều thuộc "Của tôi".
          { label: 'Của tôi', to: ROUTES.ops.surveysMine, icon: 'assignment_ind', alsoActiveOn: [ROUTES.ops.survey] },
        ],
      },
      { items: [{ label: 'Sản phẩm', to: ROUTES.ops.products, icon: 'solar_power' }] },
    ],
  },
  manage: {
    key: 'manage',
    name: 'Quản lý',
    home: ROUTES.manage.home,
    groups: [
      {
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
    home: ROUTES.admin.home,
    groups: [
      {
        items: [
          { label: 'Tài khoản', to: ROUTES.admin.users, icon: 'manage_accounts' },
          { label: 'Kỹ thuật viên', to: ROUTES.admin.technicians, icon: 'engineering' },
          { label: 'Sản phẩm', to: ROUTES.admin.products, icon: 'solar_power' },
        ],
      },
    ],
  },
  /* Vai trò kỹ thuật viên đăng nhập vào /tech (homePathForRole). */
  tech: {
    key: 'tech',
    name: 'Kỹ thuật hiện trường',
    home: ROUTES.tech.home,
    groups: [
      {
        items: [
          { label: 'Việc của tôi', to: ROUTES.tech.jobs, icon: 'assignment' },
          { label: 'Lịch làm việc', to: ROUTES.tech.schedule, icon: 'calendar_month' },
          { label: 'Sản phẩm', to: ROUTES.tech.products, icon: 'solar_power' },
        ],
      },
    ],
  },
}
