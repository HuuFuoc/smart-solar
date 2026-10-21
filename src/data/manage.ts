import type { Tone } from '@/components/common/ui/badge'
import type { Step } from '@/components/common/ui/stepper'
import { img } from '@/utils/img'

export const manageContext = {
  period: 'Quý 4/2024, từ đầu tháng đến nay',
  region: 'Tổng quan khu vực',
  gridCapacity: 94.2,
}

/* Executive dashboard */
export const execDashboard = {
  portfolio: 142,
  runRate: '104% so với dự báo',
  kpis: [
    { label: 'Dự án đang chạy', value: 142, note: '+8.2% so với tháng trước' },
    { label: 'Chờ xử lý', value: 12, note: '4 bất thường rủi ro cao', tone: 'warn' as const },
    { label: 'Báo giá chờ duyệt', value: 5, note: '$148,200 giá trị đang chờ' },
    { label: 'Đang lắp đặt', value: 18, note: '2 dự án trễ do giấy phép' },
    { label: 'Dịch vụ & bảo hành', value: 7, note: '1 lỗi inverter nghiêm trọng', tone: 'danger' as const },
    { label: 'Doanh thu quý 4', value: '$1,420k', note: 'Đạt 79% mục tiêu $1,800,000' },
  ],
  pipeline: {
    live: 142,
    medianCycle: '19.4 ngày',
    bottleneck: 'Xem xét báo giá, chậm trung bình +2.1 ngày',
    phases: [
      { label: 'Tư vấn', count: 24, note: 'Thời gian xử lý 3.2 ngày' },
      { label: 'Khảo sát', count: 19, note: 'Thời gian xử lý 4.1 ngày' },
      { label: 'Báo giá', count: 31, note: 'Chậm trung bình +2.1 ngày', friction: true },
      { label: 'Đã ký hợp đồng', count: 22, note: 'Thời gian xử lý 2.0 ngày' },
      { label: 'Lắp đặt', count: 18, note: 'Trung bình 3.5 ngày' },
      { label: 'Bảo hành & vận hành', count: 28, note: 'Hệ thống hoạt động 99.4% thời gian' },
    ],
  },
  exceptions: [
    {
      kind: 'Cần duyệt vượt biên lợi nhuận',
      tone: 'warn' as Tone,
      ref: 'QT-8824',
      value: '$28,450',
      title: 'David Miller, hệ thống SunPower Tier-1 9.6 kW',
      body: 'Đề xuất chiết khấu 16.4%, vượt ngưỡng 15% tiêu chuẩn của chi nhánh. Nhân viên kinh doanh cấp cao Marcus Chen gửi để cạnh tranh với báo giá của đối thủ trong khu vực.',
      meta: 'Đã chờ 4 giờ 12 phút. Biên lợi nhuận dự kiến 28.1%.',
      actions: ['Từ chối hoặc đề xuất lại', 'Duyệt chiết khấu'],
      link: 'approval',
    },
    {
      kind: 'Vướng kết cấu',
      tone: 'danger' as Tone,
      ref: 'INS-7704',
      value: 'Ngày 2/3',
      title: 'Nhà Chen, 14.2 kW + Tesla Powerwall',
      body: 'Trưởng nhóm lắp đặt báo vì kèo dưới mái ngói phía Nam bị mục. Cần thiết kế lại kết cấu trước khi thanh tra thành phố ký. Đã dừng thi công.',
      meta: 'Đội đang chờ: 6 kỹ thuật viên tại công trình.',
      actions: ['Điều đội khác', 'Xem trở ngại và bản vẽ'],
      link: 'alerts',
    },
    {
      kind: 'Thay đổi phạm vi',
      tone: 'info' as Tone,
      ref: 'QT-8831',
      value: '$18,900',
      title: 'Elena Rostova, bổ sung lưu trữ Enphase',
      body: 'Khách yêu cầu đổi từ pin 5 kWh lên 10 kWh. Báo giá thực tăng $6,200. Hồ sơ ưu đãi đã cập nhật.',
      meta: 'Dung lượng lưu trữ +100%.',
      actions: ['So sánh thay đổi', 'Duyệt phạm vi'],
      link: 'approval',
    },
    {
      kind: 'Vi phạm SLA nghiêm trọng (quá 48 giờ)',
      tone: 'danger' as Tone,
      ref: 'WAR-3309',
      value: 'Ưu tiên 1',
      title: 'Pemberton Estate, mất điện do chạm đất',
      body: 'Inverter báo lỗi hồ quang AFE-094 liên tục. Sản lượng hiện bằng 0. Khách đã khiếu nại lên bộ phận hỗ trợ cấp điều hành.',
      meta: 'Mất 42.8 kWh sản lượng mỗi ngày.',
      actions: ['Cử kỹ thuật viên cấp cao'],
      link: 'alerts',
    },
  ],
  sprint: {
    week: 48,
    summary: '12 công trình trong đợt này: 6 đã xong, 4 đang làm, 2 chờ điện lực nghiệm thu.',
    rows: [
      {
        project: 'Nhà Morrison',
        location: 'Oakridge',
        id: 'INS-7711',
        size: '11.4 kW',
        hardware: '28 tấm + 1 Powerwall',
        crew: 'Đội Alpha',
        lead: 'T. Vance',
        status: 'Xong lắp khung (80%)',
        tone: 'accent' as Tone,
      },
      {
        project: 'Trang trại Harrington',
        location: 'West Valley',
        id: 'INS-7709',
        size: '22.8 kW mặt đất',
        hardware: 'Inverter thương mại',
        crew: 'Đội mặt đất Bravo',
        lead: '',
        status: 'Đã hẹn điện lực nghiệm thu (Thứ Năm)',
        tone: 'info' as Tone,
      },
      {
        project: 'Gomez Villa',
        location: 'Highland Hills',
        id: 'INS-7698',
        size: '8.2 kW áp mái',
        hardware: 'Micro-inverter Enphase',
        crew: 'Đội nhanh Charlie',
        lead: '',
        status: 'Đã có PTO, vận hành hôm nay',
        tone: 'ok' as Tone,
      },
      {
        project: 'Nhà Snyder',
        location: 'Riverside Ridge',
        id: 'INS-7714',
        size: '16.0 kW',
        hardware: 'SolarEdge + pin 20 kWh',
        crew: 'Đội điện Alpha',
        lead: '',
        status: 'Trễ đấu nối tủ điện phụ',
        tone: 'warn' as Tone,
      },
    ],
    stats: [
      { k: 'Tốc độ lắp đặt', v: '2.4 ngày mỗi công trình' },
      { k: 'Thiết bị có sẵn', v: '98.5% đã tập kết' },
      { k: 'Nghiệm thu đạt lần đầu', v: 'Tỷ lệ đạt 94.8%' },
    ],
  },
  photos: [
    {
      src: img('exec-7711', 640, 400),
      caption: 'INS-7711, đội Alpha',
      meta: '32 tấm SunPower đen, mái Nam. Chống thấm đạt.',
    },
    {
      src: img('exec-7698', 640, 400),
      caption: 'INS-7698, đội Charlie',
      meta: '2 bộ Tesla Powerwall 3 đã tiếp địa, sẵn sàng nghiệm thu.',
    },
  ],
  photoTotal: 48,
  audit: [
    {
      time: '18 phút trước',
      title: 'Điện lực đã cho phép vận hành',
      body: 'Pacific Electric xác nhận đấu nối lưới cho Gomez Villa (INS-7698). Đã cài đặt công tơ thông minh và kích hoạt bảo hành.',
      by: 'Người kiểm tra: GridOps',
    },
    {
      time: '1 giờ 04 phút trước',
      title: 'Đã ký hợp đồng và nhận cọc, tổng $34,800',
      body: 'Dr. Wayne Bennett đã ký qua DocuSign. Khoản giữ chỗ thiết kế ban đầu ($3,480) đã thanh toán qua Stripe.',
      by: 'Kinh doanh: Sarah Lin',
    },
    {
      time: '2 giờ 45 phút trước',
      title: 'Đã xác nhận bản quét drone khảo sát',
      body: 'Trưởng nhóm khảo sát kết cấu Carlos Mendez đã xác minh độ dốc, hướng và bóng che cho Westfield Plaza (SV-4402).',
      by: 'Vận hành hiện trường miền Nam',
    },
    {
      time: '4 giờ 10 phút trước',
      title: 'Thành phố đã duyệt giấy phép điện',
      body: 'Thành phố Glendale đã duyệt bản sửa thiết kế cho nhà Bellingham (PER-0912). Đội thi công được phép triển khai.',
      by: 'Làm hồ sơ: CityDesk',
    },
  ],
  revenue: {
    pct: 79,
    recognized: '$1.42M',
    remaining: '$380k',
    mix: [
      { label: 'Điện mặt trời áp mái nhà ở', value: 910000, pct: 64 },
      { label: 'Bổ sung lưu trữ & sạc xe điện', value: 340000, pct: 24 },
      { label: 'Hợp đồng vận hành & bảo trì', value: 170000, pct: 12 },
    ],
  },
}

