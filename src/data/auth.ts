// Nội dung các màn xác thực

// Ảnh cột trái của AuthLayout. Chữ đã in sẵn trong ảnh nên `alt` chép lại đúng câu đó
export const authImages = {
  login: {
    src: '/images/login-1122.webp',
    srcSet: '/images/login-640.webp 640w, /images/login-1122.webp 1122w',
    alt: 'Chào mừng trở lại. Cùng doanh nghiệp tối ưu năng lượng sạch. Ảnh toà văn phòng và nhà xưởng có tấm pin trên mái lúc hoàng hôn.',
  },
  register: {
    src: '/images/register-1122.webp',
    srcSet: '/images/register-640.webp 640w, /images/register-1122.webp 1122w',
    alt: 'Bắt đầu hành trình chuyển đổi xanh. Đồng hành cùng doanh nghiệp phát triển bền vững. Ảnh mái nhà xưởng phủ tấm pin, phía xa là thành phố.',
  },
} as const

export const authLayoutContent = {
  home: 'Về trang chủ',
  brand: 'Smart Solar',
  copyright: '© 2026 Smart Solar',
} as const

/** /login */
export const loginContent = {
  title: 'Chào mừng trở lại với Smart Solar',
  emailLabel: 'Địa chỉ Email',
  emailPlaceholder: 'ten.ban@gmail.com',
  emailValid: 'Email hợp lệ',
  passwordLabel: 'Mật khẩu',
  // Chấm tròn làm ô trống trông như đã điền: dùng lời nhắc.
  passwordPlaceholder: 'Nhập mật khẩu',
  forgotLink: 'Quên mật khẩu?',
  remember: 'Ghi nhớ đăng nhập trên thiết bị này',
  submit: 'Đăng nhập',
  submitting: 'Đang đăng nhập...',
  errorTitle: 'Lỗi xác thực thông tin',
  errorMessage: 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.',
  notVerifiedLink: 'Tài khoản chưa xác thực email? Sang trang xác thực',
  quickTitle: 'Thử nhanh theo các vai trò:',
  expiredLabel: 'Hết hạn phiên',
  expiredHint: 'Xem hộp thoại hết phiên',
  noAccount: 'Chưa có tài khoản? ',
  registerLink: 'Đăng ký ngay',
  toastSuccess: 'Đã đăng nhập',
} as const

/** /register */
export const registerContent = {
  title: 'Đăng ký tài khoản Khách hàng',
  nameLabel: 'Họ và tên',
  namePlaceholder: 'Nguyễn Văn A',
  emailLabel: 'Địa chỉ Email',
  emailPlaceholder: 'nguyen.a@gmail.com',
  phoneLabel: 'Số điện thoại',
  phonePlaceholder: '0912 xxx xxx',
  passwordLabel: 'Mật khẩu mới',
  confirmLabel: 'Xác nhận mật khẩu',
  // Chấm tròn làm ô trống trông như đã điền: dùng lời nhắc.
  passwordPlaceholder: 'Nhập mật khẩu',
  rulesTitle: 'Quy chuẩn an toàn mật khẩu:',
  termsBefore: 'Tôi đồng ý với ',
  termsLink: 'Điều khoản sử dụng',
  termsMiddle: ' và ',
  privacyLink: 'Chính sách bảo mật',
  termsAfter: ' của Smart Solar.',
  submit: 'Tạo tài khoản',
  submitting: 'Đang tạo tài khoản...',
  hasAccount: 'Đã có tài khoản? ',
  loginLink: 'Đăng nhập',
  toastSuccess: 'Đã tạo tài khoản. Kiểm tra email để kích hoạt.',
} as const

/** /forgot-password */
export const forgotContent = {
  title: 'Quên mật khẩu?',
  emailLabel: 'Địa chỉ Email đã đăng ký',
  emailPlaceholder: 'ten.ban@gmail.com',
  notice: 'Nếu email này được đăng ký trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu trong hộp thư đến.',
  submit: 'Gửi hướng dẫn',
  submitting: 'Đang gửi...',
  cancel: 'Hủy',
  toastSuccess: 'Đã gửi yêu cầu đặt lại mật khẩu',
} as const

