import type { SelectOption } from '@/components/common/stitch-ui/FilterBar'
import type { MetricCardProps } from '@/components/common/stitch-ui/MetricCard'
import type { Crumb } from '@/components/common/stitch-ui/PageHeader'
import type { StatusVariant } from '@/components/common/stitch-ui/StatusBadge'

/* Dữ liệu giả cho /admin/users, nội dung lấy từ user_management/screen.png. */

export const userRoleValues = [
  'super-admin',
  'lead-technician',
  'operations-manager',
  'sales-rep',
  'homeowner',
  'field-technician',
] as const
export type UserRole = (typeof userRoleValues)[number]

export type UserRoleMeta = {
  value: UserRole
  label: string
  shortLabel: string
  icon: string
  badgeVariant: StatusVariant
  clearance: string
  description: string
}

export const userRoles: UserRoleMeta[] = [
  {
    value: 'super-admin',
    label: 'Quản trị viên (toàn quyền)',
    shortLabel: 'Quản trị viên',
    icon: 'shield_person',
    badgeVariant: 'solid',
    clearance: 'Cấp 5',
    description: 'Toàn quyền với dữ liệu vận hành, thương mại, điều phối và cấu hình AI.',
  },
  {
    value: 'lead-technician',
    label: 'Kỹ thuật viên trưởng (lắp đặt, giám sát, hiện trường)',
    shortLabel: 'KTV trưởng',
    icon: 'build',
    badgeVariant: 'warning',
    clearance: 'Cấp 3',
    description: 'Được chỉnh thông số giám sát, bật/tắt kiểm tra an toàn lưới và ghép nối inverter.',
  },
  {
    value: 'operations-manager',
    label: 'Quản lý vận hành',
    shortLabel: 'Quản lý',
    icon: 'hub',
    badgeVariant: 'scheduled',
    clearance: 'Cấp 4',
    description: 'Xếp lịch đội thi công, duyệt hồ sơ kỹ thuật và duyệt thay thế thiết bị giá trị cao.',
  },
  {
    value: 'sales-rep',
    label: 'Nhân viên kinh doanh',
    shortLabel: 'Kinh doanh',
    icon: 'monetization_on',
    badgeVariant: 'review',
    clearance: 'Cấp 2',
    description: 'Lập dự báo tiết kiệm điện, dựng gói hệ thống và tạo báo giá cho khách.',
  },
  {
    value: 'homeowner',
    label: 'Khách hàng (chủ nhà)',
    shortLabel: 'Khách hàng',
    icon: 'cottage',
    badgeVariant: 'neutral',
    clearance: 'Cấp 1',
    description: 'Xem sản lượng điện, gửi yêu cầu hỗ trợ và tra hoá đơn tiền điện.',
  },
  {
    value: 'field-technician',
    label: 'Kỹ thuật viên hiện trường',
    shortLabel: 'Kỹ thuật viên',
    icon: 'engineering',
    badgeVariant: 'neutral',
    clearance: 'Cấp 2',
    description: 'Tải ảnh thi công, ghi số liệu inverter và hoàn thành các mục kiểm tra.',
  },
]

export const userRoleMap = Object.fromEntries(userRoles.map((role) => [role.value, role])) as Record<
  UserRole,
  UserRoleMeta
>

export type UserStatus = 'active' | 'pending' | 'locked'

export const userStatuses: Record<UserStatus, { label: string; badgeVariant: StatusVariant }> = {
  active: { label: 'Đang hoạt động', badgeVariant: 'success' },
  pending: { label: 'Chờ xác thực', badgeVariant: 'review' },
  locked: { label: 'Đã khoá', badgeVariant: 'error' },
}

export const regionZones: SelectOption[] = [
  { value: 'austin', label: 'Trung tâm Austin' },
  { value: 'san-antonio', label: 'Chi nhánh San Antonio' },
  { value: 'norcal', label: 'Khu vực NorCal' },
  { value: 'socal', label: 'Khu vực SoCal' },
  { value: 'pnw', label: 'Khu vực Pacific NW' },
]

