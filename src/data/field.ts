import type { Tone } from '@/components/common/ui/badge'
import { img } from '@/utils/img'

export const fieldContext = {
  team: 'Đội Alpha',
  hub: 'Trạm triển khai khu vực, vùng 4',
  shift: 'Đang trực, tuyến B',
  shiftWindow: '07:30 đến 16:30',
  sync: 'Trực tuyến, vừa đồng bộ',
}

export type JobKind = 'survey' | 'installation' | 'warranty' | 'maintenance'
export const JOB_LABEL: Record<JobKind, string> = {
  survey: 'Khảo sát',
  installation: 'Lắp đặt',
  warranty: 'Bảo hành',
  maintenance: 'Bảo trì',
}

export const techDashboard = {
  quota: { done: 2, total: 5 },
  date: 'Thứ Tư, 24/10',
  queue: [
    { value: 'all', label: 'Tất cả', count: 5 },
    { value: 'survey', label: 'Khảo sát', count: 3 },
    { value: 'installation', label: 'Lắp đặt', count: 2 },
    { value: 'warranty', label: 'Yêu cầu bảo hành', count: 2 },
    { value: 'maintenance', label: 'Bảo trì', count: 1 },
  ] as const,
  schedule: [
    {
      time: '09:00',
      kind: 'survey' as JobKind,
      status: 'Hoàn thành',
      tone: 'ok' as Tone,
      customer: 'Eleanor Vance',
      address: '742 Evergreen Terrace, Springfield',
      detail: 'Góc mái 34°, lối lên trần mái thông thoáng.',
      action: 'Xem tóm tắt khảo sát',
      primary: false,
    },
    {
      time: '11:30',
      kind: 'installation' as JobKind,
      status: 'Đang thực hiện',
      tone: 'accent' as Tone,
      customer: 'Robert Jenkins',
      address: '1842 Willow Creek Rd',
      detail: 'Hệ thống 8.4 kW, 22 tấm pin đơn tinh thể, inverter SolarEdge HD-Wave.',
      step: 'Bước 4/6: đi dây dàn pin và cáp trục micro-inverter',
      pct: 68,
      onSite: 'Có mặt tại công trình lúc 11:24, đã làm 48 phút',
      photo: img('field-racking', 640, 420),
      action: 'Tiếp tục danh sách kiểm tra lắp đặt',
      primary: true,
    },
    {
      time: '14:00',
      kind: 'warranty' as JobKind,
      status: 'Điểm tiếp theo',
      tone: 'warn' as Tone,
      customer: 'Michael Chang',
      address: '905 Pine Crest Ave, cách 7.4 mi (khoảng 18 phút lái xe)',
      detail: 'Sự cố: chuỗi micro-inverter số 2 không phát điện, mã lỗi 404.',
      action: 'Chỉ đường & bắt đầu',
      primary: true,
    },
    {
      time: '16:15',
      kind: 'maintenance' as JobKind,
      status: 'Sắp tới',
      tone: 'neutral' as Tone,
      customer: 'Sarah Lindqvist',
      address: '312 Meadow Vista Way',
      detail: 'Vệ sinh định kỳ hằng năm, kiểm tra dây dẫn và cập nhật firmware.',
      action: 'Xem phiếu công việc',
      primary: false,
    },
  ],
  outlook: { week: 43, surveys: 3, installs: 2, warranty: 1 },
  tomorrow: [
    { time: '08:30', kind: 'Khảo sát', who: 'David K. (Oak Ridge Est.)' },
    { time: '11:00', kind: 'Vận hành thử', who: 'Nhà Perez (căn 4B)' },
  ],
  completed: [
    {
      time: '10:42',
      title: 'Eleanor Vance, khảo sát',
      body: 'Đã chụp dây điện trên trần mái; xà gồ đạt yêu cầu cho bố trí 18 tấm. Đã tải lên 12 ảnh công trình.',
    },
    {
      time: '08:15',
      title: 'Nhận vật tư tại kho',
      body: 'Đã nhận CB 250A, bát lắp và cuộn dây tiếp địa ở trạm vùng 4. Đã đối chiếu tồn kho.',
    },
  ],
  weather: { summary: 'Làm việc trên mái được, 74°F', detail: 'Mặt mái khô, gió Tây Bắc 4 mph', tone: 'ok' as const },
}

