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
  'Cho biết bạn lắp đặt cho cá nhân hay doanh nghiệp. Chỉ khai một lần cho tài khoản này.',
  'Công trình ở đâu và tấm pin sẽ lắp trên bề mặt nào.',
  'Đo mặt mái định lắp, chọn hướng mái và đánh dấu các vật cản trên mái.',
  'Chọn tấm pin và kiểu lắp để xem xếp được bao nhiêu tấm và ước tính sản lượng điện.',
  'Kiểm tra lại thông tin rồi gửi. Gửi xong bạn chọn ngày giờ để kỹ thuật viên tới khảo sát.',
]

/** Tên bước trên URL (?buoc=...) */
export const STEP_SLUGS = ['ho-so', 'dia-diem', 'mat-lap', 'mo-phong', 'xem-lai']
