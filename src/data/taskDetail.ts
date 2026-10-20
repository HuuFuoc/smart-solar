import type { TimelineEntry } from '@/features/tasks/VerticalTimeline'
import type { WorkOrderFact, WorkOrderMetric } from '@/features/tasks/WorkOrderHeaderCard'
import type { Crumb } from '@/components/common/stitch-ui/PageHeader'
import type { StatusVariant } from '@/components/common/stitch-ui/StatusBadge'
import type { TimelineStepProps } from '@/components/common/stitch-ui/Timeline'
import { ROUTES } from '@/routes/paths'

/*
 * Dữ liệu giả cho /tech/tasks/:id, nội dung ORD-8821 lấy từ task_detail_timeline/screen.png.
 * id, tên khách và trạng thái khớp data/tasks.ts (bảng work order) và data/techDashboard.ts.
 * Thiết kế ghi chủ nhà là "Marcus Vance" – trùng tên kỹ thuật viên – nên dùng Elena Rostova
 * theo my_tasks_1 để ba màn nhất quán.
 */

export type TaskDetail = {
  id: string
  code: string
  breadcrumb: Crumb[]
  actions: { share: string; export: string; dossier: { label: string; icon: string } }
  summary: {
    icon: string
    status: { label: string; variant: StatusVariant }
    syncLabel?: string
    title: string
    facts: WorkOrderFact[]
    metrics: WorkOrderMetric[]
  }
  lifecycle: {
    title: string
    badge: string
    steps: Omit<TimelineStepProps, 'index'>[]
  }
  auditLog: { title: string; meta: string; entries: TimelineEntry[] }
  fieldNote: {
    title: string
    hint: string
    dictation: { title: string; hint: string }
    placeholder: string
    submitLabel: string
  }
  geolocation: {
    title: string
    precision: string
    map: { src: string; alt: string; address: string; coords: string }
    checklistTitle: string
    checklist: string[]
  }
  signOff: {
    title: string
    badge: string
    badgeVariant: StatusVariant
    initials: string
    name: string
    contact: string
    signedNote: string
    hash: string
    verifyLabel: string
  } | null
}

const surveyCrumbs = (code: string): Crumb[] => [
  { label: 'Phiếu công việc', href: ROUTES.tech.tasks },
  { label: 'Khảo sát', href: ROUTES.tech.surveys },
  { label: code },
]

const jobCrumbs = (section: string, href: string, code: string): Crumb[] => [
  { label: 'Phiếu công việc', href: ROUTES.tech.tasks },
  { label: section, href },
  { label: code },
]

const fieldNote = {
  title: 'Thêm ghi chú hiện trường',
  hint: 'Thêm vào nhật ký',
  dictation: { title: 'Đọc ghi chú', hint: 'Chạm micro để nói' },
  placeholder: 'Gõ hoặc đọc ghi chú (ví dụ: lối đi ống trên trần, mã cổng của khách, nhà có chó)...',
  submitLabel: 'Ghi vào nhật ký',
}

const actions = {
  share: 'Chia sẻ cho kinh doanh',
  export: 'Xuất nhật ký PDF',
  dossier: { label: 'Mở hồ sơ khảo sát', icon: 'menu_book' },
}

