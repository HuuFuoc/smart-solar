import type { Step } from '@/components/common/ui/stepper'
import { img } from '@/utils/img'

export const property = {
  name: 'Nhà Oakwood',
  projectId: 'OAK-782',
  address: '742 Evergreen Terrace, Springfield, IL',
  liveOutputKw: 6.4,
  owner: 'Eleanor Vance',
}

export const advisor = {
  name: 'Marcus Chen',
  title: 'Tư vấn viên giải pháp điện mặt trời cấp cao',
  team: 'Nhóm khu vực Springfield',
  phone: '+1 (555) 382-9910',
  email: 'marcus.chen@smartsolar.io',
}

/* Overview */
export const overview = {
  milestone: {
    title: 'Khảo sát tại nhà',
    when: 'Thứ Năm, 24/10 lúc 10:00',
    daysAway: 3,
    with: advisor.name,
  },
  journey: [
    { label: 'Đã đánh giá sơ bộ', meta: '12/10, mái đạt 8.4 kW', state: 'done' },
    { label: 'Đang tư vấn', meta: `Đã giao cho ${advisor.name}`, state: 'done' },
    { label: 'Đã hẹn khảo sát', meta: 'Thứ Năm, 24/10, 10:00', state: 'active' },
    { label: 'Báo giá chính thức', meta: 'Đã sẵn sàng duyệt trước', state: 'upcoming' },
    { label: 'Lắp đặt trên mái', meta: 'Dự kiến tháng 11/2024', state: 'upcoming' },
  ] satisfies Step[],
  consultation: {
    id: 'SOL-8492',
    title: 'Khảo sát tại nhà',
    status: 'Đã hẹn khảo sát',
    date: 'Thứ Năm, 24/10 lúc 10:00',
    duration: 'Khoảng 45 phút',
    prep: ['Dọn lối đi tới tủ CB điện chính.', 'Giữ thú cưng trong nhà khi đo mái.'],
  },
  proposal: {
    id: 'Q-2024-108',
    status: 'Đang soạn báo giá',
    sizeKw: 8.4,
    panels: 21,
    offsetPct: 96,
    coversKwh: 11400,
    savingsPerYear: 2180,
    inverter: 'Micro-inverter Enphase IQ8+',
    battery: 'Tesla Powerwall 3 (tuỳ chọn)',
  },
  readiness: {
    pct: 35,
    items: [
      { label: 'Phân tích bóng che bằng LiDAR từ xa', status: 'Hoàn thành', tone: 'ok' },
      { label: 'Kiểm tra công trình và kết cấu', status: 'Đang chờ', tone: 'accent' },
      { label: 'Giấy phép kỹ thuật của thị trấn', status: 'Chờ khảo sát', tone: 'neutral' },
    ] as const,
    crew: 'Đội Bravo khu vực Bay Area, thợ lắp đặt có chứng chỉ NABCEP',
  },
  warranty: {
    plan: 'Smart Solar Protect, bảo hành 25 năm',
    summary: 'Cam kết hiệu suất phát điện 92% sau 25 năm, bao gồm thay inverter và bảo vệ các điểm khoan mái.',
  },
  events: [
    {
      day: 'T5',
      date: '24',
      title: 'Kiểm tra kết cấu mái và hệ thống điện',
      time: '10:00 đến 10:45',
      kind: 'Khảo sát hiện trường',
      detail: `Phụ trách: ${advisor.name}. Làm trực tiếp tại nhà, cần chừa lối xe vào.`,
    },
    {
      day: 'T2',
      date: '28',
      title: 'Duyệt thiết kế và chốt phương án tài chính',
      time: '14:00 đến 14:30',
      kind: 'Gọi video',
      detail: 'Sẽ gửi đường dẫn Google Meet.',
    },
  ],
  activity: [
    {
      time: 'Hôm nay 09:15',
      title: `${advisor.name} đã xác nhận lịch khảo sát`,
      body: 'Đã chốt lịch hẹn Thứ Năm, 24/10 lúc 10:00. Tin xác nhận đã gửi tới điện thoại của bạn.',
    },
    {
      time: 'Hôm qua 15:40',
      title: 'Đã cập nhật giá ước tính sơ bộ',
      body: 'Tính lại theo thay đổi ưu đãi bù trừ điện năng của điện lực địa phương năm 2024 (tiết kiệm thêm $420 mỗi năm).',
    },
    {
      time: '14/10',
      title: 'Đã tạo bố trí mái từ ảnh vệ tinh',
      body: 'Bố trí ban đầu: 14 tấm hướng Nam và 7 tấm hướng Tây để phát điện tối đa buổi chiều.',
    },
  ],
}