/* Project portfolio */
export type PortfolioStage =
  'consultation' | 'survey' | 'quotation' | 'permitting' | 'installation' | 'inspection' | 'warranty'

export type PortfolioRow = {
  id: string
  type: string
  customer: string
  address: string
  owner: string
  territory: string
  system: string
  hardware: string
  stage: PortfolioStage
  stageLabel: string
  stageNote: string
  progressLabel: string
  pct: number
  milestone: string
  pto: string
  health: string
  healthTone: Tone
  action: string
}

export const portfolioStages: { value: PortfolioStage | 'all'; label: string; count: number }[] = [
  { value: 'all', label: 'Tất cả giai đoạn', count: 142 },
  { value: 'consultation', label: 'Tư vấn', count: 18 },
  { value: 'survey', label: 'Khảo sát & thiết kế', count: 26 },
  { value: 'quotation', label: 'Báo giá & tài chính', count: 14 },
  { value: 'permitting', label: 'Xin giấy phép', count: 19 },
  { value: 'installation', label: 'Lắp đặt', count: 21 },
  { value: 'inspection', label: 'Nghiệm thu & PTO', count: 12 },
  { value: 'warranty', label: 'Đang bảo hành', count: 32 },
]

export const portfolioRows: PortfolioRow[] = [
  {
    id: 'PRJ-8821',
    type: 'Nhà ở áp mái',
    customer: 'Eleanor Hawthorne',
    address: '742 Evergreen Terrace, Springfield',
    owner: 'Marcus Chen',
    territory: 'Khu vực 04',
    system: '8.4 kW, 22 tấm',
    hardware: 'Tesla Powerwall 3 (13.5 kWh)',
    stage: 'installation',
    stageLabel: 'Giai đoạn 5: Lắp đặt',
    stageNote: 'Đã xác minh khung',
    progressLabel: 'Đang lắp',
    pct: 68,
    milestone: '14/11/2024',
    pto: '20/12/2024',
    health: 'Đúng tiến độ',
    healthTone: 'ok',
    action: 'Xem chi tiết',
  },
  {
    id: 'PRJ-8824',
    type: 'Nhà ở bổ sung pin',
    customer: 'Robert Montgomery',
    address: '124 Conch Street, Pacific Palisades',
    owner: 'Elena Vance',
    territory: 'Khu vực 01',
    system: '12.8 kW, 32 tấm',
    hardware: 'Enphase IQ8+, 2 bộ Encharge 10T',
    stage: 'quotation',
    stageLabel: 'Giai đoạn 3: Báo giá',
    stageNote: 'Chờ ký hồ sơ tài chính',
    progressLabel: 'Giấy tờ của khách',
    pct: 90,
    milestone: '28/11/2024',
    pto: '15/2/2025',
    health: 'Cần xem xét',
    healthTone: 'warn',
    action: 'Xem chi tiết',
  },
  {
    id: 'PRJ-7704',
    type: 'Nông nghiệp thương mại',
    customer: 'Skyline Vineyards LLC',
    address: '4800 Napa Valley Hwy, St Helena',
    owner: 'David Miller',
    territory: 'Thương mại miền Tây',
    system: 'Dàn mặt đất 45.0 kW',
    hardware: 'Inverter thương mại SolarEdge 50K',
    stage: 'permitting',
    stageLabel: 'Giai đoạn 4: Xin giấy phép',
    stageNote: 'Tạm dừng do hành lang điện của hạt',
    progressLabel: 'Nộp lại giấy phép',
    pct: 42,
    milestone: '10/10/2024',
    pto: 'Trễ (+30 ngày)',
    health: 'Trễ giấy phép',
    healthTone: 'danger',
    action: 'Xử lý vướng mắc',
  },
  {
    id: 'PRJ-8492',
    type: 'Nhà ở mái ngói',
    customer: 'Dr. Clara Wallace',
    address: '883 Silver Lake Blvd, Los Angeles',
    owner: 'Marcus Chen',
    territory: 'Khu vực 04',
    system: '9.6 kW, 24 tấm',
    hardware: 'REC Alpha Pure-R, tủ điện thông minh Span',
    stage: 'inspection',
    stageLabel: 'Giai đoạn 6: Nghiệm thu',
    stageNote: 'Thành phố đã nghiệm thu',
    progressLabel: 'Hồ sơ xin PTO',
    pct: 95,
    milestone: '2/11/2024',
    pto: '5/12/2024',
    health: 'Đúng tiến độ',
    healthTone: 'ok',
    action: 'Xem chi tiết',
  },
  {
    id: 'PRJ-9042',
    type: 'Nhà ở lắp mặt đất',
    customer: 'Thomas & Allison Reyes',
    address: '3100 Oak Ridge Rd, Calabasas',
    owner: 'Sarah Jenkins',
    territory: 'Khu vực 02',
    system: '15.2 kW, 38 tấm',
    hardware: 'FranklinWH FHP (27 kWh)',
    stage: 'warranty',
    stageLabel: 'Giai đoạn 7: Bảo hành',
    stageNote: 'Bảo hành 25 năm đang hiệu lực',
    progressLabel: 'Hoàn thành',
    pct: 100,
    milestone: '19/9/2024',
    pto: '10/11/2024',
    health: 'Đã hoàn thành',
    healthTone: 'neutral',
    action: 'Xem chi tiết',
  },
  {
    id: 'PRJ-6619',
    type: 'Nhà ở mái ngói bitum',
    customer: 'Gabriel & Linus Vance',
    address: '512 Meadowlark Way, Pasadena',
    owner: 'Elena Vance',
    territory: 'Khu vực 01',
    system: '6.8 kW, 17 tấm',
    hardware: 'SolarEdge HD-Wave, sẵn chỗ sạc xe điện',
    stage: 'survey',
    stageLabel: 'Giai đoạn 2: Khảo sát & thiết kế',
    stageNote: 'Đã quét LiDAR bằng drone',
    progressLabel: 'Tính toán kết cấu',
    pct: 45,
    milestone: '22/11/2024',
    pto: '28/1/2025',
    health: 'Đúng tiến độ',
    healthTone: 'ok',
    action: 'Xem chi tiết',
  },
]

