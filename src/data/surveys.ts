// Dữ liệu giả cho luồng khảo sát của kỹ thuật viên, các màn dùng chung một survey id

export type SurveyContact = { icon: string; label: string; value: string }

export type SurveyStatTile = { label: string; value: string; unit?: string; caption: string }

export type SurveyPhoto = { id: string; src: string; alt: string; tag: string }

export type SurveyChoice = { value: string; label: string; icon: string; caption: string }

export type SurveySeverity = 'none' | 'light' | 'moderate' | 'heavy'

export type SurveyObstacle = {
  id: string
  icon: string
  /** Màu icon theo thiết kế: secondary cho cây, muted cho ống khói... */
  iconTone: 'primary' | 'secondary' | 'muted'
  title: string
  description: string
  severity: SurveySeverity
}

export type SurveyRecord = {
  id: string
  projectCode: string
  statusLabel: string
  /** Ba trạng thái của dòng autosave trên header card */
  autosave: { initial: string; saving: string; saved: string }
  title: string
  contacts: SurveyContact[]
  location: { address: string; meta: string }
  homeowner: {
    title: string
    subtitle: string
    badge: string
    tiles: SurveyStatTile[]
    notes: { title: string; text: string }
    photos: { title: string; hint: string; items: SurveyPhoto[] }
    gis: { title: string; yield: string }
  }
  audit: {
    title: string
    subtitle: string
    grade: string
    area: {
      label: string
      hint: string
      value: number
      step: number
      min: number
      unit: string
      varianceLabel: string
      varianceValue: string
    }
    pitch: {
      label: string
      hint: string
      value: number
      min: number
      max: number
      unit: string
      footnoteLabel: string
      footnoteValue: string
    }
    roof: { label: string; options: SurveyChoice[]; selected: string }
    accessibility: {
      label: string
      ladder: { icon: string; title: string; description: string; badge: string }
      scaffolding: { icon: string; title: string; description: string; enabled: boolean }
    }
    shading: {
      label: string
      hint: string
      options: { value: SurveySeverity; label: string }[]
      items: SurveyObstacle[]
    }
    electrical: {
      label: string
      panel: { icon: string; title: string; description: string; rating: string }
      breaker: {
        question: string
        description: string
        options: { value: BreakerAnswer; label: string }[]
        answer: BreakerAnswer
      }
    }
    recommendation: { label: string; hint: string; text: string }
  }
  dock: {
    icon: string
    title: string
    description: string
    actions: { saveDraft: string; photos: string; submit: string }
  }
  toasts: { draftSaved: string; submitted: string }
}

export type BreakerAnswer = 'yes' | 'no'

/** Bốn mức che bóng dùng chung cho mọi vật cản. */
export const shadingSeverityOptions: { value: SurveySeverity; label: string }[] = [
  { value: 'none', label: 'Không' },
  { value: 'light', label: 'Nhẹ' },
  { value: 'moderate', label: 'Vừa' },
  { value: 'heavy', label: 'Nặng' },
]

