import type { Crumb } from '@/components/common/stitch-ui/Breadcrumb'
import type { StatusVariant } from '@/components/common/stitch-ui/StatusBadge'
import { ROUTES } from '@/routes/paths'

/* Dữ liệu giả cho /admin/roles, nội dung lấy từ roles_permissions/screen.png. */

export const rolesPageHeader = {
  breadcrumb: [
    { label: 'Quản trị', icon: 'admin_panel_settings', href: ROUTES.admin.home },
    { label: 'An toàn thông tin' },
    { label: 'Vai trò & quyền' },
  ] satisfies Crumb[],
  title: 'Vai trò và quyền',
  actions: { export: 'Xuất bảng quyền', audit: 'Rà soát sai lệch', create: 'Tạo vai trò' },
}

export type RoleId = 'super-admin' | 'ops-manager' | 'sales-rep' | 'field-tech' | 'customer' | 'compliance-auditor'

export type RoleScopeTone = 'protected' | 'custom' | 'readonly'

export type RoleSummary = {
  id: RoleId
  name: string
  tagline: string
  description: string
  icon: string
  users: number
  scopeLabel: string
  scopeIcon: string
  scopeTone: RoleScopeTone
  protected?: boolean
  detail: {
    subtitle: string
    scope: string
    badge?: { label: string; variant: StatusVariant }
    warning?: { title: string; before: string; strong: string; after: string }
  }
}

export const roles: RoleSummary[] = [
  {
    id: 'super-admin',
    name: 'Quản trị viên',
    tagline: 'Toàn quyền nền tảng và chính sách',
    description: 'Toàn quyền với dữ liệu vận hành, thương mại, điều phối và AI.',
    icon: 'shield_person',
    users: 6,
    scopeLabel: 'Được bảo vệ',
    scopeIcon: 'lock',
    scopeTone: 'protected',
    protected: true,
    detail: {
      subtitle: 'Toàn quyền quản trị, ban hành chính sách và can thiệp kỹ thuật.',
      scope: 'Toàn hệ thống',
      badge: { label: 'Vai trò hệ thống bảo vệ', variant: 'success' },
      warning: {
        title: 'Phạm vi ảnh hưởng lớn',
        before: 'Thay đổi vai trò này tác động ngay tới ',
        strong: '6 tài khoản quản trị',
        after: '. Các thao tác rủi ro cao cần thêm một quản trị viên khác phê duyệt.',
      },
    },
  },
  {
    id: 'ops-manager',
    name: 'Quản lý vận hành',
    tagline: 'Điều phối hiện trường và giám sát vận hành',
    description: 'Xếp lịch đội thi công, duyệt hồ sơ kỹ thuật và duyệt thay thiết bị lớn.',
    icon: 'engineering',
    users: 12,
    scopeLabel: 'Tuỳ chỉnh',
    scopeIcon: 'tune',
    scopeTone: 'custom',
    detail: {
      subtitle: 'Xếp lịch điều phối, theo dõi tiến độ lắp đặt và năng lực đội thi công.',
      scope: 'Vận hành theo vùng',
      badge: { label: 'Vai trò tuỳ chỉnh', variant: 'neutral' },
    },
  },
  {
    id: 'sales-rep',
    name: 'Nhân viên kinh doanh',
    tagline: 'Báo giá, phương án và ước tính sản lượng',
    description: 'Lập dự báo tiết kiệm, dựng gói hệ thống và khởi tạo hợp đồng chuẩn.',
    icon: 'point_of_sale',
    users: 84,
    scopeLabel: 'Thương mại',
    scopeIcon: 'tune',
    scopeTone: 'custom',
    detail: {
      subtitle: 'Dựng phương án cho khách, tính biểu giá điện và tiếp nhận khách tiềm năng.',
      scope: 'Thương mại',
      badge: { label: 'Vai trò tuỳ chỉnh', variant: 'neutral' },
    },
  },
  {
    id: 'field-tech',
    name: 'Kỹ thuật viên trưởng',
    tagline: 'Kiểm tra công trình, đấu nối và nghiệm thu',
    description: 'Tải ảnh thi công, ghi số liệu inverter và hoàn tất danh mục nghiệm thu đấu nối.',
    icon: 'construction',
    users: 42,
    scopeLabel: 'Hiện trường',
    scopeIcon: 'tune',
    scopeTone: 'custom',
    detail: {
      subtitle: 'Kiểm tra điện tại chỗ, quét số seri tấm pin và ký xác nhận an toàn.',
      scope: 'Khu vực thi công',
      badge: { label: 'Vai trò tuỳ chỉnh', variant: 'neutral' },
    },
  },
  {
    id: 'customer',
    name: 'Khách hàng',
    tagline: 'Xem sản lượng và hoá đơn',
    description: 'Xem sản lượng điện, gửi yêu cầu hỗ trợ và theo dõi phần điện tiết kiệm.',
    icon: 'cottage',
    users: 1284,
    scopeLabel: 'Phạm vi khách hàng',
    scopeIcon: 'lock_clock',
    scopeTone: 'custom',
    detail: {
      subtitle: 'Xem giám sát hệ thống, lưu trữ hoá đơn và yêu cầu hỗ trợ.',
      scope: 'Tài khoản khách',
      badge: { label: 'Giới hạn theo khách', variant: 'neutral' },
    },
  },
  {
    id: 'compliance-auditor',
    name: 'Kiểm soát tuân thủ',
    tagline: 'Chỉ đọc nhật ký an toàn và bảo mật',
    description: 'Chỉ đọc hồ sơ đấu nối lưới và nhật ký tuân thủ, không sửa được dữ liệu.',
    icon: 'fact_check',
    users: 2,
    scopeLabel: 'Chỉ đọc',
    scopeIcon: 'visibility',
    scopeTone: 'readonly',
    detail: {
      subtitle: 'Hồ sơ an toàn, biên bản đấu nối và dòng sự kiện tuân thủ, chỉ để đọc.',
      scope: 'Kiểm soát',
      badge: { label: 'Chỉ đọc', variant: 'warning' },
    },
  },
]