export const portfolio = {
  stats: [
    { label: 'Tất cả dự án', value: 142, note: '+8.4% so với tháng trước' },
    { label: 'Đang triển khai', value: 98, note: 'Chiếm 69.0%: khảo sát, giấy phép, lắp đặt' },
    { label: 'Cần xem xét', value: 12, note: '4 vướng cơ quan cấp phép, 8 thiết kế lại', tone: 'warn' as const },
    { label: 'Hoàn thành trong quý', value: 32, note: '100% đã đấu nối lưới' },
  ],
  filters: {
    staff: [
      'Tất cả nhân viên',
      'Marcus Chen (chuyên viên cấp cao)',
      'Elena Vance (trưởng khu vực)',
      'David Miller (kinh doanh thương mại)',
      'Sarah Jenkins (tư vấn đội xe)',
    ],
    health: [
      'Mọi tình trạng',
      'Đúng tiến độ',
      'Cần xem xét',
      'Trễ giấy phép / cơ quan cấp phép',
      'Đã hoàn thành / vận hành',
    ],
    period: ['Quý 4 (90 ngày gần nhất)', 'Tháng này', '30 ngày gần nhất'],
  },
  total: 142,
  valueInView: 348200,
  interconnection: {
    avg: '18.4 ngày tới PTO',
    queues: [
      { utility: 'Khu vực SCE', days: 14, note: 'Nhanh hơn 3 ngày', tone: 'ok' as Tone },
      { utility: 'Lưới chính PG&E', days: 26, note: 'Tồn đọng 5 ngày', tone: 'danger' as Tone },
      { utility: 'SDG&E ven biển', days: 11, note: 'Đạt mục tiêu', tone: 'ok' as Tone },
      { utility: 'LADWP đô thị', days: 19, note: 'Trung bình', tone: 'warn' as Tone },
    ],
    refresh: 'Dữ liệu cập nhật mỗi 15 phút.',
  },
  crews: {
    active: 6,
    rows: [
      {
        crew: 'Đội Alpha (xe 04)',
        task: 'Đang lắp PRJ-8821, Hawthorne',
        status: 'Đang trên mái',
        tone: 'accent' as Tone,
      },
      { crew: 'Đội Beta (xe 07)', task: 'Khảo sát PRJ-6619, Vance', status: 'Đang di chuyển', tone: 'neutral' as Tone },
    ],
  },
}

/* Project detail (management view) */
export const projectFile = {
  id: 'PRJ-8821',
  tier: 'Cải tạo nhà ở hạng 1',
  synced: 'Đồng bộ lần cuối 4 phút trước qua CrewHub',
  stage: 'Giai đoạn 5/7: đang lắp đặt, ngày 2/3',
  variance: 'Lệch tiến độ 0 ngày',
  type: 'Nhà ở riêng lẻ, bù trừ điện năng NEM 3.0',
  customer: 'Eleanor Vance',
  title: 'Chuyển đổi điện mặt trời cho nhà Oakwood',
  address: '742 Evergreen Terrace, Springfield, CA 95814',
  people: [
    { role: 'Phụ trách kinh doanh', name: 'Marcus Chen' },
    { role: 'Trưởng nhóm lắp đặt', name: 'David Miller', note: 'Đội 3' },
    { role: 'Ký duyệt cấp điều hành', name: 'Jonathan Mercer' },
  ],
  contract: { total: 28450, cleared: 17480, clearedPct: 61.4 },
  specs: [
    { k: 'Thông số hệ thống', v: '8.40 kW DC / tối đa 7.68 kW AC' },
    { k: 'Sản lượng dự kiến năm đầu', v: '12,680 kWh mỗi năm' },
    { k: 'Bố trí trên mái', v: '21 tấm, 2 dàn (mái Nam và mái Tây)' },
    { k: 'Tiến độ lắp đặt', v: 'Hoàn thành 68% phần thi công' },
  ],
  targetPto: '4/11/2024',
  steps: [
    { label: 'Tư vấn', meta: '12/10, đã xác nhận kiểm toán năng lượng', state: 'done' },
    { label: 'Khảo sát', meta: '19/10, mái 85 m², dốc 28°', state: 'done' },
    { label: 'Báo giá', meta: '21/10, J. Mercer đã duyệt', state: 'done' },
    { label: 'Ký hợp đồng', meta: '22/10, đã cọc $3,480', state: 'done' },
    { label: 'Lắp đặt', meta: 'Đang làm, ngày 2/3', state: 'active' },
    { label: 'Đấu nối lưới', meta: 'Dự kiến 4/11, chờ đặt lịch cơ quan cấp phép', state: 'upcoming' },
    { label: 'Bảo hành & vận hành', meta: 'Bắt đầu sau PTO', state: 'upcoming' },
  ] satisfies Step[],
  pulse: {
    title: 'Đã xong thanh ray dàn pin và tuyến dây DC chính',
    body: 'David Miller đã ghi chứng nhận lực siết khung (14.2 Nm) lúc 11:34 hôm nay. Đang đi cáp trục micro-inverter ở dàn mái Tây.',
    tags: ['Không thiếu vật tư', 'Lịch nghiệm thu điện của thành phố mở từ 1/11'],
  },
  bom: {
    rev: 'Đã chốt danh mục vật tư, bản REV-3',
    items: [
      {
        k: 'Tấm pin quang điện',
        v: '21 × REC 400W',
        note: 'Dòng Alpha Pure Black, hiệu suất cell 22.3%, suy giảm 0.25% mỗi năm',
      },
      { k: 'Inverter', v: '21 × micro IQ8+', note: 'Tích hợp ngắt nhanh của Enphase, gateway Envoy-S có đo đếm' },
      { k: 'Khung & chống thấm', v: 'IronRidge XR100', note: 'Chân FlashFoot2 cho mái ngói bitum, chịu gió 120 mph' },
    ],
    arrays: [
      { k: 'Nhánh 1 (mái Nam)', v: '12 tấm (4.80 kW)' },
      { k: 'Nhánh 2 (mái Tây)', v: '9 tấm (3.60 kW)' },
      { k: 'Hộp gom AC', v: 'IQ Combiner 5C' },
      { k: 'Đấu vào tủ điện chính', v: 'Thanh cái 200A, CB điện mặt trời 40A' },
    ],
  },
  telemetry: {
    crew: 'Đội 3 đang ở công trình, 3 kỹ thuật viên',
    readings: [
      { k: 'Điện áp hở mạch chuỗi DC', v: '412.4 V DC', note: 'Trong ngưỡng, ±2.1%' },
      { k: 'Điện trở nối đất', v: '0.08 Ω', note: 'Đạt thử nghiệm NEC 250' },
      { k: 'Thời tiết & gió', v: '68°F, 4 mph', note: 'Mái khô ráo' },
    ],
    photos: [
      {
        src: img('prj-south-racking', 480, 320),
        caption: 'Khung & chống thấm mái Nam',
        meta: '10:18, trưởng nhóm Miller',
      },
      { src: img('prj-combiner', 480, 320), caption: 'Đi ống luồn dây hộp gom 5C', meta: '12:44, trưởng nhóm Miller' },
      { src: img('prj-voltmeter', 480, 320), caption: 'Đo điện áp chuỗi DC', meta: '13:15, đạt thông số' },
    ],
    photoTotal: 14,
  },
  audit: {
    tolerance: 'Sai lệch dưới 4%',
    rows: [
      {
        metric: 'Điện năng tiêu thụ mỗi năm',
        self: '11,200 kWh mỗi năm',
        survey: '12,140 kWh mỗi năm (hoá đơn PG&E 12 tháng)',
        variance: '+8.3% so với số khách khai',
        resolution: 'Thiết kế hệ thống bù 104%',
      },
      {
        metric: 'Diện tích mái dùng được',
        self: 'Ước tính khoảng 90 m²',
        survey: '85.4 m² đo bằng ảnh 3D từ drone',
        variance: '-5.1% (chừa chỗ điều hoà)',
        resolution: 'Chia thành hai dàn',
      },
      {
        metric: 'Độ dốc & mặt sàn mái',
        self: 'Mái hai mái tiêu chuẩn',
        survey: 'Dốc 28°, ván ép CDX 1/2" còn tốt',
        variance: 'Góc nắng tối ưu',
        resolution: 'Không cần lót lại mái',
      },
      {
        metric: 'Tủ điện chính',
        self: 'Khai CB 200A',
        survey: 'Square D 200A (thanh cái đồng)',
        variance: 'Không chênh lệch',
        resolution: 'Đã kiểm tra quy tắc 120% của NEC',
      },
    ],
  },
  ledger: {
    status: 'Thanh toán đúng hạn',
    split: [
      { label: 'Đặt cọc', pct: 12.2 },
      { label: 'Lắp đặt', pct: 49.2 },
      { label: 'Tiền giữ lại cuối', pct: 38.6 },
    ],
    rows: [
      { name: 'Tiền cọc cam kết ban đầu', note: 'Thu ngày 22/10, Stripe ACH TX-9011', amount: 3480, state: 'done' },
      {
        name: 'Mốc giao thiết bị & lắp khung',
        note: 'Giải ngân 26/10, tự động khi điều phối',
        amount: 14000,
        state: 'done',
      },
      {
        name: 'Số tiền giữ lại cuối',
        note: 'Chờ thành phố nghiệm thu và điện lực cho phép vận hành',
        amount: 10970,
        state: 'pending',
      },
    ],
  },
  permits: [
    {
      authority: 'Cơ quan cấp phép (AHJ)',
      status: 'Đã duyệt',
      tone: 'ok' as Tone,
      name: 'Sở Xây dựng thành phố Springfield',
      ref: 'SF-9912-SOL',
      body: 'Cấp ngày 24/10/2024. Bản giấy đã dán tại tủ điện.',
    },
    {
      authority: 'Đấu nối với điện lực',
      status: 'Đang xem xét',
      tone: 'warn' as Tone,
      name: 'Bù trừ điện năng PG&E (NEM 3.0)',
      ref: 'PGE-2024-81992',
      body: 'Đã đạt nghiên cứu kỹ thuật đấu nối. Chờ thành phố đóng dấu nghiệm thu để lắp công tơ hai chiều.',
    },
  ],
  permitSla: 'Còn 4 ngày làm việc trong hạn nghiệm thu của cơ quan cấp phép',
  trail: [
    {
      time: '13:18',
      title: 'David Miller (trưởng nhóm kỹ thuật)',
      body: 'Đã cố định và tiếp địa thanh ray dàn 1. Đang gắn micro-inverter IQ8+. Khách đã mở gara để đấu CB tủ phụ.',
    },
    {
      time: '10:45',
      title: 'Marcus Chen (kinh doanh)',
      body: 'Đã xác nhận chủ nhà được phổ biến vị trí đặt thang. Bà Vance xác nhận hồ sơ duyệt thẩm mỹ của ban quản lý khu Oakwood đã nộp.',
    },
    {
      time: 'Hôm qua 16:10',
      title: 'Jonathan Mercer (giám đốc khu vực)',
      body: 'Đã duyệt chuyển gấp khung từ kho Bắc để tránh nghẽn khâu tập kết.',
    },
  ],
  compliance: 'Đạt đầy đủ yêu cầu pháp lý: tuân thủ NEC 2024, inverter hỗ trợ lưới UL 1741-SB đã được xác minh.',
  hotline: '+1 (800) 555-0199',
}