/** ORD-8821 – bản đầy đủ dựng đúng theo task_detail_timeline. */
const ord8821: TaskDetail = {
  id: 'ORD-8821',
  code: '#ORD-8821',
  breadcrumb: surveyCrumbs('#ORD-8821'),
  actions,
  summary: {
    icon: 'solar_power',
    status: { label: 'Đã xong & đồng bộ cho điều phối', variant: 'ready' },
    syncLabel: 'Đồng bộ lúc 10:48',
    title: 'Khảo sát công trình & đánh giá khả thi hệ thống điện',
    facts: [
      { icon: 'person', text: 'Elena Rostova (chủ nhà)', emphasis: true },
      { icon: 'pin_drop', text: '742 Evergreen Terrace, San Rafael CA 94901' },
      { icon: 'bolt', text: 'Điện 200A, mái ngói 28°' },
    ],
    metrics: [
      { label: 'Thời lượng', value: '2 giờ 10 phút', caption: 'Thời gian kiểm tra tại chỗ' },
      { label: 'Tư liệu', value: '8 ảnh', caption: 'Đã xác minh độ dốc & CB' },
      { label: 'Trưởng nhóm', value: 'Marcus V.', caption: 'Tổ 12 NorCal', valueTone: 'primary' },
    ],
  },
  lifecycle: {
    title: 'Tiến trình phiếu',
    badge: 'Đã xác nhận đủ 5 mốc',
    steps: [
      { title: 'Đã giao', description: 'Sarah Jenkins (điều phối)', timestamp: '22/10, 14:15', state: 'done' },
      {
        title: 'Đã hẹn & xác nhận',
        description: 'Khách xác nhận qua SMS',
        timestamp: '22/10, 15:30',
        state: 'done',
      },
      { title: 'Đang di chuyển', description: 'Điểm danh qua GPS', timestamp: '23/10, 08:15', state: 'done' },
      {
        title: 'Đang làm tại công trình',
        description: 'Người khảo sát: Marcus Vance',
        timestamp: '23/10, 08:35',
        state: 'done',
      },
      {
        title: 'Hồ sơ & nghiệm thu',
        description: 'Đã ký & đồng bộ',
        timestamp: '23/10, 10:45',
        state: 'current',
      },
    ],
  },
  auditLog: {
    title: 'Nhật ký theo thời gian',
    meta: 'Nhật ký không sửa được, 6 mục',
    entries: [
      {
        id: 'log-1045',
        nodeIcon: 'photo_camera',
        nodeTone: 'primary',
        author: { name: 'Marcus Vance', initials: 'MV' },
        role: { label: 'Trưởng nhóm kỹ thuật', variant: 'ready' },
        timestamp: 'Hôm nay, 10:45',
        body: {
          text: 'Đã tải lên 8 ảnh khảo sát (độ dốc mái, vị trí inverter chính, tủ điện chính 200A, vật cản gây bóng ở mép Nam). Đã đo độ dốc kết cấu mái bằng thước đo nghiêng: 28°.',
        },
        media: [
          { src: '/placeholders/photo-roof.svg', alt: 'Mái ngói và rafter dưới nắng sớm', label: 'Mái 28°' },
          { src: '/placeholders/photo-breaker.svg', alt: 'Tủ điện chính 200A mở nắp', label: 'Tủ điện 200A' },
          {
            src: '/placeholders/photo-microinverter.svg',
            alt: 'Đường ống dẫn của inverter trên tường ngoài',
            label: 'Tuyến inverter',
          },
          { src: '/placeholders/photo-yard.svg', alt: 'Toàn cảnh mái nhìn về hướng nam', overlay: '+5 ảnh' },
        ],
        chips: [
          { icon: 'straighten', label: 'Độ dốc: đã xác nhận 28°' },
          { icon: 'check_circle', label: 'Khoảng cách xà gồ: 24" tâm – tâm' },
          { icon: 'cloud_upload', label: '8 ảnh RAW đã mã hoá' },
        ],
      },
      {
        id: 'log-0930',
        nodeIcon: 'edit_note',
        nodeTone: 'accent',
        author: { name: 'Marcus Vance', initials: 'MV' },
        role: { label: 'Trưởng nhóm kỹ thuật', variant: 'ready' },
        timestamp: 'Hôm nay, 09:30',
        body: {
          text: 'Đã cập nhật phiếu kiểm tra: CB tổng còn chỗ cho CB 2 cực 40A ở khe 18 & 20. Thanh cái 225A / CB tổng 200A.',
          strong: 'Không cần nâng cấp tủ điện (MPU).',
          tail: 'Khách tiết kiệm khoảng $2,800.',
        },
        note: {
          icon: 'verified_user',
          text: 'Đạt quy tắc 120% của NEC: thanh cái đủ dư tải cho 7.6kW điện mặt trời phát ngược.',
        },
      },
      {
        id: 'log-0835',
        nodeIcon: 'near_me',
        nodeTone: 'tint',
        author: { name: 'Hệ thống tự ghi', initials: 'SYS', tone: 'neutral' },
        role: { label: 'Hàng rào địa lý', variant: 'neutral' },
        timestamp: 'Hôm nay, 08:35',
        body: {
          text: 'Kỹ thuật viên đã tới công trình. Vị trí xác nhận trong phạm vi 50 m quanh nhà (Vĩ độ: 37.7749, Kinh độ: -122.4194).',
        },
      },
      {
        id: 'log-0812',
        nodeIcon: 'local_shipping',
        nodeTone: 'muted',
        author: { name: 'Marcus Vance', initials: 'MV' },
        timestamp: 'Hôm nay, 08:12',
        body: {
          text: 'Đã rời kho khu vực bằng xe dịch vụ #12. Bắt đầu dẫn đường thời gian thực. Dự kiến tới sau 18 phút.',
        },
      },
      {
        id: 'log-1600',
        nodeIcon: 'home_repair_service',
        nodeTone: 'muted',
        author: { name: 'Marcus Vance', initials: 'MV' },
        timestamp: '22/10, 16:00',
        body: {
          text: 'Đã kiểm danh sách thiết bị trên xe: thước đo nghiêng đã hiệu chuẩn, thang sợi thuỷ tinh loại IA 24 ft đã cố định, máy đo khoảng cách laser đã mang theo, pin bộ drone kiểm tra đầy 100%.',
        },
      },
      {
        id: 'log-1415',
        nodeIcon: 'assignment_ind',
        nodeTone: 'muted',
        author: { name: 'Sarah Jenkins', initials: 'SJ', tone: 'secondary' },
        role: { label: 'Giám sát điều phối', variant: 'warning' },
        timestamp: '22/10, 14:15',
        body: {
          text: 'Đã giao cho Marcus Vance (chứng chỉ điện #E-9912).',
        },
      },
    ],
  },
  fieldNote,
  geolocation: {
    title: 'Vị trí công trình',
    precision: 'Độ chính xác GPS: 1.2m',
    map: {
      src: '/placeholders/map-site.svg',
      alt: 'Bản đồ vị trí 742 Evergreen Terrace',
      address: '742 Evergreen Terrace',
      coords: 'Vĩ độ: 37.77, Kinh độ: -122.41',
    },
    checklistTitle: 'Kết quả kiểm tra hiện trường',
    checklist: ['Xà gồ trên trần: nguyên vẹn', 'Tủ điện chính: 200A, sạch', 'Độ dốc mái: 28°, hướng Nam', 'Bóng cây: ít'],
  },
  signOff: {
    title: 'Khách hàng ký xác nhận',
    badge: 'Đã ký điện tử',
    badgeVariant: 'ready',
    initials: 'ER',
    name: 'Elena Rostova',
    contact: 'e.rostova@email.com, (415) 883-9021',
    signedNote: 'Ký trên màn hình điện thoại lúc 10:44',
    hash: 'Mã kiểm tra SHA-256: 4f8a...c902',
    verifyLabel: 'Kiểm tra mã',
  },
}