export type UserRecord = {
  id: string
  employeeId: string
  name: string
  initials: string
  avatarSrc?: string
  avatarTone: 'primary' | 'secondary' | 'neutral' | 'error'
  department: string
  email: string
  phone: string
  role: UserRole
  status: UserStatus
  /** Icon SSO verified cạnh tên */
  ssoVerified?: boolean
  /** Chấm xanh "Current Active Editor" cạnh tên */
  activeEditor?: boolean
  created: string
  lastActivity: string
  lastDevice: string
  regions: string[]
  mfaEnforced: boolean
  apiTokens: number
  identityLog: { event: string; when: string }[]
}

export const users: UserRecord[] = [
  {
    id: 'EMP-1001',
    employeeId: '#EMP-1001',
    name: 'Eleanor Sterling',
    initials: 'ES',
    avatarSrc: '/placeholders/avatar-1.svg',
    avatarTone: 'primary',
    department: 'Ban điều hành',
    email: 'e.sterling@smartsolar.io',
    phone: '+1 (415) 890-2134',
    role: 'super-admin',
    status: 'active',
    ssoVerified: true,
    created: '14/01/2023',
    lastActivity: '2 phút trước',
    lastDevice: 'Trình duyệt (Chrome/macOS)',
    regions: ['austin'],
    mfaEnforced: true,
    apiTokens: 4,
    identityLog: [
      { event: 'Duyệt phát hành SKU #SE7600', when: '1 giờ trước' },
      { event: 'Đăng ký lại thiết bị MFA', when: '2 ngày trước' },
    ],
  },
  {
    id: 'EMP-3319',
    employeeId: '#EMP-3319',
    name: 'Marcus Vance',
    initials: 'MV',
    avatarSrc: '/placeholders/avatar-2.svg',
    avatarTone: 'secondary',
    department: 'Kỹ thuật hiện trường',
    email: 'm.vance@smartsolar.io',
    phone: '+1 (512) 441-9022',
    role: 'lead-technician',
    status: 'active',
    activeEditor: true,
    created: '02/03/2023',
    lastActivity: '5 phút trước',
    lastDevice: 'Ứng dụng di động (Austin)',
    regions: ['austin', 'san-antonio'],
    mfaEnforced: true,
    apiTokens: 2,
    identityLog: [
      { event: 'Ghi đè cấu hình inverter #902', when: '12 phút trước' },
      { event: 'Eleanor Sterling đổi vai trò', when: '3 ngày trước' },
    ],
  },
  {
    id: 'EMP-2084',
    employeeId: '#EMP-2084',
    name: 'Sarah Lin',
    initials: 'SL',
    avatarSrc: '/placeholders/avatar-3.svg',
    avatarTone: 'primary',
    department: 'Điều độ lưới điện',
    email: 's.lin@smartsolar.io',
    phone: '+1 (415) 322-8819',
    role: 'operations-manager',
    status: 'active',
    created: '18/06/2023',
    lastActivity: '1 giờ trước',
    lastDevice: 'Trình duyệt (Edge/Windows)',
    regions: ['norcal'],
    mfaEnforced: true,
    apiTokens: 1,
    identityLog: [{ event: 'Công bố lịch đội thi công (tuần 43)', when: '1 giờ trước' }],
  },
  {
    id: 'EMP-5520',
    employeeId: '#EMP-5520',
    name: 'David Chen',
    initials: 'DC',
    avatarTone: 'neutral',
    department: 'Tư vấn hộ gia đình',
    email: 'd.chen@smartsolar.io',
    phone: '+1 (619) 540-1129',
    role: 'sales-rep',
    status: 'pending',
    created: '03/09/2024',
    lastActivity: 'Hôm qua',
    lastDevice: 'Trình duyệt (Safari/macOS)',
    regions: ['socal'],
    mfaEnforced: false,
    apiTokens: 0,
    identityLog: [{ event: 'Đã nhận lời mời, chờ xác thực', when: '1 ngày trước' }],
  },
  {
    id: 'CUST-9812',
    employeeId: '#CUST-9812',
    name: 'Alex Rivera',
    initials: 'AR',
    avatarTone: 'neutral',
    department: 'Hệ 12,4 kW (NorCal)',
    email: 'alex.rivera84@gmail.com',
    phone: '+1 (408) 773-9011',
    role: 'homeowner',
    status: 'active',
    created: '27/02/2025',
    lastActivity: '3 ngày trước',
    lastDevice: 'Ứng dụng khách hàng (Android)',
    regions: ['norcal'],
    mfaEnforced: false,
    apiTokens: 0,
    identityLog: [{ event: 'Xem báo cáo sản lượng tháng', when: '3 ngày trước' }],
  },
  {
    id: 'EMP-1904',
    employeeId: '#EMP-1904',
    name: 'Robert Morales',
    initials: 'RM',
    avatarTone: 'error',
    department: 'Tạm khoá (sai MFA 5 lần)',
    email: 'r.morales@smartsolar.io',
    phone: '+1 (512) 880-9931',
    role: 'field-technician',
    status: 'locked',
    created: '04/06/2023',
    lastActivity: '3 ngày trước',
    lastDevice: 'Bị khoá đăng nhập',
    regions: ['austin'],
    mfaEnforced: true,
    apiTokens: 0,
    identityLog: [
      { event: 'Khoá đăng nhập sau 5 lần sai MFA', when: '3 ngày trước' },
      { event: 'Yêu cầu đặt lại mật khẩu', when: '3 ngày trước' },
    ],
  },
]