/* Quotation approvals */
export type ApprovalFlag = 'margin' | 'engineering' | 'high-value'

export type Approval = {
  id: string
  customer: string
  address: string
  rep: string
  gross: number
  net: number
  flag: string
  flagTone: Tone
  flags: ApprovalFlag[]
  submitted: string
  stage: string
  slaHours?: number
  specs: { k: string; v: string }[]
  note: string
  margin: string
  criteria: { label: string; tone: Tone }[]
  breakdown: { label: string; amount: number }[]
  actionLabel: string
}

export const approvalQueue = {
  authority: 'Quyền duyệt cấp 3: từ $25,000 và các điều chỉnh ngoài quy định',
  stats: [
    { label: 'Cần xử lý', value: 5, unit: 'báo giá', note: '2 cần ký quỹ, 3 duyệt nhanh được' },
    { label: 'Tổng giá trị đang chờ', value: '$148,200', note: 'Biên lợi nhuận TB 32.8%, tổng $163.5k' },
    { label: 'Thời gian xử lý TB', value: 2.4, unit: 'giờ', note: 'Nhanh hơn mục tiêu SLA quý 3 42 phút' },
    {
      label: 'Cảnh báo SLA nghiêm trọng',
      value: 1,
      unit: 'quá 24 giờ',
      note: 'QT-8492, đã chờ 26 giờ',
      tone: 'danger' as const,
    },
  ],
  chips: [
    { value: 'all', label: 'Tất cả đang chờ', count: 5 },
    { value: 'margin', label: 'Ngoại lệ biên lợi nhuận', count: 2 },
    { value: 'engineering', label: 'Thiết kế riêng', count: 1 },
    { value: 'high-value', label: 'Giá trị cao, trên $25k', count: 2 },
  ] as const,
  recentlyApproved: 28,
  sorts: ['Chờ lâu nhất (SLA)', 'Giá trị báo giá (cao đến thấp)', 'Tỷ lệ chiết khấu'],
  cad: {
    src: img('cad-roof-8824', 640, 400),
    caption: 'Hướng Nam 180°, không bị che bóng',
    meta: 'Đã xác minh bằng Aurora. Sản lượng năm đầu tính được 14,240 kWh.',
  },
}

