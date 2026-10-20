import type { ChecklistState } from '@/components/common/stitch-ui/ChecklistItem'
import type { SelectOption } from '@/components/common/stitch-ui/FilterBar'
import type { MetricCardProps } from '@/components/common/stitch-ui/MetricCard'
import type { PhotoCardProps } from '@/components/common/stitch-ui/PhotoGrid'
import type { StatusVariant } from '@/components/common/stitch-ui/StatusBadge'
import type { TaskCardProps } from '@/components/common/stitch-ui/TaskCard'
import type { TimelineStepState } from '@/components/common/stitch-ui/Timeline'

/* Dữ liệu demo cho /styleguide, lấy từ nội dung các screen.png. */

export const styleguideBadges: { label: string; variant: StatusVariant; pulse?: boolean }[] = [
  { label: 'Đã gửi', variant: 'submitted' },
  { label: 'Đang xem xét', variant: 'review' },
  { label: 'Đã hẹn khảo sát', variant: 'scheduled' },
  { label: 'Đang thực hiện', variant: 'in-progress' },
  { label: 'Đang bảo hành', variant: 'complete' },
  { label: 'Sự cố ưu tiên cao', variant: 'error', pulse: true },
  { label: 'Chờ xử lý', variant: 'neutral' },
  { label: 'Khảo sát', variant: 'primary' },
  { label: 'Đang di chuyển', variant: 'warning' },
  { label: 'Đang hoạt động', variant: 'success' },
  { label: 'Đang làm', variant: 'active', pulse: true },
]

export const styleguideMetrics: MetricCardProps[] = [
  {
    label: 'Tổng người dùng',
    value: '1,428',
    icon: 'group',
    tone: 'primary',
    delta: { text: '+4.2% so với tháng trước', direction: 'up' },
  },
  {
    label: 'Nhân viên nội bộ',
    value: '144',
    icon: 'badge',
    tone: 'secondary',
    description: 'Kỹ thuật viên, vận hành, trưởng nhóm',
  },
  {
    label: 'Phiên đang hoạt động',
    value: '86',
    icon: 'sensors',
    tone: 'tertiary',
    valueTone: 'tertiary',
    delta: { text: 'Đang đăng nhập', direction: 'up', live: true },
  },
  {
    label: 'Bị khoá / không hoạt động',
    value: '12',
    icon: 'lock_clock',
    tone: 'error',
    valueTone: 'error',
    delta: { text: 'Cần xử lý: 3 tài khoản chờ kiểm tra', direction: 'flat' },
  },
]

export type StyleguideUser = {
  id: string
  name: string
  employeeId: string
  department: string
  email: string
  phone: string
  role: string
  roleVariant: StatusVariant
  status: string
  statusVariant: StatusVariant
  created: string
  lastActivity: string
  lastDevice: string
}

export const styleguideUsers: StyleguideUser[] = [
  {
    id: 'EMP-1001',
    name: 'Eleanor Sterling',
    employeeId: '#EMP-1001',
    department: 'Văn phòng điều hành',
    email: 'e.sterling@smartsolar.io',
    phone: '+1 (415) 890-2134',
    role: 'Quản trị cấp cao',
    roleVariant: 'primary',
    status: 'Đang hoạt động',
    statusVariant: 'success',
    created: '14/1/2023',
    lastActivity: '2 phút trước',
    lastDevice: 'Nền tảng web (Chrome/OSX)',
  },
  {
    id: 'EMP-3319',
    name: 'Marcus Vance',
    employeeId: '#EMP-3319',
    department: 'Vận hành hiện trường',
    email: 'm.vance@smartsolar.io',
    phone: '+1 (512) 441-9022',
    role: 'Trưởng nhóm kỹ thuật',
    roleVariant: 'warning',
    status: 'Đang hoạt động',
    statusVariant: 'success',
    created: '2/3/2023',
    lastActivity: '14 phút trước',
    lastDevice: 'Ứng dụng hiện trường (iOS)',
  },
  {
    id: 'EMP-2084',
    name: 'Sarah Lin',
    employeeId: '#EMP-2084',
    department: 'Điều phối lưới điện',
    email: 's.lin@smartsolar.io',
    phone: '+1 (415) 322-8819',
    role: 'Quản lý vận hành',
    roleVariant: 'scheduled',
    status: 'Đang hoạt động',
    statusVariant: 'success',
    created: '18/6/2023',
    lastActivity: '1 giờ trước',
    lastDevice: 'Nền tảng web (Edge/Win)',
  },
  {
    id: 'EMP-5520',
    name: 'David Chen',
    employeeId: '#EMP-5520',
    department: 'Tư vấn nhà ở',
    email: 'd.chen@smartsolar.io',
    phone: '+1 (619) 540-1129',
    role: 'Tư vấn viên kinh doanh',
    roleVariant: 'review',
    status: 'Chờ xác minh',
    statusVariant: 'review',
    created: '3/9/2024',
    lastActivity: 'Hôm qua',
    lastDevice: 'Nền tảng web (Safari/OSX)',
  },
  {
    id: 'CUST-9812',
    name: 'Alex Rivera',
    employeeId: '#CUST-9812',
    department: 'Dàn pin 12.4kW (NorCal)',
    email: 'alex.rivera84@gmail.com',
    phone: '+1 (408) 773-9011',
    role: 'Chủ nhà',
    roleVariant: 'neutral',
    status: 'Đang hoạt động',
    statusVariant: 'success',
    created: '27/2/2025',
    lastActivity: '3 ngày trước',
    lastDevice: 'Ứng dụng chủ nhà (Android)',
  },
  {
    id: 'EMP-1904',
    name: 'Robert Morales',
    employeeId: '#EMP-1904',
    department: 'Vận hành hiện trường',
    email: 'r.morales@smartsolar.io',
    phone: '+1 (512) 880-9931',
    role: 'Kỹ thuật viên',
    roleVariant: 'warning',
    status: 'Bị khoá (sai MFA 5 lần)',
    statusVariant: 'error',
    created: '11/11/2022',
    lastActivity: '8 ngày trước',
    lastDevice: 'Ứng dụng hiện trường (Android)',
  },
]