/** ORD-8824 – đang trên đường tới hiện trường (khớp trạng thái "En Route" ở bảng work order). */
const ord8824: TaskDetail = {
  id: 'ORD-8824',
  code: '#ORD-8824',
  breadcrumb: jobCrumbs('Lắp đặt', ROUTES.tech.installations, '#ORD-8824'),
  actions: { ...actions, dossier: { label: 'Mở hồ sơ lắp đặt', icon: 'menu_book' } },
  summary: {
    icon: 'solar_power',
    status: { label: 'Đang di chuyển, tới sau 12 phút', variant: 'warning' },
    syncLabel: 'Đồng bộ lúc 10:52',
    title: 'Thay inverter & vận hành thử – SolarEdge HD-Wave',
    facts: [
      { icon: 'person', text: 'David Chen (chủ nhà)', emphasis: true },
      { icon: 'pin_drop', text: '1204 Oak Ridge Way, Novato CA 94947' },
      { icon: 'bolt', text: 'SN: SE-7600H-US, mái tấm lợp composite' },
    ],
    metrics: [
      { label: 'Thời lượng', value: '180 phút', caption: 'Khung giờ dịch vụ dự kiến' },
      { label: 'Tư liệu', value: '2 ảnh', caption: 'Chỉ kiểm tra tập kết' },
      { label: 'Trưởng nhóm', value: 'Marcus V.', caption: 'Tổ 12 NorCal', valueTone: 'primary' },
    ],
  },
  lifecycle: {
    title: 'Tiến trình phiếu',
    badge: 'Đã xác nhận 2/5 mốc',
    steps: [
      { title: 'Đã giao', description: 'Sarah Jenkins (điều phối)', timestamp: '22/10, 09:10', state: 'done' },
      {
        title: 'Đã hẹn & xác nhận',
        description: 'Khách xác nhận qua điện thoại',
        timestamp: '22/10, 13:05',
        state: 'done',
      },
      { title: 'Đang di chuyển', description: 'Điểm danh qua GPS', timestamp: '23/10, 10:48', state: 'current' },
      { title: 'Đang làm tại công trình', description: 'Chờ tới nơi', state: 'upcoming' },
      { title: 'Hồ sơ & nghiệm thu', description: 'Chờ ký & đồng bộ', state: 'upcoming' },
    ],
  },
  auditLog: {
    title: 'Nhật ký theo thời gian',
    meta: 'Nhật ký không sửa được, 3 mục',
    entries: [
      {
        id: 'log-8824-1048',
        nodeIcon: 'near_me',
        nodeTone: 'primary',
        author: { name: 'Hệ thống tự ghi', initials: 'SYS', tone: 'neutral' },
        role: { label: 'Định tuyến', variant: 'neutral' },
        timestamp: 'Hôm nay, 10:48',
        body: { text: 'Xe dịch vụ #12 đã rời kho. Dẫn đường dự kiến tới lúc 11:00 cho khung làm việc 180 phút.' },
        subNote: 'Dự phòng kẹt xe 6 phút, điểm dừng kế tiếp sau ORD-8821.',
      },
      {
        id: 'log-8824-0920',
        nodeIcon: 'inventory_2',
        nodeTone: 'accent',
        author: { name: 'Marcus Vance', initials: 'MV' },
        role: { label: 'Trưởng nhóm kỹ thuật', variant: 'ready' },
        timestamp: 'Hôm nay, 09:20',
        body: { text: 'Inverter thay thế đã chất lên xe và quét đối chiếu với phiếu. Đã kiểm cờ lê lực và bộ cách ly DC.' },
        note: { icon: 'verified_user', text: 'Serial SE-7600H-US khớp hồ sơ thiết bị của khách.' },
      },
      {
        id: 'log-8824-1305',
        nodeIcon: 'assignment_ind',
        nodeTone: 'muted',
        author: { name: 'Sarah Jenkins', initials: 'SJ', tone: 'secondary' },
        role: { label: 'Giám sát điều phối', variant: 'warning' },
        timestamp: '22/10, 13:05',
        body: { text: 'Khách đã xác nhận khung 11:00 qua điện thoại. Mã cổng chỉ chia sẻ cho kỹ thuật viên được giao.' },
      },
    ],
  },
  fieldNote,
  geolocation: {
    title: 'Vị trí công trình',
    precision: 'Độ chính xác GPS: 2.4m',
    map: {
      src: '/placeholders/map-site.svg',
      alt: 'Bản đồ vị trí 1204 Oak Ridge Way',
      address: '1204 Oak Ridge Way',
      coords: 'Vĩ độ: 38.10, Kinh độ: -122.56',
    },
    checklistTitle: 'Kiểm tra trước khi tới',
    checklist: ['Đã tập kết inverter', 'Đã có giấy phép', 'Lối lên mái thông thoáng', 'Đã báo khách'],
  },
  signOff: null,
}

