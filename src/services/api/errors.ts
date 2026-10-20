import type { ApiErrorBody } from '@/types/res/apiRes'

// Lỗi API. `details` không có kiểu trong swagger nên parser nhận nhiều dạng
// Câu hiển thị: bản dịch theo `code`, nếu không có thì message của server, cuối cùng là câu theo HTTP status

/** Lỗi theo từng field, đã chuẩn hoá về { tenField: "thông báo đầu tiên" }. */
export type FieldErrors = Record<string, string>

export class ApiError extends Error {
  readonly status: number
  readonly code: string | null
  readonly fieldErrors: FieldErrors
  readonly traceId: string | null
  readonly details: unknown
  /** Số giây phải chờ theo header Retry-After (429); null khi server không gửi. */
  readonly retryAfter: number | null
  /** Câu gốc tiếng Anh của server, có khi kèm mã lý do trong ngoặc */
  readonly serverMessage: string | null

  constructor(init: {
    status: number
    message: string
    code?: string | null
    fieldErrors?: FieldErrors
    traceId?: string | null
    details?: unknown
    retryAfter?: number | null
    serverMessage?: string | null
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code ?? null
    this.fieldErrors = init.fieldErrors ?? {}
    this.traceId = init.traceId ?? null
    this.details = init.details
    this.retryAfter = init.retryAfter ?? null
    this.serverMessage = init.serverMessage ?? null
  }

  get hasFieldErrors() {
    return Object.keys(this.fieldErrors).length > 0
  }
}

// Bản dịch theo mã lỗi. Mã chưa có ở đây thì dùng message của server
const ERROR_MESSAGES: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác, hoặc tài khoản chưa thể đăng nhập.',
  AUTH_EMAIL_ALREADY_EXISTS: 'Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.',
  AUTH_VALIDATION_FAILED: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các ô được đánh dấu.',
  AUTH_VERIFICATION_TOKEN_INVALID_OR_EXPIRED: 'Liên kết xác minh không hợp lệ hoặc đã hết hạn.',
  AUTH_PASSWORD_RESET_TOKEN_INVALID_OR_EXPIRED: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
  AUTH_REFRESH_TOKEN_INVALID: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  AUTH_UNAUTHORIZED: 'Bạn cần đăng nhập để thực hiện thao tác này.',
  AUTH_TOO_MANY_REQUESTS: 'Bạn thao tác quá nhanh. Vui lòng chờ ít phút rồi thử lại.',
  // Đổi mật khẩu
  AUTH_CURRENT_PASSWORD_INVALID: 'Mật khẩu hiện tại không đúng.',
  // Sản phẩm
  CATALOG_PRODUCT_NOT_FOUND: 'Không tìm thấy sản phẩm. Có thể sản phẩm đã bị xoá.',
  // Khách hàng, đánh giá sơ bộ, yêu cầu khảo sát
  PRESURVEY_UNAUTHORIZED: 'Bạn cần đăng nhập để thực hiện thao tác này.',
  PRESURVEY_VALIDATION_FAILED: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các ô được đánh dấu.',
  CUSTOMER_ALREADY_EXISTS: 'Tài khoản này đã có hồ sơ khách hàng.',
  CUSTOMER_PROFILE_NOT_FOUND: 'Tài khoản chưa có hồ sơ khách hàng. Hãy khai báo thông tin khách hàng trước.',
  PROPERTY_SITE_NOT_FOUND: 'Không tìm thấy địa điểm lắp đặt.',
  PROPERTY_SITE_NOT_OWNED: 'Địa điểm này không thuộc tài khoản của bạn.',
  PRE_SURVEY_NOT_FOUND: 'Không tìm thấy bản đánh giá.',
  PRE_SURVEY_NOT_OWNED: 'Bản đánh giá này không thuộc tài khoản của bạn.',
  PRE_SURVEY_NOT_EDITABLE: 'Bản đánh giá đã gửi nên không sửa được nữa.',
  PRE_SURVEY_ALREADY_SUBMITTED: 'Bản đánh giá này đã được gửi trước đó.',
  PRE_SURVEY_INCOMPLETE: 'Bản đánh giá còn thiếu số liệu. Điền đủ các ô ở bước số liệu mặt lắp rồi gửi lại.',
  SURVEY_REQUEST_UNAVAILABLE: 'Yêu cầu này đã có người nhận hoặc không còn chờ xử lý.',
  SURVEY_REQUEST_NOT_FOUND: 'Không tìm thấy yêu cầu khảo sát.',
  SURVEY_REQUEST_NOT_ASSIGNED: 'Yêu cầu này không do bạn phụ trách nên không xem được chi tiết.',
  // Mặt lắp và mô phỏng
  PRE_SURVEY_CONCURRENTLY_MODIFIED:
    'Bản đánh giá vừa được sửa ở nơi khác (tab hoặc máy khác). Tải lại bản mới nhất rồi lưu lại.',
  SIMULATION_VALIDATION_FAILED: 'Cấu hình mô phỏng chưa hợp lệ. Kiểm tra lại các ô được đánh dấu.',
  SURFACE_NOT_DEFINED: 'Chưa lưu mặt lắp. Lưu kích thước mặt lắp rồi chạy mô phỏng.',
  PRODUCT_NOT_FOUND: 'Tấm pin này không còn bán. Chọn tấm pin khác.',
  PRODUCT_NOT_SOLAR_PANEL: 'Sản phẩm đã chọn không phải tấm pin. Chọn tấm pin khác.',
  PRODUCT_SPEC_INCOMPLETE: 'Tấm pin này thiếu công suất hoặc kích thước nên chưa mô phỏng được. Chọn tấm pin khác.',
  INSTALLATION_BELOW_DOCUMENTED_MINIMUM:
    'Khoảng cách đã nhập nhỏ hơn mức tối thiểu trong tài liệu của nhà sản xuất. Tăng khoảng cách rồi chạy lại.',
  INSTALLATION_PARAMETER_REQUIRED: 'Thiếu một khoảng cách lắp đặt bắt buộc. Nhập đủ các ô khoảng cách rồi chạy lại.',
  PANEL_FACES_INTO_SURFACE:
    'Với góc và hướng này, mặt tấm pin sẽ quay vào mặt mái. Đổi hướng tấm hoặc giảm góc nghiêng.',
  PANEL_ORIENTATION_UNSUPPORTED: 'Bản mô phỏng chưa hỗ trợ góc và hướng tấm pin này. Thử góc nghiêng hoặc hướng khác.',
  SIMULATION_LAYOUT_LIMIT_EXCEEDED:
    'Bố trí vượt 5.000 tấm, giới hạn của bản mô phỏng sơ bộ. Thu nhỏ mặt lắp hoặc chọn tấm pin lớn hơn.',
  SIMULATION_SOURCE_CHANGED: 'Mặt lắp vừa thay đổi sau lần tải trước. Đã tải lại mặt lắp, hãy chạy mô phỏng lại.',
  SIMULATION_NOT_FOUND: 'Không tìm thấy lần mô phỏng này.',
  SIMULATION_ACCESS_DENIED: 'Bạn không có quyền xem mô phỏng của bản đánh giá này.',
  // Lịch khảo sát
  SCHEDULING_VALIDATION_FAILED: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các ô được đánh dấu.',
  SURVEY_SLOT_UNAVAILABLE: 'Giờ vừa chọn không còn trống. Danh sách giờ đã được tải lại, hãy chọn giờ khác.',
  SURVEY_BOOKING_ALREADY_EXISTS: 'Yêu cầu này đã có lịch hẹn. Tải lại trang để xem lịch hiện tại.',
  SURVEY_BOOKING_NOT_FOUND: 'Yêu cầu này chưa có lịch hẹn đang hiệu lực.',
  INVALID_BOOKING_TIME:
    'Giờ này không đặt được: giờ bắt đầu phải theo mốc 30 phút, nằm trọn trong giờ làm của kỹ thuật viên, chưa qua và trong 30 ngày tới.',
  INVALID_BOOKING_STATE:
    'Lịch hẹn đã đổi trạng thái (đã phân công, đã qua giờ hoặc đã huỷ) nên không làm được thao tác này. Tải lại để xem trạng thái mới.',
  TECHNICIAN_NOT_AVAILABLE: 'Kỹ thuật viên này không nhận được lịch vào giờ đó. Tải lại danh sách và chọn người khác.',
  TECHNICIAN_NOT_FOUND: 'Không tìm thấy kỹ thuật viên.',
  TECHNICIAN_NOT_ASSIGNED: 'Lịch này không giao cho bạn.',
  TRAVEL_ROUTE_UNAVAILABLE: 'Không tìm được đường đi tới công trình. Kiểm tra lại toạ độ của địa điểm.',
  TRAVEL_PROVIDER_UNAVAILABLE:
    'Dịch vụ tính đường đi (Vietmap) đang lỗi nên chưa kiểm tra được giờ này. Thử lại sau ít phút.',
  TRAVEL_PROVIDER_QUOTA_EXCEEDED: 'Đã hết lượt tính đường đi của Vietmap. Thử lại sau.',
  APPOINTMENT_CONCURRENCY_CONFLICT: 'Lịch hẹn vừa được thay đổi ở nơi khác. Đã tải lại, hãy thử lại.',
  PROPERTY_SITE_LOCATION_REQUIRED: 'Địa điểm chưa có toạ độ GPS hợp lệ nên chưa tính được đường đi và giờ khảo sát.',
  APPOINTMENT_NOT_FOUND: 'Không tìm thấy lịch hẹn, hoặc lịch không còn giao cho bạn.',
  TECHNICIAN_HAS_CONFLICTING_APPOINTMENTS:
    'Thay đổi này làm hỏng lịch hẹn đã có. Đổi giờ hoặc chuyển các lịch bên dưới cho người khác trước.',
  TECHNICIAN_PROFILE_REQUIRED: 'Lưu hồ sơ lịch của kỹ thuật viên (nơi xuất phát) trước.',
  // Quản lý tài khoản
  ADMIN_USER_NOT_FOUND: 'Không tìm thấy tài khoản.',
  ADMIN_INVALID_ROLE: 'Vai trò không hợp lệ.',
  ADMIN_INVALID_STATUS_TRANSITION:
    'Không chuyển được sang trạng thái này. Tài khoản chưa xác minh email thì gửi link kích hoạt; chỉ tài khoản đang hoạt động mới tạm khoá được.',
  ADMIN_LAST_ACTIVE_ADMIN: 'Đây là quản trị viên đang hoạt động cuối cùng. Cấp quyền quản trị cho người khác trước.',
  ADMIN_CANNOT_MODIFY_OWN_ACCOUNT: 'Bạn không thể đổi trạng thái hay xoá chính tài khoản của mình.',
  ACCOUNT_HAS_ACTIVE_WORK:
    'Tài khoản còn lịch khảo sát sắp tới hoặc yêu cầu khảo sát đang xử lý. Chuyển các việc này cho người khác trước.',
  ADMIN_USER_DELETED: 'Tài khoản đã bị xoá nên không sửa được.',
  ADMIN_RECOVERY_NOT_ALLOWED: 'Tài khoản đang tạm khoá hoặc bị vô hiệu: kích hoạt lại trước khi gửi link.',
  // Mã chung
  AUTH_FORBIDDEN: 'Tài khoản của bạn không có quyền xem nội dung này.',
  RESOURCE_NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu. Kiểm tra lại đường dẫn.',
  REQUEST_NOT_ACCEPTABLE: 'Máy chủ không hỗ trợ thao tác này.',
}