export const styleguideTaskCards: TaskCardProps[] = [
  {
    accent: 'primary',
    type: { label: 'Khảo sát', variant: 'primary' },
    priority: { label: 'Ưu tiên cao', variant: 'error' },
    meta: { icon: 'timer', emphasis: 'Tiếp theo', text: 'Bắt đầu sau 24 phút', boxed: true },
    title: 'Elena Rostova',
    address: '842 Crestview Terrace, Los Gatos, CA',
    phoneHref: 'tel:5550192834',
    specs: [
      { label: 'Khung giờ', value: '09:00 - 10:30' },
      { label: 'Vật liệu mái', value: 'Ngói Tây Ban Nha (28°)' },
      { label: 'Hệ thống ước tính', value: '11.4 kW, 26 tấm' },
    ],
    primaryAction: { label: 'Bắt đầu khảo sát', icon: 'play_arrow' },
    secondaryAction: { label: 'Bản đồ', icon: 'directions' },
  },
  {
    accent: 'error',
    type: { label: 'Điều phối bảo hành', variant: 'error' },
    priority: { label: 'Ưu tiên cao', variant: 'error' },
    meta: { icon: 'schedule', text: '03:00 - 16:15' },
    title: 'Garrett, Highland Plaza',
    address: '339 Redwood Ave, San Jose, CA',
    phoneHref: 'tel:5550192835',
    specs: [
      { label: 'Cảnh báo', value: 'Hồ quang micro-inverter #04', tone: 'error' },
      { label: 'Tuổi hệ thống', value: '11 tháng (gói Gold)' },
      { label: 'Thiết bị thay thế', value: 'Có IQ8+ trên xe' },
    ],
    primaryAction: { label: 'Kiểm tra hệ thống', icon: 'build' },
    secondaryAction: { label: 'Bản đồ', icon: 'directions' },
  },
]

export const styleguideTimeline: {
  title: string
  description: string
  timestamp: string
  state: TimelineStepState
}[] = [
  { title: 'Đã giao', description: 'Sarah Jenkins (điều phối)', timestamp: '22/10, 14:15', state: 'done' },
  { title: 'Đã hẹn & xác nhận', description: 'Khách xác nhận qua SMS', timestamp: '22/10, 15:30', state: 'done' },
  { title: 'Đang di chuyển', description: 'Điểm danh qua GPS', timestamp: '23/10, 08:15', state: 'done' },
  {
    title: 'Đang làm tại công trình',
    description: 'Người khảo sát: Marcus Vance',
    timestamp: '23/10, 08:35',
    state: 'current',
  },
  { title: 'Hồ sơ & nghiệm thu', description: 'Ký & đồng bộ', timestamp: 'Chờ', state: 'upcoming' },
]

export type StyleguideChecklistItem = {
  id: string
  title: string
  description: string
  checked: boolean
  state?: ChecklistState
  status?: string
  statusIcon?: string
  progress?: { value: number; leftText: string; rightText: string }
}

