import type { Tone } from '@/components/common/ui/badge'

export const opsContext = { team: 'Nhóm nhà ở California A', region: 'Khu vực CA' }

export const salesDashboard = {
  priorityCount: 12,
  pipelineCount: 8,
  conditions: 'Thời tiết và tiến độ cấp phép ở Bắc California đang thuận lợi.',
  pipeline: [
    { label: 'Yêu cầu mới', count: 5, note: 'Chờ phân loại' },
    { label: 'Cần xem xét', count: 3, note: 'Chờ đánh giá' },
    { label: 'Cần lên lịch', count: 4, note: 'Sẵn sàng đặt lịch' },
    { label: 'Đã khảo sát', count: 6, note: 'Cần xem kết quả' },
    { label: 'Báo giá nháp', count: 2, note: 'Đang soạn' },
    { label: 'Chờ quản lý duyệt', count: 3, note: 'Chờ ký duyệt' },
    { label: 'Khách đã chấp nhận', count: 4, note: 'Sẵn sàng làm hợp đồng' },
    { label: 'Hợp đồng', count: 2, note: 'Chờ đặt cọc' },
  ],
  tasks: [
    {
      customer: 'Harrison Morales',
      task: 'Cần khảo sát',
      due: 'Hết hạn sau 3 giờ',
      dueTone: 'danger' as Tone,
      detail: '742 Evergreen Terrace, Palo Alto, CA. Hệ thống: 11.4 kW DC áp mái.',
      action: 'Lên lịch',
    },
    {
      customer: 'Claire Beaumont',
      task: 'Xem kết quả khảo sát',
      due: 'Hết hạn sau 5 giờ',
      dueTone: 'warn' as Tone,
      detail: '1204 Woodside Dr, Redwood City, CA. Ghi chú kỹ thuật: cần nâng cấp tủ điện chính.',
      action: 'Xem xét',
    },
    {
      customer: 'Marcus Vance (khách doanh nghiệp)',
      task: 'Duyệt báo giá',
      due: 'Gia hạn 24 giờ',
      dueTone: 'neutral' as Tone,
      detail: '480 Bernardo Ave, Sunnyvale, CA. Báo giá Q-8491: $48,600 kèm 3 pin lưu trữ Enphase.',
      action: 'Phê duyệt',
    },
    {
      customer: 'Dr. Aris Thorne',
      task: 'Ghi nhận tiền cọc',
      due: 'Hạn hôm nay 17:00',
      dueTone: 'warn' as Tone,
      detail: '883 Crestline Dr, San Jose, CA. Mã chuyển khoản WF-99420, ký quỹ ban đầu $2,500.',
      action: 'Ghi nhận',
    },
  ],
  surveys: [
    {
      when: 'Hôm nay, 10:30',
      status: 'Khảo sát hôm nay',
      tone: 'ok' as Tone,
      customer: 'Nathaniel Cross',
      address: '312 Fremont Blvd, Fremont',
      assignee: 'Dave Miller',
      role: 'Trưởng nhóm',
    },
    {
      when: 'Hôm nay, 14:15',
      status: 'Đang di chuyển',
      tone: 'warn' as Tone,
      customer: 'Sarah & Kevin Lee',
      address: '941 Los Gatos Way, San Jose',
      assignee: 'Jake Kovacs',
      role: 'Kỹ thuật viên',
    },
    {
      when: 'Ngày mai, 09:00',
      status: 'Đã xác nhận',
      tone: 'info' as Tone,
      customer: 'Priya Patel',
      address: '510 Alpine Terrace, Oakland',
      assignee: 'Ana Reyes',
      role: 'Trưởng nhóm',
    },
  ],
  activity: [
    {
      time: '14 phút trước',
      title: 'Đã ký hợp đồng',
      body: 'Robert Chen đã ký hợp đồng 9.8 kW điện mặt trời + Tesla Powerwall 3 ($31,200) qua DocuSign.',
    },
    {
      time: '42 phút trước',
      title: 'Đã tải bản đồ LiDAR từ drone',
      body: 'Kỹ thuật viên khảo sát Dave Miller đã tải bản quét hướng mái độ phân giải cao cho 114 Meadow Ln.',
    },
    {
      time: '1 giờ 10 phút trước',
      title: 'Quản lý đã duyệt báo giá',
      body: 'Giám đốc khu vực đã duyệt chiết khấu gói 5% cho báo giá Q-8488.',
    },
  ],
  shortcuts: [
    { label: 'Khách tiềm năng mới', note: 'Phân loại yêu cầu đầu vào', count: 5 },
    { label: 'Báo giá nháp', note: 'Sẵn sàng xem lại giá', count: 2 },
    { label: 'Chờ đặt cọc', note: 'Hợp đồng đã ký, chờ cọc', count: 2 },
  ],
  quota: {
    month: 'Tháng 10',
    pct: 76.6,
    current: 184000,
    target: 240000,
    pipelineValue: 320500,
    pipelineDelta: '+14% so với tháng trước',
    closeRate: 41.8,
    closeNote: 'Top 10% nhân viên kinh doanh',
    stages: [
      { label: 'Hợp đồng', value: 184000, pct: 57 },
      { label: 'Đã chấp nhận', value: 78000, pct: 24 },
      { label: 'Khảo sát', value: 42000, pct: 13 },
      { label: 'Khách tiềm năng', value: 16000, pct: 6 },
    ],
  },
  inquiries: [
    { name: 'Grace Lin', note: 'Hoá đơn điện ước tính $280/tháng' },
    { name: 'Thomas Anstead', note: 'Sạc xe điện + điện mặt trời' },
    { name: 'Whitney & Kyle Ross', note: 'Ưu tiên pin lưu trữ dự phòng' },
  ],
  inquiriesTotal: 5,
}