/* Preliminary estimate */
export const estimate = {
  viabilityScore: 94,
  grossRange: [14200, 16800] as const,
  netRange: [9940, 11760] as const,
  paybackYears: '5.8 đến 6.5',
  year1Savings: 1480,
  lifetimeCo2Tons: 192,
  system: {
    name: 'Hệ thống Smart Solar EcoPrime 8.4 kW',
    summary: 'Thiết kế cho mái dốc nhà ở, nhận nắng theo quỹ đạo phía Nam.',
    parts: [
      { name: '21 tấm pin đơn tinh thể', detail: 'Tấm Tier-1 400W màu đen toàn phần, hiệu suất 21.8%.' },
      { name: 'Micro-inverter thông minh', detail: 'Micro-inverter Enphase IQ8 tối ưu sản lượng từng tấm.' },
      { name: 'Gateway thông minh 24/7', detail: 'Theo dõi tiêu thụ và điện phát lên lưới trên điện thoại.' },
      { name: 'Bảo hành 25 năm', detail: 'Cam kết về thiết bị, tay nghề thi công và sản lượng điện.' },
    ],
    render: img('oakwood-render', 1200, 800),
    panelsMapped: 21,
  },
  assumptions: [
    { k: 'Sản lượng điện sạch mỗi năm', v: 'Khoảng 11,200 kWh', note: 'Theo mô hình bức xạ mặt trời' },
    { k: 'Diện tích mái sử dụng được', v: '75 m²', note: 'Mặt mái dốc không bị che bóng' },
    { k: 'Hướng và góc phương vị', v: 'Nam (182°)', note: 'Nhận nắng tốt nhất trong ngày' },
    { k: 'Mục tiêu bù điện năng', v: '104%', note: 'So với mức tiêu thụ 10,750 kWh' },
  ],
  disclaimer:
    'Đây là ước tính sơ bộ tự động, tính từ số đo bạn tự khai và dữ liệu bức xạ từ vệ tinh. Đây không phải báo giá ràng buộc. Giá chính thức được xác nhận sau khi kỹ sư điện mặt trời có chứng chỉ kiểm tra kết cấu và hệ thống điện tại nhà.',
}