/** ORD-8827 – đã lên lịch, chưa bắt đầu. */
const ord8827: TaskDetail = {
  id: 'ORD-8827',
  code: '#ORD-8827',
  breadcrumb: jobCrumbs('Bảo hành & bảo trì', ROUTES.tech.warranty, '#ORD-8827'),
  actions: { ...actions, dossier: { label: 'Mở hồ sơ bảo hành', icon: 'menu_book' } },
  summary: {
    icon: 'shield_with_heart',
    status: { label: 'Đã hẹn, 14:30', variant: 'neutral' },
    title: 'Kiểm tra BMS pin xả nhanh – Tesla Powerwall 2',
    facts: [
      { icon: 'person', text: 'Kavita Patel (chủ nhà)', emphasis: true },
      { icon: 'pin_drop', text: '410 Vista Grande, Mill Valley CA 94941' },
      { icon: 'bolt', text: 'Pin #44, sân thượng nhà phố' },
    ],
    metrics: [
      { label: 'Thời lượng', value: '60 phút', caption: 'Khung buổi chiều' },
      { label: 'Tư liệu', value: '0 ảnh', caption: 'Chụp khi tới nơi' },
      { label: 'Trưởng nhóm', value: 'Marcus V.', caption: 'Tổ 12 NorCal', valueTone: 'primary' },
    ],
  },
  lifecycle: {
    title: 'Tiến trình phiếu',
    badge: 'Đã xác nhận 2/5 mốc',
    steps: [
      { title: 'Đã giao', description: 'Sarah Jenkins (điều phối)', timestamp: '22/10, 16:40', state: 'done' },
      {
        title: 'Đã hẹn & xác nhận',
        description: 'Khách xác nhận qua SMS',
        timestamp: '23/10, 07:05',
        state: 'current',
      },
      { title: 'Đang di chuyển', description: 'Đi sau ORD-8824', state: 'upcoming' },
      { title: 'Đang làm tại công trình', description: 'Chẩn đoán pin', state: 'upcoming' },
      { title: 'Hồ sơ & nghiệm thu', description: 'Chờ ký & đồng bộ', state: 'upcoming' },
    ],
  },
  auditLog: {
    title: 'Nhật ký theo thời gian',
    meta: 'Nhật ký không sửa được, 2 mục',
    entries: [
      {
        id: 'log-8827-0705',
        nodeIcon: 'sms',
        nodeTone: 'accent',
        author: { name: 'Hệ thống tự ghi', initials: 'SYS', tone: 'neutral' },
        role: { label: 'Tin nhắn', variant: 'neutral' },
        timestamp: 'Hôm nay, 07:05',
        body: { text: 'Khách đã xác nhận khung 14:30 chiều qua SMS. Lưu ý: đỗ xe ngoài đường, cổng sân thượng không khoá.' },
      },
      {
        id: 'log-8827-1640',
        nodeIcon: 'warning',
        nodeTone: 'muted',
        author: { name: 'Sarah Jenkins', initials: 'SJ', tone: 'secondary' },
        role: { label: 'Giám sát điều phối', variant: 'warning' },
        timestamp: '22/10, 16:40',
        body: {
          text: 'Nâng lên ưu tiên cao sau khi hệ thống giám sát ghi nhận 3 lần xả nhanh trong 24 giờ.',
          strong: 'Pin thuộc gói bảo hành Gold.',
        },
      },
    ],
  },
  fieldNote,
  geolocation: {
    title: 'Vị trí công trình',
    precision: 'Độ chính xác GPS: 3.1m',
    map: {
      src: '/placeholders/map-site.svg',
      alt: 'Bản đồ vị trí 410 Vista Grande',
      address: '410 Vista Grande',
      coords: 'Vĩ độ: 37.90, Kinh độ: -122.54',
    },
    checklistTitle: 'Kiểm tra trước chuyến đi',
    checklist: ['Bảo hành còn hiệu lực', 'Có BMS dự phòng trên xe', 'Đã ghi lối lên sân thượng', 'Liên lạc được với khách'],
  },
  signOff: null,
}

