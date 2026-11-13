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
  SCHEMA_NOT_READY: 'Hệ thống đang cập nhật. Vui lòng thử lại sau ít phút.',
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
  // Rút / đóng yêu cầu (khách rút, kinh doanh đóng). Đã đóng thì không mở lại
  SURVEY_REQUEST_CLOSED: 'Yêu cầu này đã đóng nên không thay đổi được nữa.',
  SURVEY_REQUEST_CONTRACT_EXISTS: 'Yêu cầu đã có hợp đồng nên không rút hoặc đóng được.',
  SURVEY_REQUEST_APPOINTMENT_OPEN: 'Yêu cầu còn lịch khảo sát đang hẹn. Huỷ lịch trước rồi thử lại.',
  SURVEY_REQUEST_NOT_FEASIBLE_UNCONFIRMED:
    'Chỉ chọn "Khảo sát kết luận không lắp được" khi biên bản khảo sát kết luận như vậy.',
  SURVEY_REQUEST_CLOSURE_CONFLICT: 'Báo giá của yêu cầu vừa thay đổi (có thể khách vừa đồng ý). Tải lại rồi xem lại.',
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
  // Điều phối khi khu vực chưa có kỹ thuật viên nhận lịch
  DISPATCH_REQUEST_OPEN:
    'Yêu cầu đang chờ Smart Solar xếp kỹ thuật viên. Trả lời đề xuất hoặc huỷ yêu cầu xếp lịch trước.',
  DISPATCH_NOT_NEEDED: 'Khu vực của công trình đã có giờ trống vào các khung bạn chọn. Hãy đặt giờ trực tiếp.',
  DISPATCH_REQUEST_NOT_FOUND: 'Không tìm thấy yêu cầu xếp kỹ thuật viên.',
  DISPATCH_PROPOSAL_NOT_FOUND: 'Không tìm thấy đề xuất này.',
  DISPATCH_INVALID_STATE: 'Yêu cầu xếp kỹ thuật viên đã xử lý xong hoặc vừa đổi trạng thái. Tải lại để xem.',
  DISPATCH_STALE_REVISION: 'Yêu cầu vừa được cập nhật ở nơi khác. Đã tải lại, kiểm tra rồi thử lại.',
  DISPATCH_REASON_REQUIRED: 'Ghi lý do.',
  PROPOSAL_ALREADY_PENDING: 'Đang có một đề xuất chờ khách trả lời. Rút đề xuất đó trước.',
  PROPOSAL_NOT_PENDING: 'Đề xuất này đã được trả lời hoặc không còn hiệu lực.',
  PROPOSAL_EXPIRED: 'Đề xuất đã hết hạn trả lời. Smart Solar sẽ gửi đề xuất khác.',
  APPOINTMENT_RECOVERY_REASON_REQUIRED: 'Lịch đã qua giờ mà chưa khảo sát: ghi lý do đổi giờ.',
  ONSITE_SURVEY_IN_PROGRESS: 'Kỹ thuật viên đã bắt đầu khảo sát nên không đổi giờ được nữa.',
  TECHNICIAN_OUTSIDE_ZONE: 'Kỹ thuật viên này không thuộc khu vực của công trình.',
  SITE_HAS_ACTIVE_BOOKING: 'Địa điểm đang có lịch khảo sát nên chưa đổi được vị trí.',
  APPOINTMENT_NOT_FOUND: 'Không tìm thấy lịch hẹn, hoặc lịch không còn giao cho bạn.',
  TECHNICIAN_HAS_CONFLICTING_APPOINTMENTS:
    'Thay đổi này làm hỏng lịch hẹn đã có. Đổi giờ hoặc chuyển các lịch bên dưới cho người khác trước.',
  TECHNICIAN_PROFILE_REQUIRED: 'Lưu hồ sơ nhận lịch của kỹ thuật viên trước.',
  // Chức năng chưa bật trên hệ thống (lắp đặt, sau bán, kho tri thức)
  FEATURE_PENDING_MIGRATION: 'Chức năng này chưa được bật trên hệ thống. Liên hệ quản trị hệ thống.',
  // Lắp đặt (mọi vai trò)
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
  INSTALLATION_ASSET_PRODUCT_VALIDATION_FAILED:
    'Thiết bị đã chọn không khớp với danh mục sản phẩm hoặc thời hạn bảo hành không hợp lệ. Chọn đúng sản phẩm trong danh sách.',
  INSTALLATION_SUBSTITUTION_APPROVAL_REQUIRED:
    'Thiết bị đã lắp khác với hợp đồng. Quản lý cần duyệt thay đổi thiết bị trước khi gửi báo cáo hoàn thành.',
  INSTALLATION_SUBSTITUTION_CUSTOMER_APPROVAL_REQUIRED:
    'Khách hàng chưa đồng ý thay đổi thiết bị nên chưa bàn giao được.',
  INSTALLATION_NO_SUBSTITUTION: 'Thiết bị đã lắp khớp với hợp đồng nên không cần duyệt thay đổi.',
  RAG_DOCUMENT_AUDIENCE_UNCHANGED: 'Tài liệu đã ở đúng đối tượng này.',
  INSTALLATION_PREREQUISITE_MANDATORY: 'Hạng mục bắt buộc trước thi công không thể bỏ qua.',
  INSTALLATION_PREREQUISITE_EXEMPTION_NOT_AUTHORIZED: 'Chưa có quy định cho phép miễn hạng mục bắt buộc này.',
  INSTALLATION_EXEMPTION_EVIDENCE_REQUIRED: 'Cần đính kèm tài liệu chứng minh khi miễn hạng mục bắt buộc.',
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
  AFTER_SALES_MANUFACTURER_WARRANTY_POLICY_PENDING:
    'Chưa xét theo bảo hành của hãng được vì quy định xử lý chưa ban hành. Chọn hình thức khác.',
  AFTER_SALES_WARRANTY_SOURCE_UNVERIFIED:
    'Thiết bị này không có thời hạn bảo hành từ danh mục sản phẩm nên không ghi được ngày kích hoạt.',
  AFTER_SALES_WARRANTY_ACTIVATION_RECORDED: 'Thiết bị này đã có ngày kích hoạt bảo hành. Ngày đã ghi không sửa được.',
  AFTER_SALES_PAYMENT_REQUIRED: 'Khách chưa thanh toán phần phải trả tiền nên chưa làm được.',
  AFTER_SALES_EVIDENCE_REQUIRED: 'Cần ít nhất một ảnh hiện trường của buổi này trước khi gửi báo cáo.',
  AFTER_SALES_PARTS_UNAVAILABLE:
    'Chưa đủ linh kiện nên không sửa luôn được. Kết thúc buổi chờ để quản lý xếp buổi sửa.',
  AFTER_SALES_REPAIR_TIME_INSUFFICIENT:
    'Thời gian sửa vượt khung giờ của buổi này. Kết thúc buổi chờ để quản lý xếp buổi sửa riêng.',
  AFTER_SALES_CHANGE_TOO_LATE: 'Đã quá hạn đổi hoặc huỷ trên mạng. Liên hệ Smart Solar.',
  AFTER_SALES_TECHNICIAN_UNAVAILABLE:
    'Kỹ thuật viên không nhận được buổi hẹn vào giờ này (trùng lịch, nghỉ hoặc ngoài giờ làm). Chọn người khác hoặc đổi giờ.',
  MAINTENANCE_BOOKING_TOO_SOON: 'Ngày hẹn quá gần so với thời gian phải đặt trước. Chọn ngày xa hơn.',
  MAINTENANCE_OUTSIDE_PERIOD:
    'Giờ hẹn nằm ngoài thời gian đặt được của lượt bảo trì này. Chọn ngày trong khoảng được ghi.',
  MAINTENANCE_ENTITLEMENT_NOT_FOUND: 'Không tìm thấy lượt bảo trì này trong gói của bạn. Danh sách đã được tải lại.',
  SITE_HAS_ACTIVE_INSTALLATION: 'Công trình đang thi công nên chưa đổi được phường, xã của địa điểm.',
  // Khảo sát tại công trình
  ONSITE_APPOINTMENT_NOT_FOUND: 'Không tìm thấy lịch khảo sát, hoặc lịch không còn giao cho bạn.',
  ONSITE_APPOINTMENT_NOT_CONFIRMED: 'Nhận lịch này trước rồi mới khảo sát được.',
  ONSITE_SURVEY_TOO_EARLY: 'Chưa tới giờ bắt đầu khảo sát. Bắt đầu được khi gần tới giờ hẹn.',
  ONSITE_SURVEY_NOT_FOUND: 'Bấm Bắt đầu khảo sát trước rồi mới thêm ảnh được.',
  ONSITE_SURVEY_ALREADY_COMPLETED: 'Khảo sát này đã hoàn thành. Muốn sửa thì gửi bổ sung biên bản kèm lý do.',
  ONSITE_SURVEY_NOT_COMPLETED: 'Biên bản chưa hoàn thành nên chưa bổ sung được. Sửa thẳng trên biên bản rồi lưu.',
  ONSITE_SURVEY_NOT_STARTED: 'Bấm Bắt đầu khảo sát tại công trình trước khi hoàn thành.',
  ONSITE_SURVEY_INCOMPLETE: 'Còn thiếu số đo bắt buộc. Điền các ô được đánh dấu rồi hoàn thành lại.',
  ONSITE_SURVEY_STALE_REVISION: 'Biên bản vừa được cập nhật ở nơi khác. Đã tải lại, kiểm tra rồi thử lại.',
  ONSITE_SURVEY_EVIDENCE_REQUIRED: 'Cần ít nhất một ảnh loại Mái trước khi hoàn thành khảo sát.',
  ONSITE_SURVEY_ATTACHMENT_NOT_FOUND: 'Không tìm thấy ảnh này trong biên bản.',
  INVALID_STATE_TRANSITION:
    'Trạng thái đã thay đổi nên không làm được thao tác này. Tải lại trang để xem trạng thái mới.',
  SALES_TASK_NOT_FOUND: 'Không tìm thấy việc này.',
  SALES_TASK_ALREADY_CLAIMED: 'Việc này vừa có người nhận trước. Danh sách đã được tải lại.',
  AFTER_SALES_DUPLICATE_SERIAL: 'Đã có thiết bị khác cùng hãng và số serial này. Kiểm tra lại số serial.',
  DISASTER_CLAIM_NOT_APPROVED: 'Hỗ trợ của gói thiên tai chưa được duyệt. Xét hỗ trợ trước rồi mới chọn gói thiên tai.',
  DISASTER_RECONSIDERATION_USED: 'Yêu cầu này đã được xét lại một lần.',
  // Báo giá lắp đặt
  QUOTATION_NOT_FOUND: 'Không tìm thấy báo giá.',
  QUOTATION_SURVEY_NOT_COMPLETED: 'Kỹ thuật viên chưa hoàn thành khảo sát tại công trình nên chưa lập báo giá được.',
  QUOTATION_DRAFT_EXISTS: 'Yêu cầu này đã có một bản nháp báo giá. Đã tải lại, sửa tiếp bản đó.',
  QUOTATION_ACTIVE_EXISTS: 'Yêu cầu này đã có báo giá đang gửi khách. Lập bản sửa từ báo giá đó.',
  QUOTATION_NOT_DRAFT: 'Báo giá đã gửi khách nên không sửa được nữa. Lập bản sửa để đổi nội dung.',
  QUOTATION_NOT_ISSUED: 'Báo giá này không còn chờ trả lời (đã có bản mới hoặc vừa thay đổi). Đã tải lại.',
  QUOTATION_EXPIRED: 'Báo giá đã hết hạn. Liên hệ nhân viên kinh doanh để nhận bản mới.',
  QUOTATION_INVALID_LINE:
    'Số liệu báo giá chưa hợp lệ: số lượng phải lớn hơn 0, đơn giá không âm, giảm giá không quá số tiền trước giảm và tổng phải lớn hơn 0.',
  QUOTATION_EMPTY: 'Thêm ít nhất một dòng trước khi gửi khách.',
  QUOTATION_STALE_REVISION: 'Báo giá vừa được cập nhật ở nơi khác. Đã tải lại, kiểm tra rồi thử lại.',
  QUOTATION_PRODUCT_UNAVAILABLE:
    'Sản phẩm này đã ngừng bán hoặc không bán bằng VND. Chọn sản phẩm khác hoặc ghi dòng tự ghi.',
  QUOTATION_ALREADY_ACCEPTED: 'Khách đã đồng ý báo giá này.',
  QUOTATION_CANNOT_REVISE: 'Không lập bản sửa được vì khách vừa đồng ý hoặc báo giá vừa thay đổi. Đã tải lại.',
  QUOTATION_SALES_OWNER_REQUIRED: 'Yêu cầu chưa có nhân viên kinh doanh phụ trách nên chưa lập báo giá được.',
  QUOTATION_SURVEY_CHANGED:
    'Biên bản khảo sát được bổ sung sau khi lập báo giá này nên báo giá không dùng tiếp được. Đã tải lại.',
  QUOTATION_SURVEY_NOT_FEASIBLE: 'Kỹ thuật viên kết luận công trình không lắp được nên không lập báo giá.',
  QUOTATION_REQUEST_CLOSED: 'Yêu cầu khảo sát đã đóng hoặc khách đã rút nên không làm tiếp báo giá được.',
  QUOTATION_PRICE_MISSING: 'Sản phẩm này chưa có giá trong danh mục. Nhập đơn giá cho dòng.',
  QUOTATION_BOM_MISMATCH:
    'Dòng thiết bị chưa khớp danh sách thiết bị của biên bản khảo sát. Sửa số lượng cho khớp hoặc nhờ kỹ thuật viên bổ sung biên bản.',
  QUOTATION_PRICING_REVIEW_REQUIRED:
    'Bản tự động còn vấn đề về giá. Xử lý các vấn đề phải sửa, phần còn lại ghi lý do vẫn gửi.',
  QUOTATION_PRICING_APPROVAL_REQUIRED: 'Báo giá có giá thấp hơn danh mục. Quản lý duyệt giá xong mới gửi khách được.',
  QUOTATION_PRICING_APPROVAL_PENDING: 'Bộ giá này đang chờ quản lý duyệt.',
  QUOTATION_PRICING_APPROVAL_NOT_REQUIRED: 'Báo giá dùng giá danh mục và không giảm giá nên không cần duyệt giá.',
  QUOTATION_PRICING_APPROVAL_NOT_PENDING:
    'Không còn yêu cầu duyệt giá nào chờ cho bộ giá này (đã quyết định hoặc giá vừa đổi). Đã tải lại.',
  QUOTATION_SELF_APPROVAL_NOT_ALLOWED: 'Bạn là người lập báo giá này nên không tự duyệt giá được.',
  // Hợp đồng lắp đặt (phía nhân viên)
  CONTRACT_NOT_FOUND: 'Không tìm thấy hợp đồng, hoặc bạn không phụ trách yêu cầu khảo sát này.',
  CONTRACT_QUOTATION_NOT_ACCEPTED: 'Chỉ lập được hợp đồng từ báo giá khách đã đồng ý.',
  CONTRACT_ALREADY_EXISTS: 'Báo giá này đã có hợp đồng hoặc đang có phụ lục nháp. Đã tải lại, làm tiếp trên bản đó.',
  CONTRACT_INVALID_STATE:
    'Hợp đồng vừa đổi trạng thái nên không làm được thao tác này. Đã tải lại để xem trạng thái mới.',
  CONTRACT_STALE_REVISION: 'Hợp đồng vừa được cập nhật ở nơi khác. Đã tải lại, kiểm tra rồi thử lại.',
  CONTRACT_CANONICAL_HASH_MISMATCH:
    'PDF không được tạo từ phiên bản hợp đồng đang xem (mã nội dung không khớp). Tạo lại PDF từ đúng phiên bản.',
  CONTRACT_DOCUMENT_MISSING: 'Gắn PDF hợp đồng chính thức trước khi gửi khách ký.',
  CONTRACT_DOCUMENT_NOT_FOUND: 'Hợp đồng chưa có tài liệu này.',
  CONTRACT_WRONG_DOCUMENT_VERSION: 'Bản ký không phải bản in của PDF hợp đồng chính thức hiện tại.',
  CONTRACT_REJECTION_REASON_REQUIRED: 'Ghi lý do từ chối bản ký.',
  CONTRACT_WARRANTY_VALIDATION_FAILED: 'Thời hạn bảo hành này không còn được dùng. Chọn lại thời hạn trong danh sách.',
  CONTRACT_WARRANTY_REQUIRED:
    'Chưa chọn thời hạn bảo hành lắp đặt. Nếu không có thời hạn nào để chọn, nhờ quản trị thêm thời hạn bảo hành lắp đặt.',
  CONTRACT_SURVEY_CHANGED:
    'Biên bản khảo sát được bổ sung sau khi lập báo giá. Lập báo giá sửa trước rồi mới lập hợp đồng.',
  CONTRACT_REQUEST_CLOSED: 'Yêu cầu khảo sát đã đóng hoặc khách đã rút nên không lập được hợp đồng.',
  CONTRACT_DRAFT_DISCARDED:
    'Bản nháp hợp đồng của báo giá này đã bị huỷ nên không lập hợp đồng mới từ báo giá đó được.',
  CONTRACT_TERMS_REQUIRED: 'Ghi điều khoản hợp đồng trước khi phát hành.',
  CONTRACT_NOT_DISCARDABLE:
    'Chỉ huỷ được bản nháp đầu tiên chưa phát hành. Hợp đồng đã phát hành hoặc phụ lục nháp thì không huỷ được.',
  CONTRACT_DISCARD_REASON_REQUIRED: 'Ghi lý do huỷ bản nháp, tối đa 1000 ký tự.',
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
  // Thời hạn bảo hành, hoàn tiền (quản trị)
  REFUND_NOT_FOUND: 'Không tìm thấy khoản hoàn tiền này.',
  // Khu vực phục vụ
  ZONE_NOT_FOUND: 'Không tìm thấy khu vực này.',
  ZONE_MANAGEMENT_FORBIDDEN: 'Chỉ quản trị viên đang hoạt động mới tạo hoặc sửa khu vực.',
  ZONE_SCOPE_FORBIDDEN: 'Bạn không phụ trách khu vực này.',
  ZONE_CODE_EXISTS: 'Đã có khu vực dùng mã này. Chọn mã khác.',
  ZONE_STALE_REVISION: 'Khu vực vừa được sửa ở nơi khác. Đã tải lại, kiểm tra rồi làm lại.',
  ZONE_IN_USE:
    'Khu vực còn lịch khảo sát hoặc công trình chưa xong nên chưa tắt được. Hoàn tất, huỷ hoặc chuyển các việc đó trước.',
  COMMUNE_ALREADY_MAPPED: 'Có phường, xã đang thuộc một khu khác đang hoạt động. Gỡ khỏi khu đó trước.',
  COMMUNE_IN_USE:
    'Có phường, xã đang có lịch khảo sát hoặc công trình chưa xong nên chưa gỡ được. Hoàn tất, huỷ hoặc chuyển các việc đó trước.',
  RESPONSIBLE_MANAGER_INVALID: 'Người phụ trách phải là tài khoản quản lý hoặc quản trị đang hoạt động.',
  SALES_USER_INVALID: 'Người được chọn không phải nhân viên kinh doanh đang hoạt động.',
  // Kho tri thức AI và cấu hình chatbot
  RAG_DOCUMENT_NOT_FOUND: 'Không tìm thấy tài liệu này.',
  RAG_VERSION_NOT_FOUND: 'Không tìm thấy phiên bản này của tài liệu.',
  RAG_JOB_NOT_FOUND: 'Không tìm thấy lượt nạp này.',
  RAG_INVALID_STATE: 'Tài liệu vừa đổi trạng thái nên không làm được thao tác này. Đã tải lại để xem trạng thái mới.',
  RAG_STALE_REVISION: 'Tài liệu vừa được sửa ở nơi khác. Đã tải lại, kiểm tra rồi làm lại.',
  RAG_SERVICE_UNAVAILABLE: 'Dịch vụ chatbot tạm thời không phản hồi. Thử lại sau ít phút.',
  RAG_SESSION_NOT_FOUND: 'Không tìm thấy cuộc trò chuyện này. Mở cuộc trò chuyện mới để hỏi tiếp.',
  RAG_MESSAGE_TOO_LONG: 'Câu hỏi phải có từ 1 đến 8.000 ký tự.',
  // Hạn mức theo ngày của từng người hoặc của cả hệ thống, backend không nói là hạn mức nào
  RAG_QUOTA_EXCEEDED: 'Đã hết lượt hỏi trợ lý trong hôm nay. Hỏi lại vào ngày mai.',
  RAG_TOO_MANY_CONCURRENT_REQUESTS: 'Câu hỏi trước vẫn đang được trả lời. Chờ xong rồi hỏi tiếp.',
  RAG_CONFIG_VALIDATION_FAILED: 'Cấu hình chưa hợp lệ. Kiểm tra lại các tham số được báo lỗi.',
  RAG_CONFIG_STALE_REVISION: 'Cấu hình vừa được sửa ở nơi khác. Đã tải lại, kiểm tra rồi làm lại.',
  RAG_CONFIG_DRAFT_NOT_FOUND: 'Không còn bản nháp nào. Đã tải lại cấu hình.',
  RAG_CONFIG_VERSION_NOT_FOUND: 'Không tìm thấy phiên bản cấu hình này.',
  RAG_CONFIG_INVALID_STATE: 'Chỉ khôi phục được phiên bản đã từng dùng, không phải phiên bản đang dùng.',
  // Ảnh sản phẩm
  PRODUCT_IMAGE_NOT_FOUND: 'Không tìm thấy ảnh này. Đã tải lại danh sách ảnh.',
  PRODUCT_IMAGE_DUPLICATE: 'Sản phẩm đã có ảnh dùng đúng link này.',
  PRODUCT_IMAGE_CONFLICT: 'Ảnh của sản phẩm vừa được đổi ở nơi khác. Đã tải lại, kiểm tra rồi làm lại.',
  PRODUCT_IMAGE_LIMIT_REACHED: 'Sản phẩm đã đủ số ảnh tối đa. Xoá bớt ảnh rồi thêm lại.',
  PRODUCT_IMAGE_ORDER_MISMATCH: 'Danh sách ảnh vừa thay đổi. Đã tải lại, sắp xếp lại rồi lưu.',
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
  RESOURCE_NOT_FOUND: 'Nội dung có thể đã bị xoá, hoặc đường dẫn không đúng.',
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
  404: 'Nội dung có thể đã bị xoá, hoặc đường dẫn không đúng.',
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

/** Chức năng chưa bật (503 FEATURE_PENDING_MIGRATION) hoặc DB chưa chạy đủ migration (SCHEMA_NOT_READY) */
export function isFeatureUnavailable(error: unknown) {
  return isApiError(error) && (error.code === 'FEATURE_PENDING_MIGRATION' || error.code === 'SCHEMA_NOT_READY')
}

/** Tên các migration còn chờ chạy, khi backend trả kèm trong `details.pendingMigrations` */
export function pendingMigrationsOf(error: unknown): string[] {
  if (!isApiError(error) || !isRecord(error.details)) return []
  const list = error.details.pendingMigrations
  return Array.isArray(list) ? list.filter((m): m is string => typeof m === 'string') : []
}

/** Câu lỗi kèm số giây phải chờ khi bị giới hạn số lần (429 + Retry-After) */
export function rateLimitedMessage(error: unknown) {
  if (isApiError(error) && error.status === 429 && error.retryAfter)
    return `Bạn thao tác quá nhanh. Thử lại sau ${error.retryAfter} giây.`
  return errorMessage(error)
}