/** Bản dịch theo mã lỗi; chưa có trong bảng thì trả null. */
export function messageForCode(code: string | null | undefined) {
  if (!code) return null
  return ERROR_MESSAGES[code] ?? null
}

/** Thông báo mặc định theo HTTP status khi server không trả message. */
const STATUS_MESSAGES: Record<number, string> = {
  400: 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.',
  // Đăng nhập sai luôn có mã AUTH_INVALID_CREDENTIALS; 401 không mã chỉ còn là phiên hết hạn.
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu yêu cầu.',
  409: 'Dữ liệu đã tồn tại trên hệ thống.',
  422: 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.',
  429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
  500: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
  502: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
  503: 'Máy chủ đang bảo trì. Vui lòng thử lại sau.',
}

/** Mất mạng / không gọi được server (status = 0). */
export const NETWORK_ERROR_MESSAGE = 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'

export function messageForStatus(status: number) {
  if (status === 0) return NETWORK_ERROR_MESSAGE
  return STATUS_MESSAGES[status] ?? 'Đã xảy ra lỗi. Vui lòng thử lại.'
}

function firstString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item)
      if (found) return found
    }
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Chuẩn hoá `details` về { field: message }. Nhận 3 dạng:
// { email: ["..."] }, [{ field, message }], { errors: { ... } }
// Dạng khác trả về {}
export function parseFieldErrors(details: unknown): FieldErrors {
  if (!details) return {}

  // Dạng 3: mở lớp bọc "errors" rồi xử lý tiếp như dạng 1.
  if (isRecord(details) && 'errors' in details && (isRecord(details.errors) || Array.isArray(details.errors))) {
    return parseFieldErrors(details.errors)
  }

  // Dạng 2
  if (Array.isArray(details)) {
    const result: FieldErrors = {}
    for (const item of details) {
      if (!isRecord(item)) continue
      const field = firstString(item.field ?? item.name ?? item.propertyName ?? item.key)
      const message = firstString(item.message ?? item.error ?? item.errorMessage ?? item.description)
      if (field && message && !(field in result)) result[field] = message
    }
    return result
  }

  // Dạng 1
  if (isRecord(details)) {
    const result: FieldErrors = {}
    for (const [field, value] of Object.entries(details)) {
      const message = firstString(value)
      if (message) result[field] = message
    }
    return result
  }

  return {}
}