/* Consultation request */
export const consultation = {
  id: 'CR-9042',
  type: 'Tư vấn nhà ở',
  submitted: '18/10/2024 lúc 14:15',
  status: 'Đang khảo sát công trình',
  estimatedCompletion: '24/10/2024',
  steps: [
    { label: 'Đã gửi', meta: '18/10', state: 'done' },
    { label: 'Đang xem xét', meta: 'Đã duyệt 19/10', state: 'done' },
    { label: 'Đã hẹn khảo sát', meta: 'Thứ Năm, 24/10, 10:00', state: 'active' },
    { label: 'Đã khảo sát', state: 'upcoming' },
    { label: 'Đang soạn báo giá', state: 'upcoming' },
  ] satisfies Step[],
  inspection: {
    when: 'Thứ Năm, 24/10 lúc 10:00 (EST)',
    scope: 'Marcus sẽ kiểm tra xà gồ, tủ công tơ điện và các yếu tố gây bóng che.',
    duration: '45 đến 60 phút',
    access: 'Cần vào sân ngoài một lúc và có lối đi tới gara hoặc tủ CB điện.',
    checklist: [
      'Mở khoá cổng hoặc giữ chó trong nhà',
      'Chừa khoảng trống 1 m quanh tủ CB chính',
      'Chuẩn bị sẵn hoá đơn điện gần đây nếu cần hỏi',
    ],
  },
  propertyData: [
    { k: 'Địa chỉ', v: '742 Evergreen Terrace, Springfield, OR 97477' },
    { k: 'Thửa đất', v: 'Đã xác minh' },
    { k: 'Mái', v: 'Ngói bitum, hướng Nam, dốc 28°' },
    { k: 'Công suất mục tiêu', v: '8.4 kW, khoảng 21 tấm, bù 94% điện năng' },
    { k: 'Điện lực', v: 'Springfield Power & Light, tài khoản SP-88319' },
    { k: 'Tủ điện chính', v: 'CB 200A' },
  ],
  photos: [
    { src: img('cr-roof-south', 640, 480), name: 'Roof South Plane.jpg', meta: '4.2 MB, thấy rõ độ dốc' },
    { src: img('cr-breaker', 640, 480), name: 'Main Breaker Box.jpg', meta: '3.8 MB, thanh cái 200A' },
    { src: img('cr-obstruction', 640, 480), name: 'Obstruction View.jpg', meta: '5.1 MB, hàng cây chắn' },
  ],
  activity: [
    {
      time: 'Hôm nay 09:40',
      title: 'Đã xác nhận lịch khảo sát',
      body: 'Marcus Chen đã xác nhận khung 24/10, 10:00. Lời mời lịch đã gửi tới eleanor.vance@example.com.',
    },
    {
      time: '19/10 15:12',
      title: 'Đã giao tư vấn viên cấp cao',
      body: 'Chọn Marcus Chen vì có kinh nghiệm với mái ngói bitum nhà ở tại Springfield.',
    },
    {
      time: '19/10 11:04',
      title: 'Đã phân tích LiDAR từ vệ tinh',
      body: 'Mô hình bức xạ mái cho 1,480 giờ nắng đỉnh mỗi năm với hướng Nam. Mức phù hợp ước tính: 98%.',
    },
    {
      time: '18/10 14:15',
      title: 'Đã tạo yêu cầu tư vấn',
      body: 'Eleanor Vance đã gửi thông tin nhà và 3 ảnh tham khảo.',
    },
  ],
  homeownerNote:
    'Cổng sân bên có khoá số cơ: 4182. Nếu lúc anh tới tôi đang bận họp, cứ vào thẳng sân sau. Nhờ anh kiểm tra giúp ống khói có che bóng một phần mái phía Đông sau 3 giờ chiều không.',
  homeownerNoteMeta: 'Eleanor V., thêm ngày 18/10',
  support: 'Bộ phận hỗ trợ làm việc từ Thứ Hai đến Thứ Bảy, 8:00 đến 19:00 (EST).',
}

/* Official quotation */
export const quotation = {
  id: 'QT-8821',
  status: 'Chờ khách xem xét',
  validDays: 18,
  expires: '25/11/2024',
  title: 'Lắp đặt điện mặt trời cho nhà Oakwood',
  issued: '25/10/2024',
  preparedBy: advisor.name,
  site: {
    address: '742 Evergreen Terrace, Springfield',
    detail: 'Mái ngói composite hướng Nam, dốc 28°, 4.8 giờ nắng mỗi ngày',
    photo: img('oakwood-quote-site', 1000, 700),
  },
  capacityKw: 8.4,
  year1Kwh: 11400,
  offsetPct: 102,
  lines: [
    {
      name: 'Tấm pin điện mặt trời',
      qty: '21 tấm',
      detail: 'Tấm đơn tinh thể Smart Solar Black 400W, $380 mỗi tấm',
      amount: 7980,
    },
    {
      name: 'Micro-inverter',
      qty: '21 bộ',
      detail: 'Enphase IQ8+ có ngắt nhanh cấp tấm pin, $185 mỗi bộ',
      amount: 3885,
    },
    {
      name: 'Khung giá đỡ và lắp đặt trên mái',
      qty: 'Trọn gói',
      detail: 'Bát QuickMount PV có tấm chống thấm, thanh ray nhôm anod hoá và kẹp tiếp địa',
      amount: 1250,
    },
    {
      name: 'Gateway giám sát thông minh',
      qty: '4G + WiFi',
      detail: 'Công tơ sản lượng Envoy kèm kẹp dòng CT đo tiêu thụ',
      amount: 650,
    },
    {
      name: 'Thiết kế, xin phép và đấu nối lưới',
      qty: '',
      detail:
        'Bản vẽ điện CAD có dấu kỹ sư PE, thẩm định kết cấu của thành phố Springfield, hồ sơ đấu nối với điện lực',
      amount: 1150,
    },
    {
      name: 'Lắp đặt bởi thợ có chứng chỉ',
      qty: 'NABCEP',
      detail: 'Toàn bộ nhân công, cầu dao cách ly AC, ống luồn dây và nghiệm thu an toàn của thành phố',
      amount: 2850,
    },
  ],
  gross: 17765,
  incentives: [
    {
      name: 'Tín dụng thuế điện mặt trời liên bang (ITC)',
      detail: 'Giảm 30% thuế, không hoàn tiền mặt',
      amount: -5329.5,
    },
    { name: 'Hỗ trợ năng lượng sạch của bang', detail: 'Ưu đãi trả trước tự động qua điện lực', amount: -750 },
  ],
  net: 11685.5,
  cashflow: {
    currentBill: 195,
    loanPayment: 89,
    savings: 106,
    terms: 'Khoản vay năng lượng sạch 15 năm, lãi suất 5.49%/năm, không cần trả trước.',
  },
  warranties: [
    { name: 'Sản lượng 25 năm', detail: 'Tối thiểu 85% sản lượng ở năm thứ 25' },
    { name: 'Chống thấm 10 năm', detail: 'Bảo hành không rò rỉ tại các điểm khoan mái' },
    { name: 'Tay nghề thi công', detail: 'Bảo hành toàn bộ nhân công và dịch vụ' },
  ],
  license:
    'Thợ lắp đặt bậc thầy có chứng chỉ NABCEP và thợ điện bậc thầy có giấy phép. Giấy phép nhà thầu SOL-98442-SP, có bảo hiểm và bảo lãnh (trách nhiệm chung $2,000,000).',
}

