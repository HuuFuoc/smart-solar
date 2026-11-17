// Các bước của wizard đánh giá sơ bộ, theo đúng thứ tự
export const STEP = {
  PROFILE: 0,
  SITE: 1,
  SURFACE: 2,
  SIMULATION: 3,
  REVIEW: 4,
} as const

/** Tên bước hiện trên thanh các bước */
export const STEP_LABELS = ['Thông tin khách hàng', 'Địa điểm lắp đặt', 'Mặt lắp', 'Mô phỏng', 'Xem lại và gửi']

/** Câu mô tả dưới tiêu đề trang, cho khách biết bước này làm gì */
export const STEP_HINTS = [
  'Chỉ khai một lần cho tài khoản này.',
  '',
  'Nhập kích thước, hướng mái và các vật cản trên mái.',
  'Chọn tấm pin và kiểu lắp để xem số tấm và sản lượng ước tính.',
  'Gửi xong bạn chọn giờ để kỹ thuật viên tới khảo sát trong 30 ngày tới.',
]

/** Tên bước trên URL (?buoc=...) */
export const STEP_SLUGS = ['ho-so', 'dia-diem', 'mat-lap', 'mo-phong', 'xem-lai']
