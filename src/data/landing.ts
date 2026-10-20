// Nội dung trang chủ: hero, giải pháp, quy trình, mời đăng ký khảo sát
// Chưa có nguồn thật thì không đưa số liệu tiết kiệm, số khách hàng hay đánh giá

export const pageTitle = 'Smart Solar | Giải pháp điện mặt trời cho ngôi nhà của bạn'

export const header = {
  solution: 'Giải pháp',
  process: 'Quy trình',
  products: 'Sản phẩm',
  login: 'Đăng nhập',
  workspace: 'Vào trang làm việc',
  register: 'Đăng ký khảo sát',
  menu: 'Menu',
  skip: 'Bỏ qua, tới nội dung chính',
}

// Nút sáng / tối: tên đọc cố định kèm aria-pressed, tooltip nói việc sẽ làm khi bấm
export const themeToggle = {
  label: 'Giao diện tối',
  toDark: 'Chuyển sang giao diện tối',
  toLight: 'Chuyển sang giao diện sáng',
}

// Ảnh ngày cho giao diện sáng, ảnh đêm cho giao diện tối. `wide` cho màn từ 768px, `crop` cho điện thoại
// index.html tải trước ảnh với đúng srcset / sizes này, đổi ở đây thì phải đổi cả ở đó
export const heroImages = {
  wide: { widths: [1280, 1920, 2560, 3840], width: 3840, height: 2160, sizes: '(min-width: 1024px) 100vw, 140vw' },
  crop: { widths: [640, 960, 1280, 1600], width: 1600, height: 1600, sizes: '120vw' },
  scene: { light: 'day', dark: 'night' },
} as const

/* Bạn là ai, bạn làm gì. */
export const hero = {
  // U+00A0 giữ cụm từ trên một dòng khi xuống hàng
  title: 'Giải pháp điện mặt trời cho ngôi nhà của bạn',
  lede: 'Khảo sát nhu cầu, tư vấn lắp đặt và quản lý bảo hành, bảo trì trên cùng một nền tảng.',
  cta: 'Đăng ký khảo sát',
  secondary: 'Khám phá giải pháp',
}

// Giải pháp: ba chức năng đang có của nền tảng
export const solution = {
  id: 'giai-phap',
  title: 'Từ khảo sát đến bảo trì, mọi việc nằm trong một tài khoản',
  lede: 'Smart Solar đi cùng gia đình bạn trong cả vòng đời hệ thống: trước khi lắp, lúc lắp và trong những năm sử dụng.',
  products: 'Xem tấm pin và thiết bị đang bán',
  // Mô hình 3D tấm pin dưới phần chữ (solar-panel-showcase.tsx)
  model: {
    label:
      'Mô hình 3D một tấm pin mặt trời: mặt kính phủ các ô quang điện xanh đen, khung nhôm, mặt sau có hộp đấu dây.',
    alt: 'Tấm pin mặt trời nhìn chéo: mặt kính phủ các ô quang điện xanh đen trong khung nhôm.',
    hint: 'Kéo để xoay tấm pin',
    keyboard: 'Khi đang chọn mô hình, dùng phím mũi tên để xoay.',
  },
  items: [
    {
      title: 'Khảo sát nhu cầu',
      text: 'Khai kích thước, hướng và độ dốc mái nhà để xem ước tính sơ bộ số tấm pin và sản lượng điện mỗi năm.',
    },
    {
      title: 'Tư vấn lắp đặt',
      text: 'Chọn giờ khảo sát ngay trên web. Kỹ thuật viên đến tận nơi đo đạc và tư vấn phương án, thiết bị phù hợp.',
    },
    {
      title: 'Bảo hành, bảo trì',
      text: 'Thông tin lắp đặt và bảo hành lưu trong tài khoản; cần bảo trì thì gửi yêu cầu ở cùng một nơi.',
    },
  ],
}

// Quy trình làm việc, bốn bước theo thứ tự
export const workflow = {
  id: 'quy-trinh',
  title: 'Quy trình làm việc',
  steps: [
    { title: 'Cung cấp thông tin', text: 'Tạo tài khoản, khai địa chỉ và thông tin mái nhà, xem ước tính sơ bộ.' },
    { title: 'Tư vấn và khảo sát', text: 'Chọn giờ phù hợp; kỹ thuật viên đến đo đạc mái và tư vấn phương án.' },
    {
      title: 'Báo giá và lắp đặt',
      text: 'Nhận báo giá theo phương án đã thống nhất, đội kỹ thuật lắp đặt và bàn giao.',
    },
    { title: 'Bảo hành, bảo trì', text: 'Theo dõi bảo hành và gửi yêu cầu bảo trì khi hệ thống cần chăm sóc.' },
  ],
}

/* Bắt đầu thế nào: một lời mời, không phải quy trình. */
export const cta = {
  id: 'dang-ky',
  title: 'Mái nhà của bạn lắp được bao nhiêu tấm pin?',
  lede: 'Đăng ký tài khoản, khai thông tin mái nhà để xem ước tính sơ bộ, rồi chọn giờ để kỹ thuật viên đến khảo sát.',
  button: 'Đăng ký khảo sát',
  hasAccount: 'Đã có tài khoản?',
  login: 'Đăng nhập',
}

export const footer = {
  brand: 'Smart Solar',
  copyright: '© 2026 Smart Solar',
}