export type RequestStage = 'new' | 'evaluation' | 'survey-needed' | 'survey-scheduled' | 'archived'

export type ConsultationRequest = {
  id: string
  type: string
  homeowner: string
  contact: string
  address: string
  city: string
  intake: string
  age: string
  sla: string
  slaTone: Tone
  highlights: { label: string; tone: Tone }[]
  stage: RequestStage
  stageLabel: string
  stageTone: Tone
  assignee: string | null
  action: string
}

export const requestStages: { value: RequestStage | 'all'; label: string; count: number }[] = [
  { value: 'all', label: 'Tất cả yêu cầu', count: 48 },
  { value: 'new', label: 'Đánh giá mới', count: 9 },
  { value: 'evaluation', label: 'Đang đánh giá', count: 14 },
  { value: 'survey-needed', label: 'Cần khảo sát', count: 8 },
  { value: 'survey-scheduled', label: 'Đã hẹn khảo sát', count: 11 },
  { value: 'archived', label: 'Đã lưu trữ', count: 6 },
]

export const consultationRequests: ConsultationRequest[] = [
  {
    id: 'REQ-8492',
    type: 'Nhà ở hạng 1',
    homeowner: 'Robert & Sarah Jenkins',
    contact: '+1 (512) 890-4122',
    address: '1420 Meadowview Way',
    city: 'Austin, TX 78704',
    intake: '24/10/2024',
    age: '2 giờ trước',
    sla: 'Sắp quá hạn SLA, còn 58 phút',
    slaTone: 'warn',
    highlights: [
      { label: '42 m² hướng Nam', tone: 'neutral' },
      { label: 'Có nguy cơ bóng che', tone: 'danger' },
    ],
    stage: 'evaluation',
    stageLabel: 'Cần xem xét',
    stageTone: 'warn',
    assignee: 'Elena Vance',
    action: 'Xem đánh giá',
  },
  {
    id: 'REQ-8491',
    type: 'Lưu trữ sẵn cho xe điện',
    homeowner: 'David & Maya Chen',
    contact: 'd.chen.austin@gmail.com',
    address: '8804 West Oak Terrace',
    city: 'Austin, TX 78731',
    intake: '24/10/2024',
    age: '4 giờ trước',
    sla: 'Đúng hạn',
    slaTone: 'ok',
    highlights: [
      { label: '65 m² tôn sóng đứng', tone: 'neutral' },
      { label: 'Bức xạ cao', tone: 'ok' },
    ],
    stage: 'survey-scheduled',
    stageLabel: 'Đã hẹn khảo sát',
    stageTone: 'info',
    assignee: 'Marcus Thorne',
    action: 'Xem thông tin khảo sát',
  },
  {
    id: 'REQ-8488',
    type: 'Bổ sung pin lưu trữ',
    homeowner: 'Gia đình Kathryn Long',
    contact: '+1 (512) 349-9801',
    address: '302 Crestview Ridge',
    city: 'Lakeway, TX 78734',
    intake: '23/10/2024',
    age: '1 ngày trước',
    sla: 'Đúng hạn',
    slaTone: 'ok',
    highlights: [
      { label: 'Mái ngói dốc tiêu chuẩn', tone: 'neutral' },
      { label: 'Tủ điện 3 pha 200A', tone: 'neutral' },
    ],
    stage: 'survey-needed',
    stageLabel: 'Chờ khảo sát',
    stageTone: 'accent',
    assignee: 'Sarah Chen',
    action: 'Hẹn khảo sát',
  },
  {
    id: 'REQ-8484',
    type: 'Hòa lưới 11.2 kW',
    homeowner: 'Bradley & Lisa Wright',
    contact: 'wright_b@txtech.edu',
    address: '512 Barton Springs Rd',
    city: 'Austin, TX 78704',
    intake: '22/10/2024',
    age: '2 ngày trước',
    sla: 'Đúng hạn',
    slaTone: 'ok',
    highlights: [
      { label: 'Khảo sát đã xác minh bằng drone', tone: 'neutral' },
      { label: 'Không bị che bóng', tone: 'ok' },
    ],
    stage: 'evaluation',
    stageLabel: 'Báo giá sẵn sàng',
    stageTone: 'ok',
    assignee: 'Elena Vance',
    action: 'Soạn báo giá',
  },
  {
    id: 'REQ-8479',
    type: 'Khách tự gửi qua web',
    homeowner: 'Arthur & Nora Pendelton',
    contact: '+1 (512) 651-4099',
    address: '7401 Shoal Creek Blvd',
    city: 'Austin, TX 78757',
    intake: '24/10/2024',
    age: '18 phút trước',
    sla: 'Khách mới',
    slaTone: 'info',
    highlights: [
      { label: '52 m² mái bốn mái', tone: 'neutral' },
      { label: 'Hoá đơn điện cao', tone: 'neutral' },
    ],
    stage: 'new',
    stageLabel: 'Yêu cầu mới',
    stageTone: 'info',
    assignee: null,
    action: 'Giao người phụ trách',
  },
  {
    id: 'REQ-8472',
    type: 'Thay tấm pin cũ',
    homeowner: 'Gabriel & Sofia Morales',
    contact: '+1 (512) 714-2210',
    address: '1904 Evergreen Ave',
    city: 'Austin, TX 78704',
    intake: '23/10/2024',
    age: '18 giờ trước',
    sla: 'Đúng hạn',
    slaTone: 'ok',
    highlights: [
      { label: 'Thay mái ngói', tone: 'neutral' },
      { label: 'Chờ giấy phép', tone: 'warn' },
    ],
    stage: 'evaluation',
    stageLabel: 'Cần xem xét',
    stageTone: 'warn',
    assignee: 'Marcus Thorne',
    action: 'Xem đánh giá',
  },
]

