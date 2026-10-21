// Dữ liệu giả cho /tech/installations/:id và .../checklist, số liệu phải khớp nhau giữa hai màn

import type { ChecklistPhaseTone, ChecklistTaskItem } from '@/features/installations/ChecklistPhaseCard'
import type { EvidenceDropzoneItem, EvidencePhotoItem } from '@/components/common/tech/EvidenceGallery'
import type { ExecutionStepItem } from '@/components/common/tech/ExecutionStepList'
import type { InfoTileData } from '@/components/common/tech/InfoTile'
import type { JobHeaderAction, JobProgress } from '@/components/common/tech/JobHeaderCard'
import type { MeasurementReading } from '@/components/common/tech/MeasurementCard'
import type { PanelCell, PanelState } from '@/features/installations/PanelArrayGrid'
import type { StatusVariant } from '@/components/common/stitch-ui/StatusBadge'

export type SpecCard = {
  icon: string
  /** secondary = khối OSHA màu cam trong thiết kế */
  tone: 'primary' | 'secondary'
  title: string
  description: string
  /** Chip nổi bật giữa khối */
  chip: string
  chipTone: 'neutral' | 'warning'
  footnote: string
}

/** Một bước của "Execution Sequence"; bước active có thêm bộ đếm panel đã lắp. */
export type InstallationStep = ExecutionStepItem & {
  counter?: { label: string; unitLabel: string; total: number; initial: number }
  defaultChecked: boolean
}

export type EvidencePhase = {
  title: string
  photos: EvidencePhotoItem[]
}

export type SerialField = {
  id: string
  label: string
  value: string
  /** Dòng xác nhận màu primary dưới ô nhập */
  confirmation: string
}

export type InstallationTask = {
  id: string
  /** Nhãn pill trước mã job */
  kindLabel: string
  code: string
  stage: { label: string; variant: StatusVariant }
  summary: string
  headerActions: JobHeaderAction[]
  meta: InfoTileData[]
  progress: JobProgress
  specs: {
    title: string
    icon: string
    toggleLabels: { collapse: string; expand: string }
    cards: SpecCard[]
    request: { text: string; verdict: string }
  }
  execution: {
    title: string
    icon: string
    steps: InstallationStep[]
  }
  fieldLog: {
    title: string
    icon: string
    serials: SerialField[]
    notesLabel: string
    notesPlaceholder: string
    notes: string
  }
  arrayGrid: {
    title: string
    icon: string
    planLabel: string
    cells: PanelCell[]
    legend: { label: string; state: PanelState }[]
  }
  evidence: {
    title: string
    icon: string
    uploadedLabel: string
    phases: EvidencePhase[]
    dropzoneTitle: string
    dropzones: EvidenceDropzoneItem[]
  }
  contact: {
    initials: string
    name: string
    note: string
    phoneHref: string
  }
  footer: {
    activeTime: string
    estimate: string
    syncLabel: string
    syncingLabel: string
    syncedLabel: string
    completeLabel: string
  }
}

/** 24 panel: 18 đã lắp, 1 đang kéo lên, 5 đang chờ, khớp bộ đếm "18 / 24 Mounted". */
const southArrayCells: PanelCell[] = Array.from({ length: 24 }, (_, i) => {
  const index = i + 1
  if (index <= 18) return { index, state: 'mounted' }
  if (index === 19) return { index, state: 'active' }
  return { index, state: 'queued' }
})

