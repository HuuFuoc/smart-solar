/*
 * Dữ liệu giả cho màn 13 – maintenance_task (/tech/maintenance/:id).
 * Dựng theo maintenance_task/screen.png: work order bảo trì định kỳ Tier-1 của
 * một hệ thương mại 45 kW, kèm số liệu lịch sử, telemetry và ký xác nhận.
 */

import type { EvidencePhotoItem } from '@/components/common/tech/EvidenceGallery'
import type { ExecutionStepItem } from '@/components/common/tech/ExecutionStepList'
import type { InfoTileData } from '@/components/common/tech/InfoTile'
import type { JobHeaderAction } from '@/components/common/tech/JobHeaderCard'
import type { StatTileProps } from '@/components/common/tech/StatTile'
import type { YieldSeriesPoint } from '@/features/warranty/YieldImpactChart'
import type { StatusVariant } from '@/components/common/stitch-ui/StatusBadge'

/** Một bước của "Standardized Protocol Checklist"; bước đang đo có bảng số liệu riêng. */
export type MaintenanceStep = ExecutionStepItem & {
  defaultChecked: boolean
  /** Chỉ bước đang đo: các cặp nhãn / giá trị và nút xác nhận */
  readings?: {
    items: { label: string; value: string; tone?: 'primary' | 'default' }[]
    confirmLabel: string
    confirmedLabel: string
  }
}

export type MaintenanceTask = {
  id: string
  kindLabel: string
  code: string
  status: { label: string; variant: StatusVariant }
  title: string
  summary: string
  headerActions: JobHeaderAction[]
  meta: InfoTileData[]
  history: {
    title: string
    icon: string
    badge: string
    stats: StatTileProps[]
    note: { title: string; quote: string }
  }
  protocol: {
    title: string
    icon: string
    description: string
    verifiedSuffix: string
    steps: MaintenanceStep[]
  }
  telemetry: {
    title: string
    icon: string
    liveLabel: string
    sensors: { label: string; value: string; unit: string; caption: string; tone?: 'default' | 'secondary' }[]
    yield: {
      title: string
      badge: string
      description: string
      baseline: YieldSeriesPoint[]
      postWash: YieldSeriesPoint[]
      marker: YieldSeriesPoint
      startLabel: string
      endLabel: string
      baselineLabel: string
      postWashLabel: string
    }
  }
  photoLog: {
    title: string
    icon: string
    description: string
    addLabel: string
    photos: EvidencePhotoItem[]
  }
  signOff: {
    title: string
    icon: string
    ratingLabel: string
    ratingBadge: string
    summary: string
    cards: { label: string; value: string; caption: string; tone?: 'default' | 'primary' }[]
  }
  toasts: {
    draftSaving: string
    draftSaved: string
    completed: string
    readingsConfirmed: string
  }
}