export const surveys: SurveyRecord[] = [
  {
    id: 'SS-8842',
    projectCode: 'DỰ ÁN #SS-8842',
    statusLabel: 'Đang khảo sát',
    autosave: {
      initial: 'Tự lưu 2 phút trước',
      saving: 'Đang lưu thay đổi…',
      saved: 'Đã lưu mọi thay đổi',
    },
    title: 'Hệ thống điện mặt trời nhà ở 8.4kW',
    contacts: [
      { icon: 'person', label: 'Khách hàng', value: 'Marcus Vance' },
      { icon: 'phone_iphone', label: 'Liên hệ trực tiếp', value: '(555) 349-8201' },
      { icon: 'calendar_clock', label: 'Khung giờ hẹn', value: 'Hôm nay, 10:00 - 12:00' },
    ],
    location: { address: '742 Evergreen Terrace', meta: 'Springfield, mã thửa đất #094-11' },
    homeowner: {
      title: 'Thông tin chủ nhà gửi',
      subtitle: 'Dữ liệu sơ bộ khách tự khai trên cổng',
      badge: 'Chỉ để tham khảo',
      tiles: [
        { label: 'Diện tích khai báo', value: '85', unit: 'm²', caption: 'Khai báo 12.5m × 6.8m' },
        { label: 'Độ nghiêng ước tính', value: '25°', caption: 'Chủ nhà ước lượng' },
        { label: 'Hướng', value: 'SSE', caption: 'Nam – Đông Nam ~155°' },
        { label: 'Vật liệu mái', value: 'Nhựa đường', caption: 'Ngói bitum kiến trúc' },
      ],
      notes: {
        title: 'Ghi chú khách hàng khai',
        text: '“Đã thay lớp lợp mái 3 năm trước sau trận mưa đá. Bên trái có cây thông lớn ở sân sau nhà hàng xóm, đổ bóng tới khoảng 10:30 vào mùa thu. Tủ điện ở trong gara.”',
      },
      photos: {
        title: 'Ảnh khách tự chụp (3)',
        hint: 'Chạm để xem',
        items: [
          {
            id: 'south-face',
            src: '/placeholders/photo-roof.svg',
            alt: 'Mái dốc hai tầng nhìn từ xa dưới nắng sớm',
            tag: 'Mặt Nam',
          },
          {
            id: 'breaker',
            src: '/placeholders/photo-panel.svg',
            alt: 'Tủ điện tổng trong gara đang mở cửa',
            tag: 'Tủ CB',
          },
          {
            id: 'east-yard',
            src: '/placeholders/photo-yard.svg',
            alt: 'Sân bên và cây thông cao đổ bóng lên mái',
            tag: 'Sân phía Đông',
          },
        ],
      },
      gis: { title: 'Mô hình tiềm năng điện mặt trời (GIS)', yield: 'Ước tính 1,420 kWh/kWp' },
    },
    audit: {
      title: 'Kỹ thuật viên kiểm tra',
      subtitle: 'Số liệu đo trực tiếp và nhập tại hiện trường đã hiệu chuẩn',
      grade: 'Độ chính xác loại A',
      area: {
        label: 'Diện tích sử dụng được đã xác minh (m²)',
        hint: 'Đã kết nối máy đo laser',
        value: 78.5,
        step: 0.5,
        min: 10,
        unit: 'm²',
        varianceLabel: 'Chênh lệch so với khách khai:',
        varianceValue: '-6.5 m² (đã trừ vật cản)',
      },
      pitch: {
        label: 'Góc dốc đã xác minh (°)',
        hint: 'Cảm biến đo nghiêng',
        value: 28,
        min: 0,
        max: 60,
        unit: 'Độ',
        footnoteLabel: 'Góc khung đề xuất:',
        footnoteValue: '28°, lắp sát mái',
      },
      roof: {
        label: 'Dạng mái',
        selected: 'gable',
        options: [
          { value: 'gable', label: 'Mái hai mái', icon: 'roofing', caption: 'Hai mặt dốc đơn giản' },
          { value: 'hip', label: 'Mái bốn mái', icon: 'home', caption: 'Bốn mặt dốc' },
          { value: 'flat', label: 'Mái bằng / thấp', icon: 'horizontal_rule', caption: 'Dùng được khung đối trọng' },
          { value: 'complex', label: 'Phức tạp', icon: 'architecture', caption: 'Nhiều khe mái' },
        ],
      },
      accessibility: {
        label: 'Khả năng tiếp cận & an toàn đội thi công',
        ladder: {
          icon: 'height',
          title: 'Khoảng trống đặt thang',
          description: 'Đặt thang ngay lối xe vào',
          badge: 'Thông thoáng',
        },
        scaffolding: {
          icon: 'construction',
          title: 'Bắt buộc dựng giàn giáo',
          description: 'Mép mái phía Tây > 22 ft',
          enabled: true,
        },
      },
      shading: {
        label: 'Phân tích vật cản gây bóng',
        hint: 'Ảnh hưởng cấu hình inverter',
        options: shadingSeverityOptions,
        items: [
          {
            id: 'pine',
            icon: 'park',
            iconTone: 'secondary',
            title: 'Cây thông nhà bên (ĐN)',
            description: 'Ảnh hưởng 08:00 - 10:45',
            severity: 'moderate',
          },
          {
            id: 'chimney',
            icon: 'fireplace',
            iconTone: 'muted',
            title: 'Ống khói giữa mái',
            description: 'Bóng đổ dài 1.2m',
            severity: 'light',
          },
          {
            id: 'service-drop',
            icon: 'power',
            iconTone: 'primary',
            title: 'Dây điện kéo vào nhà trên cao',
            description: 'Đi ngang trên nóc mái phía Bắc',
            severity: 'none',
          },
        ],
      },
      electrical: {
        label: 'Kiểm tra hạ tầng điện',
        panel: {
          icon: 'electrical_services',
          title: 'Định mức tủ điện chính',
          description: 'Square D Homeline, vỏ tủ ngoài trời',
          rating: '200 A',
        },
        breaker: {
          question: 'Còn chỗ lắp CB 2 cực 40A cho điện mặt trời không?',
          description: 'Khe 22 & 24 đang trống',
          options: [
            { value: 'yes', label: 'Có' },
            { value: 'no', label: 'Không' },
          ],
          answer: 'yes',
        },
      },
      recommendation: {
        label: 'Khuyến nghị kỹ thuật cho bộ phận kinh doanh',
        hint: 'Đầu vào thiết kế hệ thống',
        text: 'Đề xuất 22 tấm đơn tinh thể 400W, chia hai mặt Nam (14 tấm) và Tây (8 tấm). Nên dùng micro-inverter (IQ8M) thay cho inverter chuỗi trung tâm vì cây thông nhà bên đổ bóng buổi sáng.',
      },
    },
    dock: {
      icon: 'fact_check',
      title: 'Kiểm tra hiện trường: xong 6/6 mục',
      description: 'Sẵn sàng ký xác nhận hồ sơ',
      actions: {
        saveDraft: 'Lưu nháp',
        photos: 'Ảnh hồ sơ',
        submit: 'Gửi kinh doanh',
      },
    },
    toasts: {
      draftSaved: 'Đã lưu nháp trên máy (ngoại tuyến).',
      submitted: 'Khảo sát #SS-8842 đã xác minh và chuyển cho bộ phận kỹ thuật & kinh doanh.',
    },
  },
]