/** ORD-8819 – đã xong phần việc, chờ khách ký. */
const ord8819: TaskDetail = {
  id: 'ORD-8819',
  code: '#ORD-8819',
  breadcrumb: jobCrumbs('Bảo hành & bảo trì', ROUTES.tech.warranty, '#ORD-8819'),
  actions: { ...actions, dossier: { label: 'Mở biên bản dịch vụ', icon: 'menu_book' } },
  summary: {
    icon: 'tune',
    status: { label: 'Chờ khách ký xác nhận', variant: 'pending' },
    syncLabel: 'Đồng bộ lúc 16:31',
    title: 'Đi lại dây dàn pin & kiểm tra optimizer – SolarEdge P401 chuỗi A+B',
    facts: [
      { icon: 'person', text: 'Robert Morales (chủ nhà)', emphasis: true },
      { icon: 'pin_drop', text: '89 Circle Drive, Tiburon CA 94920' },
      { icon: 'bolt', text: 'Mái tôn sóng đứng, chuỗi A+B' },
    ],
    metrics: [
      { label: 'Thời lượng', value: '45 phút', caption: 'Kiểm tra kết thúc' },
      { label: 'Tư liệu', value: '5 ảnh', caption: 'Sơ đồ chuỗi & optimizer' },
      { label: 'Trưởng nhóm', value: 'Marcus V.', caption: 'Tổ 12 NorCal', valueTone: 'primary' },
    ],
  },
  lifecycle: {
    title: 'Tiến trình phiếu',
    badge: 'Đã xác nhận 4/5 mốc',
    steps: [
      { title: 'Đã giao', description: 'Sarah Jenkins (điều phối)', timestamp: '21/10, 11:20', state: 'done' },
      { title: 'Đã hẹn & xác nhận', description: 'Đã xác nhận qua email', timestamp: '21/10, 14:00', state: 'done' },
      { title: 'Đang di chuyển', description: 'Điểm danh qua GPS', timestamp: '23/10, 16:05', state: 'done' },
      { title: 'Đang làm tại công trình', description: 'Đã đi lại dây xong', timestamp: '23/10, 16:20', state: 'done' },
      { title: 'Hồ sơ & nghiệm thu', description: 'Chờ chữ ký', state: 'current' },
    ],
  },
  auditLog: {
    title: 'Nhật ký theo thời gian',
    meta: 'Nhật ký không sửa được, 3 mục',
    entries: [
      {
        id: 'log-8819-1631',
        nodeIcon: 'draw',
        nodeTone: 'primary',
        author: { name: 'Marcus Vance', initials: 'MV' },
        role: { label: 'Trưởng nhóm kỹ thuật', variant: 'ready' },
        timestamp: 'Hôm nay, 16:31',
        body: { text: 'Đã gửi yêu cầu ký tới máy tính bảng của chủ nhà, kèm biên bản dịch vụ và chứng nhận lực siết để xem lại.' },
        chips: [
          { icon: 'check_circle', label: 'Optimizer: 24 đang hoạt động' },
          { icon: 'straighten', label: 'Điện áp chuỗi: bình thường' },
        ],
      },
      {
        id: 'log-8819-1620',
        nodeIcon: 'photo_camera',
        nodeTone: 'accent',
        author: { name: 'Marcus Vance', initials: 'MV' },
        role: { label: 'Trưởng nhóm kỹ thuật', variant: 'ready' },
        timestamp: 'Hôm nay, 16:20',
        body: { text: 'Đã đi lại dây chuỗi A và B, thay 2 đầu nối MC4 bị ăn mòn và lắp lại optimizer #14.' },
        media: [
          { src: '/placeholders/photo-panel.svg', alt: 'Dãy tấm pin sau khi đi lại dây', label: 'Chuỗi A' },
          { src: '/placeholders/photo-microinverter.svg', alt: 'Optimizer sau khi lắp lại', label: 'Optimizer 14' },
        ],
      },
      {
        id: 'log-8819-1405',
        nodeIcon: 'assignment_ind',
        nodeTone: 'muted',
        author: { name: 'Sarah Jenkins', initials: 'SJ', tone: 'secondary' },
        role: { label: 'Giám sát điều phối', variant: 'warning' },
        timestamp: '21/10, 11:20',
        body: { text: 'Phiếu bảo trì tạo từ cảnh báo giám sát trên chuỗi A+B và chuyển vào hàng chờ khu vực phía Bắc.' },
      },
    ],
  },
  fieldNote,
  geolocation: {
    title: 'Vị trí công trình',
    precision: 'Độ chính xác GPS: 1.8m',
    map: {
      src: '/placeholders/map-site.svg',
      alt: 'Bản đồ vị trí 89 Circle Drive',
      address: '89 Circle Drive',
      coords: 'Vĩ độ: 37.87, Kinh độ: -122.45',
    },
    checklistTitle: 'Kết quả kiểm tra hiện trường',
    checklist: ['Chuỗi A+B: đã đi lại dây', 'Optimizer: 24 đang hoạt động', 'Chứng nhận lực siết: đã lưu', 'Chống thấm mái: nguyên vẹn'],
  },
  signOff: {
    title: 'Khách hàng ký xác nhận',
    badge: 'Chờ chữ ký',
    badgeVariant: 'pending',
    initials: 'RM',
    name: 'Robert Morales',
    contact: 'r.morales@email.com, (415) 771-4923',
    signedNote: 'Khách đã mở liên kết ký lúc 16:33',
    hash: 'Mã kiểm tra SHA-256: 91c4...7ab1',
    verifyLabel: 'Kiểm tra mã',
  },
}

