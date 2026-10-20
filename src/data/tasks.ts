import type { TaskBucket, TaskPriorityFilter, TaskTypeFilter } from '@/features/tasks/TaskFilterBar'
import type { ViewOption } from '@/features/tasks/ViewToggle'
import type { ButtonVariant } from '@/components/common/stitch-ui/Button'
import type { StatusVariant } from '@/components/common/stitch-ui/StatusBadge'
import type { TaskAccent } from '@/components/common/stitch-ui/TaskCard'

// Dữ liệu giả cho /tech/tasks, dùng chung id với data/techDashboard.ts

export const tasksHeader = {
  title: 'Phiếu công việc',
  quickAction: 'Điều phối nhanh',
}

export type TaskView = 'list' | 'bento'

export const taskViewOptions: ViewOption<TaskView>[] = [
  { value: 'list', label: 'Dạng bảng', icon: 'table_rows' },
  { value: 'bento', label: 'Dạng thẻ', icon: 'grid_view' },
]

export const taskBuckets: TaskBucket[] = [
  { key: 'today', label: 'Hôm nay', count: 4 },
  { key: 'upcoming', label: 'Sắp tới', count: 12 },
  { key: 'completed', label: 'Đã xong', count: 38 },
  { key: 'all', label: 'Tất cả' },
]

export const taskPriorities: TaskPriorityFilter[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'high', label: 'Ưu tiên cao (3)', tone: 'error' },
  { key: 'normal', label: 'Thường' },
]

export const taskTypes: TaskTypeFilter[] = [
  { key: 'all', label: 'Tất cả loại việc (16)' },
  { key: 'survey', label: 'Khảo sát (5)', icon: 'square_foot', iconClassName: 'text-secondary' },
  { key: 'installation', label: 'Lắp đặt (3)', icon: 'solar_power', iconClassName: 'text-primary' },
  { key: 'warranty', label: 'Bảo hành (4)', icon: 'shield_with_heart', iconClassName: 'text-error' },
  { key: 'maintenance', label: 'Bảo trì (4)', icon: 'tune', iconClassName: 'text-tertiary-container' },
]

export const taskFilterCopy = {
  priorityLabel: 'Mức ưu tiên:',
  searchPlaceholder: 'Tìm khách hàng, mã phiếu, số máy…',
  searchShortcut: 'Ctrl K',
}

export const taskSyncNotice = {
  icon: 'sync',
  prefix: 'Đang hiển thị ',
  strong: '4 việc',
  suffix: ' của Marcus Vance hôm nay tại khu vực 4B',
  meta: 'Tự động định tuyến theo GPS',
}

export const taskTableHeaders = {
  workOrder: 'Phiếu việc',
  customer: 'Khách hàng',
  address: 'Địa chỉ / khu vực',
  time: 'Khung giờ',
  status: 'Trạng thái',
  actions: 'Thao tác',
}

export type WorkOrder = {
  id: string
  /** Mã hiển thị "#ORD-8821" */
  code: string
  highPriority: boolean
  /** Khớp với key trong taskTypes để lọc */
  typeKey: 'survey' | 'installation' | 'warranty' | 'maintenance'
  /** Loại việc + icon màu theo loại */
  work: { label: string; icon: string; iconClassName: string }
  /** Dòng phụ dưới loại việc: serial, thiết bị... */
  reference: string
  customer: { name: string; phone: string; property: string; propertyIcon: string }
  site: { street: string; zone: string; distance: string }
  schedule: { time: string; duration: string; note: string; noteTone: 'primary' | 'muted' }
  status: { label: string; variant: StatusVariant; pulse?: boolean }
  /** Bước đang sáng trong "Shift Job Lifecycle Stage" của Quick Status Drawer (1-4) */
  lifecycleStage: 1 | 2 | 3 | 4
  action: { label: string; variant: ButtonVariant }
  /** Dùng cho chế độ xem Bento (TaskCard) */
  accent: TaskAccent
  typeVariant: StatusVariant
}