/* Project lifecycle */
export const project = {
  id: 'SS-8842-CA',
  type: 'Hệ thống hòa lưới tiêu chuẩn 8.4 kW',
  title: 'Chuyển đổi điện mặt trời cho nhà Oakwood',
  address: '2428 Oakwood Crest Lane, Santa Clara, CA 95054',
  stage: 5,
  stageCount: 7,
  steps: [
    { label: 'Tư vấn', meta: '12/9', state: 'done' },
    { label: 'Khảo sát tại nhà', meta: '24/9', state: 'done' },
    { label: 'Báo giá', meta: '2/10', state: 'done' },
    { label: 'Ký hợp đồng', meta: '10/10', state: 'done' },
    { label: 'Lắp đặt', meta: '28/10 đến 30', state: 'active' },
    { label: 'Đấu nối lưới', meta: 'Dự kiến 4/11', state: 'upcoming' },
    { label: 'Bảo hành', meta: 'Hệ thống 25 năm', state: 'upcoming' },
  ] satisfies Step[],
  current: {
    title: 'Đang lắp đặt trên mái',
    summary:
      'Đội lắp đặt đang ở công trình: gắn tấm pin hai mặt, chống thấm các điểm khoan và đi dây micro-inverter Enphase.',
    window: '28/10 đến 30/10/2024',
    health: 'Đúng tiến độ',
    pct: 68,
  },
  crew: {
    squad: 'Đội 3 khu vực Bay Area',
    lead: {
      name: 'David Miller',
      role: 'Thợ điện bậc thầy, trưởng nhóm lắp đặt kiêm phụ trách an toàn',
      exp: '12 năm',
      phone: '+1 (555) 714-2209',
    },
    size: '4 kỹ thuật viên',
    vehicle: 'Xe 14 (Ford điện)',
    license: 'C-10 104829',
  },
  schedule: [
    {
      day: 'Ngày 1',
      title: 'Lắp khung và neo an toàn trên mái',
      when: '28/10',
      status: 'Hoàn thành',
      tone: 'ok',
      body: 'Thanh ray IronRidge XR100 đã bắt vào xà gồ kèm tấm chống thấm. Keo cách nhiệt đã khô.',
      notes: ['Đã siết lực 42 điểm khoan mái', 'Đã ký biên bản kiểm tra chất lượng'],
    },
    {
      day: 'Ngày 2',
      title: 'Đi dây dàn 21 tấm và đặt micro-inverter',
      when: 'Hôm nay',
      status: 'Đang thực hiện',
      tone: 'accent',
      body: 'Đang đặt tấm REC Alpha Pure-R 400W, mỗi tấm một micro-inverter Enphase IQ8+. Cáp trục đã kẹp vào máng bảo vệ.',
      progress: { done: 14, total: 21 },
    },
    {
      day: 'Ngày 3',
      title: 'Đấu ống luồn dây vào tủ điện và đồng bộ gateway',
      when: '30/10',
      status: 'Đã lên lịch',
      tone: 'neutral',
      body: 'Lắp cầu dao cách ly AC, khoá liên động CB tổng 200A và ghép nối gateway Envoy qua mạng di động.',
    },
    {
      day: 'Nghiệm thu',
      title: 'Thành phố nghiệm thu xây dựng và điện',
      when: '4/11',
      status: 'Theo kế hoạch',
      tone: 'neutral',
      body: 'Cán bộ thành phố Santa Clara kiểm tra để cấp phép vận hành và đóng giấy phép SF-9912.',
    },
  ] as const,
  feed: [
    {
      time: '13:42',
      title: 'Đã kiểm tra điện trở cáp trục',
      body: 'David Miller đã đo thông mạch nhánh dàn phía Nam. Cả 14 micro-inverter đều đạt trở kháng.',
    },
    {
      time: '11:15',
      title: 'Đã tải ảnh kiểm tra giữa ca',
      body: 'Ảnh neo vào xà gồ đã thêm vào hồ sơ tuân thủ của thành phố.',
    },
    {
      time: '08:30',
      title: 'Thiết bị đã giao tới công trình',
      body: '21 tấm REC Alpha và bộ gom Enphase đã dỡ xuống khu tập kết ở lối xe vào.',
    },
    {
      time: 'Hôm qua',
      title: 'Xong danh sách kiểm tra chống thấm ngày 1',
      body: 'Các tấm chống thấm đã đạt kiểm tra keo bằng thiết bị điện tử.',
    },
  ],
  feedTotal: 18,
  documents: [
    { name: 'Hợp đồng lắp đặt điện mặt trời đã ký', meta: 'PDF, 2.4 MB, hai bên ký ngày 10/10' },
    { name: 'Giấy phép xây dựng thành phố SF-9912', meta: 'Đã duyệt, Sở Xây dựng Santa Clara' },
    { name: 'Sơ đồ điện một sợi (SLD)', meta: 'Bản vẽ có dấu kỹ sư PE, sơ đồ bản sửa 3' },
  ],
  photos: [
    {
      src: img('oakwood-before', 800, 600),
      caption: 'Đánh giá mái ban đầu',
      meta: 'Trước lắp đặt, 24/9/2024',
      body: 'Độ dốc mái hướng Nam đo được 24°. Lớp ngói không mục, khung không xuống cấp.',
    },
    {
      src: img('oakwood-day2', 800, 600),
      caption: 'Tập kết thiết bị và bát neo xà gồ',
      meta: 'Ngày 2, hôm nay 11:15',
      body: 'Khung IronRidge bắt bằng bu lông inox vào giữa xà gồ. Cáp trục micro-inverter đã đi sẵn.',
    },
    {
      src: img('oakwood-cad', 800, 600),
      caption: 'Mô phỏng bố trí 3D',
      meta: 'Dự kiến khi hoàn thành, bản CAD',
      body: 'Hình dung cuối cùng với 21 tấm đen xếp đối xứng. Sản lượng ước tính 11,240 kWh mỗi năm.',
    },
  ],
}