/** ORD-8830 – phiếu bảo hành trên dashboard (Garrett, Highland Plaza). */
const ord8830: TaskDetail = {
  id: 'ORD-8830',
  code: '#ORD-8830',
  breadcrumb: jobCrumbs('Bảo hành & bảo trì', ROUTES.tech.warranty, '#ORD-8830'),
  actions: { ...actions, dossier: { label: 'Mở hồ sơ bảo hành', icon: 'menu_book' } },
  summary: {
    icon: 'build_circle',
    status: { label: 'Đã lên lịch điều phối, 15:00', variant: 'neutral' },
    title: 'Kiểm tra lỗi hồ quang micro-inverter – Highland Plaza',
    facts: [
      { icon: 'person', text: 'Garrett (quản lý toà nhà)', emphasis: true },
      { icon: 'pin_drop', text: '339 Redwood Ave, San Jose CA 95110' },
      { icon: 'bolt', text: 'Hồ quang micro-inverter #04, gói Gold' },
    ],
    metrics: [
      { label: 'Thời lượng', value: '75 phút', caption: 'Điều phối buổi chiều' },
      { label: 'Tư liệu', value: '1 ảnh', caption: 'Ảnh chụp cảnh báo' },
      { label: 'Trưởng nhóm', value: 'Marcus V.', caption: 'Tổ 12 NorCal', valueTone: 'primary' },
    ],
  },
  lifecycle: {
    title: 'Tiến trình phiếu',
    badge: 'Đã xác nhận 2/5 mốc',
    steps: [
      { title: 'Đã giao', description: 'Tự chuyển từ cảnh báo', timestamp: '23/10, 06:40', state: 'done' },
      { title: 'Đã hẹn & xác nhận', description: 'Đã báo quản lý toà nhà', timestamp: '23/10, 07:15', state: 'current' },
      { title: 'Đang di chuyển', description: 'Đi sau ORD-8827', state: 'upcoming' },
      { title: 'Đang làm tại công trình', description: 'Kiểm tra lỗi hồ quang', state: 'upcoming' },
      { title: 'Hồ sơ & nghiệm thu', description: 'Chờ ký & đồng bộ', state: 'upcoming' },
    ],
  },
  auditLog: {
    title: 'Nhật ký theo thời gian',
    meta: 'Nhật ký không sửa được, 2 mục',
    entries: [
      {
        id: 'log-8830-0715',
        nodeIcon: 'notifications_active',
        nodeTone: 'accent',
        author: { name: 'Hệ thống tự ghi', initials: 'SYS', tone: 'neutral' },
        role: { label: 'Giám sát hệ thống', variant: 'neutral' },
        timestamp: 'Hôm nay, 07:15',
        body: {
          text: 'Lỗi hồ quang lặp lại trên micro-inverter #04 sáng thứ ba liên tiếp.',
          strong: 'Đã xác nhận có IQ8+ thay thế trên xe.',
        },
      },
      {
        id: 'log-8830-0640',
        nodeIcon: 'assignment_ind',
        nodeTone: 'muted',
        author: { name: 'Sarah Jenkins', initials: 'SJ', tone: 'secondary' },
        role: { label: 'Giám sát điều phối', variant: 'warning' },
        timestamp: 'Hôm nay, 06:40',
        body: { text: 'Lệnh bảo hành tạo từ cảnh báo giám sát và chuyển cho kỹ thuật viên có chứng chỉ gần nhất.' },
      },
    ],
  },
  fieldNote,
  geolocation: {
    title: 'Vị trí công trình',
    precision: 'Độ chính xác GPS: 2.0m',
    map: {
      src: '/placeholders/map-site.svg',
      alt: 'Bản đồ vị trí 339 Redwood Ave',
      address: '339 Redwood Ave',
      coords: 'Vĩ độ: 37.33, Kinh độ: -121.89',
    },
    checklistTitle: 'Kiểm tra trước chuyến đi',
    checklist: ['Đã ghi cảnh báo', 'Có IQ8+ trên xe', 'Đã hẹn lối lên mái', 'Liên lạc được quản lý toà nhà'],
  },
  signOff: null,
}