export const workOrders: WorkOrder[] = [
  {
    id: 'ORD-8821',
    code: '#ORD-8821',
    typeKey: 'survey',
    highPriority: true,
    work: { label: 'Khảo sát mái và độ dốc', icon: 'square_foot', iconClassName: 'text-secondary' },
    reference: 'INV-77291 / 9.8kWp',
    customer: {
      name: 'Elena Rostova',
      phone: '+1 (415) 883-9021',
      property: 'Nhà 2 tầng, mái ngói',
      propertyIcon: 'home',
    },
    site: { street: '742 Evergreen Terrace', zone: 'San Rafael, khu vực 4B', distance: 'cách 1,9 km' },
    schedule: { time: 'Hôm nay, 08:30', duration: 'Dự kiến 90 phút', note: 'Đang tới lượt', noteTone: 'primary' },
    status: { label: 'Đang làm', variant: 'success', pulse: true },
    lifecycleStage: 3,
    action: { label: 'Cập nhật trạng thái', variant: 'primary' },
    accent: 'primary',
    typeVariant: 'primary',
  },
  {
    id: 'ORD-8824',
    code: '#ORD-8824',
    typeKey: 'installation',
    highPriority: false,
    work: { label: 'Thay inverter và nghiệm thu', icon: 'solar_power', iconClassName: 'text-primary' },
    reference: 'SN: SE-7600H-US',
    customer: {
      name: 'David Chen',
      phone: '+1 (510) 412-8809',
      property: 'Nhà phố, mái tôn',
      propertyIcon: 'home',
    },
    site: { street: '1204 Oak Ridge Way', zone: 'Novato, khu vực 4B', distance: 'cách 8,7 km' },
    schedule: { time: 'Hôm nay, 11:00', duration: 'Dự kiến 180 phút', note: 'Kế tiếp', noteTone: 'muted' },
    status: { label: 'Đang di chuyển', variant: 'warning' },
    lifecycleStage: 2,
    action: { label: 'Cập nhật trạng thái', variant: 'neutral' },
    accent: 'secondary',
    typeVariant: 'warning',
  },
  {
    id: 'ORD-8827',
    code: '#ORD-8827',
    typeKey: 'warranty',
    highPriority: true,
    work: { label: 'Kiểm tra pin xả nhanh (BMS)', icon: 'shield_with_heart', iconClassName: 'text-error' },
    reference: 'Tesla Powerwall 2, pin #44',
    customer: {
      name: 'Kavita Patel',
      phone: '+1 (415) 309-1120',
      property: 'Nhà phố, mái bằng',
      propertyIcon: 'apartment',
    },
    site: { street: '410 Vista Grande', zone: 'Mill Valley, khu vực 4B', distance: 'cách 19 km' },
    schedule: { time: 'Hôm nay, 14:30', duration: 'Dự kiến 60 phút', note: 'Khung chiều', noteTone: 'muted' },
    status: { label: 'Đã xếp lịch', variant: 'neutral' },
    lifecycleStage: 1,
    action: { label: 'Bắt đầu', variant: 'neutral' },
    accent: 'error',
    typeVariant: 'error',
  },
  {
    id: 'ORD-8819',
    code: '#ORD-8819',
    typeKey: 'maintenance',
    highPriority: false,
    work: { label: 'Đi lại dây và kiểm tra optimizer', icon: 'tune', iconClassName: 'text-tertiary-container' },
    reference: 'SolarEdge P401, chuỗi A+B',
    customer: {
      name: 'Robert Morales',
      phone: '+1 (415) 771-4923',
      property: 'Nhà phố, mái tôn seamlock',
      propertyIcon: 'home',
    },
    site: { street: '89 Circle Drive', zone: 'Tiburon, khu vực 4B', distance: 'cách 22,8 km' },
    schedule: { time: 'Hôm nay, 16:45', duration: 'Dự kiến 45 phút', note: 'Kiểm tra cuối ngày', noteTone: 'muted' },
    status: { label: 'Chờ nghiệm thu', variant: 'pending' },
    lifecycleStage: 4,
    action: { label: 'Nghiệm thu', variant: 'neutral' },
    accent: 'success',
    typeVariant: 'neutral',
  },
]