export const installationTasks: InstallationTask[] = [
  {
    id: 'INS-7704',
    kindLabel: 'Phiếu công việc',
    code: '#INS-7704',
    stage: { label: 'Giai đoạn 3: Lắp cơ khí & đi dây điện', variant: 'in-progress' },
    summary: 'Dàn pin áp mái (9.6 kW) & hệ lưu trữ Tesla Powerwall 3',
    headerActions: [
      { label: 'Bộ hồ sơ giấy phép #SARA-24-09', icon: 'verified', tone: 'primary' },
      { label: 'Bộ đàm đội thi công (kênh 4)', icon: 'group', tone: 'plain' },
    ],
    meta: [
      {
        icon: 'person_pin_circle',
        label: 'Khách hàng',
        value: 'David Chen',
        hint: '1240 Oak Knolls Way, Saratoga',
      },
      {
        icon: 'request_quote',
        label: 'Báo giá đã duyệt',
        value: '#QT-2024-918',
        hint: 'Giá trị hợp đồng $28,450',
      },
      {
        icon: 'schedule',
        label: 'Khung giờ làm việc',
        value: 'Hôm nay 08:30 – 16:30',
        hint: 'Đã ở công trình 4 giờ 15 phút',
        hintTone: 'primary',
      },
      {
        icon: 'badge',
        label: 'Trưởng nhóm & nhân sự',
        value: 'Marcus Vance (bạn)',
        hint: '+ J. Alvarez, T. Nuyen',
      },
    ],
    progress: {
      title: 'Tiến độ lắp đặt tổng thể',
      note: 'Giai đoạn 3/4 (lắp khung và tấm pin)',
      percent: 65,
      milestones: [
        { label: '1. An toàn & tiếp cận', done: true },
        { label: '2. Khoan mái & chống thấm', done: true },
        { label: '3. Khung & tấm pin (đang làm)', done: true },
        { label: '4. Vận hành thử & nghiệm thu', done: false },
      ],
    },
    specs: {
      title: 'Bản vẽ kỹ thuật & yêu cầu an toàn',
      icon: 'architecture',
      toggleLabels: { collapse: 'Thu gọn thông số', expand: 'Xem thông số' },
      cards: [
        {
          icon: 'grid_view',
          tone: 'primary',
          title: 'Khung & tấm pin',
          description: 'IronRidge XR100, lắp sát mái.',
          chip: '24 tấm REC Alpha 400W',
          chipTone: 'neutral',
          footnote: 'Móc ngói cách nhau tối đa 48" tâm – tâm',
        },
        {
          icon: 'bolt',
          tone: 'primary',
          title: 'Tuyến điện chính',
          description: 'Ống EMT 3/4" dọc diềm mái phía Bắc về tủ điện chính.',
          chip: 'CB riêng 40A',
          chipTone: 'neutral',
          footnote: 'Khe 18/20 dán nhãn "Solar PV"',
        },
        {
          icon: 'health_and_safety',
          tone: 'secondary',
          title: 'Bắt buộc theo OSHA',
          description: 'Bắt buộc móc dây an toàn 100%: mái ngói đất nung dốc 28°.',
          chip: 'Đã gắn 2 neo nóc mái',
          chipTone: 'warning',
          footnote: 'Chỉ bước lên 1/3 dưới của viên ngói.',
        },
      ],
      request: {
        text: 'Yêu cầu riêng của khách: đi ống luồn dây trong hốc tường gara nếu được.',
        verdict: 'Đã xác minh, làm được ✓',
      },
    },
    execution: {
      title: 'Trình tự thi công & xác nhận',
      icon: 'fact_check',
      steps: [
        {
          id: 'ins-7704-step-1',
          order: 1,
          title: 'Có mặt tại công trình, phổ biến an toàn & neo chống rơi',
          description: 'JSA đã ký bởi Marcus Vance, J. Alvarez, T. Nuyen. Lực siết neo xác nhận 45 ft-lbs.',
          state: 'done',
          statusText: '08:45',
          defaultChecked: true,
        },
        {
          id: 'ins-7704-step-2',
          order: 2,
          title: 'Bật mực định vị trên mái & bịt chống thấm các lỗ khoan bát',
          description: 'Tấm chống thấm QuickMount PV đã đặt với keo ChemLink M-1. Không có ngói vỡ.',
          state: 'done',
          statusText: '11:15',
          defaultChecked: true,
        },
        {
          id: 'ins-7704-step-3',
          order: 3,
          title: 'Lắp thanh ray, đi cáp micro-inverter & đặt tấm pin',
          description:
            'Micro-inverter Enphase IQ8+ đã cắm vào bó cáp Q-Cable. Đang kéo 6 tấm pin cuối lên dàn phía Nam.',
          state: 'active',
          statusText: 'Đang làm',
          activeMetric: 'Đã lắp 18/24',
          counter: { label: 'Tấm pin đã lắp:', unitLabel: 'trên tổng 24 tấm', total: 24, initial: 18 },
          defaultChecked: false,
        },
        {
          id: 'ins-7704-step-4',
          order: 4,
          title: 'Kéo dây DC/AC trong ống về inverter & cầu dao cách ly',
          description: 'Kéo dây THHN 10AWG qua ống ngoài trời phía Bắc tới Tesla Backup Gateway 2.',
          state: 'pending',
          statusText: 'Làm tiếp theo',
          defaultChecked: false,
        },
        {
          id: 'ins-7704-step-5',
          order: 5,
          title: 'Thử ngắt nhanh & thử chạm đất',
          description: 'Kiểm tra bộ kích RSD hạ điện áp dàn pin < 30V trong 30 giây theo NEC 690.12.',
          state: 'pending',
          statusText: 'Chờ làm',
          defaultChecked: false,
        },
        {
          id: 'ins-7704-step-6',
          order: 6,
          title: 'Hướng dẫn khách vận hành hệ thống & ghép nối ứng dụng gateway',
          description:
            'Hướng dẫn ngắt công tắc chính, bàn giao hồ sơ bảo hành, đăng ký ứng dụng Tesla Powerwall trên thiết bị của chủ nhà.',
          state: 'pending',
          statusText: 'Chờ làm',
          defaultChecked: false,
        },
      ],
    },
    fieldLog: {
      title: 'Ghi chú hiện trường & số serial thiết bị',
      icon: 'edit_note',
      serials: [
        {
          id: 'battery-sn',
          label: 'Số serial Tesla Powerwall 3',
          value: 'TG3-2024-PW3-094188',
          confirmation: '✓ Đã đối chiếu với Tesla Hub Registry',
        },
        {
          id: 'gateway-sn',
          label: 'Số serial Backup Gateway 2',
          value: 'GW2-9844-019B',
          confirmation: '✓ Liên kết trước vận hành thử hợp lệ',
        },
      ],
      notesLabel: 'Nhật ký hiện trường / ghi chú kết cấu',
      notesPlaceholder:
        'Ghi chú về thời tiết, thay đổi nhỏ so với bản vẽ, tuyến dây trên trần hoặc câu hỏi của khách...',
      notes:
        'Ngói còn chắc. Mái hướng Nam không bị che bóng tới 17:15. Đã bơm thêm keo ở các lỗ khoan sát mép mái vì sắp có sương mù ven biển.',
    },
    arrayGrid: {
      title: 'Sơ đồ dàn pin mái Nam',
      icon: 'solar_power',
      planLabel: 'Bố trí 24 tấm',
      cells: southArrayCells,
      legend: [
        { label: 'Đã lắp (18)', state: 'mounted' },
        { label: 'Đang kéo lên (1)', state: 'active' },
        { label: 'Chờ lắp (5)', state: 'queued' },
      ],
    },
    evidence: {
      title: 'Ảnh hiện trường',
      icon: 'photo_camera',
      uploadedLabel: 'Đã tải lên 5/7',
      phases: [
        {
          title: 'Giai đoạn 1: Hiện trạng trước lắp đặt',
          photos: [
            {
              src: '/placeholders/photo-roof.svg',
              alt: 'Mái ngói âm dương trước khi lắp tấm pin',
              title: 'Hiện trạng mái',
              meta: '08:35, đã xác nhận nguyên vẹn',
            },
            {
              src: '/placeholders/photo-breaker.svg',
              alt: 'Tủ CB 200A của nhà đang mở',
              title: 'Tủ CB đang mở',
              meta: '08:42, khe 18/20 còn trống',
            },
          ],
        },
        {
          title: 'Giai đoạn 2: Đang thi công',
          photos: [
            {
              src: '/placeholders/photo-flashing.svg',
              alt: 'Thanh ray kẹp cùng tấm chống thấm dưới viên ngói',
              title: 'Chống thấm & bịt bu lông',
              meta: '11:20, 45 ft-lbs',
            },
            {
              src: '/placeholders/photo-microinverter.svg',
              alt: 'Micro-inverter lắp dưới thanh ray tấm pin, có cọc tiếp địa',
              title: 'Micro-inverter trên thanh ray',
              meta: '12:15, đã tiếp địa',
            },
          ],
        },
      ],
      dropzoneTitle: 'Giai đoạn 3: Ảnh hoàn thành (bắt buộc để nghiệm thu)',
      dropzones: [
        { icon: 'add_a_photo', title: 'Góc chụp dàn pin từ đường', hint: 'Chạm để chụp / tải lên' },
        { icon: 'add_a_photo', title: 'Tường / đoạn uốn ống tới inverter', hint: 'Chạm để chụp / tải lên' },
      ],
    },
    contact: {
      initials: 'DC',
      name: 'David Chen (chủ nhà)',
      note: 'Đang có mặt (phòng khách)',
      phoneHref: 'tel:4085550192',
    },
    footer: {
      activeTime: 'Thời gian làm: 04 giờ 15 phút',
      estimate: 'Dự kiến xong: 15:45 hôm nay',
      syncLabel: 'Đồng bộ tiến độ',
      syncingLabel: 'Đang đồng bộ...',
      syncedLabel: 'Đã đồng bộ',
      completeLabel: 'Hoàn thành & yêu cầu nghiệm thu',
    },
  },
]