export const styleguideChecklist: StyleguideChecklistItem[] = [
  {
    id: 'ppe',
    title: 'Đồ bảo hộ cá nhân (dây đai & điểm neo đã cố định)',
    description: 'Tem kiểm định dây đai toàn thân: còn hạn. Hai kẹp neo nóc mái đã siết lực.',
    checked: true,
    status: 'Đã xác minh 13:05',
  },
  {
    id: 'loto',
    title: 'Đã khoá & treo thẻ tủ điện chính (LOTO)',
    description: 'Đã cắt điện CB tổng 200A. Đã gắn khoá #TX-489 kèm thẻ, xác nhận không còn điện.',
    checked: true,
    status: 'Đã kiểm lực siết 12 ft-lbs',
    statusIcon: 'check_circle',
  },
  {
    id: 'dc-wire',
    title: 'Đấu nối DC tấm pin & đi dây gọn (xong 18/24)',
    description: 'Đầu nối MC4 đã cắm chặt. Kẹp inox mỗi 12 inch, dây không chạm mặt mái.',
    checked: false,
    state: 'active',
    status: 'Đang làm',
    progress: { value: 75, leftText: 'Còn 6 tấm trên dàn mái Nam', rightText: '75% bước này' },
  },
  {
    id: 'ac-disconnect',
    title: 'Đã lắp & tiếp địa cầu dao cách ly AC',
    description: 'Cầu dao cách ly AC 60A có cầu chì, đặt ngoài trời cạnh công tơ điện lực, lưỡi cắt nhìn thấy được.',
    checked: false,
    status: 'Chờ làm',
  },
]

export const styleguidePhotos: Omit<PhotoCardProps, 'onZoom' | 'onReplace' | 'onNoteChange'>[] = [
  {
    src: '/placeholders/photo-roof.svg',
    alt: 'Toàn cảnh mái mặt Nam',
    tag: { label: 'Mặt Nam' },
    time: '10:14',
    gpsTagged: true,
    title: 'Toàn cảnh mặt Nam',
    note: 'Lớp lợp còn tốt, dốc 28°',
  },
  {
    src: '/placeholders/photo-panel.svg',
    alt: 'Tủ CB tổng 200A',
    tag: { label: 'CB tổng 200A' },
    time: '10:35',
    gpsTagged: true,
    title: 'Nhãn thanh cái & CB 200A',
    note: 'CB 200A / thanh cái 225A',
  },
]

export const styleguideRoleOptions: SelectOption[] = [
  { value: 'all', label: 'Tất cả vai trò (1,428)' },
  { value: 'admin', label: 'Quản trị viên (6)' },
  { value: 'manager', label: 'Quản lý (12)' },
  { value: 'technician', label: 'Kỹ thuật viên (42)' },
  { value: 'sales', label: 'Kinh doanh (84)' },
  { value: 'customer', label: 'Khách hàng (1,284)' },
]

export const styleguideStatusOptions: SelectOption[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'inactive', label: 'Không hoạt động' },
  { value: 'pending', label: 'Chờ xác minh' },
  { value: 'locked', label: 'Bị khoá / tạm ngưng' },
]

export const styleguideRegionOptions: SelectOption[] = [
  { value: 'all', label: 'Tất cả khu vực' },
  { value: 'norcal', label: 'Cụm NorCal' },
  { value: 'austin', label: 'Trạm Austin' },
  { value: 'socal', label: 'Khu vực SoCal' },
]

export const styleguideTimeChips: { key: string; label: string; count?: number }[] = [
  { key: 'today', label: 'Hôm nay', count: 4 },
  { key: 'upcoming', label: 'Sắp tới', count: 12 },
  { key: 'completed', label: 'Đã xong', count: 38 },
  { key: 'all', label: 'Tất cả việc' },
]

export const styleguideTypeChips: { key: string; label: string; icon?: string; iconClassName?: string }[] = [
  { key: 'all', label: 'Tất cả loại (16)' },
  { key: 'survey', label: 'Khảo sát (5)', icon: 'square_foot', iconClassName: 'text-secondary' },
  { key: 'install', label: 'Lắp đặt (3)', icon: 'solar_power', iconClassName: 'text-primary' },
  { key: 'warranty', label: 'Bảo hành (4)', icon: 'shield_with_heart', iconClassName: 'text-error' },
  { key: 'maintenance', label: 'Bảo trì (4)', icon: 'tune', iconClassName: 'text-tertiary-container' },
]

export const styleguidePageHeader = {
  breadcrumb: [{ label: 'Quản trị', href: '/admin' }, { label: 'Tổng quan hệ thống' }],
  metaText: 'Nút cụm: US-Central-Primary (đang hoạt động)',
  title: 'Tổng quan hệ thống',
  description: 'Theo dõi trực tiếp dữ liệu nền tảng, cấu hình hằng số thuật toán và nhật ký kiểm tra của doanh nghiệp.',
}