export function getSurveyById(id: string | undefined): SurveyRecord | undefined {
  return surveys.find((survey) => survey.id === id)
}

// Dữ liệu màn xác minh (/tech/surveys/:id/verify), số đo suy ra từ `surveys` ở trên để không mâu thuẫn

export type SurveyRafterCondition = 'excellent' | 'good' | 'reinforce'
export type SurveyRiskLevel = 'low' | 'moderate' | 'high'

export type SurveyRadioOption<T extends string> = { value: T; label: string; description?: string }

export type SurveyVerification = {
  breadcrumbRoot: { icon: string; label: string }
  syncLabel: string
  statusLabel: string
  cluster: string
  assignee: string
  meta: { icon: string; tone: 'primary' | 'secondary'; text: string }[]
  headerActions: { reject: string; saveDraft: string; complete: string }
  baseline: {
    title: string
    subtitle: string
    badge: string
    blueprint: {
      label: string
      length: string
      width: string
      area: string
      /** Phần trăm thanh tiến trình dưới số đo */
      progress: number
      caption: string
    }
    metrics: { icon: string; label: string; value: string; caption: string }[]
    material: { icon: string; title: string; description: string; badge: string }
    /** `photoId` trỏ sang homeowner.photos.items để hai màn dùng đúng một bộ ảnh */
    photos: { title: string; count: string; items: { photoId: string; caption: string }[] }
    note: string
  }
  safety: { title: string; items: { id: string; label: string; checked: boolean }[] }
  dimensions: {
    title: string
    subtitle: string
    badge: string
    length: { label: string; value: string; footnote: string }
    width: { label: string; value: string; footnote: string }
    area: { label: string; unit: string; footnote: string }
    tilt: { label: string; syncLabel: string; value: string; footnote: string }
    azimuth: { label: string; value: string; footnote: string }
    rafter: {
      label: string
      options: SurveyRadioOption<SurveyRafterCondition>[]
      value: SurveyRafterCondition
    }
  }
  accessibility: {
    title: string
    badge: string
    shading: { label: string; hint: string; value: string }
    panel: { label: string; value: string }
    conduit: { label: string; value: string }
    access: { label: string; icon: string; value: string }
  }
  proposal: {
    title: string
    badge: string
    capacity: { label: string; value: string; caption: string }
    inverter: { label: string; value: string; caption: string }
    notes: { label: string; value: string }
    risk: { label: string; options: SurveyRadioOption<SurveyRiskLevel>[]; value: SurveyRiskLevel }
  }
  dock: { uploadLabel: string; uploadCount: number; photoHint: string; saveDraft: string; complete: string }
  signOff: {
    title: string
    subtitle: string
    technicianLabel: string
    technician: string
    areaLabel: string
    capacityLabel: string
    capacity: string
    panelLabel: string
    panel: string
    signatureLabel: string
    signatureHint: string
    cancel: string
    confirm: string
  }
  reject: {
    title: string
    description: string
    label: string
    options: string[]
    cancel: string
    confirm: string
  }
  toasts: { draftSaved: string; transmitted: string; rejected: string; tiltSynced: string }
}

