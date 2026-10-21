// Dữ liệu giả cho màn bảo hành (/tech/warranty/:id)

import type { MeasurementReading } from '@/components/common/tech/MeasurementCard'
import type { StatusVariant } from '@/components/common/stitch-ui/StatusBadge'

export type WarrantyStat = {
  label: string
  value: string
  caption: string
  tone?: 'default' | 'primary' | 'error'
}

export type WarrantyMediaItem = {
  label: string
  src: string
  alt: string
  /** Tên file hiện đè lên ảnh */
  fileName: string
}

export type WarrantyAuditPhoto = {
  /** "Before: Physical Fault" */
  phase: string
  phaseTone: 'error' | 'primary'
  time: string
  src: string
  alt: string
  caption: string
}

export type RootCauseOption = {
  value: string
  label: string
  description: string
}

export type CorrectiveAction = {
  value: string
  label: string
  /** Chọn sẵn khi mở màn */
  defaultChecked: boolean
}

export type WarrantyCase = {
  id: string
  priority: { label: string; variant: StatusVariant }
  caseLabel: string
  guarantee: string
  dispatchWindow: string
  title: string
  subtitle: string
  productionDrop: string
  stats: WarrantyStat[]
  reported: {
    title: string
    loggedLabel: string
    quote: string
    media: WarrantyMediaItem[]
  }
  diagnostics: {
    title: string
    toolsLabel: string
    readings: MeasurementReading[]
    rootCause: {
      label: string
      options: RootCauseOption[]
      /** Lựa chọn mặc định khi mở màn */
      defaultValue: string
    }
    corrective: {
      label: string
      actions: CorrectiveAction[]
      narrativeLabel: string
      narrativePlaceholder: string
      narrative: string
    }
    hardwareSwap: {
      title: string
      badge: string
      removedLabel: string
      removedSerial: string
      replacementLabel: string
      replacementSerial: string
    }
  }
  audit: {
    title: string
    addLabel: string
    photos: WarrantyAuditPhoto[]
    attachment: { title: string; description: string; actionLabel: string }
  }
  site: {
    title: string
    region: string
    initials: string
    name: string
    premiseId: string
    address: string
    phone: { label: string; href: string }
    email: string
    mapSrc: string
    mapCaption: string
    accessLabel: string
    accessNote: string
  }
  burnIn: {
    title: string
    badge: string
    ringLabel: string
    value: string
    unit: string
    /** Phần trăm vòng tròn, theo stroke-dashoffset trong thiết kế */
    percent: number
    metrics: { label: string; value: string; tone?: 'default' | 'primary' }[]
    note: string
  }
  signOff: {
    title: string
    sectionLabel: string
    signatureLabel: string
    clearLabel: string
    signatureHint: string
    signatureCaption: string
    confirmations: { id: string; label: string; defaultChecked: boolean }[]
    submitLabel: string
    receiptLabel: string
    successMessage: string
  }
  validation: {
    rootCause: string
    actions: string
    narrative: string
    serial: string
    signature: string
    confirmations: string
  }
}