export const approvals: Approval[] = [
  {
    id: 'QT-8824',
    customer: 'David Miller',
    address: '104 Elmwood Rd, Westside Hills',
    rep: 'Marcus Chen',
    gross: 32450,
    net: 28450,
    flag: 'Chiết khấu khuyến mãi 12.3% cần duyệt',
    flagTone: 'warn',
    flags: ['margin', 'high-value'],
    submitted: '3 giờ trước',
    stage: 'Chờ giám đốc khu vực ký duyệt',
    specs: [
      { k: 'Dàn pin', v: '9.6 kW REC Alpha Pure' },
      { k: 'Lưu trữ', v: '1 Tesla Powerwall 3' },
      { k: 'Tỷ lệ bù ước tính', v: 'Đáp ứng 118% điện lưới' },
    ],
    note: 'Khách có báo giá của Sunrun $29k trọn gói, không có pin dự phòng. Khoản khuyến mãi thêm $4k giúp chốt hợp đồng hôm nay, trước khi ưu đãi thuế liên bang thay đổi.',
    margin: '28.4% (mức sàn quy định 26.0%)',
    criteria: [
      { label: 'Chiết khấu trên 10% (áp dụng 12.3%)', tone: 'warn' },
      { label: 'Tổng giá trị trên $30,000', tone: 'info' },
      { label: 'Có thêm bộ pin lưu trữ', tone: 'ok' },
    ],
    breakdown: [
      { label: 'Dàn pin cơ bản (9.6 kW REC)', amount: 22500 },
      { label: 'Tesla Powerwall 3 (tích hợp inverter)', amount: 9950 },
      { label: 'Chiết khấu VIP của nhân viên kinh doanh', amount: -4000 },
    ],
    actionLabel: 'Xem chi tiết & đề xuất sửa',
  },
  {
    id: 'QT-8492',
    customer: 'Robert Jenkins',
    address: '1420 Meadowview Way',
    rep: 'Marcus Chen',
    gross: 41200,
    net: 41200,
    flag: 'Quá hạn SLA, đã chờ 26 giờ',
    flagTone: 'danger',
    flags: ['engineering', 'high-value'],
    submitted: '26 giờ trước',
    stage: 'Khách đã hẹn trao đổi thiết kế sau 2 giờ nữa',
    slaHours: 26,
    specs: [
      { k: 'Quy mô dàn pin', v: '11.4 kW hạng thương mại' },
      { k: 'Độ phức tạp giấy phép', v: 'Gia cố xà gồ chống động đất' },
      { k: 'Tài chính', v: 'GoodLeap 25 năm, 3.99%' },
    ],
    note: 'Kỹ sư kết cấu đã duyệt tính toán tải cho phần gia cố xà gồ. Khách đồng ý chia đôi chi phí gỗ gia cố chuyên dụng.',
    margin: '31.2% sau gia cố',
    criteria: [
      { label: 'Quá hạn SLA, 26 giờ', tone: 'danger' },
      { label: 'Hạng mục kết cấu riêng, $3,400', tone: 'warn' },
      { label: 'Giá trị cao, $41,200', tone: 'info' },
    ],
    breakdown: [
      { label: 'Hệ thống cơ bản', amount: 37800 },
      { label: 'Bổ sung kết cấu riêng', amount: 3400 },
    ],
    actionLabel: 'Xem & duyệt thiết kế',
  },
  {
    id: 'QT-8831',
    customer: 'Elena Rostova',
    address: '842 Crestview Terrace',
    rep: 'Elena Vance',
    gross: 18900,
    net: 18900,
    flag: 'Yêu cầu thêm pin lưu trữ',
    flagTone: 'info',
    flags: [],
    submitted: '6 giờ trước',
    stage: 'Biên lợi nhuận phần bổ sung đạt mục tiêu',
    specs: [
      { k: 'Thông số hệ thống', v: '7.2 kW + micro-inverter IQ8' },
      { k: 'Đánh giá mái', v: 'Ngói composite, còn tốt' },
      { k: 'Lợi ích ròng 25 năm ước tính', v: 'Tiết kiệm $38,200' },
    ],
    note: 'Đã thêm bộ lưu trữ Enphase sau khi khảo sát cho thấy khách cần dự phòng điện cho tủ đông, khu vực điện lực số 4.',
    margin: '34.1%',
    criteria: [
      { label: 'Đổi phạm vi sau khảo sát', tone: 'info' },
      { label: 'Đi kèm micro-inverter IQ8', tone: 'ok' },
    ],
    breakdown: [
      { label: 'Hệ thống cơ bản', amount: 12700 },
      { label: 'Bổ sung lưu trữ Enphase', amount: 6200 },
    ],
    actionLabel: 'Xem chi tiết',
  },
  {
    id: 'QT-8819',
    customer: 'Sarah Lin',
    address: '88 Oakwood Dr, North Ridge',
    rep: 'Elena Vance',
    gross: 23500,
    net: 23500,
    flag: 'Hạng cao tiêu chuẩn',
    flagTone: 'neutral',
    flags: [],
    submitted: '1 ngày trước',
    stage: 'Quản lý duyệt theo quy trình chuẩn',
    specs: [
      { k: 'Hãng tấm pin', v: '8.8 kW SunPower 400W' },
      { k: 'Bảo hành', v: 'Complete Confidence 25 năm' },
      { k: 'Hình thức thanh toán', v: 'Trả tiền mặt' },
    ],
    note: 'Hợp đồng trả tiền mặt tiêu chuẩn, khách sẵn sàng ký ngay.',
    margin: '35.6%',
    criteria: [
      { label: 'Hãng cao cấp SunPower', tone: 'info' },
      { label: 'Trả tiền mặt', tone: 'ok' },
    ],
    breakdown: [{ label: 'Hệ thống cơ bản', amount: 23500 }],
    actionLabel: 'Xem chi tiết',
  },
  {
    id: 'QT-9012',
    customer: 'Michael Chang',
    address: '905 Pine Crest Ave',
    rep: 'Marcus Chen',
    gross: 17100,
    net: 15600,
    flag: 'Hoàn tiền không khí sạch của khu vực ($1,500)',
    flagTone: 'warn',
    flags: ['margin'],
    submitted: '4 giờ trước',
    stage: 'Hồ sơ hoàn tiền đã kiểm tra trước',
    specs: [{ k: 'Gói', v: 'Gói cơ bản, dàn 6.4 kW' }],
    note: 'Hồ sơ hoàn tiền của điện lực đã đính kèm và được xác minh trên cổng khu vực.',
    margin: '29.8%',
    criteria: [
      { label: 'Hoàn tiền không khí sạch của khu vực ($1,500)', tone: 'warn' },
      { label: 'Gói cơ bản 6.4 kW', tone: 'info' },
    ],
    breakdown: [
      { label: 'Hệ thống cơ bản', amount: 17100 },
      { label: 'Hoàn tiền không khí sạch của khu vực', amount: -1500 },
    ],
    actionLabel: 'Kiểm tra hồ sơ hoàn tiền',
  },
]

export const approvalDetail = {
  id: 'QT-8824',
  status: 'Chờ cấp điều hành ký duyệt',
  submitted: '2 giờ trước bởi Marcus Chen (kinh doanh cấp cao)',
  exception: {
    policy: 'POL-FIN-084',
    title: 'Cần quản lý cấp 3 ký duyệt',
    body: 'Chiết khấu khuyến mãi 12.3% (giảm $4,000) vượt ngưỡng tự quyết 10.0% của nhân viên kinh doanh.',
    repNote:
      'Khách David Miller đưa ra báo giá Sunrun $29,000 trọn gói với pin cùng công nghệ. Duyệt mức $28,450 để khớp ưu đãi của Sunrun cộng thêm $550, chốt trước hạn chỉ tiêu cuối tháng.',
  },
  margin: { pct: 28.4, floor: 26.0, contribution: 8079.8, tier: 'Hạng hoa hồng 1' },
  customer: {
    name: 'David Miller',
    credit: 'Tín dụng hạng 1 (790+)',
    address: '104 Elmwood Road, Pleasant Valley, CA 94523',
    profile: 'Nhà ở riêng, chủ sở hữu đã ở 11 năm',
    utility: 'PG&E bậc E-1, trung bình $385 mỗi tháng',
    financing: 'Trả tiền mặt, đã ký quỹ 100%',
  },
  survey: {
    id: 'SRV-4402',
    status: 'Đã duyệt',
    photos: [
      { src: img('srv-4402-drone', 480, 320), caption: 'Mái Nam chụp từ drone' },
      { src: img('srv-4402-msp', 480, 320), caption: 'Kiểm tra tủ điện chính 200A' },
    ],
    facts: [
      { k: 'Khả năng lắp trên mái', v: '24 tấm mặt Nam, nhận nắng 100%' },
      { k: 'Tủ điện chính', v: 'Thanh cái 200A, không cần giảm định mức' },
      { k: 'Vật cản / bóng che', v: 'Ảnh hưởng TSRF 0.0%, không bị che' },
      { k: 'Người khảo sát', v: 'Marcus Vance, xong hôm qua' },
    ],
    attachments: 4,
  },
  trail: [
    { time: '09:14', title: 'Chiết khấu khuyến mãi được chuyển lên duyệt', body: 'Hệ thống quy tắc tự động' },
    { time: '08:52', title: 'Marcus Chen chốt bản nháp báo giá', body: 'Bản v2.4' },
    { time: 'Hôm qua 16:30', title: 'Đã hoàn tất khảo sát tại công trình', body: 'Người khảo sát đã ký' },
  ],
  architecture: '9.60 kW DC / 13.5 kWh AC',
  items: [
    {
      name: 'Tấm pin REC Alpha Pure 400W',
      detail: 'Tấm dị thể cao cấp, đen toàn phần',
      qty: '24',
      cost: 5400,
      retail: 7980,
    },
    {
      name: 'Micro-inverter Enphase IQ8+ và cáp trục',
      detail: 'Công suất đỉnh AC 290 VA, tạo lưới vi mô',
      qty: '24',
      cost: 3120,
      retail: 4440,
    },
    {
      name: 'Tesla Powerwall 3 (lưu trữ 13.5 kWh)',
      detail: 'Tích hợp inverter điện mặt trời và gateway toàn nhà',
      qty: '1',
      cost: 7200,
      retail: 9950,
    },
    {
      name: 'Khung IronRidge XR100 và tấm chống thấm',
      detail: 'Nhôm định hình kết cấu, chống cháy cấp A',
      qty: '1 bộ',
      cost: 980,
      retail: 1450,
    },
    {
      name: 'Thiết kế, bản vẽ có dấu PE và đấu nối',
      detail: 'Phí giấy phép thành phố và hồ sơ bù trừ điện năng với điện lực',
      qty: '1 gói',
      cost: 750,
      retail: 1150,
    },
    {
      name: 'Nhân công lắp đặt trọn gói và thợ điện bậc thầy',
      detail: 'Đội lắp 2 ngày, vận hành thử và phối hợp xin PTO',
      qty: '1 công trình',
      cost: 2920,
      retail: 3480,
    },
  ],
  gross: 32450,
  discount: { label: 'Ưu đãi khớp giá Sunrun (12.3%)', amount: -4000, overCap: true },
  final: 28450,
  perWatt: '$2.96 mỗi watt DC',
  guardrails: {
    cogs: 20370.2,
    hardMin: 27527,
    budget: { remaining: 1420, total: 8000, note: 'Sẽ dùng hết hạn mức nếu được duyệt' },
    competitor: { name: 'Sunrun Bắc California', rate: '$3.02 mỗi watt', winRate: 'Thắng 78% trong khu vực' },
  },
  presets: ['Khớp $29,000 trọn gói', 'Điều chỉnh phần nhân công'],
  rejectReasons: [
    'Biên lợi nhuận dưới mức sàn của công ty',
    'Báo giá đối thủ chưa xác minh hoặc phá giá',
    'Khách cần thay tủ điện chính',
    'Nhân viên đã hết hạn mức chiết khấu',
  ],
  hash: '0x8F92...B41E',
}