export const maintenanceTasks: MaintenanceTask[] = [
  {
    id: 'MNT-5521',
    kindLabel: 'Phiếu việc',
    code: '#MNT-5521',
    status: { label: 'Đang làm, xong 4/6 bước', variant: 'in-progress' },
    title: 'Bảo trì định kỳ hằng năm',
    summary: 'Bảo dưỡng năm thứ 2 và kiểm tra lại dàn pin',
    headerActions: [
      { label: 'Lưu nháp', icon: 'save', tone: 'plain' },
      { label: 'Hoàn tất và xuất biên bản', icon: 'verified', tone: 'solid' },
    ],
    meta: [
      {
        icon: 'apartment',
        label: 'Khách hàng',
        value: 'Trung tâm Oakridge',
        hint: 'Frank Rossi (quản lý toà nhà)',
        layout: 'stacked',
      },
      {
        icon: 'pin_drop',
        label: 'Địa điểm',
        value: '1100 Blossom Hill Rd',
        hint: 'San Jose, CA 95123',
        layout: 'stacked',
      },
      {
        icon: 'solar_power',
        label: 'Cấu hình hệ thống',
        value: 'Dàn thương mại 45 kW',
        hint: '2 inverter SolarEdge SE20K',
        layout: 'stacked',
      },
      {
        icon: 'history',
        label: 'Mốc bảo trì',
        value: 'Lần trước: 10/2023 (A. Rivers)',
        hint: 'Ngưỡng yêu cầu: ≥ 96%',
        layout: 'stacked',
      },
    ],
    history: {
      title: 'Lịch sử chẩn đoán',
      icon: 'analytics',
      badge: 'Gói bảo trì hạng 1',
      stats: [
        { label: 'Lần bảo trì trước', value: '14/10/2023', caption: 'KTV Alex Rivers #3319' },
        { label: 'Mục tiêu sản lượng', value: '≥ 96,0%', caption: 'Cam kết trong hợp đồng', valueTone: 'primary' },
        {
          label: 'Ghi nhận lần trước',
          value: 'Giảm 4% do bụi',
          caption: 'Dàn hướng đông bám bụi',
          valueTone: 'secondary',
        },
      ],
      note: {
        title: 'Ghi chú của Alex Rivers (10/2023):',
        quote:
          '"Dàn hướng đông bám bụi nhẹ, hiệu suất giảm 4%. Lực siết aptomat đo được 22 Nm. Nên xịt rửa nhẹ trước mùa nắng gắt."',
      },
    },
    protocol: {
      title: 'Quy trình kiểm tra chuẩn',
      icon: 'checklist',
      description: 'Theo quy chuẩn điện NEC 2023 và quy định phòng cháy',
      verifiedSuffix: 'đã kiểm',
      steps: [
        {
          id: 'mnt-5521-step-1',
          title: 'Kiểm tra bề mặt tấm pin',
          description: 'Không có vết ố, bong lớp, điểm nóng đổi màu hay nứt kính.',
          state: 'done',
          statusText: 'Đạt',
          activeMetric: 'Đạt',
          defaultChecked: true,
        },
        {
          id: 'mnt-5521-step-2',
          title: 'Kiểm tra lực siết khung giá đỡ',
          description: 'Siết lại 12 bu lông ngẫu nhiên ở dàn nam và tây đúng 20 Nm, không có bu lông lỏng.',
          state: 'done',
          statusText: '20 Nm',
          activeMetric: '20 Nm',
          defaultChecked: true,
        },
        {
          id: 'mnt-5521-step-3',
          title: 'Vệ sinh tản nhiệt và khe thoát khí inverter',
          description: 'Thổi khí nén cho cả hai bộ SolarEdge SE20K, khe thoát khí sạch.',
          state: 'done',
          statusText: 'Đã vệ sinh',
          activeMetric: 'Đã vệ sinh',
          defaultChecked: true,
        },
        {
          id: 'mnt-5521-step-4',
          title: 'Đo điện áp hở mạch và dòng ngắn mạch từng chuỗi',
          description: 'Đo bằng đồng hồ vạn năng. Chuỗi 1-6 bình thường (384V ± 2V), đang đo chuỗi 7 và 8.',
          state: 'active',
          statusText: 'Đang đo',
          defaultChecked: false,
          readings: {
            items: [
              { label: 'Voc chuỗi 7:', value: '383,4 V', tone: 'primary' },
              { label: 'Voc chuỗi 8:', value: '384,1 V', tone: 'primary' },
              { label: 'Chênh lệch:', value: 'dưới 0,3%' },
            ],
            confirmLabel: 'Xác nhận số đo',
            confirmedLabel: 'Đã ghi số đo',
          },
        },
        {
          id: 'mnt-5521-step-5',
          title: 'Kiểm tra cầu dao AC và chống sét lan truyền',
          description: 'Xem đèn báo của bộ chống sét (phải xanh) và thử cầu dao ngắt khẩn cấp.',
          state: 'pending',
          statusText: 'Chưa làm',
          defaultChecked: false,
        },
        {
          id: 'mnt-5521-step-6',
          title: 'Đánh giá mức bẩn bề mặt tấm pin',
          description: 'Chỉ có lớp phấn hoa mỏng, xịt nước sạch là đủ, không cần chà mạnh.',
          state: 'pending',
          statusText: 'Chưa làm',
          defaultChecked: false,
        },
      ],
    },
    telemetry: {
      title: 'Môi trường và số liệu đo',
      icon: 'wb_sunny',
      liveLabel: 'Cảm biến trực tiếp',
      sensors: [
        { label: 'Nhiệt độ môi trường', value: '23', unit: '°C', caption: 'Nhiệt độ tấm pin: 33°C (bình thường)' },
        {
          label: 'Bức xạ mặt trời',
          value: '890',
          unit: 'W/m²',
          caption: 'Trời quang giữa trưa',
          tone: 'secondary',
        },
      ],
      yield: {
        title: 'Sản lượng thay đổi sau vệ sinh',
        badge: 'Tăng 6,2%',
        description: 'Trước khi vệ sinh 37,1 kW, dự kiến sau khi vệ sinh 39,4 kW',
        baseline: [
          { x: 0, y: 110 },
          { x: 40, y: 95 },
          { x: 90, y: 75 },
          { x: 150, y: 60 },
          { x: 220, y: 55 },
          { x: 290, y: 62 },
          { x: 350, y: 78 },
          { x: 400, y: 100 },
        ],
        postWash: [
          { x: 0, y: 110 },
          { x: 40, y: 88 },
          { x: 90, y: 65 },
          { x: 150, y: 45 },
          { x: 220, y: 38 },
          { x: 290, y: 44 },
          { x: 350, y: 60 },
          { x: 400, y: 85 },
        ],
        marker: { x: 220, y: 38 },
        startLabel: '08:00',
        endLabel: '16:00',
        baselineLabel: 'Trước vệ sinh',
        postWashLabel: 'Sau vệ sinh',
      },
    },
    photoLog: {
      title: 'Ảnh hiện trường',
      icon: 'photo_camera',
      description: 'Đã nộp đủ 3 ảnh bắt buộc',
      addLabel: 'Thêm ảnh',
      photos: [
        {
          src: '/placeholders/photo-breaker.svg',
          alt: 'Màn hình inverter hiển thị điện áp bình thường',
          title: 'Màn hình inverter',
          meta: '11:22, đã kiểm',
        },
        {
          src: '/placeholders/photo-panel.svg',
          alt: 'Tấm pin vừa vệ sinh còn đọng nước dưới nắng trưa',
          title: 'Tấm pin sau vệ sinh',
          meta: '11:38, đã kiểm',
        },
        {
          src: '/placeholders/photo-microinverter.svg',
          alt: 'Hộp cầu dao AC có gắn thẻ khoá khi bảo trì',
          title: 'Thẻ khoá cầu dao',
          meta: '11:45, đã kiểm',
        },
      ],
    },
    signOff: {
      title: 'Kết luận và ký xác nhận',
      icon: 'assignment_turned_in',
      ratingLabel: 'Đánh giá chung',
      ratingBadge: 'Tình trạng tốt',
      summary: 'Đã làm sạch lớp phấn hoa bám trên tấm pin. Thông số các chuỗi đều trong ngưỡng nhà sản xuất.',
      cards: [
        { label: 'Lần bảo trì kế tiếp', value: 'Tháng 10/2025', caption: 'Chu kỳ 12 tháng' },
        { label: 'Kỹ thuật viên ký', value: 'Marcus Vance', caption: 'Mã #4402, có chứng chỉ', tone: 'primary' },
      ],
    },
    toasts: {
      draftSaving: 'Đang lưu nháp…',
      draftSaved: 'Đã lưu nháp trên máy.',
      completed: 'Đã hoàn tất bảo trì và xuất biên bản cho #MNT-5521.',
      readingsConfirmed: 'Đã ghi số đo chuỗi 7 và 8 vào phiếu việc.',
    },
  },
]

/** Tra work order bảo trì theo id trên URL; chấp nhận cả dạng có và không có "#". */
export function getMaintenanceTask(id: string | undefined): MaintenanceTask | undefined {
  if (!id) return undefined
  const normalized = id.replace(/^#/, '').toUpperCase()
  return maintenanceTasks.find((task) => task.id.toUpperCase() === normalized)
}

/** Nhãn phần trăm bên phải tiêu đề checklist. */
export const protocolVerifiedLabel = (done: number, total: number) =>
  `${total === 0 ? 0 : Math.round((done / total) * 100)}%`