export type PermissionItem = {
  id: string
  label: string
  description: string
  /** Quyền phá hủy: chữ đỏ, checkbox đỏ, icon crisis_alert */
  destructive?: boolean
}

export type PermissionModule = {
  id: string
  index: number
  title: string
  icon: string
  columns: 2 | 3
  items: PermissionItem[]
}

export const permissionModules: PermissionModule[] = [
  {
    id: 'identity',
    index: 1,
    title: 'Người dùng và định danh',
    icon: 'manage_accounts',
    columns: 2,
    items: [
      { id: 'view-users', label: 'Xem người dùng', description: 'Tra danh bạ, hồ sơ và trạng thái' },
      {
        id: 'create-edit-users',
        label: 'Tạo và sửa người dùng',
        description: 'Cấp tài khoản và sửa thông tin liên hệ',
      },
      {
        id: 'deactivate-accounts',
        label: 'Ngừng hoặc xoá tài khoản',
        description: 'Thu hồi SSO, xoá tài khoản (không khôi phục được)',
        destructive: true,
      },
      { id: 'assign-admin-roles', label: 'Gán vai trò quản trị', description: 'Nâng phạm vi quyền của tài khoản' },
    ],
  },
  {
    id: 'pricing',
    index: 2,
    title: 'Giá và duyệt báo giá',
    icon: 'price_change',
    columns: 3,
    items: [
      { id: 'view-quotations', label: 'Xem báo giá chính thức', description: 'Xem phần tài chính của phương án' },
      { id: 'authorize-discounts', label: 'Duyệt giảm giá trên 10%', description: 'Cho phép giá khác khung chuẩn' },
      { id: 'bypass-signoff', label: 'Bỏ qua bước quản lý duyệt', description: 'Cho ký hợp đồng ngay' },
    ],
  },
  {
    id: 'catalogue',
    index: 3,
    title: 'Danh mục sản phẩm và dịch vụ',
    icon: 'solar_power',
    columns: 3,
    items: [
      { id: 'publish-skus', label: 'Phát hành SKU thiết bị', description: 'Tấm pin, inverter, pin lưu trữ' },
      { id: 'baseline-cost', label: 'Đặt giá gốc và nhân công', description: 'Bảng giá lắp đặt theo khu vực' },
      { id: 'archive-modules', label: 'Lưu trữ thiết bị cũ', description: 'Ngừng kinh doanh các lô đời cũ' },
    ],
  },
  {
    id: 'engine',
    index: 4,
    title: 'Tham số kỹ thuật và bộ tính toán',
    icon: 'tune',
    columns: 3,
    items: [
      { id: 'degradation', label: 'Sửa hệ số suy giảm', description: 'Mức suy giảm tấm pin trong 25 năm' },
      { id: 'cec-presets', label: 'Cấu hình chuẩn CEC cho inverter', description: 'Hiệu chỉnh đường hiệu suất' },
      { id: 'warranty-terms', label: 'Cập nhật điều khoản bảo hành', description: 'Chính sách bảo hành thi công' },
    ],
  },
  {
    id: 'knowledge',
    index: 5,
    title: 'Kho tri thức AI',
    icon: 'smart_toy',
    columns: 3,
    items: [
      { id: 'upload-pdfs', label: 'Tải tài liệu quy định', description: 'Bổ sung quy chuẩn của địa phương' },
      { id: 'reindex', label: 'Đánh lại chỉ mục vector', description: 'Tính lại embedding trong Pinecone' },
      { id: 'purge-chunks', label: 'Xoá dữ liệu vector', description: 'Bỏ các đoạn tài liệu đã lỗi thời' },
    ],
  },
]