/* Warranty and maintenance */
export const warranty = {
  policyId: 'SS-PRT-88291-OAK',
  status: 'Đang hiệu lực',
  plan: 'Smart Solar Protect, bảo hành toàn diện 25 năm',
  summary: 'Cam kết sản lượng điện, chủ động bảo vệ mái và thay mới 100% thiết bị phát điện quan trọng.',
  expires: 'Tháng 10/2049',
  remaining: 'Còn 24 năm 11 tháng',
  site: 'Nhà Oakwood, dàn pin đơn tinh thể 8.4 kW',
  coverage: [
    { k: 'Tấm pin điện mặt trời', v: '25 năm' },
    { k: 'Micro-inverter và bộ gom', v: '25 năm' },
    { k: 'Tay nghề thi công và mái', v: '10 năm' },
  ],
  telemetry: {
    status: 'Hệ thống hoạt động bình thường',
    detail: 'Cập nhật tình trạng 4 phút trước. Cả 24 tấm đã đồng bộ.',
    efficiencyPct: 99.8,
  },
  activeRequests: [
    {
      id: 'WR-3091',
      title: 'Kiểm tra và chỉnh lưới chắn chim quanh tấm pin',
      status: 'Đã hẹn ngày 12/11',
      body: 'Kiểm tra định kỳ hằng năm quanh mép dàn pin và căn chỉnh lưới chắn động vật.',
      technician: 'Alex Roy',
      window: '09:00 đến 11:30',
    },
  ],
  history: [
    {
      title: 'Kiểm tra định kỳ hằng năm',
      result: 'Đạt',
      body: 'Kiểm tra hiện trường có chứng nhận. Điện áp DC các chuỗi cân bằng, công tắc ngắt nhanh hoạt động, chụp ảnh nhiệt không thấy vết nứt vi mô.',
      when: '18/10/2024',
      ref: 'Chứng nhận dịch vụ SS-8831',
    },
    {
      title: 'Cập nhật firmware inverter',
      result: 'Tự động qua mạng',
      body: 'Phần mềm micro-inverter đã cập nhật lên bản v4.19.2 để phản ứng công suất phản kháng tốt hơn khi điện áp lưới tăng đột ngột. Không gián đoạn.',
      when: '2/10/2024, 02:30 UTC',
      ref: 'Máy chủ: SolarCloud Edge 04',
    },
  ],
  systems: ['Nhà Oakwood, hệ thống 8.4 kW (24 tấm)', 'Nhà gỗ Pine Cabin, dàn phụ 4.2 kW'],
  serviceTypes: ['Kiểm tra chẩn đoán', 'Sửa chữa', 'Vệ sinh tấm pin', 'Yêu cầu khác'],
  contact: { phone: '(555) 234-8901', email: 'eleanor.vance@example.com' },
  emergencyPhone: '(800) 555-SOLAR',
}