const surveyVerifications: Record<string, SurveyVerification> = {
  'SS-8842': {
    breadcrumbRoot: { icon: 'roofing', label: 'Khảo sát hiện trường' },
    syncLabel: 'Đã lưu 2 phút trước (đồng bộ máy & đám mây)',
    statusLabel: 'Đang thực hiện',
    cluster: 'Cụm NorCal Metro 04',
    assignee: 'Người phụ trách: Marcus Vance (trưởng nhóm kỹ thuật)',
    meta: [
      { icon: 'location_on', tone: 'primary', text: '742 Evergreen Terrace, Springfield' },
      { icon: 'call', tone: 'primary', text: '(555) 349-8201' },
      { icon: 'schedule', tone: 'secondary', text: 'Hôm nay, 10:00 (hẹn tại nhà)' },
    ],
    headerActions: {
      reject: 'Từ chối / không thể thi công',
      saveDraft: 'Lưu nháp',
      complete: 'Hoàn thành & ký khảo sát',
    },
    baseline: {
      title: 'Số liệu khách khai',
      subtitle: 'Gửi qua cổng khách hàng ngày 5/12',
      badge: 'Khách tự khai',
      blueprint: {
        label: 'Ước tính theo bản vẽ mái',
        // 12.5m x 6.8m ~41ft x 22ft ~915 sq ft, khớp "85 m²" ở màn 8
        length: '41 ft',
        width: '22 ft',
        area: '~915 ft²',
        progress: 88,
        caption: 'Mặt mái liền ước tính trên khối nhà chính',
      },
      metrics: [
        { icon: 'explore', label: 'Hướng', value: '155° SSE', caption: 'Nam – Đông Nam' },
        { icon: 'change_history', label: 'Độ dốc', value: '25°', caption: 'Độ dốc: 5.6/12' },
      ],
      material: {
        icon: 'roofing',
        title: 'Ngói bitum kiến trúc',
        // Ghi chú của chủ nhà ở màn 8: lợp lại mái 3 năm trước
        description: 'Lắp 3 năm trước, tuổi thọ dự kiến 25 năm',
        badge: 'Đã xác nhận',
      },
      photos: {
        title: 'Ảnh khách tải lên',
        count: '3 ảnh',
        items: [
          { photoId: 'south-face', caption: 'Mái nhìn từ phía trước' },
          { photoId: 'breaker', caption: 'Tủ điện chính (200A)' },
          { photoId: 'east-yard', caption: 'Sân Đông & hàng thông' },
        ],
      },
      note: 'Khách muốn phủ tối đa mặt Tây – Nam để bù giá điện cao điểm mùa hè. Kiểm tra khoảng cách xà gồ gần ống thông hơi.',
    },
    safety: {
      title: 'An toàn & tiếp cận hiện trường',
      items: [
        { id: 'ppe', label: 'Đồ bảo hộ: đã kiểm tra & cố định dây đai chống rơi', checked: true },
        { id: 'gfci', label: 'Đã hiệu chỉnh về 0 thiết bị dò chạm đất & bút thử điện', checked: true },
        { id: 'deadfront', label: 'Đã báo khách trước khi tháo nắp che tủ điện chính', checked: true },
      ],
    },
    dimensions: {
      title: 'Kích thước mái đã xác minh',
      subtitle: 'Đo trên mái bằng thiết bị đã hiệu chuẩn',
      badge: 'Đồng bộ laser trực tiếp',
      // 40.5 x 20.9 ~846 sq ft ~78.5 m², đúng "Verified Usable Area" của màn 8
      length: { label: 'Chiều dài sử dụng được (ft)', value: '40.5', footnote: 'Khách khai: 41 ft' },
      width: { label: 'Chiều rộng sử dụng được (ft)', value: '20.9', footnote: 'Chừa mép mái: 2 ft' },
      area: { label: 'Diện tích sử dụng thực', unit: 'ft²', footnote: 'Đủ cho hơn 22 tấm' },
      tilt: {
        label: 'Độ dốc / nghiêng đo được',
        syncLabel: 'Lấy số từ thước đo nghiêng',
        // Màn 8 đo được 28°, khách ước tính 25° nên lệch +3°
        value: '28°',
        footnote: 'Chênh lệch: +3° so với khách ước tính',
      },
      azimuth: {
        label: 'Góc phương vị / hướng đo được',
        value: '159° SSE',
        footnote: 'Đã tính độ lệch từ: +4.2°',
      },
      rafter: {
        label: 'Tình trạng mái & khoảng cách xà gồ',
        value: 'excellent',
        options: [
          { value: 'excellent', label: 'Rất tốt (xà gồ 24")', description: 'Vì kèo thiết kế sẵn' },
          { value: 'good', label: 'Tốt (xà gồ 16")', description: 'Khung gỗ 2x4 tiêu chuẩn' },
          { value: 'reinforce', label: 'Cần gia cố', description: 'Phải ốp thêm xà gồ trên trần' },
        ],
      },
    },
    accessibility: {
      title: 'Tiếp cận & vật cản',
      badge: 'Đạt quy chuẩn điện lực',
      shading: {
        label: 'Phân tích bóng che & đường chân trời SunEye',
        hint: 'Ước tính tổn thất <4%',
        // Ba vật cản của màn 8: thông hàng xóm (sáng), ống khói, dây điện trên cao
        value:
          'Chỉ bị che bóng buổi sáng: cây thông nhà bên (ĐN) đổ bóng tới 10:45, ống khói giữa mái đổ bóng 1.2m, dây điện trên cao không chắn dàn pin.',
      },
      panel: {
        label: 'Định mức tủ điện',
        value: 'CB tổng 200A, khe 22 & 24 trống - sẵn sàng cho điện mặt trời',
      },
      conduit: { label: 'Chiều dài ống luồn dây', value: 'Khoảng 35 ft tới vị trí inverter' },
      access: {
        label: 'Điểm lên mái & khu tập kết',
        icon: 'stairs',
        value: 'Đặt thang ngay lối xe vào (lối lát phẳng, tránh dây điện ở nóc mái phía Bắc)',
      },
    },
    proposal: {
      title: 'Đề xuất lắp đặt của kỹ thuật viên',
      badge: 'Ưu tiên cho kinh doanh',
      capacity: {
        label: 'Công suất hệ thống đề xuất',
        // Màn 8: 22 tấm 400W; GIS 1,420 kWh/kWp x 8.8 kW ~12,400 kWh/năm
        value: '8.8 kW DC (22 tấm Tier-1 400W)',
        caption: 'Sản lượng ước tính: 12,400 kWh/năm',
      },
      inverter: {
        label: 'Cấu hình inverter đề xuất',
        value: 'Micro-inverter Enphase IQ8M',
        caption: 'Phương án khác: SolarEdge HD-Wave kèm optimizer P401',
      },
      notes: {
        label: 'Ghi chú kết cấu & kỹ thuật',
        value: 'Xà gồ chắc chắn, không cần gia cố, bức xạ mặt trời rất tốt. Dễ đấu nối cọc tiếp địa.',
      },
      risk: {
        label: 'Đánh giá rủi ro kỹ thuật',
        value: 'low',
        options: [
          { value: 'low', label: 'Rủi ro thấp' },
          { value: 'moderate', label: 'Trung bình' },
          { value: 'high', label: 'Cao (cần kỹ sư PE duyệt)' },
        ],
      },
    },
    dock: {
      uploadLabel: 'Tải ảnh khảo sát',
      // Bằng số ảnh đã chụp trong data/surveyPhotos.ts của cùng survey
      uploadCount: 6,
      photoHint: 'Đã đủ số ảnh tối thiểu',
      saveDraft: 'Lưu nháp',
      complete: 'Hoàn thành & gửi kinh doanh',
    },
    signOff: {
      title: 'Ký xác nhận khảo sát hiện trường',
      subtitle: 'Chứng nhận vận hành hiện trường NorCal Metro',
      technicianLabel: 'Kỹ thuật viên:',
      technician: 'Marcus Vance (ID: TECH-772)',
      areaLabel: 'Diện tích mái thực đã xác minh:',
      capacityLabel: 'Công suất đề xuất:',
      capacity: '8.8 kW DC (Tier-1)',
      panelLabel: 'Tình trạng tủ điện:',
      panel: 'Thanh cái 200A / sẵn sàng cho điện mặt trời',
      signatureLabel: 'Chữ ký điện tử của kỹ thuật viên',
      signatureHint: 'Ký bằng tay hoặc bút cảm ứng',
      cancel: 'Quay lại chỉnh sửa',
      confirm: 'Gửi sang CAD kinh doanh',
    },
    reject: {
      title: 'Báo không thể thi công / từ chối khảo sát',
      description:
        'Chọn lý do không thể thi công. Đề xuất bán hàng tự động sẽ dừng và bộ phận lập kế hoạch dự án nhận cảnh báo.',
      label: 'Lý do',
      options: [
        'Tấm lót mái / vì kèo xuống cấp',
        'Điểm đấu nối lưới không an toàn / bóng che nặng',
        'Ban quản lý khu dân cư không cho phép / vật cản lớn',
        'Khách hủy / không cho vào',
      ],
      cancel: 'Hủy',
      confirm: 'Xác nhận không thể thi công',
    },
    toasts: {
      draftSaved: 'Đã tự lưu nháp khảo sát trên máy',
      transmitted: 'Khảo sát SS-8842 đã xác minh và gửi sang CAD kinh doanh.',
      rejected: 'Đã báo không thể thi công cho bộ phận lập kế hoạch dự án.',
      tiltSynced: 'Đã lấy số đo từ thước đo nghiêng.',
    },
  },
}

export function getSurveyVerificationById(id: string | undefined): SurveyVerification | undefined {
  return id ? surveyVerifications[id] : undefined
}