export const warrantyCases: WarrantyCase[] = [
  {
    id: 'WAR-3309',
    priority: { label: 'Sự cố ưu tiên cao', variant: 'error' },
    caseLabel: 'Mã hồ sơ #WAR-3309',
    guarantee: 'Bảo hành hệ thống 25 năm',
    dispatchWindow: 'Khung giờ điều phối: 13:30 – 15:00',
    title: 'Lỗi micro-inverter & sụt chuỗi DC',
    subtitle: 'Dàn pin mái Nam, nhánh mạch Bravo-2, ngắt do hồ quang',
    productionDrop: 'Sản lượng -35%',
    stats: [
      { label: 'Dàn pin đang chạy', value: '7.2 kW', caption: '18 × SunPower 400W' },
      { label: 'Ngày vận hành', value: 'Tháng 3/2022', caption: 'Đã vận hành 38 tháng' },
      { label: 'Mã lỗi', value: 'AFE-094', caption: 'Hồ quang chạm đất', tone: 'error' },
      { label: 'Hình thức bảo hành', value: 'RMA Express', caption: 'Hãng bảo hành cấp 1', tone: 'primary' },
    ],
    reported: {
      title: 'Dữ liệu giám sát & ghi chú của khách',
      loggedLabel: 'Ghi nhận 4 ngày trước qua ứng dụng SmartSolar',
      quote:
        '"Ứng dụng báo inverter #4 lỗi nghiêm trọng \'Chạm đất / phát hiện hồ quang\'. Ba tấm pin trên mái Nam không phát điện 4 ngày nay. Sản lượng tụt đột ngột chiều thứ Năm sau trận mưa lớn."',
      media: [
        {
          label: 'Ảnh chụp ứng dụng chủ nhà gửi',
          src: '/placeholders/photo-app-alert.svg',
          alt: 'Ứng dụng giám sát báo lỗi chạm đất ở micro-inverter số 4',
          fileName: 'IMG_AppAlert_0411.png',
        },
        {
          label: 'Ảnh hộp nối ngoài trời chủ nhà gửi',
          src: '/placeholders/photo-junction-box.svg',
          alt: 'Cầu dao cách ly AC và hộp nối gắn trên tường trát vữa',
          fileName: 'IMG_JunctionBox_0412.jpg',
        },
      ],
    },
    diagnostics: {
      title: 'Chẩn đoán & kiểm tra tại hiện trường',
      toolsLabel: 'Đã kết nối FLIR E8-XT & Fluke 1587 FC',
      readings: [
        {
          label: 'Điện áp hở mạch (Voc)',
          icon: 'electric_bolt',
          value: '48.2',
          unit: 'VDC',
          verdict: { label: 'Đạt' },
          footer: { left: 'Mức chuẩn: 47.5V – 49.0V', right: 'Sai số mục tiêu ±0.8%' },
          scale: 82,
        },
        {
          label: 'Điện trở cách điện (Megger)',
          icon: 'emergency_heat',
          tone: 'error',
          value: '0.12',
          unit: 'MΩ',
          verdict: { label: 'Không đạt, nghiêm trọng' },
          footer: { left: 'Tối thiểu theo chuẩn: ≥ 1.0 MΩ @ 500VDC', right: 'Chạm đất' },
          scale: 12,
        },
      ],
      rootCause: {
        label: 'Xác định nguyên nhân gốc',
        defaultValue: 'cable-insulation',
        options: [
          {
            value: 'factory-defect',
            label: 'Micro-inverter lỗi từ nhà sản xuất',
            description: 'Hỏng IGBT bên trong hoặc hỏng diode cầu',
          },
          {
            value: 'cable-insulation',
            label: 'Vỏ cách điện cáp bị hỏng',
            description: 'Chuột cắn & mài mòn bó dây chuỗi Nam 2',
          },
          {
            value: 'water-ingress',
            label: 'Nước lọt vào / hở gioăng',
            description: 'Ăn mòn do ẩm bên trong đầu nối nhanh MC4',
          },
        ],
      },
      corrective: {
        label: 'Hạng mục bảo hành đã khắc phục',
        actions: [
          { value: 'dc-cable', label: 'Thay 4 m cáp DC chống UV', defaultChecked: true },
          { value: 'mc4', label: 'Bấm lại đầu nối Stäubli MC4', defaultChecked: true },
          { value: 'critter-guard', label: 'Lắp lưới chắn động vật loại dày', defaultChecked: true },
          { value: 'grounding', label: 'Đấu lại cọc tiếp địa', defaultChecked: false },
        ],
        narrativeLabel: 'Mô tả hiện trường của kỹ thuật viên',
        narrativePlaceholder: 'Ghi chú mô tả hiện trường...',
        narrative:
          'Đã dọn tổ sóc sau dàn pin 4B. Làm sạch đoạn dây tiếp địa bị hở. Thay 4 m dây DC chống UV, bấm lại đầu nối MC4 bằng kìm đã hiệu chuẩn và che kín toàn bộ mép mái Nam bằng lưới thép mạ kẽm chống động vật.',
      },
      hardwareSwap: {
        title: 'Thay thiết bị chính hãng, micro-inverter Enphase IQ8+',
        badge: 'Đã quét mã vạch',
        removedLabel: 'Thiết bị lỗi đã tháo',
        removedSerial: 'EN-98214-X02',
        replacementLabel: 'Thiết bị thay thế đã vận hành',
        replacementSerial: 'EN-11048-Y09',
      },
    },
    audit: {
      title: 'Ảnh xác minh sửa chữa',
      addLabel: 'Thêm góc chụp',
      photos: [
        {
          phase: 'Trước: hư hỏng thực tế',
          phaseTone: 'error',
          time: '13:42 (PST)',
          src: '/placeholders/photo-cable-fault.svg',
          alt: 'Bó dây DC bị cắn, lộ lõi đồng dưới tấm pin',
          caption: 'Vỏ ngoài hư hỏng nặng',
        },
        {
          phase: 'Sau: đã sửa bảo hành',
          phaseTone: 'primary',
          time: '14:26 (PST)',
          src: '/placeholders/photo-cable-repaired.svg',
          alt: 'Cáp chống UV mới nối, kẹp dọc khung dàn pin',
          caption: 'Đã nối, thử & chắn động vật',
        },
      ],
      attachment: {
        title: 'Ảnh nhiệt sau sửa chữa',
        description: 'Tệp ảnh nhiệt FLIR: IR_20240415_0912.seq',
        actionLabel: 'Đính kèm số đo',
      },
    },
    site: {
      title: 'Thông tin công trình',
      region: 'Los Gatos, CA',
      initials: 'ER',
      name: 'Elena Rostova',
      premiseId: 'Mã công trình #992-410',
      address: '842 Crestview Terrace, Los Gatos, CA 95032',
      phone: { label: '(408) 555-0199', href: 'tel:4085550199' },
      email: 'elena.rostova@icloud.com',
      mapSrc: '/placeholders/map-site.svg',
      mapCaption: 'Độ dốc mái: 22°, mặt Nam',
      accessLabel: 'Mã cổng & hướng dẫn vào',
      accessNote: 'Mã cổng: 4921. Nhà có chó trong nhà, đi qua cổng vườn phía Tây thẳng tới chỗ đặt thang.',
    },
    burnIn: {
      title: 'Chạy thử liên tục 15 phút',
      badge: 'Cả 18 đang hoạt động',
      ringLabel: 'Công suất hiện tại',
      value: '5.84',
      unit: 'kW (thời gian thực)',
      percent: 86,
      metrics: [
        { label: 'Tần số lưới', value: '60.02 Hz' },
        { label: 'Trở kháng chuỗi 2', value: '> 12.4 MΩ', tone: 'primary' },
      ],
      note: 'Không có lỗi hồ quang trong 15 phút chạy liên tục.',
    },
    signOff: {
      title: 'Ký xác nhận & đóng hồ sơ',
      sectionLabel: 'Mục 4.3',
      signatureLabel: 'Chữ ký khách hàng',
      clearLabel: 'Xoá',
      signatureHint: 'Ký vào khung này',
      signatureCaption: 'Elena Rostova, ký & xác nhận',
      confirmations: [
        {
          id: 'wattage',
          label: 'Khách đã xem công suất tăng lại trên ứng dụng điện thoại.',
          defaultChecked: true,
        },
        {
          id: 'rma',
          label: 'Đã ghi số serial thiết bị thay thế lên cổng của hãng (RMA #ENP-449102).',
          defaultChecked: true,
        },
      ],
      submitLabel: 'Gửi hồ sơ bảo hành & khôi phục',
      receiptLabel: 'Xuất biên nhận bảo hành (PDF)',
      successMessage: 'Đã gửi hồ sơ bảo hành #WAR-3309. Hồ sơ RMA đang chờ hãng xem xét.',
    },
    validation: {
      rootCause: 'Chọn một nguyên nhân gốc trước khi gửi.',
      actions: 'Chọn ít nhất một hạng mục đã khắc phục.',
      narrative: 'Mô tả hiện trường cần ít nhất 20 ký tự.',
      serial: 'Số sê-ri theo định dạng EN-00000-X00.',
      signature: 'Cần chữ ký của khách hàng.',
      confirmations: 'Phải xác nhận cả hai mục trước khi gửi.',
    },
  },
]

/** Tra hồ sơ bảo hành theo id trên URL; chấp nhận cả dạng có và không có "#". */
export function getWarrantyCase(id: string | undefined): WarrantyCase | undefined {
  if (!id) return undefined
  const normalized = id.replace(/^#/, '').toUpperCase()
  return warrantyCases.find((item) => item.id.toUpperCase() === normalized)
}
