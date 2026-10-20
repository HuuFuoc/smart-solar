// Dữ liệu giả cho /tech/surveys/:id/photos, dùng chung survey id SS-8842 với data/surveys.ts
// Tiến độ tính từ `sections` (getSurveyPhotoProgress) để các số không lệch nhau

export type PhotoTagTone = 'verified' | 'warning'

export type SurveyPhotoAsset = {
  id: string
  src: string
  alt: string
  tag: { label: string; icon: string; tone: PhotoTagTone }
  time: string
  gpsTagged: boolean
  title: string
  note: string
  inspector: {
    coordinates: string
    timestamp: string
    elevation: string
    lens: string
    annotations: number
    notes: string
  }
}

export type SurveyPhotoDropzone = {
  id: string
  icon: string
  title: string
  /** Dòng đỏ khi còn góc chụp bắt buộc */
  requirement?: string
  hint: string
  actionLabel: string
  actionIcon: string
  required: boolean
}

export type SurveyPhotoSection = {
  id: string
  icon: string
  /** Màu ô icon của mỗi section theo thiết kế */
  iconTone: 'primary' | 'secondary' | 'tertiary' | 'neutral'
  title: string
  description: string
  /** Số ảnh bắt buộc; 0 = section tuỳ chọn */
  requiredCount: number
  requirementLabel: string
  requirementTone: 'error' | 'success' | 'neutral'
  photos: SurveyPhotoAsset[]
  dropzones: SurveyPhotoDropzone[]
}

export type SurveyPhotoDoc = {
  surveyId: string
  header: {
    projectRef: string
    customer: string
    address: string
    title: string
    badge: string
    actions: { batch: string; camera: string; verifyAll: string }
  }
  progress: {
    title: string
    /** "{n} of {m} required site photos captured" */
    capturedTemplate: string
    completeTemplate: string
    remainingTemplate: string
    optionalLabel: string
  }
  inspector: {
    title: string
    badge: string
    annotationLabel: string
    editTitleLabel: string
    coordinatesLabel: string
    timestampLabel: string
    elevationLabel: string
    lensLabel: string
    notesLabel: string
    removeLabel: string
    saveLabel: string
    annotationText: string
    tools: { icon: string; label: string }[]
  }
  tip: { icon: string; title: string; text: string }
  sections: SurveyPhotoSection[]
  dock: {
    icon: string
    title: string
    descriptionTemplate: string
    saveDraft: string
    complete: string
  }
  toasts: { saved: string; completed: string; verifiedAll: string; annotationSaved: string }
}