/** Retry-After dạng số giây hoặc ngày giờ HTTP */
export function parseRetryAfter(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds))
  const at = Date.parse(value)
  return Number.isNaN(at) ? null : Math.max(0, Math.ceil((at - Date.now()) / 1000))
}

/** Dựng ApiError từ payload lỗi của server (đã có wrapper hoặc chỉ có ApiError). */
export function toApiError(status: number, body: unknown, retryAfter: number | null = null): ApiError {
  let raw: ApiErrorBody | null = null
  let traceId: string | null = null

  if (isRecord(body)) {
    traceId = firstString(body.traceId)
    if (isRecord(body.error)) raw = body.error as ApiErrorBody
    else if ('code' in body || 'message' in body) raw = body as ApiErrorBody
  }

  const code = firstString(raw?.code)
  const serverMessage = firstString(raw?.message)
  const fieldErrors = parseFieldErrors(raw?.details)

  return new ApiError({
    status,
    // Ưu tiên bản dịch theo mã, rồi message của server, cuối cùng là câu theo status
    message:
      messageForCode(code) ?? serverMessage ?? firstString(Object.values(fieldErrors)) ?? messageForStatus(status),
    code,
    fieldErrors,
    traceId,
    details: raw?.details,
    retryAfter,
    serverMessage,
  })
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function errorMessage(error: unknown, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.') {
  if (isApiError(error)) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}