export type WorkOrder = {
  id: string
  kind: JobKind
  priority: 'Urgent' | 'High' | 'Normal'
  window: string
  status: string
  statusTone: Tone
  customer: string
  phone: string
  address: string
  distance: string
  scope: string
  scopeNote: string
  progress: string
  pct?: number
  action: string
  actionPrimary: boolean
  timeline: 'today' | 'upcoming' | 'completed'
}

export const workOrders: WorkOrder[] = [
  {
    id: 'WO-8821',
    kind: 'warranty',
    priority: 'Urgent',
    window: '08:30 đến 10:30',
    status: 'Đang di chuyển',
    statusTone: 'accent',
    customer: 'Nhà Eleanor Vance',
    phone: '555-019-8234',
    address: '742 Evergreen Terrace, West Hills, CA 91307',
    distance: '1.2 mi, còn 4 phút',
    scope: 'Xong 3/5 bước',
    scopeNote: 'Tiếp theo: chẩn đoán nhanh lỗi hồ quang inverter',
    progress: '60%',
    pct: 60,
    action: 'Hoàn thành bước',
    actionPrimary: true,
    timeline: 'today',
  },
  {
    id: 'WO-8824',
    kind: 'survey',
    priority: 'High',
    window: '11:30 đến 13:00',
    status: 'Đã lên lịch',
    statusTone: 'neutral',
    customer: 'David & Sarah Sterling',
    phone: '555-023-9912',
    address: '1204 Oak Ridge Way, Thousand Oaks, CA 91360',
    distance: '4.8 mi, 14 phút di chuyển',
    scope: 'Phân tích độ dốc và hướng mái',
    scopeNote: 'Khoảng trống tủ CB trên trần 200A',
    progress: 'Xong 0/6',
    action: 'Bắt đầu di chuyển',
    actionPrimary: true,
    timeline: 'today',
  },
  {
    id: 'WO-8799',
    kind: 'installation',
    priority: 'Normal',
    window: '13:45 đến 15:45',
    status: 'Đã chất lên xe',
    statusTone: 'neutral',
    customer: 'Kenneth Morris Estates',
    phone: '555-099-2381',
    address: '8831 Sunrise Terrace, Calabasas, CA 91302',
    distance: '7.1 mi, 19 phút di chuyển',
    scope: 'Vận hành thử để xin PTO và tích hợp pin lưu trữ',
    scopeNote: 'Đồng bộ micro-inverter Enphase IQ8',
    progress: 'Giai đoạn 4/5',
    action: 'Chỉ đường điểm tiếp',
    actionPrimary: false,
    timeline: 'today',
  },
  {
    id: 'WO-8772',
    kind: 'maintenance',
    priority: 'Normal',
    window: '16:00 đến 17:00',
    status: 'Đã lên lịch',
    statusTone: 'neutral',
    customer: 'Dr. Angela Wu',
    phone: '555-088-4920',
    address: '3302 Malibu Vista Point, Malibu, CA 90265',
    distance: '9.3 mi, 21 phút di chuyển',
    scope: 'Rửa dàn pin định kỳ 6 tháng và đo điện trở dây tiếp địa',
    scopeNote: 'Khách cho mã cổng 4812',
    progress: 'Xong 0/4',
    action: 'Báo trước cho khách',
    actionPrimary: false,
    timeline: 'today',
  },
]

export const tasksPage = {
  activeToday: 4,
  sync: 'Đã đồng bộ mọi dữ liệu 2 phút trước, dùng được khi mất mạng',
  stats: {
    jobs: { done: 4, planned: 6 },
    miles: 18.4,
    nextLeg: '3.4 mi (12 phút)',
    critical: 2,
    criticalNote: '1 inverter hỏng, 1 khảo sát gấp',
    parts: 100,
    partsNote: 'Đã kiểm đủ micro-inverter',
  },
  timelines: [
    { value: 'today', label: 'Hôm nay', count: 4 },
    { value: 'upcoming', label: 'Sắp tới', count: 8 },
    { value: 'completed', label: 'Đã xong', count: 19 },
    { value: 'all', label: 'Tất cả', count: 31 },
  ] as const,
  types: [
    { value: 'all', label: 'Tất cả loại', count: 6 },
    { value: 'survey', label: 'Khảo sát', count: 2 },
    { value: 'installation', label: 'Lắp đặt', count: 1 },
    { value: 'warranty', label: 'Bảo hành', count: 2 },
    { value: 'maintenance', label: 'Bảo trì', count: 1 },
  ] as const,
  footer: {
    safety: 'Đã hoàn thành danh sách kiểm tra an toàn EPA và OSHA cho các việc hôm nay.',
    dispatch: '(800) 555-SOLAR',
  },
}