export const warrantyRequest = {
  id: 'WR-3091',
  altId: '88402-A',
  status: 'Đã lên lịch',
  tier: 'Bảo hành hệ thống nhà ở 25 năm',
  title: 'Chỉnh lưới chắn chim và kiểm tra chống thấm xà gồ',
  site: 'Nhà Oakwood, mặt mái Đông Bắc, 18 tấm SunPower Maxeon 400W',
  window: { date: 'Thứ Ba, 12/11', time: '09:00 đến 11:30 (EST)', access: 'Đã xác nhận lối vào' },
  steps: [
    { label: 'Đã gửi yêu cầu', meta: '22/10, 16:18', state: 'done' },
    { label: 'Xem xét chẩn đoán', meta: '23/10, 10:05', state: 'done' },
    { label: 'Đã giao kỹ thuật viên', meta: '24/10, 14:30', state: 'done' },
    { label: 'Lịch tới nhà', meta: '12/11 lúc 09:00', state: 'active' },
    { label: 'Hoàn tất xử lý', meta: 'Chờ ký xác nhận tại nhà', state: 'upcoming' },
  ] satisfies Step[],
  description:
    'Thấy cành cây nhỏ tích tụ gần mép dàn pin phía Đông Bắc và nghe tiếng chim vỗ cánh. Nhờ kiểm tra lưới thép bảo vệ.',
  photos: [
    { src: img('wr-array-edge', 640, 480), caption: 'Mép dàn pin Đông Bắc', meta: 'photo_array_edge_1.jpg' },
    { src: img('wr-gutter', 640, 480), caption: 'Chỗ nối máng xối và lưới', meta: 'photo_gutter_seam_2.jpg' },
  ],
  plan: {
    brief:
      'Kỹ thuật viên sẽ mang bộ chỉnh lưới chắn động vật tiêu chuẩn. Không cần tắt hệ thống. Sẽ kiểm tra gioăng quanh các tấm chống thấm để chắc chắn lớp chắn còn kín.',
    impact: [
      { k: 'Ảnh hưởng hệ thống', v: 'Không gián đoạn, inverter vẫn chạy' },
      { k: 'An toàn & lối vào', v: 'Dùng thang ngoài, chỉ làm bên ngoài' },
      { k: 'Phạm vi bảo hành', v: 'Bảo hành 100%, không mất phí' },
    ],
  },
  technician: {
    name: 'Alex Roy',
    cert: 'Chuyên viên điện mặt trời có chứng chỉ NABCEP',
    exp: 'Hơn 8 năm làm dịch vụ trên mái',
    phone: '+1 (555) 670-3490',
    background: 'Đã xác minh',
    van: 'Xe 08 (Smart Solar, xe điện)',
  },
  verification: {
    protocol: 'SEC-PV-2024',
    before: {
      date: '22/10/2024',
      src: img('wr-baseline', 640, 480),
      body: 'Ảnh ban đầu khách chụp, cho thấy một khe hở nhỏ (dưới 2.5 cm) dọc mép khung.',
    },
    after:
      'Alex Roy sẽ tải ảnh xác nhận đã bịt kín và tạo chứng nhận chất lượng điện tử ngay tại nhà. Cả hai được lưu trong hồ sơ bảo hành của bạn.',
  },
  guarantee:
    'Mọi hạng mục trong yêu cầu này được gia hạn bảo hành tay nghề vô điều kiện 24 tháng cho phần chỉnh lưới và gioăng chống thời tiết.',
  supportPhone: '1-800-555-SOLAR (24/7)',
}

