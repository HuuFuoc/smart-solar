import type { CompletedTask } from '@/features/dashboard/CompletedTaskCard'
import type { ScheduleDay } from '@/features/dashboard/ScheduleList'
import type { StatRibbonItem } from '@/features/dashboard/StatRibbon'
import type { ButtonVariant } from '@/components/common/stitch-ui/Button'
import type { StatusVariant } from '@/components/common/stitch-ui/StatusBadge'
import type { TaskAccent, TaskSpec } from '@/components/common/stitch-ui/TaskCard'

// Dữ liệu giả cho /tech, id trùng với data/tasks.ts. Việc đã xong dùng tiền tố CMP-

export const dispatchRibbon = {
  unitLabel: 'Tổ kỹ thuật 12',
  readyLabel: 'Sẵn sàng nhận việc',
  busyLabel: 'Đang nghỉ / đang di chuyển',
}

export const dailyStats: StatRibbonItem[] = [
  { key: 'active', icon: 'assignment_turned_in', value: '4', label: 'Việc hôm nay', tone: 'primary' },
  { key: 'surveys', icon: 'square_foot', value: '2', label: 'Khảo sát chờ', tone: 'neutral' },
  { key: 'installs', icon: 'solar_power', value: '1', label: 'Đang lắp đặt', tone: 'secondary' },
  { key: 'dispatches', icon: 'build_circle', value: '3', label: 'Lượt điều phối', tone: 'success' },
]

export const todayHeading = {
  title: 'Việc hôm nay',
  subtitle: 'Thứ Tư, 23/10',
  meta: 'Sắp theo giờ hẹn',
}

export type TodayAssignment = {
  id: string
  accent: TaskAccent
  type: { label: string; variant: StatusVariant }
  priority: { label: string; variant: StatusVariant }
  /** Góc phải thẻ: "Next Up, Starts in 24m" (boxed) hoặc khung giờ */
  meta: { icon: string; emphasis?: string; text: string; boxed?: boolean }
  title: string
  address: string
  phoneHref: string
  specs: TaskSpec[]
  primaryAction: { label: string; icon: string; variant?: ButtonVariant }
  mapAction: { label: string; icon: string }
}

export const todayAssignments: TodayAssignment[] = [
  {
    id: 'ORD-8821',
    accent: 'primary',
    type: { label: 'Khảo sát', variant: 'primary' },
    priority: { label: 'Ưu tiên cao', variant: 'error' },
    meta: { icon: 'timer', emphasis: 'Việc kế tiếp', text: 'bắt đầu sau 24 phút', boxed: true },
    title: 'Elena Rostova',
    address: '842 Crestview Terrace, Los Gatos, CA',
    phoneHref: 'tel:5550192834',
    specs: [
      { label: 'Khung giờ', value: '09:00 - 10:30' },
      { label: 'Vật liệu mái', value: 'Ngói (28°)' },
      { label: 'Quy mô dự kiến', value: '11,4 kW, 26 tấm' },
    ],
    primaryAction: { label: 'Bắt đầu khảo sát', icon: 'play_arrow' },
    mapAction: { label: 'Chỉ đường', icon: 'directions' },
  },
  {
    id: 'ORD-8824',
    accent: 'secondary',
    type: { label: 'Lắp đặt (ngày 2/2)', variant: 'warning' },
    priority: { label: 'Thường', variant: 'neutral' },
    meta: { icon: 'schedule', text: '11:15 - 14:30' },
    title: 'David Chen, nhà Chen',
    address: '1240 Oak Knolls Way, Saratoga, CA',
    phoneHref: 'tel:5550482910',
    specs: [
      { label: 'Tủ điện', value: 'Aptomat tổng 200A' },
      { label: 'Inverter', value: 'Enphase IQ8+ (32 bộ)' },
      { label: 'Pin lưu trữ', value: 'Tesla Powerwall 3' },
    ],
    primaryAction: { label: 'Tiếp tục lắp đặt', icon: 'engineering' },
    mapAction: { label: 'Chỉ đường', icon: 'directions' },
  },
  {
    id: 'ORD-8830',
    accent: 'error',
    type: { label: 'Bảo hành', variant: 'error' },
    priority: { label: 'Ưu tiên cao', variant: 'error' },
    meta: { icon: 'schedule', text: '15:00 - 16:15' },
    title: 'Garrett, Highland Plaza',
    address: '339 Redwood Ave, San Jose, CA',
    phoneHref: 'tel:5550991122',
    specs: [
      { label: 'Lỗi báo về', value: 'Phóng hồ quang microinverter #04', tone: 'error' },
      { label: 'Tuổi hệ thống', value: '11 tháng (gói Gold)' },
      { label: 'Hàng thay thế', value: 'IQ8+ có sẵn trên xe' },
    ],
    primaryAction: { label: 'Kiểm tra hệ thống', icon: 'build' },
    mapAction: { label: 'Chỉ đường', icon: 'directions' },
  },
  {
    id: 'ORD-8833',
    accent: 'success',
    type: { label: 'Khảo sát', variant: 'primary' },
    priority: { label: 'Thường', variant: 'neutral' },
    meta: { icon: 'schedule', text: '16:45 - 17:45' },
    title: 'Theresa Montgomery',
    address: '510 Skyview Ridge, Cupertino, CA',
    phoneHref: 'tel:5550239918',
    specs: [
      { label: 'Phạm vi', value: 'Trần mái, tủ điện, xà gồ' },
      { label: 'Nâng cấp tủ điện', value: 'Cần nâng (125A → 200A)' },
      { label: 'Bay drone', value: 'Đã được cấp phép' },
    ],
    primaryAction: { label: 'Tải ảnh lên', icon: 'add_a_photo', variant: 'ghost' },
    mapAction: { label: 'Chỉ đường', icon: 'directions' },
  },
]