/** ORD-8833 – khảo sát cuối ngày trên dashboard (Theresa Montgomery). */
const ord8833: TaskDetail = {
  id: 'ORD-8833',
  code: '#ORD-8833',
  breadcrumb: surveyCrumbs('#ORD-8833'),
  actions,
  summary: {
    icon: 'square_foot',
    status: { label: 'Đã hẹn, 16:45', variant: 'neutral' },
    title: 'Khảo sát nhà ở – trần mái, tủ điện chính & xà gồ',
    facts: [
      { icon: 'person', text: 'Theresa Montgomery (chủ nhà)', emphasis: true },
      { icon: 'pin_drop', text: '510 Skyview Ridge, Cupertino CA 95014' },
      { icon: 'bolt', text: 'Cần nâng cấp tủ điện (125A → 200A)' },
    ],
    metrics: [
      { label: 'Thời lượng', value: '60 phút', caption: 'Khung cuối buổi chiều' },
      { label: 'Tư liệu', value: '0 ảnh', caption: 'Đã có phép bay drone' },
      { label: 'Trưởng nhóm', value: 'Marcus V.', caption: 'Tổ 12 NorCal', valueTone: 'primary' },
    ],
  },
  lifecycle: {
    title: 'Tiến trình phiếu',
    badge: 'Đã xác nhận 2/5 mốc',
    steps: [
      { title: 'Đã giao', description: 'Sarah Jenkins (điều phối)', timestamp: '22/10, 17:05', state: 'done' },
      { title: 'Đã hẹn & xác nhận', description: 'Khách xác nhận qua SMS', timestamp: '23/10, 08:00', state: 'current' },
      { title: 'Đang di chuyển', description: 'Điểm cuối trong ngày', state: 'upcoming' },
      { title: 'Đang làm tại công trình', description: 'Kiểm tra trần mái và tủ điện chính', state: 'upcoming' },
      { title: 'Hồ sơ & nghiệm thu', description: 'Chờ ký & đồng bộ', state: 'upcoming' },
    ],
  },
  auditLog: {
    title: 'Nhật ký theo thời gian',
    meta: 'Nhật ký không sửa được, 2 mục',
    entries: [
      {
        id: 'log-8833-0800',
        nodeIcon: 'flight_takeoff',
        nodeTone: 'accent',
        author: { name: 'Hệ thống tự ghi', initials: 'SYS', tone: 'neutral' },
        role: { label: 'Giấy phép', variant: 'neutral' },
        timestamp: 'Hôm nay, 08:00',
        body: { text: 'Đã có phép bay drone trong vùng trời Cupertino từ 16:30 đến 18:00.' },
        subNote: 'Trần bay 120 ft, phải luôn nhìn thấy drone.',
      },
      {
        id: 'log-8833-1705',
        nodeIcon: 'assignment_ind',
        nodeTone: 'muted',
        author: { name: 'Sarah Jenkins', initials: 'SJ', tone: 'secondary' },
        role: { label: 'Giám sát điều phối', variant: 'warning' },
        timestamp: '22/10, 17:05',
        body: { text: 'Đặt lịch khảo sát sau khi chủ nhà yêu cầu báo giá nâng cấp điện cùng với đánh giá mái.' },
      },
    ],
  },
  fieldNote,
  geolocation: {
    title: 'Vị trí công trình',
    precision: 'Độ chính xác GPS: 1.5m',
    map: {
      src: '/placeholders/map-site.svg',
      alt: 'Bản đồ vị trí 510 Skyview Ridge',
      address: '510 Skyview Ridge',
      coords: 'Vĩ độ: 37.32, Kinh độ: -122.05',
    },
    checklistTitle: 'Kiểm tra trước chuyến đi',
    checklist: ['Đã có phép bay drone', 'Đã xác nhận lối lên trần mái', 'Cần ảnh tủ điện chính', 'Đã ghi phạm vi xà gồ'],
  },
  signOff: null,
}

const taskDetails: Record<string, TaskDetail> = {
  [ord8821.id]: ord8821,
  [ord8824.id]: ord8824,
  [ord8827.id]: ord8827,
  [ord8819.id]: ord8819,
  [ord8830.id]: ord8830,
  [ord8833.id]: ord8833,
}

/** Tra chi tiết theo id trên URL; trả undefined để trang gọi notFound(). */
export function getTaskDetail(id: string | undefined): TaskDetail | undefined {
  if (!id) return undefined
  return taskDetails[id]
}