export const requestsDirectory = {
  stats: { activeIntake: 48, avgTriageSla: '1.8h', surveyBacklog: 8 },
  total: 48,
  filters: {
    assessment: ['Tất cả loại đánh giá', 'Đã xác minh đủ', 'Thiếu thông tin', 'Có cảnh báo bóng che hoặc mái'],
    stage: ['Tất cả giai đoạn', 'Đánh giá sơ bộ', 'Kinh doanh xem xét', 'Đã hẹn khảo sát', 'Báo giá nháp'],
    consultant: ['Tất cả nhân viên', 'Elena Vance (cấp cao)', 'Marcus Thorne', 'Sarah Chen', 'Chưa giao'],
    window: ['7 ngày gần nhất', 'Tháng này', '30 ngày gần nhất', 'Chọn khoảng ngày'],
  },
  region: {
    clusters: [
      { area: 'South Austin (78704)', pct: 42, leads: 20 },
      { area: 'Lakeway / Hills (78734)', pct: 31, leads: 15 },
    ],
    clusterNote: 'Chỉ số bức xạ trên mái cao ở mã vùng 78704.',
    triage: {
      avg: '1 giờ 48 phút',
      health: '94.2% đúng hạn',
      note: 'Có 1 yêu cầu đang ở ngưỡng phải báo cấp trên theo SLA.',
    },
    fleet: { vans: 3, nextSlot: 'Ngày mai, 10:30', crew: 'Đội Delta' },
  },
}
