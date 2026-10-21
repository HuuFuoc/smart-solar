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
  ADMINISTRATIVE_LOCATION_UNKNOWN: 'Phường, xã này không có trong danh mục. Chọn lại trong danh sách.',
  ADMINISTRATIVE_LOCATION_SUPERSEDED:
    'Phường, xã này đã sáp nhập hoặc đổi tên. Chọn phường, xã hiện tại trong danh sách.',
  ADMINISTRATIVE_LOCATION_OUT_OF_SERVICE_AREA: 'Hiện Smart Solar chỉ nhận công trình tại TP.HCM.',
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
  SIMULATION_EXPIRED: 'Kết quả lần chạy này đã hết hạn (hệ thống chỉ giữ 24 giờ). Chạy lại mô phỏng.',
  SIMULATION_CACHE_UNAVAILABLE: 'Tạm thời không đọc được kết quả mô phỏng. Thử lại sau ít phút.',
  SIMULATION_SELECTION_CONFLICT: 'Mô phỏng chính vừa được đổi ở nơi khác. Đã tải lại, hãy chọn lại.',
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
  APPOINTMENT_CONCURRENCY_CONFLICT: 'Lịch hẹn vừa được thay đổi ở nơi khác. Đã tải lại, hãy thử lại.',
  SITE_LOCATION_REQUIRED: 'Địa điểm chưa có mã phường, xã nên chưa biết thuộc khu vực nào để xếp kỹ thuật viên.',
  NO_ZONE_COVERAGE: 'Phường, xã của công trình chưa thuộc khu vực phục vụ nào. Bộ phận kinh doanh sẽ liên hệ xếp lịch.',
  ZONE_NOT_SERVICEABLE: 'Khu vực của công trình đang tạm ngừng nhận lịch.',
  NO_ZONE_TECHNICIAN: 'Khu vực của công trình chưa có kỹ thuật viên. Bộ phận kinh doanh sẽ liên hệ xếp lịch.',
  NO_AVAILABLE_TECHNICIAN: 'Kỹ thuật viên của khu vực đã kín lịch. Chọn ngày khác.',
  SCHEDULE_CONFLICT: 'Giờ này kỹ thuật viên của khu vực đã kín lịch. Chọn giờ khác.',
  APPOINTMENT_ALREADY_TAKEN: 'Lịch này vừa có người nhận trước. Danh sách đã được tải lại.',
  SURVEY_REQUEST_NOT_OWNED: 'Bạn chưa nhận yêu cầu này nên chưa phân công được. Nhận yêu cầu trước.',
  ASSIGNMENT_REASON_REQUIRED: 'Ghi lý do phân công.',
  TECHNICIAN_OUTSIDE_ZONE: 'Kỹ thuật viên này không thuộc khu vực của công trình.',
  SITE_HAS_ACTIVE_BOOKING: 'Địa điểm đang có lịch khảo sát nên chưa đổi được vị trí.',
  APPOINTMENT_NOT_FOUND: 'Không tìm thấy lịch hẹn, hoặc lịch không còn giao cho bạn.',
  TECHNICIAN_HAS_CONFLICTING_APPOINTMENTS:
    'Thay đổi này làm hỏng lịch hẹn đã có. Đổi giờ hoặc chuyển các lịch bên dưới cho người khác trước.',
  TECHNICIAN_PROFILE_REQUIRED: 'Lưu hồ sơ nhận lịch của kỹ thuật viên trước.',
  // Lắp đặt (mọi vai trò)
  FEATURE_PENDING_MIGRATION: 'Chức năng lắp đặt đang tạm tắt. Liên hệ quản trị hệ thống.',
  VALIDATION_FAILED: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các ô được đánh dấu.',
  INSTALLATION_PROJECT_NOT_FOUND: 'Không tìm thấy công trình, hoặc bạn không còn quyền xem công trình này.',
  INSTALLATION_INVALID_STATE:
    'Công trình đã đổi trạng thái nên không làm được thao tác này. Tải lại để xem trạng thái mới.',
  INSTALLATION_STALE_REVISION: 'Công trình vừa được cập nhật ở nơi khác. Đã tải lại, kiểm tra rồi thử lại.',
  INSTALLATION_REASON_REQUIRED: 'Ghi lý do.',
  INSTALLATION_NOT_HANDED_OVER: 'Công trình chưa được bàn giao.',
  INSTALLATION_EVIDENCE_NOT_FOUND: 'Không tìm thấy ảnh này trong công trình.',
  INSTALLATION_EVIDENCE_OBJECT_MISSING: 'Ảnh này không còn nên không xem được nữa.',
  // Lắp đặt: kỹ thuật viên
  INSTALLATION_ASSIGNMENT_NOT_PENDING:
    'Bạn đã nhận việc này nên không từ chối được nữa. Báo quản lý nếu cần đổi người.',
  INSTALLATION_ASSIGNMENT_NOT_ACCEPTED: 'Nhận việc trước rồi mới thi công được.',
  INSTALLATION_TOO_EARLY_TO_START: 'Chưa tới ngày thi công nên chưa bắt đầu được.',
  INSTALLATION_SCHEDULE_EXPIRED: 'Đã hết khung giờ thi công. Báo quản lý xếp lại lịch trước khi bắt đầu.',
  INSTALLATION_CHECKLIST_INCOMPLETE: 'Quản lý chưa hoàn tất các hạng mục bắt buộc trước thi công.',
  INSTALLATION_EVIDENCE_REQUIRED: 'Cần ít nhất một ảnh thi công của lượt này trước khi gửi báo cáo hoàn thành.',
  INSTALLATION_ASSETS_REQUIRED: 'Ghi tấm pin và inverter đã lắp trước khi gửi báo cáo hoàn thành.',
  INSTALLATION_DUPLICATE_SERIAL: 'Số serial này đã được ghi trên hệ thống (trùng hãng và serial). Kiểm tra lại.',
  // Lắp đặt: quản lý
  INSTALLATION_CONTRACT_NOT_FOUND: 'Không tìm thấy hợp đồng.',
  INSTALLATION_CONTRACT_NOT_PAID: 'Hợp đồng chưa được xác nhận thanh toán đủ nên chưa tạo được dự án thi công.',
  INSTALLATION_PROJECT_EXISTS: 'Hợp đồng này đã có dự án thi công. Danh sách đã được tải lại.',
  INSTALLATION_CHECKLIST_ITEM_NOT_FOUND: 'Không tìm thấy hạng mục này trong checklist. Tải lại trang.',
  INSTALLATION_INVALID_SCHEDULE:
    'Khoảng thời gian chưa hợp lệ: kết thúc phải sau bắt đầu, bắt đầu ở tương lai, trong vòng một năm tới và không dài quá số ngày hệ thống cho phép cho một lần phân công.',
  CROSS_ZONE_AUTHORIZATION_REQUIRED:
    'Kỹ thuật viên này không thuộc khu vực của công trình: đánh dấu cho phép phân công ngoài khu vực và ghi lý do.',
  TECHNICIAN_SCHEDULE_CONFLICT:
    'Kỹ thuật viên đã có lịch khác (hoặc chưa đủ thời gian nghỉ giữa hai việc) trong khoảng này. Chọn người khác hoặc đổi thời gian.',
  TECHNICIAN_ON_LEAVE: 'Kỹ thuật viên nghỉ trong khoảng thời gian này.',
  OUTSIDE_WORKING_HOURS: 'Khoảng thời gian nằm ngoài ngày làm hoặc giờ làm của kỹ thuật viên.',
  TECHNICIAN_SCHEDULING_DISABLED: 'Kỹ thuật viên đang tắt nhận lịch.',
  TECHNICIAN_INACTIVE: 'Tài khoản này không phải kỹ thuật viên đang hoạt động.',
  // Tải tệp lên kho
  FILE_INVALID_PURPOSE: 'Mục đích tải tệp không hợp lệ.',
  FILE_UPLOAD_NOT_ALLOWED: 'Tài khoản của bạn không được tải loại tệp này lên.',
  FILE_TYPE_NOT_ALLOWED: 'Loại tệp này không được nhận ở đây. Kiểm tra loại tệp và đuôi tên tệp.',
  FILE_TOO_LARGE: 'Tệp rỗng hoặc lớn hơn cỡ cho phép.',
  FILE_BUCKET_NOT_ALLOWED: 'Chức năng tải tệp đang tạm tắt. Liên hệ quản trị hệ thống.',
  FILE_INVALID_OBJECT_KEY: 'Vị trí lưu tệp không hợp lệ. Tải lại tệp.',
  FILE_ALREADY_REGISTERED: 'Tệp này đã được đăng ký. Tải lại tệp.',
  FILE_NOT_FOUND: 'Không tìm thấy tệp, hoặc tệp do tài khoản khác tải lên.',
  FILE_NOT_VERIFIED: 'Tệp chưa được xác minh nên chưa dùng được.',
  FILE_WRONG_PURPOSE: 'Tệp này được tải lên cho việc khác nên không dùng ở đây được.',
  FILE_NOT_OWNED: 'Tệp này do tài khoản khác tải lên.',
  FILE_ALREADY_LINKED: 'Ảnh này đã được gắn trước đó.',
  FILE_CONTENT_CHANGED: 'Tệp trên kho đã thay đổi sau khi xác minh nên không dùng được nữa.',
  FILE_STORAGE_UNAVAILABLE: 'Hệ thống chưa kiểm tra được tệp. Thử lại sau ít phút.',
  FILE_NOT_SIGNABLE: 'Không mở được tệp này.',
  FILE_OBJECT_MISSING: 'Tệp này không còn nữa.',
  STORAGE_NOT_CONFIGURED: 'Chức năng tải tệp đang tạm tắt. Liên hệ quản trị hệ thống.',
  STORAGE_UNAVAILABLE: 'Tạm thời chưa mở được tệp. Thử lại sau ít phút.',
  // Gói dịch vụ sau lắp đặt (khách hàng). Mua gói dùng mã PROJECT_NOT_FOUND khi không tìm thấy hợp đồng
  AFTER_SALES_PROJECT_NOT_FOUND: 'Không tìm thấy hợp đồng hoặc công trình này trong tài khoản của bạn.',
  AFTER_SALES_VALIDATION_FAILED: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các ô được đánh dấu.',
  AFTER_SALES_INVALID_STATE: 'Trạng thái đã thay đổi nên không làm được thao tác này. Tải lại để xem trạng thái mới.',
  AFTER_SALES_STALE_REVISION: 'Dữ liệu vừa được cập nhật ở nơi khác. Đã tải lại, kiểm tra rồi thử lại.',
  AFTER_SALES_REASON_REQUIRED: 'Ghi lý do.',
  SERVICE_PACKAGE_NOT_FOUND: 'Không tìm thấy gói này. Danh sách gói đã được tải lại.',
  SERVICE_PACKAGE_INACTIVE: 'Gói này đã ngừng bán. Danh sách gói đã được tải lại.',
  SERVICE_SUBSCRIPTION_NOT_FOUND: 'Không tìm thấy gói đã mua.',
  SERVICE_SUBSCRIPTION_OVERLAP:
    'Hợp đồng này đã có một kỳ gói cùng loại đã thanh toán và chưa bắt đầu. Mỗi loại chỉ mua trước được một kỳ.',
  // Bảo hành, sửa chữa, bảo trì
  AFTER_SALES_NOT_HANDED_OVER: 'Công trình chưa bàn giao nên chưa gửi yêu cầu bảo hành, bảo trì được.',
  SERVICE_REQUEST_NOT_FOUND: 'Không tìm thấy yêu cầu này.',
  SERVICE_ITEM_NOT_FOUND: 'Không tìm thấy hạng mục này. Đã tải lại, kiểm tra rồi thử lại.',
  SERVICE_VISIT_NOT_FOUND: 'Không tìm thấy buổi hẹn, hoặc buổi hẹn không còn giao cho bạn.',
  SERVICE_QUOTATION_NOT_FOUND: 'Không tìm thấy báo giá.',
  SERVICE_QUOTATION_EXPIRED: 'Báo giá đã hết hạn. Liên hệ Smart Solar để nhận báo giá mới.',
  AFTER_SALES_ASSET_NOT_FOUND: 'Thiết bị đã chọn không thuộc công trình này.',
  AFTER_SALES_PAYMENT_REQUIRED: 'Khách chưa thanh toán phần phải trả tiền nên chưa làm được.',
  AFTER_SALES_EVIDENCE_REQUIRED: 'Cần ít nhất một ảnh hiện trường của buổi này trước khi gửi báo cáo.',
  AFTER_SALES_CHANGE_TOO_LATE: 'Đã quá hạn đổi hoặc huỷ trên mạng. Liên hệ Smart Solar.',
  AFTER_SALES_TECHNICIAN_UNAVAILABLE:
    'Kỹ thuật viên không nhận được buổi hẹn vào giờ này (trùng lịch, nghỉ hoặc ngoài giờ làm). Chọn người khác hoặc đổi giờ.',
  MAINTENANCE_BOOKING_TOO_SOON: 'Ngày hẹn quá gần so với thời gian phải đặt trước. Chọn ngày xa hơn.',
  SALES_TASK_NOT_FOUND: 'Không tìm thấy việc này.',
  SALES_TASK_ALREADY_CLAIMED: 'Việc này vừa có người nhận trước. Danh sách đã được tải lại.',
  // Thanh toán PayOS
  PAYMENT_CHECKOUT_IN_PROGRESS:
    'Đang có một lần thanh toán chưa xong cho gói cùng loại hoặc cho hợp đồng này. Thanh toán hoặc huỷ đơn đó trước.',
  PAYMENT_PROVIDER_NOT_CONFIGURED: 'Thanh toán trực tuyến đang tạm tắt. Liên hệ Smart Solar.',
  PAYMENT_PROVIDER_ERROR: 'PayOS chưa tạo được link thanh toán. Thử lại sau ít phút.',
  PAYMENT_AMOUNT_NOT_SUPPORTED: 'Số tiền thanh toán không hợp lệ hoặc vượt giới hạn của một lần thanh toán.',
  PAYMENT_TOO_MANY_ATTEMPTS: 'Bạn đã tạo nhiều link thanh toán trong ít phút. Chờ một lát rồi thử lại.',
  PAYMENT_ATTEMPT_NOT_FOUND: 'Không tìm thấy lần thanh toán này.',
  PAYMENT_CONTRACT_NOT_FOUND: 'Không tìm thấy hợp đồng.',
  PAYMENT_CONTRACT_NOT_SIGNED: 'Hợp đồng chưa được duyệt bản ký nên chưa thanh toán được.',
  PAYMENT_ALREADY_PAID: 'Hợp đồng này đã được thanh toán. Danh sách đã được tải lại.',
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
  REQUEST_NOT_ACCEPTABLE: 'Hệ thống không hỗ trợ thao tác này.',
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
  500: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
  502: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
  503: 'Hệ thống đang bảo trì. Vui lòng thử lại sau.',
}

/** Mất mạng / không gọi được server (status = 0). */
export const NETWORK_ERROR_MESSAGE = 'Không kết nối được Smart Solar. Kiểm tra mạng rồi thử lại.'

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