/** Tra job order theo id trên URL; chấp nhận cả dạng có và không có tiền tố "#". */
export function getInstallationTask(id: string | undefined): InstallationTask | undefined {
  if (!id) return undefined
  const normalized = id.replace(/^#/, '').toUpperCase()
  return installationTasks.find((task) => task.id.toUpperCase() === normalized)
}

/** Nhãn đếm bước dưới tiêu đề "Execution Sequence & Sign-off". */
export const executionCounterLabel = (done: number, total: number) => `Đã xong ${done}/${total} bước`

// Dữ liệu màn checklist (/tech/installations/:id/checklist), cùng job INS-7704 với màn lắp đặt

export type ChecklistPhase = {
  id: string
  icon: string
  tone: ChecklistPhaseTone
  title: string
  description?: string
  /** Icon trong badge tiến độ của phase */
  badgeIcon: string
  /** Hậu tố badge: "Verified" hoặc "Complete" */
  badgeSuffix: string
  tasks: ChecklistTaskItem[]
}

export type InstallationChecklist = {
  /** Banner trạng thái kết nối trên cùng */
  session: { label: string; mode: string; database: string; signal: string }
  header: {
    projectCode: string
    customerLabel: string
    status: { label: string; variant: StatusVariant }
    timer: string
    title: string
    address: string
    phone: { label: string; href: string }
    window: string
    actions: JobHeaderAction[]
    stats: { label: string; value: string; unit: string; tone?: 'default' | 'primary' | 'secondary' }[]
  }
  phases: ChecklistPhase[]
  photos: {
    id: string
    icon: string
    tone: ChecklistPhaseTone
    title: string
    description?: string
    badgeLabel: string
    items: EvidencePhotoItem[]
    dropzones: EvidenceDropzoneItem[]
  }
  measurements: {
    title: string
    icon: string
    badge: string
    readings: MeasurementReading[]
    topology: { title: string; note: string; combinerLabel: string }
  }
  notes: {
    title: string
    icon: string
    autosaveLabel: string
    placeholder: string
    techLead: string
    appendLabel: string
  }
  hotline: { eyebrow: string; icon: string; name: string; note: string; phoneHref: string }
  dock: {
    title: string
    stageLabel: string
    counterLabel: (done: number, total: number) => string
    saveLabel: string
    savedMessage: string
    signLabel: string
  }
  signature: {
    title: string
    subtitle: string
    rows: { label: string; value: string; highlight?: boolean }[]
    consent: string
    canvasLabel: string
    hint: string
    clearLabel: string
    cancelLabel: string
    submitLabel: string
    successMessage: string
  }
}

export const installationChecklists: Record<string, InstallationChecklist> = {
  'INS-7704': {
    session: {
      label: 'Phiên làm việc hiện trường',
      mode: 'Chế độ ứng dụng hiện trường: tự đồng bộ khi có mạng (đã đồng bộ 8 thao tác ngoại tuyến)',
      database: 'Đã kết nối cơ sở dữ liệu',
      signal: 'Sóng: 4G LTE (-82 dBm)',
    },
    header: {
      projectCode: '#INS-7704',
      customerLabel: 'Nhà David Chen',
      status: { label: 'Đang thực hiện', variant: 'active' },
      timer: 'Đã ở công trình 04 giờ 15 phút',
      title: 'Giai đoạn 3: Lắp khung, dàn pin & vận hành thử inverter',
      address: '1240 Oak Knolls Way, Saratoga',
      phone: { label: '(408) 555-0192', href: 'tel:4085550192' },
      window: 'Hôm nay: 08:30 – 16:30',
      actions: [
        { label: 'Tạm dừng', icon: 'pause_circle', tone: 'plain' },
        { label: 'Cập nhật tiến độ', icon: 'sync', tone: 'primary' },
      ],
      stats: [
        { label: 'Tổng số tấm pin', value: '24', unit: 'tấm REC 400W' },
        { label: 'Công suất DC', value: '9.6', unit: 'kW DC', tone: 'primary' },
        { label: 'Micro-inverter', value: '24', unit: 'Enphase IQ8+' },
        { label: 'Thời tiết', value: '82°F', unit: 'Trời quang, gió Nam 6 mph', tone: 'secondary' },
      ],
    },
    phases: [
      {
        id: 'phase-1',
        icon: 'health_and_safety',
        tone: 'safety',
        title: '1. An toàn & kiểm tra công trình trước lắp đặt',
        badgeIcon: 'verified',
        badgeSuffix: 'đã xác minh',
        tasks: [
          {
            id: 'ins-7704-chk-1-1',
            title: 'Đồ bảo hộ cá nhân (dây đai & điểm neo đã cố định)',
            description: 'Tem kiểm định dây đai toàn thân: còn hạn. Hai kẹp neo nóc mái đã siết lực.',
            doneText: 'Đã xác minh 08:45',
            pendingText: 'Chờ làm',
            defaultChecked: true,
          },
          {
            id: 'ins-7704-chk-1-2',
            title: 'Đã khoá & treo thẻ tủ điện chính (LOTO)',
            description: 'Đã cắt điện CB tổng 200A. Đã gắn khoá #TX-489 kèm thẻ, xác nhận không còn điện.',
            doneText: 'Đã xác minh 08:52',
            pendingText: 'Chờ làm',
            defaultChecked: true,
          },
          {
            id: 'ins-7704-chk-1-3',
            title: 'Vật tư đã tập kết & kiểm đếm',
            description: '24 tấm REC Alpha 400W, thanh ray IronRidge XR100, Enphase IQ Combiner 4C.',
            doneText: 'Đã xác minh 09:05',
            pendingText: 'Chờ làm',
            defaultChecked: true,
          },
        ],
      },
      {
        id: 'phase-2',
        icon: 'solar_power',
        tone: 'execution',
        title: '2. Danh sách kiểm tra lắp đặt & đấu điện',
        badgeIcon: 'pending_actions',
        badgeSuffix: 'đã xong',
        tasks: [
          {
            id: 'ins-7704-chk-2-1',
            title: 'Tấm chống thấm & chân L đã bắt bu lông vào xà gồ',
            description: '32 lỗ khoan đã bơm keo ChemLink M-1. Tâm xà gồ đã khoan mồi bằng mũi 7/32 in.',
            doneText: 'Đã kiểm lực siết 45 ft-lbs',
            pendingText: 'Chờ làm',
            defaultChecked: true,
          },
          {
            id: 'ins-7704-chk-2-2',
            title: 'Đã lắp micro-inverter & đi cáp trục Q-Cable',
            description: '24 micro-inverter đã bắt vào rãnh trên của thanh ray. Đầu cáp đã bịt bằng nắp Enphase.',
            doneText: 'Đã xong',
            pendingText: 'Chờ làm',
            defaultChecked: true,
          },
          {
            id: 'ins-7704-chk-2-3',
            title: 'Đấu nối DC tấm pin & đi dây gọn (xong 18/24)',
            description: 'Đầu nối MC4 đã cắm chặt. Kẹp inox mỗi 12 inch, dây không chạm mặt mái.',
            doneText: 'Đã xong',
            pendingText: 'Chờ làm',
            active: true,
            activeLabel: 'Đang làm',
            progress: { value: 75, leftText: 'Còn 6 tấm trên dàn mái Nam', rightText: '75% bước này' },
            defaultChecked: false,
          },
          {
            id: 'ins-7704-chk-2-4',
            title: 'Đã lắp & tiếp địa cầu dao cách ly AC',
            description:
              'Cầu dao cách ly AC 60A có cầu chì, đặt ngoài trời cạnh công tơ điện lực, lưỡi cắt nhìn thấy được.',
            doneText: 'Đã xong',
            pendingText: 'Chờ làm',
            defaultChecked: false,
          },
          {
            id: 'ins-7704-chk-2-5',
            title: 'Ghép nối gateway inverter & đăng ký Enlighten',
            description:
              'Tải sơ đồ quét vận hành thử, kiểm tra 24 kết nối PLC, rồi ghép Tesla Backup Gateway 2 với ứng dụng của chủ nhà.',
            doneText: 'Đã xong',
            pendingText: 'Chờ làm',
            defaultChecked: false,
          },
        ],
      },
    ],
    photos: {
      id: 'phase-3',
      icon: 'photo_camera',
      tone: 'audit',
      title: '3. Ảnh xác minh công trình & lịch sử kiểm tra',
      badgeLabel: 'Đã tải 3, còn thiếu 1',
      items: [
        {
          src: '/placeholders/photo-roof.svg',
          alt: 'Mái dốc có vạch mực định vị trước khi lắp thanh ray',
          title: 'Trước lắp đặt',
          meta: '08:35, mái hướng Nam',
          verified: true,
        },
        {
          src: '/placeholders/photo-flashing.svg',
          alt: 'Thanh ray bắt bu lông cùng tấm chống thấm vào mặt mái',
          title: 'Kiểm tra ray & chống thấm',
          meta: '11:20, 32 lỗ khoan',
          verified: true,
        },
        {
          src: '/placeholders/photo-microinverter.svg',
          alt: 'Tấm pin đang được lắp lên thanh ray, có micro-inverter bên dưới',
          title: 'Đang lắp tấm pin',
          meta: '12:15, đang làm hàng 2',
          verified: true,
        },
      ],
      dropzones: [{ icon: 'add_a_photo', title: '+ Chụp ảnh', hint: 'Bắt buộc: đi dây inverter' }],
    },
    measurements: {
      title: 'Số đo',
      icon: 'speed',
      badge: 'Đã thử theo NEC 690',
      readings: [
        {
          label: 'Điện áp hở mạch chuỗi 1 (Voc)',
          target: 'Mục tiêu: 405-418 V',
          value: '412',
          unit: 'V DC',
          verdict: { label: 'Đạt', icon: 'check' },
          scale: 96,
        },
        {
          label: 'Điện áp hở mạch chuỗi 2 (Voc)',
          target: 'Mục tiêu: 405-418 V',
          value: '410',
          unit: 'V DC',
          verdict: { label: 'Đạt', icon: 'check' },
          scale: 94,
        },
        {
          label: 'Điện trở cách điện với đất',
          target: 'Yêu cầu: >50 MΩ',
          value: '> 100',
          unit: 'MΩ',
          valueSize: 'headline',
          verdict: { label: 'Megger đạt', icon: 'verified' },
        },
      ],
      topology: {
        title: 'Sơ đồ đấu nối dàn pin',
        note: '2 chuỗi × 12 tấm',
        combinerLabel: 'IQ Combiner 4C (đang kết nối)',
      },
    },
    notes: {
      title: 'Ghi chú hiện trường',
      icon: 'edit_note',
      autosaveLabel: 'Tự lưu lúc 14:18',
      placeholder: 'Ghi tình trạng kết cấu, độ sâu bu lông, trao đổi với khách...',
      techLead: 'Trưởng nhóm kỹ thuật: M. Vance #4402',
      appendLabel: 'Thêm ghi chú',
    },
    hotline: {
      eyebrow: 'Đường dây nóng an toàn & điều phối',
      icon: 'support_agent',
      name: 'Điều phối vận hành',
      note: 'Bàn 4, khu vực NorCal 4',
      phoneHref: 'tel:18005550199',
    },
    dock: {
      title: 'Tiến độ hoàn thành lắp đặt',
      stageLabel: 'Giai đoạn 3/4',
      counterLabel: (done, total) => `Đã xác nhận ${done}/${total} bước an toàn & lắp ráp`,
      saveLabel: 'Lưu tiến độ',
      savedMessage: 'Đã đồng bộ tiến độ lắp đặt.',
      signLabel: 'Hoàn thành lắp đặt & ký',
    },
    signature: {
      title: 'Bàn giao & chữ ký khách hàng',
      subtitle: 'Phiếu công việc #INS-7704, David Chen',
      rows: [
        { label: 'Tấm pin đã lắp:', value: '24 tấm REC Alpha 400W' },
        { label: 'Micro-inverter:', value: '24 bộ Enphase IQ8+' },
        { label: 'Trạng thái cách ly lưới:', value: 'Đã đóng lại, sẵn sàng xin phép vận hành (PTO)', highlight: true },
      ],
      consent:
        'Khi ký bên dưới, chủ nhà hoặc người được uỷ quyền xác nhận dàn pin áp mái đã được cố định chắc chắn, dây điện đã đi kín và sân đã được dọn sạch.',
      canvasLabel: 'Ký tại đây (bằng tay hoặc bút cảm ứng)',
      hint: 'Khách hàng ký phía trên',
      clearLabel: 'Xoá chữ ký',
      cancelLabel: 'Hủy',
      submitLabel: 'Ký & hoàn thành',
      successMessage: 'Đã ký bàn giao. Hồ sơ nghiệm thu đã gửi trưởng khu vực.',
    },
  },
}

/** Checklist theo phase của một job order; dùng chung id với getInstallationTask. */
export function getInstallationChecklist(id: string | undefined): InstallationChecklist | undefined {
  if (!id) return undefined
  return installationChecklists[id.replace(/^#/, '').toUpperCase()]
}