/* Alerts */
export type AlertGroup = 'critical' | 'financial' | 'field'

export const alerts = {
  summary: { active: 7, districts: 4, exposure: 142650, crews: 3 },
  stats: [
    { label: 'Điểm nghẽn đang mở', value: 7, note: 'Tổng giá trị bị ảnh hưởng $142.6k' },
    { label: 'Vi phạm SLA nghiêm trọng', value: 2, note: 'Đứng yên lâu nhất 48 giờ', tone: 'danger' as const },
    { label: 'Duyệt vượt biên lợi nhuận', value: 2, note: 'Chờ giám đốc ký, giá trị $69,650', tone: 'warn' as const },
    { label: 'Nghiệm thu bị trễ', value: 3, note: 'Ảnh hưởng 2 đội, hàng chờ điện lực +26 ngày' },
  ],
  chips: [
    { value: 'all', label: 'Tất cả vấn đề', count: 7 },
    { value: 'critical', label: 'Chỉ SLA nghiêm trọng', count: 2 },
    { value: 'financial', label: 'Tài chính / biên lợi nhuận', count: 2 },
    { value: 'field', label: 'Hiện trường & vận hành', count: 3 },
  ] as const,
  sections: [
    {
      key: 'quotes',
      group: 'financial' as AlertGroup,
      title: 'Báo giá chờ giám đốc ký duyệt',
      description: 'Vượt mức chiết khấu 8% của nhân viên hoặc đã quá hạn SLA.',
      count: '2 báo giá chờ duyệt',
      items: [
        {
          ref: 'QT-8824',
          tone: 'warn' as Tone,
          tag: 'Vượt khuyến mãi',
          title: 'David Miller',
          meta: 'Giá trị hợp đồng $28,450. Kinh doanh: Sarah Lin (khu vực Tây Bắc).',
          body: 'Cảnh báo chính sách: áp dụng chiết khấu khuyến mãi 12.3% (vượt $1,220 so với mức tự động 8% của nhân viên). Thời gian hoàn vốn giảm còn 6.2 năm.',
          actions: ['Duyệt vượt mức', 'Từ chối và đề xuất lại'],
          critical: false,
        },
        {
          ref: 'QT-8492',
          tone: 'danger' as Tone,
          tag: 'Quá hạn 26 giờ',
          title: 'Robert Jenkins',
          meta: 'Giá trị hợp đồng $41,200. Bổ sung pin thương mại hạng 2.',
          body: 'Quá hạn: nằm ở bàn duyệt khu vực quá 26 giờ. Khách đã hỏi hai lần qua cổng khách hàng. Giá chuẩn đã kiểm tra, không có vấn đề.',
          actions: ['Duyệt nhanh', 'Xem toàn bộ lịch sử'],
          critical: true,
        },
      ],
    },
    {
      key: 'projects',
      group: 'field' as AlertGroup,
      title: 'Dự án cần xử lý gấp',
      description: 'Nguy cơ dừng thi công, cơ quan cấp phép tạm dừng và khiếu nại chính thức của khách.',
      count: '2 dự án bị dừng',
      items: [
        {
          ref: 'PRJ-7704',
          tone: 'danger' as Tone,
          tag: 'Kẹt giấy phép 48 giờ',
          title: 'Nhà Chen',
          meta: 'Sở Xây dựng và An toàn thành phố Pasadena. Kỹ sư chính Marcus Boyd.',
          body: 'Thanh tra từ chối: cần bản tính gia cố xà gồ có dấu kỹ sư PE trước khi cấp giấy phép điện mặt trời. Thi công trên mái dừng 48 giờ; chi phí đội chờ $650 mỗi ngày. Mốc thanh toán PTO $18,900 bị lùi.',
          actions: ['Giao kỹ sư PE kết cấu khác', 'Xem hồ sơ giấy phép'],
          critical: true,
        },
        {
          ref: 'PRJ-8819',
          tone: 'warn' as Tone,
          tag: 'Tranh chấp thẩm mỹ',
          title: 'Nhà Morales',
          meta: 'Giai đoạn lắp: ngày 1, đi dây điện thô. Quản lý khách hàng Alicia Vance.',
          body: 'Khách yêu cầu dừng tại chỗ: chủ nhà cho thợ điện ngừng vì ống luồn dây lộ ngoài mặt tiền trát vữa, thay vì đi trên trần như đã thống nhất khi tư vấn thiết kế. Đội đang tạm dừng; đang chờ giải quyết tranh chấp quy định thẩm mỹ của ban quản lý khu.',
          actions: ['Liên hệ trưởng bộ phận chăm sóc khách hàng', 'Duyệt đi lại ống trên trần (+$420)'],
          critical: false,
        },
      ],
    },
    {
      key: 'ops',
      group: 'field' as AlertGroup,
      title: 'Việc vận hành & hiện trường bị trễ',
      description: 'Trễ điều xe và hàng chờ đấu nối của điện lực.',
      count: '2 việc hiện trường',
      items: [
        {
          ref: 'Xe 12',
          tone: 'warn' as Tone,
          tag: 'Lỡ khung khảo sát',
          title: 'Xe dịch vụ 12 (vùng 4)',
          meta: 'Công trình 8129 nâng cấp tủ điện chính đang kéo dài.',
          body: 'Đội sẽ lỡ khung khảo sát 14:00 của khách Michael Chang. Đề xuất: tự động điều người khảo sát đang rảnh gần nhất trên xe 08 (cách 4.2 dặm).',
          actions: ['Tự động điều xe 08'],
          critical: false,
        },
        {
          ref: 'Hàng chờ PTO',
          tone: 'warn' as Tone,
          tag: 'Trễ hệ thống',
          title: 'Nghẽn cấp phép vận hành PTO',
          meta: 'PG&E khu vực phía Bắc.',
          body: 'Thời gian xử lý trung bình tăng từ 9 lên 26 ngày với 14 nhà đã lắp xong đang chờ thay công tơ. Ảnh hưởng điểm hài lòng khu vực và $68k tiền thanh toán giữ lại.',
          actions: ['Chuyển lên đầu mối điện lực'],
          critical: false,
        },
      ],
    },
    {
      key: 'hardware',
      group: 'critical' as AlertGroup,
      title: 'Lỗi thiết bị nghiêm trọng',
      description: 'Nguy hiểm điện kéo dài và mất sản lượng.',
      count: 'Ưu tiên đỏ',
      items: [
        {
          ref: 'WAR-3309',
          tone: 'danger' as Tone,
          tag: 'Hồ quang kéo dài trên 48 giờ',
          title: 'Pemberton Estate (dàn 18.4 kW)',
          meta: 'Mã lỗi AFE-094, chuỗi 3 DC chạm đất. Sản lượng 0.00 kWh. Khu South Hills, cách trạm khu vực 14 dặm.',
          body: 'Nhánh micro-inverter bị ngắt do bảo vệ hồ quang; inverter đã tự khoá. Gói bảo hành cao cấp cam kết có người tới trong 48 giờ. Còn 3 giờ 12 phút trước khi bị phạt vi phạm SLA.',
          actions: ['Cử kỹ thuật viên cấp cao'],
          critical: true,
        },
      ],
    },
  ],
  fleet: [
    { van: 'Xe 12', status: 'Bị trễ', note: 'Vùng 4, đang di chuyển', tone: 'warn' as Tone },
    { van: 'Xe 08', status: 'Sẵn sàng', note: 'Vùng 4, cách 4.2 dặm', tone: 'ok' as Tone },
    { van: 'Xe 03', status: 'Đang tới xử lý lỗi hồ quang', note: 'Vùng 1, South Hills', tone: 'danger' as Tone },
  ],
  leads: [
    { name: 'Marcus Boyd', role: 'Kỹ sư PE kết cấu chính' },
    { name: 'Alicia Vance', role: 'Trưởng bộ phận chăm sóc khách hàng' },
    { name: 'Derek Lawson', role: 'Đầu mối pháp lý với PG&E' },
  ],
  sla: {
    current: 86,
    target: 92.4,
    note: 'Thấp hơn chuẩn 92.4% là 6.4 điểm do hàng chờ đấu nối lưới PG&E tăng ở vùng Alameda và San Joaquin.',
  },
  resolved: [
    {
      time: '10:45',
      title: 'Duyệt vượt mức QT-8790',
      body: 'Đã duyệt chiết khấu 9.5% cho nhà Henderson. Giữ được biên lợi nhuận +18.4%.',
      by: 'J. Mercer',
    },
    {
      time: '09:15',
      title: 'Điều lại đội',
      body: 'Xe 04 chuyển sang sửa hộp ngắt nhanh bị nhảy ở công trình Ortiz. Xử lý xong trong 34 phút.',
    },
    {
      time: 'Hôm qua',
      title: 'Xử lý với điện lực, mã 1102',
      body: 'SoCal Edison đẩy nhanh cấp PTO đợt cho 6 nhà. Giải ngân mốc $54,000.',
    },
  ],
  resolvedTotal: 14,
}