const surveyPhotoDocs: Record<string, SurveyPhotoDoc> = {
  'SS-8842': {
    surveyId: 'SS-8842',
    header: {
      projectRef: 'Mã dự án #SS-8842',
      customer: 'Nhà Marcus Vance',
      address: '742 Evergreen Terrace, Springfield',
      title: 'Bước 2/2: Ảnh hiện trường & kiểm tra công trình',
      badge: 'Xác minh hiện trường',
      actions: { batch: 'Tải lên nhiều ảnh', camera: 'Chụp bằng máy ảnh', verifyAll: 'Đánh dấu đã xác minh tất cả' },
    },
    progress: {
      title: 'Mức độ đầy đủ hồ sơ',
      capturedTemplate: 'Đã chụp {captured}/{required} ảnh bắt buộc',
      completeTemplate: 'Hoàn thành {percent}%',
      remainingTemplate: 'Còn {remaining} ảnh bắt buộc',
      optionalLabel: 'tuỳ chọn',
    },
    inspector: {
      title: 'Xem ảnh',
      badge: 'Đang xem xét',
      annotationLabel: '{count} chú thích',
      editTitleLabel: 'Sửa tiêu đề',
      coordinatesLabel: 'Toạ độ:',
      timestampLabel: 'Thời điểm:',
      elevationLabel: 'Độ cao (EXIF):',
      lensLabel: 'Tiêu cự:',
      notesLabel: 'Ghi chú & nhận xét hiện trường',
      removeLabel: 'Xoá ảnh',
      saveLabel: 'Lưu chú thích',
      annotationText: 'Căn theo xà gồ',
      tools: [
        { icon: 'edit', label: 'Bút đánh dấu' },
        { icon: 'arrow_right_alt', label: 'Mũi tên' },
        { icon: 'straighten', label: 'Công cụ đo' },
        { icon: 'delete', label: 'Xoá đánh dấu' },
      ],
    },
    tip: {
      icon: 'lightbulb',
      title: 'Mẹo chụp ảnh',
      text: 'Chụp nhãn định mức thiết bị điện sao cho không bị loá đèn flash.',
    },
    sections: [
      {
        id: 'roof',
        icon: 'roofing',
        iconTone: 'primary',
        title: 'Mục A: Mái & bề mặt lắp đặt',
        description: 'Kiểm tra độ dốc, độ mòn lớp lợp, khe mái, tình trạng xà gồ và kết cấu.',
        requiredCount: 3,
        requirementLabel: 'Tối thiểu 3 ảnh',
        requirementTone: 'error',
        photos: [
          {
            id: 'south-face',
            src: '/placeholders/photo-roof.svg',
            alt: 'Mái ngói nhựa đường chụp chéo từ trên cao dưới nắng trưa',
            tag: { label: 'Mặt Nam', icon: 'verified', tone: 'verified' },
            time: '10:14',
            gpsTagged: true,
            title: 'Toàn cảnh mặt Nam',
            // Độ dốc 28° khớp "Verified Pitch Angle" của màn 8
            note: 'Lớp lợp còn tốt, dốc 28°',
            inspector: {
              coordinates: '37.3382° N, 121.8863° W',
              timestamp: 'Hôm nay, 10:14',
              elevation: '82m so với mực nước biển',
              lens: '24mm (f/1.8)',
              annotations: 2,
              notes:
                'Lớp lợp còn tốt, ít bong hạt. Độ dốc 28° đã xác nhận bằng thước đo nghiêng. Khoảng cách xà gồ theo chuẩn 24 inch tâm – tâm.',
            },
          },
          {
            id: 'east-valley',
            src: '/placeholders/photo-valley.svg',
            alt: 'Máng thoát nước giữa hai mái với tôn chống thấm sạch',
            tag: { label: 'Khe mái Đông', icon: 'verified', tone: 'verified' },
            time: '10:21',
            gpsTagged: true,
            title: 'Nóc & khe mái phía Đông',
            note: 'Khe mái sạch, tấm chống thấm không gỉ',
            inspector: {
              coordinates: '37.3384° N, 121.8860° W',
              timestamp: 'Hôm nay, 10:21',
              elevation: '82m so với mực nước biển',
              lens: '24mm (f/1.8)',
              annotations: 0,
              notes: 'Khe mái thông thoáng, tấm chống thấm nguyên vẹn, không có dấu hiệu mục.',
            },
          },
        ],
        dropzones: [
          {
            id: 'roof-slot-3',
            icon: 'add_a_photo',
            title: 'Thêm ảnh mái',
            requirement: 'Cần thêm 1 góc chụp bắt buộc',
            hint: 'Mép hồi mái phía Tây hoặc vì kèo trên trần',
            actionLabel: 'Chọn tệp',
            actionIcon: 'upload_file',
            required: true,
          },
        ],
      },
      {
        id: 'electrical',
        icon: 'bolt',
        iconTone: 'secondary',
        title: 'Mục B: Tủ điện & công tơ',
        description: 'Kiểm tra dây điện vào nhà, chỉ số công tơ, định mức thanh cái chính và mối nối cọc tiếp địa.',
        requiredCount: 2,
        requirementLabel: 'Tối thiểu 2 ảnh (đã đủ)',
        requirementTone: 'success',
        photos: [
          {
            id: 'panel-exterior',
            src: '/placeholders/photo-panel.svg',
            alt: 'Tủ điện ngoài trời với khoảng trống thao tác phía trước',
            tag: { label: 'Bên ngoài & khoảng trống', icon: 'verified', tone: 'verified' },
            time: '10:32',
            gpsTagged: true,
            title: 'Bên ngoài tủ điện chính',
            note: 'Khoảng trống thao tác 36 in đạt yêu cầu',
            inspector: {
              coordinates: '37.3381° N, 121.8865° W',
              timestamp: 'Hôm nay, 10:32',
              elevation: '78m so với mực nước biển',
              lens: '24mm (f/2.0)',
              annotations: 1,
              notes: 'Vỏ tủ ngoài trời còn tốt. Đo được khoảng trống thao tác 36 inch trước nắp che.',
            },
          },
          {
            id: 'busbar',
            src: '/placeholders/photo-breaker.svg',
            alt: 'Nhãn thanh cái và cầu dao tổng 200A trong tủ điện',
            tag: { label: 'CB tổng 200A', icon: 'verified', tone: 'verified' },
            time: '10:35',
            gpsTagged: true,
            title: 'Nhãn thanh cái & CB 200A',
            // Khớp "200 Ampere / slots 22 & 24" ở màn 8 và màn 9
            note: 'Đã xác nhận CB 200A / thanh cái 225A',
            inspector: {
              coordinates: '37.3381° N, 121.8865° W',
              timestamp: 'Hôm nay, 10:35',
              elevation: '78m so với mực nước biển',
              lens: '35mm (f/2.8)',
              annotations: 1,
              notes:
                'Thanh cái Square D Homeline định mức 225A, CB tổng 200A. Khe 22 và 24 còn trống cho CB 2 cực 40A của điện mặt trời.',
            },
          },
        ],
        dropzones: [
          {
            id: 'electrical-aux',
            icon: 'add',
            title: '+ Thêm ảnh phụ',
            hint: 'Ảnh cọc tiếp địa hoặc tủ điện phụ',
            actionLabel: 'Tải lên (tuỳ chọn)',
            actionIcon: 'add_circle',
            required: false,
          },
        ],
      },
      {
        id: 'conduit',
        icon: 'alt_route',
        iconTone: 'tertiary',
        title: 'Mục C: Inverter & tuyến ống luồn dây',
        description: 'Ghi tuyến ống EMT / PVC từ hộp nối trên mái tới inverter và cầu dao cách ly pin lưu trữ.',
        requiredCount: 2,
        requirementLabel: 'Tối thiểu 2 ảnh',
        requirementTone: 'error',
        photos: [
          {
            id: 'inverter-mount',
            src: '/placeholders/photo-inverter.svg',
            alt: 'Vị trí gắn inverter trên tường ngoài gara',
            tag: { label: 'Vị trí inverter đề xuất', icon: 'verified', tone: 'verified' },
            time: '10:48',
            gpsTagged: true,
            title: 'Vị trí lắp inverter ngoài gara',
            note: 'Tường Bắc của gara, khoảng trống 48 in',
            inspector: {
              coordinates: '37.3380° N, 121.8866° W',
              timestamp: 'Hôm nay, 10:48',
              elevation: '78m so với mực nước biển',
              lens: '24mm (f/1.8)',
              annotations: 0,
              // Khớp đề xuất microinverter IQ8M của màn 8 và màn 9
              notes: 'Tường Bắc gara đủ chỗ cho bộ gom IQ8M. Ống luồn dây về tủ điện chính dài khoảng 35 ft.',
            },
          },
        ],
        dropzones: [
          {
            id: 'conduit-route',
            icon: 'route',
            title: '+ Thêm ảnh tuyến ống',
            requirement: 'Cần thêm 1 góc chụp bắt buộc',
            hint: 'Đoạn chuyển qua mép mái hoặc lỗ xuyên trần',
            actionLabel: 'Tải ảnh tuyến ống',
            actionIcon: 'upload_file',
            required: true,
          },
          {
            id: 'attic-interior',
            icon: 'add',
            title: 'Thêm ảnh bên trong trần mái',
            hint: 'Khung xà gồ & lớp cách nhiệt',
            actionLabel: 'Thêm (tuỳ chọn)',
            actionIcon: 'add_circle',
            required: false,
          },
        ],
      },
      {
        id: 'shading',
        icon: 'nature',
        iconTone: 'neutral',
        title: 'Mục D: Bóng che & vật cản',
        description: 'Ghi lại cây lớn gần nhà, cửa mái, ống khói và ống thông hơi có thể che bóng làm giảm sản lượng.',
        requiredCount: 0,
        requirementLabel: 'Tuỳ chọn / khi cần',
        requirementTone: 'neutral',
        photos: [
          {
            id: 'neighbor-pine',
            src: '/placeholders/photo-tree.svg',
            alt: 'Tán thông cao nhìn từ dưới lên, cạnh mái nhà hai tầng',
            // Màn 8 ghi vật cản là "Neighbor Pine (SE)" che bóng buổi sáng
            tag: { label: 'Ghi chú vật cản', icon: 'warning', tone: 'warning' },
            time: '10:55',
            gpsTagged: true,
            title: 'Cây thông nhà bên (ĐN, 15 ft)',
            note: 'Tán cây che dàn pin tới 10:45',
            inspector: {
              coordinates: '37.3380° N, 121.8859° W',
              timestamp: 'Hôm nay, 10:55',
              elevation: '80m so với mực nước biển',
              lens: '16mm (f/2.8)',
              annotations: 1,
              notes:
                'Cây thông lớn cách 15 ft về hướng Đông Nam gây bóng vừa phải buổi sáng lên chuỗi pin 2, từ 08:00 tới khoảng 10:45. Nên dùng micro-inverter.',
            },
          },
        ],
        dropzones: [
          {
            id: 'shading-add',
            icon: 'add_photo_alternate',
            title: '+ Thêm vật gây bóng',
            hint: 'Ống khói, ống thông hơi, nóc mái nhà bên',
            actionLabel: 'Tải ảnh lên',
            actionIcon: 'add',
            required: false,
          },
        ],
      },
    ],
    dock: {
      icon: 'sync_saved_locally',
      title: 'Đang tự đồng bộ',
      descriptionTemplate:
        'Đã sao lưu toàn bộ {total} ảnh. Chụp nốt {remaining} ảnh bắt buộc để hoàn tất bàn giao hồ sơ.',
      saveDraft: 'Lưu nháp',
      complete: 'Lưu & hoàn tất hồ sơ công trình',
    },
    toasts: {
      saved: 'Đã lưu nháp trên máy (ngoại tuyến).',
      completed: 'Hồ sơ công trình SS-8842 đã chuyển sang CAD kinh doanh.',
      verifiedAll: 'Đã đánh dấu tất cả ảnh là đã xác minh.',
      annotationSaved: 'Đã lưu chú thích cho ảnh này.',
    },
  },
}