export const upcomingHeading = {
  title: 'Lịch 3 ngày tới',
  meta: '6 lượt đã xếp',
}

export const upcomingSchedule: ScheduleDay[] = [
  {
    id: 'thu-oct-24',
    label: 'Ngày mai, thứ Năm 24/10',
    tone: 'primary',
    note: '2 lượt nghiệm thu, 1 lượt kiểm tra kết nối',
    rows: [
      {
        id: 'ORD-8851',
        icon: 'verified',
        iconTone: 'primary',
        title: 'Nghiệm thu phần thô',
        subtitle: 'B. Sterling, 4410 Paseo Dr, Campbell',
        time: '08:30',
        detail: 'Hồ sơ đã có tại công trình',
        badge: { label: 'Đủ giấy phép', variant: 'ready' },
      },
      {
        id: 'ORD-8852',
        icon: 'solar_power',
        iconTone: 'secondary',
        title: 'Nghiệm thu dàn pin',
        subtitle: 'R. Patel, 900 Monte Vista, Sunnyvale',
        time: '13:00',
        detail: 'SolarEdge SE7600',
        badge: { label: 'Đã chuẩn bị', variant: 'neutral' },
      },
    ],
  },
  {
    id: 'fri-oct-25',
    label: 'Thứ Sáu, 25/10',
    tone: 'default',
    note: 'Khởi công 1 công trình',
    rows: [
      {
        id: 'ORD-8853',
        icon: 'roofing',
        iconTone: 'primary',
        title: 'Lắp khung giá đỡ',
        subtitle: 'Dr. J. Miller, 108 Blossom Hill, Los Gatos',
        time: '07:30',
        detail: 'IronRidge XR100',
        badge: { label: 'Chờ vật tư', variant: 'warning' },
      },
    ],
  },
]

export const completedHeading = {
  title: 'Vừa hoàn thành',
  meta: 'Đã kiểm tra chất lượng',
}

export const recentlyCompleted: CompletedTask[] = [
  {
    id: 'CMP-8821',
    title: 'Khảo sát #8821',
    address: '420 University Ave, Palo Alto',
    timestamp: 'Hôm nay, 08:15',
    evidence: '18 ảnh đã tải',
    verification: 'Khách đã ký',
  },
  {
    id: 'CMP-8814',
    title: 'Khởi động lại bộ thu thập dữ liệu',
    address: '1921 Sunny Glen Way, San Jose',
    timestamp: 'Hôm qua, 16:40',
    evidence: '6 ảnh đã tải',
    verification: 'Đã đồng bộ từ xa',
  },
  {
    id: 'CMP-8809',
    title: 'Đấu nối tủ điện kiểu main lug',
    address: '885 Almaden Expy, San Jose',
    timestamp: 'Hôm qua, 14:10',
    evidence: '12 ảnh, phiếu siết lực',
    verification: 'Đạt kiểm tra',
  },
]