/* Assistant */
export const assistant = {
  profile: { system: 'Oakwood 8.8 kW', contract: 'SS-2024-884', status: 'Đã kết nối' },
  domains: ['Sản phẩm & thiết bị', 'Tiến độ lắp đặt', 'Bảo hành & chăm sóc', 'Thanh toán & giấy phép'],
  recent: [
    {
      when: 'Hôm qua',
      title: 'Bảo hành inverter và bảo hành tấm pin khác nhau thế nào',
      meta: '3 điểm chính, hợp đồng SS-PRT-88291',
    },
    {
      when: 'Hôm nay, 10:14',
      title: 'Tín dụng thuế và ưu đãi điện mặt trời liên bang',
      meta: 'Xem mẫu IRS 5695, ước tính $7,920',
    },
    {
      when: '3 ngày trước',
      title: 'Bù trừ điện năng với PG&E hoạt động thế nào?',
      meta: 'Tín chỉ phát lưới NEM 3.0 và tháng quyết toán',
    },
  ],
  suggestions: [
    'Trời mưa ảnh hưởng sản lượng hằng ngày thế nào?',
    'Giải thích tín dụng thuế năng lượng sạch liên bang 30%',
    'Tôi cần chuẩn bị gì cho đội lắp đặt ngày mai?',
    'Làm sao chuyển bảo hành 25 năm khi bán nhà?',
  ],
  thread: [
    {
      role: 'user' as const,
      time: 'Hôm qua, 16:28',
      text: 'Bảo hành 25 năm khác gì bảo hành 10 năm cho các điểm khoan mái?',
    },
    {
      role: 'assistant' as const,
      time: 'Hôm qua, 16:29',
      title: 'Gói bảo hành nhiều tầng của Smart Solar',
      text: 'Chào chị Eleanor. Hệ thống ở nhà Oakwood có hai tầng bảo hành bổ trợ nhau:',
      tiers: [
        {
          years: '25 năm',
          name: 'Tấm pin đơn tinh thể',
          body: 'Sản lượng tối thiểu 85% theo đường thẳng tới năm thứ 25. Bao gồm sửa lỗi vật lý và linh kiện chính hãng.',
        },
        {
          years: '25 năm',
          name: 'Micro-inverter Enphase',
          body: 'Thay mới toàn bộ thiết bị và cử kỹ thuật viên có chứng chỉ nếu inverter hỏng. Không mất phí.',
        },
        {
          years: '10 năm',
          name: 'Điểm khoan mái & chống thấm',
          body: 'Cam kết kín nước tại mọi bu lông và tấm chống thấm, không rò nước hay xô lệch ngói.',
        },
      ],
      attachment: { name: 'Oakwood-Warranty-Summary.pdf', meta: 'Hợp đồng SS-PRT-88291, 1.4 MB' },
      footer:
        'Cả hai bảo hành được chuyển miễn phí cho chủ mới nếu chị bán nhà Oakwood. Chị có muốn xem thủ tục chuyển nhượng không?',
    },
  ],
  cannedReply:
    'Theo dữ liệu micro-inverter ở nhà Oakwood: kể cả khi trời nhiều mây hay mưa, dàn pin vẫn nhận bức xạ tán xạ và phát từ 18% đến 32% công suất đỉnh. Ngày âm u, lượng điện dư trung bình khoảng 1.8 kWh.',
  disclaimer:
    'Trợ lý trả lời dựa trên hồ sơ thiết kế nhà Oakwood của bạn. Nếu có sự cố điện khẩn cấp, gọi đường dây nóng 24/7 (800) 555-SOLAR.',
}