export type SurveyPhotoProgress = {
  /** Tổng số ảnh đã chụp, gồm cả section tuỳ chọn */
  total: number
  /** Số ảnh bắt buộc đã chụp / cần chụp */
  captured: number
  required: number
  percent: number
  remaining: number
  /** "Mục A (2/3), Mục B (2/2), ..." */
  breakdown: string
}

/** Tính lại tiến độ từ `sections` để các con số trên trang luôn khớp nhau. */
export function getSurveyPhotoProgress(doc: SurveyPhotoDoc): SurveyPhotoProgress {
  let total = 0
  let captured = 0
  let required = 0
  const parts: string[] = []

  for (const section of doc.sections) {
    const shots = section.photos.length
    total += shots
    const letter = section.title.split(':')[0] ?? section.title
    if (section.requiredCount > 0) {
      captured += Math.min(shots, section.requiredCount)
      required += section.requiredCount
      parts.push(`${letter} (${shots}/${section.requiredCount})`)
    } else {
      parts.push(`${letter} (${shots} ${doc.progress.optionalLabel})`)
    }
  }

  return {
    total,
    captured,
    required,
    percent: required === 0 ? 100 : Math.round((captured / required) * 100),
    remaining: Math.max(0, required - captured),
    breakdown: parts.join(', '),
  }
}

export function getSurveyPhotoDocById(id: string | undefined): SurveyPhotoDoc | undefined {
  return id ? surveyPhotoDocs[id] : undefined
}

export function findSurveyPhotoById(doc: SurveyPhotoDoc, photoId: string): SurveyPhotoAsset | undefined {
  for (const section of doc.sections) {
    const photo = section.photos.find((candidate) => candidate.id === photoId)
    if (photo) return photo
  }
  return undefined
}

/** Ảnh mở sẵn trong Photo Inspector khi vào trang. */
export function getFirstSurveyPhoto(doc: SurveyPhotoDoc): SurveyPhotoAsset | undefined {
  return doc.sections.flatMap((section) => section.photos)[0]
}