export const surveyJob = {
  id: 'SS-PRJ-2024-089',
  status: 'Đang thực hiện',
  autosave: 'Vừa tự lưu',
  customer: 'David & Clara Miller',
  address: '1420 Sunburst Ridge, Austin, TX 78704',
  window: 'Hôm nay, 10:00 đến 11:30',
  target: '7.38 kW, bù 98% điện năng',
  baseline: [
    { k: 'Kích thước', v: '12.5 m × 7.2 m' },
    { k: 'Diện tích khách khai', v: 'Khoảng 90.0 m²' },
    { k: 'Độ nghiêng khách khai', v: 'Dốc 25°' },
    { k: 'Góc phương vị', v: '200° (Nam – Tây Nam)' },
  ],
  referencePhotos: [
    { src: img('survey-ref-roof', 640, 420), caption: 'Mái nhìn từ đường' },
    { src: img('survey-ref-panel', 640, 420), caption: 'Tủ điện chính' },
  ],
  profiles: ['Nhiều mặt', 'Mái hai mái', 'Mái bốn mái', 'Mái bằng / thấp'],
  access: [
    { label: 'Dễ', note: 'Nhà 1 tầng tiêu chuẩn' },
    { label: 'Trung bình', note: 'Nhà 2 tầng, lên qua khe mái' },
    { label: 'Cần giàn giáo', note: 'Mép mái cao' },
    { label: 'Mái dốc', note: 'Trên 35°, cần dây an toàn' },
  ],
  obstacles: [
    { label: 'Ống khói gạch ở đỉnh mái Tây Bắc', note: 'Khoảng lùi tối thiểu 0.8 m' },
    { label: 'Cây sồi lớn (phía Đông)', note: 'Che bóng khoảng 15% buổi sáng' },
    { label: 'Ống thông hơi (2 ống PVC 3")', note: 'Bố trí tránh' },
  ],
  panel: [
    { k: 'Định mức thanh cái', v: '200 A' },
    { k: 'Chỗ trống lắp CB', v: '2 khe (đạt)' },
    { k: 'Cọc tiếp địa', v: 'Đã kiểm tra mối nối' },
  ],
  panelNote: 'Đạt chuẩn NEC (quy tắc 120%)',
  recommendation:
    'Mái đủ chỗ cho 18 tấm đơn tinh thể 410W (7.38 kWp), xếp dọc thành 2 hàng trên mặt Nam. Micro-inverter lắp dưới thanh ray phụ. Ống luồn dây dự kiến: 18 m đi thẳng ngoài tường tới cầu dao cách ly ở gara.',
  photos: [
    {
      src: img('survey-roof-tiles', 640, 420),
      title: 'Kết cấu mái và ngói',
      status: 'Đã xác minh',
      note: 'Ngói bitum còn tốt',
    },
    {
      src: img('survey-meter', 640, 420),
      title: 'Tủ điện chính và công tơ',
      status: 'Đọc rõ',
      note: 'Tủ CB tổng 200A, nhãn đọc rõ',
    },
    {
      src: img('survey-horizon', 640, 420),
      title: 'Bóng che và góc chân trời',
      status: 'Đã tính',
      note: 'Đo bằng Solar Pathfinder: cây sồi phía Đông che 15%',
    },
    {
      src: img('survey-ground', 640, 420),
      title: 'Tiếp địa và vị trí inverter',
      status: 'Đã duyệt',
      note: 'Cọc tiếp địa và khu vực hộp gom phụ ngoài trời',
    },
  ],
  mandatory: { done: 12, total: 12 },
}