/* Operational reports */
export const operations = {
  filters: {
    horizon: ['90 ngày gần nhất', '30 ngày gần nhất', 'Từ đầu quý'],
    territory: ['Tất cả khu vực (3 đô thị)', 'Bay Area', 'Austin', 'Nam California'],
    asset: ['Nhà ở trọn gói', 'Thương mại', 'Tất cả loại công trình'],
  },
  feeds: 142,
  kpis: [
    { label: 'Dự án đã xử lý', value: 142, note: '+16.4% so với quý trước, 128 đúng tiến độ' },
    { label: 'Số ngày TB tới PTO', value: 18.4, unit: 'ngày', note: 'Nhanh hơn 3.2 ngày, trần dưới 21' },
    { label: 'Tỷ lệ nghiệm thu đạt', value: '94.8%', note: '135/142 đạt lần đầu, mục tiêu SLA 92.0%' },
    { label: 'Hiệu suất sử dụng đội', value: '88.2%', note: 'Đã tối ưu lộ trình' },
    {
      label: 'Thời gian sửa TB (bảo hành)',
      value: 28.5,
      unit: 'giờ',
      note: 'Trong mức cam kết 36 giờ, 11 phiếu đang mở',
    },
  ],
  throughput: {
    handshakes: 14,
    conversion: '84.1% từ khách tiềm năng tới vận hành',
    phases: [
      { label: 'Tư vấn', count: 24, note: 'Tìm hiểu nhu cầu & phụ tải', avg: '3.4 ngày' },
      { label: 'Khảo sát', count: 19, note: 'Kết cấu bằng LiDAR', avg: '2.1 ngày' },
      { label: 'Báo giá chờ duyệt', count: 31, note: '4 sẵn sàng xem xét', avg: '1.8 ngày' },
      { label: 'Ký hợp đồng', count: 22, note: 'Ký quỹ tiền cọc', avg: '2.9 ngày' },
      { label: 'Đang lắp đặt', count: 18, note: 'Khung và tấm pin', avg: '2.1 ngày' },
      { label: 'Đấu nối lưới', count: 14, note: 'Kiểm tra PTO với điện lực', avg: '4.8 ngày' },
      { label: 'Hoàn thành', count: 14, note: 'Hòa lưới trong tháng', avg: '100% PTO' },
    ],
  },
  squads: {
    avgSpeed: '2.1 ngày mỗi hệ thống',
    rows: [
      {
        name: 'Đội Alpha',
        metro: 'Bay Area',
        lead: 'Đội trưởng Marcus Vance, 6 kỹ thuật viên lành nghề',
        turnaround: '1.9 ngày',
        pass: '96.4%',
        installs: 7,
        utilization: '92.4%',
        safety: '148 ngày',
      },
      {
        name: 'Đội Bravo',
        metro: 'Trạm Austin',
        lead: 'Đội trưởng Elena Rostova, 5 kỹ thuật viên có chứng chỉ',
        turnaround: '2.1 ngày',
        pass: '94.1%',
        installs: 6,
        utilization: '87.5%',
        safety: '210 ngày',
      },
      {
        name: 'Đội Delta',
        metro: 'Nam California',
        lead: 'Thợ điện bậc thầy Devon Patel, 5 kỹ thuật viên hiện trường',
        turnaround: '2.3 ngày',
        pass: '93.8%',
        installs: 5,
        utilization: '84.8%',
        safety: '94 ngày',
      },
    ],
    benchmark: {
      src: img('ortega-residence', 800, 450),
      title: 'Nhà Ortega (Austin, TX)',
      meta: 'Hoàn thành trọn gói trong 1.8 ngày. Dàn 10.8 kW kèm Powerwall 3. Đã nghiệm thu và có PTO.',
    },
  },
  reliability: {
    uptime: 'Hệ thống hoạt động 98.2% thời gian',
    incidents: [
      {
        label: 'Mất liên lạc micro-inverter',
        pct: 42,
        note: 'Ghép lại tín hiệu PLC của Enphase và kết nối lại gateway',
      },
      { label: 'Lưới chắn chim / rác quanh dàn', pct: 28, note: 'Chỉnh lại lưới sau gió lớn hoặc lá cây tích tụ' },
      { label: 'Gateway mất WiFi', pct: 18, note: 'Chủ nhà đổi mật khẩu router, chuyển sang mạng di động dự phòng' },
      { label: 'Kiểm tra gioăng chống thấm xà gồ', pct: 12, note: 'Kiểm tra phòng ngừa lớp silicon cách nhiệt' },
    ],
    mttrTrend: 'Nhanh hơn 7.2 giờ so với tháng trước',
    closed: 89,
    open: 11,
  },
  ahj: {
    rows: [
      {
        authority: 'Sở Quy hoạch thành phố San Jose',
        note: 'Đối tác xét duyệt nhanh SolarApp+',
        region: 'Bay Area vùng 4',
        days: 1.2,
        pass: '98.1%',
        audits: 18,
        risk: 'Xử lý nhanh',
        tone: 'ok' as Tone,
      },
      {
        authority: 'Dịch vụ đấu nối Austin Energy',
        note: 'Thay công tơ hai chiều',
        region: 'Austin',
        days: 3.8,
        pass: '93.4%',
        audits: 14,
        risk: 'Trong kiểm soát',
        tone: 'warn' as Tone,
      },
      {
        authority: 'Southern California Edison (SCE)',
        note: 'Gateway giám sát NEM 3.0',
        region: 'Khu vực SoCal',
        days: 6.4,
        pass: '89.2%',
        audits: 22,
        risk: 'Có tồn đọng',
        tone: 'danger' as Tone,
      },
    ],
    total: 19,
    share: '78% khối lượng đang xử lý',
  },
}

