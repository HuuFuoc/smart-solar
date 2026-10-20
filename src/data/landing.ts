/*
 * Nội dung trang chủ công khai "/" – nền tảng tư vấn lắp đặt, bảo hành và bảo trì điện mặt trời cho hộ gia đình
 * (người dùng đổi hướng 20/10/2026, trước đó là thi công cho nhà xưởng và doanh nghiệp).
 *
 * Thứ tự: hero (ảnh ngày / đêm theo giao diện) → giải pháp → quy trình → mời đăng ký khảo sát. Không con số tiết kiệm,
 * số khách hàng, chứng nhận, đánh giá hay thông tin liên hệ khi chưa có nguồn thật.
 */

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

/* Nút sáng / tối trên header: tên đọc cố định + aria-pressed, tooltip nói việc sẽ làm khi bấm. */
export const themeToggle = {
  label: 'Giao diện tối',
  toDark: 'Chuyển sang giao diện tối',
  toLight: 'Chuyển sang giao diện sáng',
}

/*
  Hai ảnh người dùng cung cấp (public/images/smart-solar-{day,night}-4k.png, 3840 × 2160, cùng bố cục): ngày cho giao
  diện sáng, đêm cho giao diện tối. Bản AVIF / WebP trong public/images/hero sinh từ hai ảnh đó:
    wide  cả khung 16:9, cho màn từ 768px
    crop  khung vuông cắt phần bên trái (nhà lớn, hai nhà nhỏ, dãy pin phía trước), cho điện thoại
  index.html tải trước ảnh của giao diện đang dùng với đúng các srcset / sizes này: đổi ở đây thì đổi cả ở đó.
*/
export const heroImages = {
  wide: { widths: [1280, 1920, 2560, 3840], width: 3840, height: 2160, sizes: '(min-width: 1024px) 100vw, 140vw' },
  crop: { widths: [640, 960, 1280, 1600], width: 1600, height: 1600, sizes: '120vw' },
  scene: { light: 'day', dark: 'night' },
} as const

export const hero = {
  // U+00A0 giữ cụm từ (điện mặt trời, ngôi nhà, lắp đặt, bảo trì…) trên một dòng khi xuống hàng.
  title: 'Giải pháp điện mặt trời cho ngôi nhà của bạn',
  lede: 'Khảo sát nhu cầu, tư vấn lắp đặt và quản lý bảo hành, bảo trì trên cùng một nền tảng.',
  cta: 'Đăng ký khảo sát',
  secondary: 'Khám phá giải pháp',
}

/* Giải pháp: ba việc nền tảng làm, mô tả đúng chức năng đang có (đánh giá sơ bộ, đặt giờ khảo sát, danh mục sản phẩm). */
export const solution = {
  id: 'giai-phap',
  title: 'Từ khảo sát đến bảo trì, mọi việc nằm trong một tài khoản',
  lede: 'Smart Solar đi cùng gia đình bạn trong cả vòng đời hệ thống: trước khi lắp, lúc lắp và trong những năm sử dụng.',
  products: 'Xem tấm pin và thiết bị đang bán',
  /* Mô hình 3D một tấm pin dưới phần chữ (solar-panel-showcase.tsx). */
  model: {
    label: 'Mô hình 3D một tấm pin mặt trời: mặt kính phủ các ô quang điện xanh đen, khung nhôm, mặt sau có hộp đấu dây.',
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

/* Quy trình: bốn bước theo đúng thứ tự người dùng chốt. */
export const workflow = {
  id: 'quy-trinh',
  title: 'Quy trình làm việc',
  steps: [
    { title: 'Cung cấp thông tin', text: 'Tạo tài khoản, khai địa chỉ và thông tin mái nhà, xem ước tính sơ bộ.' },
    { title: 'Tư vấn và khảo sát', text: 'Chọn giờ phù hợp; kỹ thuật viên đến đo đạc mái và tư vấn phương án.' },
    { title: 'Báo giá và lắp đặt', text: 'Nhận báo giá theo phương án đã thống nhất, đội kỹ thuật lắp đặt và bàn giao.' },
    { title: 'Bảo hành, bảo trì', text: 'Theo dõi bảo hành và gửi yêu cầu bảo trì khi hệ thống cần chăm sóc.' },
  ],
}

/* Mời bắt đầu: một câu hỏi, một nút. */
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