/** /reset-password */
export const resetContent = {
  // Chỉ biết link có mã, chưa biết mã còn hạn: server kiểm tra khi bấm đặt lại.
  tokenValid: 'Đã nhận mã từ liên kết',
  tokenInvalid: 'Liên kết thiếu mã đặt lại',
  title: 'Đặt lại mật khẩu mới',
  passwordLabel: 'Mật khẩu mới',
  passwordPlaceholder: 'Nhập mật khẩu mới',
  confirmLabel: 'Xác nhận mật khẩu',
  confirmPlaceholder: 'Nhập lại mật khẩu mới',
  submit: 'Đặt lại mật khẩu',
  submitting: 'Đang cập nhật...',
  missingToken:
    'Liên kết đặt lại mật khẩu không đầy đủ hoặc không hợp lệ. Hãy mở lại liên kết trong email, hoặc yêu cầu gửi lại.',
  failedMessage: 'Liên kết đã hết hạn hoặc không còn đúng.',
  requestNewLink: 'Gửi lại liên kết',
  success: 'Mật khẩu của bạn đã được cập nhật thành công. Đang chuyển hướng...',
  toastSuccess: 'Đã đặt lại mật khẩu',
} as const

/** /verify-email */
export const verifyContent = {
  title: 'Xác minh email của bạn',
  description: 'Chúng tôi đã gửi một thư liên kết kích hoạt tài khoản an toàn đến hòm thư:',
  unknownEmail: 'email bạn đã đăng ký',
  missingEmail: 'Không xác định được email để gửi lại. Vui lòng đăng nhập hoặc đăng ký lại.',
  verifyingTitle: 'Đang xác minh email…',
  successTitle: 'Email đã được xác minh',
  goToLogin: 'Đăng nhập ngay',
  failedTitle: 'Liên kết xác minh không hợp lệ',
  failedMessage: 'Liên kết đã hết hạn hoặc không còn đúng. Hãy gửi lại email xác minh.',
  hint: 'Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam) và nhấp vào nút "Kích hoạt tài khoản" trong vòng 24 giờ.',
  resend: 'Gửi lại email xác minh',
  /** Nhãn lúc đang đếm ngược, %s là số giây còn lại */
  resendCountdown: 'Gửi lại sau %s giây',
  backToLogin: 'Quay lại đăng nhập',
  wrongEmail: 'Sai email đăng ký? ',
  registerAgain: 'Đăng ký lại với email khác',
  resendSeconds: 60,
  toastVerified: 'Đã xác minh email',
  toastResent: 'Đã gửi lại email xác minh',
} as const

/** /403 */
export const forbiddenContent = {
  title: 'Không có quyền truy cập trang này',
  descriptionBefore: 'Tài khoản của bạn (',
  descriptionAfter: ') không có quyền mở trang này.',
  guestLabel: 'Khách',
  switchAccount: 'Đổi tài khoản khác',
  requiredPrefix: 'Cần quyền ',
} as const

/** Dialog "Đổi mật khẩu" mở từ khối user ở Sidebar */
export const changePasswordContent = {
  title: 'Đổi mật khẩu',
  currentLabel: 'Mật khẩu hiện tại',
  newLabel: 'Mật khẩu mới',
  confirmLabel: 'Xác nhận mật khẩu mới',
  placeholder: 'Nhập mật khẩu',
  submit: 'Đổi mật khẩu',
  submitting: 'Đang cập nhật...',
  cancel: 'Huỷ',
  success: 'Đã đổi mật khẩu thành công.',
  successRelogin: 'Đã đổi mật khẩu. Vui lòng đăng nhập lại.',
  menuLabel: 'Đổi mật khẩu',
} as const

/** Modal hết hạn phiên */
export const sessionExpiredContent = {
  title: 'Phiên đăng nhập đã hết hạn',
  primary: 'Đăng nhập lại',
  secondary: 'Đóng và xem trang chủ',
} as const

/** 4 quy tắc mật khẩu trong PasswordRules */
export const passwordRules = [
  {
    id: 'length',
    label: 'Tối thiểu 8 ký tự',
    test: (value: string) => value.length >= 8,
  },
  {
    id: 'upper',
    label: 'Ít nhất 1 chữ in hoa (A-Z)',
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: 'number',
    label: 'Có ít nhất 1 chữ số (0-9)',
    test: (value: string) => /\d/.test(value),
  },
  {
    id: 'special',
    label: 'Có ký tự đặc biệt (@, #, $...)',
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const

/** Mật khẩu hợp lệ khi thỏa cả 4 quy tắc, dùng chung cho zod schema. */
export function isStrongPassword(value: string) {
  return passwordRules.every((rule) => rule.test(value))
}