/* Revenue */
export const revenue = {
  scope: 'Tây California',
  kpis: [
    { label: 'Doanh thu đã chốt quý 4', value: '$1,420,000', note: 'Đạt 79% chỉ tiêu $1.80M, +$214k so với quý 3' },
    {
      label: 'Tổng giá trị hợp đồng đang xử lý',
      value: '$2,840,000',
      note: '64 hợp đồng đang thiết kế hoặc xin phép, tỷ lệ chuyển đổi 30 ngày có trọng số 81%',
    },
    {
      label: 'Giá trị hợp đồng TB',
      value: '$24,650',
      note: 'Nhà ở; thương mại $58,200. +8.4% nhờ bán kèm pin nhiều hơn',
    },
    { label: 'Biên lợi nhuận gộp TB', value: '32.8%', note: '+2.8 điểm, mức sàn 30.0%', tone: 'ok' as const },
    {
      label: 'Dự báo tiến độ',
      value: '$1,890,000',
      note: 'Đạt 105% chỉ tiêu tháng, dự kiến dư $90,000',
      tone: 'ok' as const,
    },
  ],
  series: {
    months: ['T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
    booked: [1.05, 1.18, 1.22, 1.39, 1.42, 1.89],
    realized: [0.82, 0.94, 1.01, 1.12, 1.19, 1.52],
    note: 'Cách ghi nhận: 10% tiền cọc ban đầu, 50% khi xong đi dây thô, 40% khi có PTO. Tháng 11 tính tới hiện tại, tháng 12 là dự báo.',
    insight: 'Điện mặt trời kèm hai bộ pin lưu trữ đang giúp biên lợi nhuận mỗi hợp đồng tăng 14.2% so với cùng kỳ.',
  },
  tiers: [
    { label: 'Gói điện mặt trời + lưu trữ', value: 710000, pct: 50.0, note: 'Tesla Powerwall 3 / Enphase 5P' },
    { label: 'Chỉ hòa lưới, không lưu trữ', value: 620000, pct: 43.6, note: 'Tấm REC Alpha Pure-RX 430W' },
    { label: 'Thương mại / công nghiệp nhẹ', value: 90000, pct: 6.4, note: 'Inverter 3 pha SolarEdge' },
  ],
  backlog: '98.4% thiết bị có sẵn',
  ledger: {
    filters: {
      advisers: ['Tất cả nhân viên kinh doanh', 'Darren Hayes', 'Marissa Sullivan', 'Elena Stone', 'Julian Vance'],
      margin: [
        'Mọi mức biên lợi nhuận',
        'Trên mục tiêu (từ 30%)',
        'Sát ngưỡng (25% đến 29.9%)',
        'Bị cảnh báo (dưới 25%)',
      ],
      range: '1/11 đến 30/11',
    },
    rows: [
      {
        id: 'PRJ-8821',
        customer: 'Dr. Evelyn Vance',
        city: 'Carmel Valley, CA',
        adviser: 'Darren Hayes',
        tier: 'Hạng 1 xuất sắc',
        system: '12.4 kW DC, 28 tấm',
        hardware: '2 Tesla Powerwall 3 (27 kWh)',
        gross: 48500,
        discount: -1200,
        net: 47300,
        margin: 36.4,
        stage: 'Xong đi dây thô (60%)',
      },
      {
        id: 'PRJ-8824',
        customer: 'Marcus & Claire Thorne',
        city: 'Del Mar, CA',
        adviser: 'Marissa Sullivan',
        tier: 'Trưởng khu vực',
        system: '8.6 kW DC, 20 tấm',
        hardware: 'Micro-inverter Enphase IQ8+',
        gross: 25200,
        discount: 0,
        net: 25200,
        margin: 33.1,
        stage: 'Đã cọc (10%)',
      },
      {
        id: 'PRJ-7704',
        customer: 'Pacific Heights Vineyard',
        city: 'Temecula AVA',
        adviser: 'Elena Stone',
        tier: 'Chuyên viên thương mại',
        system: '42.0 kW DC lắp mặt đất thương mại',
        hardware: 'SolarEdge SE43.2K + backup hub',
        gross: 94500,
        discount: -4500,
        net: 90000,
        margin: 30.5,
        stage: 'Tiền giữ lại chờ PTO (40%)',
      },
      {
        id: 'PRJ-8492',
        customer: 'Harrison & Mia Sterling',
        city: 'La Jolla, CA',
        adviser: 'Julian Vance',
        tier: 'Nhân viên',
        system: '10.2 kW DC, mái ngói đất nung',
        hardware: '1 Enphase IQ Battery 5P',
        gross: 36900,
        discount: -2800,
        net: 34100,
        margin: 27.8,
        stage: 'Đã cọc (10%)',
      },
      {
        id: 'PRJ-9042',
        customer: 'Sunil & Anita Kapoor',
        city: 'Encinitas, CA',
        adviser: 'Darren Hayes',
        tier: 'Hạng 1 xuất sắc',
        system: '11.6 kW DC, mái ngói bitum',
        hardware: '1 Tesla Powerwall 3 (13.5 kWh)',
        gross: 39400,
        discount: 0,
        net: 39400,
        margin: 35.2,
        stage: 'Đã có PTO (100%)',
      },
    ],
    total: 64,
    flagged: 1,
  },
  phases: [
    {
      label: 'Tiền cọc ban đầu',
      amount: 142000,
      body: 'Khoản giữ chỗ 10% khi ký hợp đồng, giữ trong tài khoản ký quỹ',
      note: 'Trễ chuyển đổi 2.1 ngày, đã thu đủ 100%',
      tone: 'ok' as Tone,
    },
    {
      label: 'Lắp khung & đi dây thô',
      amount: 710000,
      body: 'Thu 50% khi xong lắp khung và chuỗi DC',
      note: '22 công trình đang làm, tiến độ bình thường',
      tone: 'accent' as Tone,
    },
    {
      label: 'Đấu nối điện lực',
      amount: 568000,
      body: '40% tiền giữ lại giải ngân sau khi duyệt bù trừ điện năng (NEM hoặc net-billing)',
      note: 'SDG&E và SCE đang chờ, trung bình 18 ngày',
      tone: 'warn' as Tone,
    },
  ],
}