export const installJob = {
  id: 'SS-PRJ-2024-042',
  day: 'Ngày 1/2, 08:00 đến 16:30',
  status: 'Đang thực hiện',
  title: 'Hệ thống điện mặt trời nhà ở 7.4 kW + pin lưu trữ',
  customer: 'Marcus & Sarah Brody',
  address: '528 Highland Park Blvd, Austin, TX',
  safetyBrief: 'Đã ký biên bản phổ biến an toàn',
  specs: [
    { k: 'Dàn pin', v: '18 × 410W', note: 'Tier-1 mono PERC' },
    { k: 'Dung lượng lưu trữ', v: '10 kWh', note: 'Pin LiFePO4 gia đình' },
    { k: 'Inverter', v: 'Dòng IQ8', note: 'Micro-inverter Enphase' },
    { k: 'Hạ tầng', v: 'Tuyến 24 ft', note: 'Ống EMT 3/4" và cầu dao cách ly' },
  ],
  steps: [
    {
      title: 'Kiểm tra an toàn mái trước lắp đặt và đặt điểm neo',
      body: 'Đã cố định dây đai chống rơi, kiểm tra dầm đỡ và mặt sàn mái.',
      done: true,
      signed: 'M. Vance (T-44)',
      logged: 'Hôm nay, 08:42',
    },
    {
      title: 'Lắp khung và tấm chống thấm, đã thử độ kín',
      body: 'Chân L bắt cùng keo hoá học; lực siết lớp chống thấm đạt 12 Nm.',
      done: true,
      signed: 'M. Vance (T-44)',
      logged: 'Hôm nay, 11:15',
    },
    {
      title: 'Lắp tấm pin và đi dây chuỗi DC / micro-inverter',
      body: 'Đang nối cáp trục Enphase, kẹp tiếp địa và các tấm pin theo chuỗi.',
      done: false,
      active: true,
      panels: { done: 14, total: 18 },
      lead: 'Marcus Vance',
      updated: '6 phút trước',
    },
    {
      title: 'Cầu dao cách ly AC, ống luồn dây và đấu inverter về tủ phân phối chính',
      body: 'Ống EMT ngoài trời 24 ft, đấu nối hộp kéo dây và khoá liên động tủ điện chính.',
      done: false,
      prerequisite: 'Hoàn thành đấu chuỗi',
      duration: 'Khoảng 1.5 giờ',
    },
    {
      title: 'Vận hành thử, đo điện áp và hòa lưới inverter',
      body: 'Đo Voc, thử chức năng chống tách đảo và kết nối gateway lên hệ thống giám sát.',
      done: false,
      requirement: 'Cần điện lực chứng kiến hoặc tự chứng nhận, bắt buộc tải ảnh cho cơ quan cấp phép',
    },
  ],
  diagnostics: [
    {
      label: 'Điện áp hở mạch chuỗi 1 (Voc)',
      value: '384',
      unit: 'V DC',
      note: 'Mục tiêu 378 đến 392 V ở 840 W/m²',
      status: 'Trong ngưỡng',
      tone: 'ok' as Tone,
    },
    {
      label: 'Điện trở cách điện (Megger)',
      value: '> 100',
      unit: 'MΩ',
      note: 'Thử ở 500 V DC từ thanh ray xuống đất, không rò điện',
      status: 'Đạt',
      tone: 'ok' as Tone,
    },
  ],
  notes:
    'Khách muốn đi ống lệch theo diềm mái phía Đông cho mặt tiền gọn hơn. Thanh cái 200A của tủ chính còn 2 khe trống; đã lắp CB 40A riêng cho điện mặt trời kèm bộ giữ CB theo NEC 705.12.',
  before: [
    { src: img('install-roof-pre', 640, 420), caption: 'Hiện trạng mái', meta: '08:14, mái chưa lắp' },
    { src: img('install-panel-pre', 640, 420), caption: 'Tủ điện chính', meta: '08:29, thanh cái 200A ban đầu' },
  ],
  during: [
    { src: img('install-mid', 1000, 600), caption: 'Tiến độ giữa ca', meta: 'Vừa xong, đã gắn và tiếp địa 14/18 tấm' },
  ],
  weather: {
    summary: 'Trên mái 78°F, trời quang',
    detail: 'Gió Tây Nam 4 mph, mặt ngói khô bám tốt',
    tone: 'ok' as const,
  },
  session: { tech: 'Marcus Vance', timer: 'Đã ở công trình 4 giờ 18 phút', wrap: 'Dự kiến xong 15:30' },
}