export const allPermissionIds = permissionModules.flatMap((module) => module.items.map((item) => item.id))

/** Baseline quyền của từng role (id trong permissionModules). */
export const roleDefaults: Record<RoleId, string[]> = {
  'super-admin': allPermissionIds,
  'ops-manager': allPermissionIds.filter(
    (id) => !['deactivate-accounts', 'assign-admin-roles', 'bypass-signoff', 'purge-chunks'].includes(id),
  ),
  'sales-rep': ['view-users', 'view-quotations', 'authorize-discounts', 'publish-skus', 'baseline-cost'],
  'field-tech': [
    'view-users',
    'view-quotations',
    'publish-skus',
    'cec-presets',
    'warranty-terms',
    'upload-pdfs',
    'reindex',
  ],
  customer: ['view-users', 'view-quotations'],
  'compliance-auditor': ['view-users', 'view-quotations', 'baseline-cost', 'cec-presets', 'upload-pdfs'],
}

export const systemRolesPanel = {
  title: 'Vai trò hệ thống',
  countLabel: (count: number) => `${count} vai trò`,
  searchPlaceholder: 'Lọc theo vai trò hoặc phạm vi…',
  governed: { label: 'Tài khoản được quản lý', value: '1.430', note: '100% áp chính sách', percent: 94 },
}

export const governanceCallout = {
  image: '/placeholders/photo-panel.svg',
  eyebrow: 'Ràng buộc quyền',
  title: 'Giới hạn an toàn thiết bị và lưới',
  note: 'Không thể bỏ ngưỡng an toàn của inverter nếu chưa xác thực hai lớp.',
}

export const matrixLabels = {
  title: 'Bảng quyền theo chức năng',
  collapse: 'Thu gọn',
  expand: 'Mở rộng',
  grantAll: 'Cấp tất cả',
  revokeAll: 'Bỏ tất cả',
  allowed: 'quyền được cấp',
  reset: 'Khôi phục mặc định',
  save: 'Lưu bảng quyền',
}

export const matrixStatus = {
  clean: 'Không có thay đổi chưa lưu',
  dirty: 'Có thay đổi chưa lưu',
  loaded: (name: string) => `Đã tải quyền mặc định của ${name}`,
  saved: 'Đã lưu toàn bộ thay đổi',
  reset: 'Đã khôi phục vai trò về chính sách mặc định',
}

export const rolesToasts = {
  saved: 'Đã đồng bộ bảng quyền sang hệ thống kiểm soát truy cập',
  reset: 'Đã quay về cấu hình mặc định',
  export: 'Đang xuất bảng quyền ra PDF/CSV…',
  audit: 'Đã quét: không phát hiện tài khoản được nâng quyền trái phép.',
}

export const auditTrailFooter = {
  title: 'Nhật ký thay đổi quyền',
  before: 'Lần lưu gần nhất: ',
  strong: 'Hôm nay, 09:14',
  after: ' bởi Eleanor Sterling (quản trị viên)',
  linkLabel: 'Xem chi tiết thay đổi',
}