// Nội dung của Quick Status Drawer, phần đầu theo work order đang chọn
export type LifecycleStage = {
  /** 1-4, khớp WorkOrder.lifecycleStage */
  value: 1 | 2 | 3 | 4
  label: string
  /** Class cho chấm tròn 8px bên trái, theo đúng code.html */
  dotClassName: string
}

export type DrawerChecklistItem = {
  id: string
  label: string
  description: string
  defaultChecked: boolean
}

export type DrawerPhoto = {
  id: string
  src: string
  alt: string
}

export const quickStatusDrawer = {
  sync: { label: 'Đang đồng bộ hiện trường' },
  closeLabel: 'Đóng bảng cập nhật nhanh',
  /** drawerCustomer trong code.html: "<tên khách>, <địa chỉ>" */
  customerSeparator: ', ',
  lifecycle: {
    title: 'Giai đoạn công việc',
    stages: [
      { value: 1, label: '1. Đã xếp lịch', dotClassName: 'bg-outline' },
      { value: 2, label: '2. Đang di chuyển', dotClassName: 'bg-secondary' },
      { value: 3, label: '3. Đang làm', dotClassName: 'bg-primary-fixed' },
      { value: 4, label: '4. Nghiệm thu', dotClassName: 'bg-secondary-container' },
    ] as LifecycleStage[],
  },
  checklist: {
    title: 'Việc bắt buộc kiểm tra',
    items: [
      {
        id: 'ppe',
        label: 'Đã mắc dây an toàn và đồ bảo hộ',
        description: 'Đúng quy định an toàn khi làm trên mái',
        defaultChecked: true,
      },
      {
        id: 'msp',
        label: 'Đã kiểm tra thanh cái tủ điện chính',
        description: 'Chụp ảnh aptomat tổng 200A và khoảng cách an toàn',
        defaultChecked: true,
      },
      {
        id: 'pitch',
        label: 'Đã ghi độ dốc mái và kích thước xà gồ',
        description: 'Lưu số đo bằng máy laser',
        defaultChecked: false,
      },
    ] as DrawerChecklistItem[],
  },
  observation: {
    title: 'Ghi chú tại hiện trường',
    dictateLabel: 'Ghi âm ghi chú',
    dictateIcon: 'mic',
    placeholder: 'Ghi chú tại chỗ (ví dụ: xà gồ hướng nam cách nhau 60cm, có bóng cây che sau 16 giờ)…',
  },
  photos: {
    /** "Job Site Photos (3 uploaded)", 2 ảnh + 1 ô Add Slot như code.html */
    titleTemplate: 'Ảnh công trình ({count} ảnh)',
    uploadedCount: 3,
    captureLabel: 'Chụp ảnh',
    captureIcon: 'camera_alt',
    addSlotLabel: 'Thêm ô ảnh',
    addSlotIcon: 'add_circle',
    items: [
      {
        id: 'breaker',
        src: '/placeholders/photo-breaker.svg',
        alt: 'Ảnh cận cảnh tủ điện với nhãn và dây đi gọn gàng.',
      },
      {
        id: 'roof',
        src: '/placeholders/photo-roof.svg',
        alt: 'Ảnh mái ngói hướng nam chụp dưới trời nắng.',
      },
    ] as DrawerPhoto[],
  },
  footer: {
    commitLabel: 'Lưu và gửi về điều phối',
    commitIcon: 'cloud_done',
    cancelLabel: 'Huỷ',
  },
  toast: 'Đã gửi phiếu việc về điều phối.',
}