export const usersPageHeader = {
  breadcrumb: [{ label: 'Quản trị' }, { label: 'Quản trị nền tảng' }, { label: 'Người dùng' }] satisfies Crumb[],
  title: 'Người dùng',
  actions: { export: 'Xuất CSV', invite: 'Mời người dùng' },
}

export const usersKpis: MetricCardProps[] = [
  {
    label: 'Tổng người dùng',
    value: '1,428',
    icon: 'group',
    tone: 'primary',
    delta: { text: '+4,2% so với tháng trước', direction: 'up' },
  },
  {
    label: 'Nhân sự nội bộ',
    value: '144',
    icon: 'badge',
    tone: 'secondary',
  },
  {
    label: 'Phiên đang mở',
    value: '86',
    icon: 'sensors',
    tone: 'tertiary',
    valueTone: 'tertiary',
    delta: { text: 'đang đăng nhập', direction: 'flat', tone: 'positive', live: true },
  },
  {
    label: 'Tạm khoá / ngừng dùng',
    value: '12',
    icon: 'lock_clock',
    tone: 'error',
    valueTone: 'error',
    delta: { text: 'Cần xử lý: 3 hồ sơ chờ rà soát', direction: 'flat' },
  },
]

export type RoleFilter = 'all' | 'super-admin' | 'operations-manager' | 'technician' | 'sales-rep' | 'homeowner'
export type StatusFilter = 'all' | UserStatus | 'inactive'

export const usersFilterOptions = {
  roles: [
    { value: 'all', label: 'Tất cả vai trò (1.428)' },
    { value: 'super-admin', label: 'Quản trị viên (6)' },
    { value: 'operations-manager', label: 'Quản lý (12)' },
    { value: 'technician', label: 'Kỹ thuật viên (42)' },
    { value: 'sales-rep', label: 'Kinh doanh (84)' },
    { value: 'homeowner', label: 'Khách hàng (1.284)' },
  ] satisfies { value: RoleFilter; label: string }[],
  statuses: [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Đang hoạt động' },
    { value: 'inactive', label: 'Ngừng dùng' },
    { value: 'pending', label: 'Chờ xác thực' },
    { value: 'locked', label: 'Đã khoá' },
  ] satisfies { value: StatusFilter; label: string }[],
  regions: [{ value: 'all', label: 'Tất cả khu vực' }, ...regionZones],
  searchPlaceholder: 'Tìm theo tên, email, mã nhân viên, số điện thoại…',
}

/** Chip "Active Scopes" trong thiết kế chỉ là nhãn minh họa, không lọc dữ liệu. */
export const usersDefaultScopes = ['Chỉ nội bộ', 'Bắt buộc MFA']

export const usersBulkActions = [
  { key: 'deactivate', icon: 'block', label: 'Ngừng hoạt động', hover: 'hover:text-error' },
  { key: 'resend', icon: 'mail', label: 'Gửi lại lời mời', hover: 'hover:text-primary' },
]

export const usersDirectory = {
  /** Tổng số trong thư mục thật; bảng mock chỉ là trang mẫu đầu tiên */
  total: 1428,
  initiallySelected: ['EMP-1001', 'EMP-3319'],
  pageSizeOptions: [10, 25, 50, 100],
}
