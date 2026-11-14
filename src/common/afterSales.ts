import type { Tone } from '@/components/common/ui/badge'

// Enum của gói dịch vụ sau lắp đặt (Modules.AfterSales) và lần thanh toán PayOS (Modules.Payments) phía khách hàng

/** ServicePackageKinds; màn của khách hiện chỉ bán gói thiên tai */
export const SERVICE_PACKAGE_KINDS = {
  maintenance: 'MAINTENANCE',
  disasterProtection: 'DISASTER_PROTECTION',
} as const

/** Tên loại gói trên màn quản trị */
export const SERVICE_PACKAGE_KIND_LABELS: Record<string, string> = {
  DISASTER_PROTECTION: 'Bảo vệ thiên tai',
  MAINTENANCE: 'Bảo trì định kỳ',
}

/** Gói đang bán (isActive) hay đã ngừng bán: ngừng bán thì khách không mua mới được, gói đã mua không đổi */
export const PACKAGE_SALE_STATUSES = {
  active: { label: 'Đang bán', tone: 'ok' },
  inactive: { label: 'Ngừng bán', tone: 'neutral' },
} as const satisfies Record<string, { label: string; tone: Tone }>

/** DisasterTypes: loại thiên tai một gói bảo vệ */
export const DISASTER_TYPES: Record<string, string> = {
  STORM: 'Bão',
  FLOOD: 'Lũ lụt',
  LIGHTNING: 'Sét',
}

// Đỏ chỉ cho việc khách phải làm (thanh toán đơn đang chờ). Đã trả tiền nhưng chưa bắt đầu kỳ hoặc chờ duyệt huỷ là info
export const SUBSCRIPTION_STATUSES: Record<string, { label: string; tone: Tone }> = {
  AWAITING_PAYMENT: { label: 'Chờ thanh toán', tone: 'danger' },
  CHECKOUT_EXPIRED: { label: 'Hết hạn thanh toán', tone: 'neutral' },
  PAID: { label: 'Đã thanh toán, chờ bắt đầu', tone: 'info' },
  ACTIVE: { label: 'Đang hiệu lực', tone: 'ok' },
  EXPIRED: { label: 'Đã hết hạn', tone: 'neutral' },
  CANCELLATION_REQUESTED: { label: 'Chờ duyệt huỷ', tone: 'info' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

/**
 * Trạng thái khách tự huỷ được: chỉ đơn chưa trả tiền (huỷ ngay). Gói đã trả tiền thì huỷ là xin hoàn tiền, nhóm không làm
 * hoàn tiền nên không mở
 */
export const SUBSCRIPTION_CANCEL_MODES: Record<string, 'unpaid'> = {
  AWAITING_PAYMENT: 'unpaid',
  CHECKOUT_EXPIRED: 'unpaid',
}

/** PaymentStatuses của một link PayOS */
export const PAYMENT_ATTEMPT_STATUSES: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Chờ thanh toán', tone: 'danger' },
  PROCESSING: { label: 'PayOS đang xử lý', tone: 'info' },
  PAID: { label: 'PayOS đã xác nhận nhận tiền', tone: 'ok' },
  CANCELLED: { label: 'Link đã huỷ', tone: 'neutral' },
  EXPIRED: { label: 'Link đã hết hạn', tone: 'neutral' },
  FAILED: { label: 'Không tạo được link', tone: 'neutral' },
  REVIEW_REQUIRED: { label: 'Chờ Smart Solar đối soát', tone: 'warn' },
  REFUND_REQUIRED: { label: 'Chờ Smart Solar hoàn tiền', tone: 'warn' },
}

/** Link còn trả tiền được (PaymentStatuses.Payable); backend chỉ đối soát với PayOS khi link ở các trạng thái này */
export const PAYABLE_ATTEMPT_STATUSES: readonly string[] = ['PENDING', 'PROCESSING']

/** Trạng thái hợp đồng mua gói được: PAID mua riêng gói, SIGNED thì link thanh toán gồm cả tiền hợp đồng */
export const PURCHASABLE_CONTRACT_STATUSES = {
  paid: 'PAID',
  signed: 'SIGNED',
} as const

// Yêu cầu bảo hành, sửa chữa, bảo trì (ServiceRequest và các bảng đi kèm của Modules.AfterSales)

/** ServiceRequestKinds */
export const SERVICE_REQUEST_KINDS: Record<string, string> = {
  FAULT: 'Báo lỗi',
  MAINTENANCE: 'Bảo trì theo gói',
  ONE_TIME_MAINTENANCE: 'Bảo trì lẻ',
}

/** ServiceRequestStatuses */
export const SERVICE_REQUEST_STATUSES: Record<string, string> = {
  SUBMITTED: 'Chờ xếp lịch',
  SCHEDULED: 'Đã có lịch hẹn',
  IN_PROGRESS: 'Kỹ thuật viên đang làm',
  AWAITING_DECISION: 'Chờ xét bảo hành',
  AWAITING_QUOTATION: 'Chờ báo giá',
  AWAITING_CUSTOMER: 'Chờ duyệt và thanh toán báo giá',
  READY_FOR_WORK: 'Chờ xếp lịch làm',
  PENDING_CUSTOMER_ACCEPTANCE: 'Chờ khách nghiệm thu',
  DISPUTED: 'Khách chưa đồng ý kết quả',
  REWORK_REQUIRED: 'Chờ làm lại',
  COMPLETED: 'Hoàn thành',
  NOT_COMPLETED: 'Không hoàn thành',
  CANCELLED: 'Đã huỷ',
  CLOSED_DUPLICATE: 'Trùng yêu cầu khác',
}

/** Trạng thái đã đóng, không còn thao tác */
export const FINAL_REQUEST_STATUSES: readonly string[] = ['COMPLETED', 'NOT_COMPLETED', 'CANCELLED', 'CLOSED_DUPLICATE']

/** Trạng thái quản lý phải làm: xếp lịch, xét bảo hành, xét khiếu nại */
export const MANAGER_TODO_STATUSES: readonly string[] = [
  'SUBMITTED',
  'AWAITING_DECISION',
  'READY_FOR_WORK',
  'DISPUTED',
  'REWORK_REQUIRED',
]

/** Trạng thái khách phải làm: duyệt báo giá, nghiệm thu */
export const CUSTOMER_TODO_STATUSES: readonly string[] = ['AWAITING_CUSTOMER', 'PENDING_CUSTOMER_ACCEPTANCE']

/** ServiceOutcomes */
export const SERVICE_OUTCOMES: Record<string, string> = {
  NO_FAULT_FOUND: 'Không phát hiện lỗi',
  REPAIRED: 'Đã sửa xong',
  MAINTENANCE_DONE: 'Đã bảo trì xong',
  CUSTOMER_ABSENT: 'Khách vắng nhà',
}

/** ItemCoverages: ai chịu chi phí của một hạng mục */
export const ITEM_COVERAGES: Record<string, string> = {
  PENDING: 'Chờ quản lý xét',
  INSTALLATION_WARRANTY: 'Bảo hành lắp đặt',
  REPAIR_WARRANTY: 'Bảo hành sửa chữa',
  DISASTER_PROTECTION: 'Gói bảo vệ thiên tai',
  MANUFACTURER_WARRANTY: 'Bảo hành của hãng',
  CHARGEABLE: 'Khách trả tiền',
}

/** ItemStatuses */
export const ITEM_STATUSES: Record<string, { label: string; tone: Tone }> = {
  OPEN: { label: 'Chờ xử lý', tone: 'info' },
  QUOTED: { label: 'Đã báo giá', tone: 'info' },
  AUTHORIZED: { label: 'Được làm', tone: 'ok' },
  DECLINED: { label: 'Không làm', tone: 'neutral' },
  DONE: { label: 'Đã làm', tone: 'neutral' },
}

/** VisitPurposes */
export const VISIT_PURPOSES: Record<string, string> = {
  INSPECTION: 'Kiểm tra',
  REPAIR: 'Sửa chữa',
  MAINTENANCE: 'Bảo trì',
  REWORK: 'Làm lại',
}

/** VisitStatuses */
export const VISIT_STATUSES: Record<string, { label: string; tone: Tone }> = {
  SCHEDULED: { label: 'Đã hẹn', tone: 'info' },
  IN_PROGRESS: { label: 'Đang làm', tone: 'info' },
  REPORTED: { label: 'Đã báo cáo', tone: 'neutral' },
  CUSTOMER_ABSENT: { label: 'Khách vắng', tone: 'neutral' },
  DECLINED: { label: 'Kỹ thuật viên từ chối', tone: 'neutral' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

/** QuotationStatuses của báo giá sửa chữa, bảo trì */
export const SERVICE_QUOTATION_STATUSES: Record<string, { label: string; tone: Tone }> = {
  ISSUED: { label: 'Chờ khách duyệt', tone: 'info' },
  ACCEPTED: { label: 'Khách đã đồng ý, chờ thanh toán', tone: 'info' },
  PAID: { label: 'Đã thanh toán', tone: 'ok' },
  REJECTED: { label: 'Khách từ chối', tone: 'neutral' },
  SUPERSEDED: { label: 'Đã thay bằng bản mới', tone: 'neutral' },
  EXPIRED: { label: 'Hết hạn', tone: 'neutral' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

/** SalesTaskTypes */
export const SALES_TASK_TYPES: Record<string, string> = {
  REPAIR_QUOTATION: 'Báo giá sửa chữa',
  MAINTENANCE_QUOTATION: 'Báo giá bảo trì lẻ',
  MAINTENANCE_FOLLOW_UP: 'Nhắc khách đặt lịch bảo trì',
  ACCEPTANCE_FOLLOW_UP: 'Nhắc khách nghiệm thu',
}

/** SalesTaskStatuses */
export const SALES_TASK_STATUSES: Record<string, string> = {
  OPEN: 'Chờ nhận',
  CLAIMED: 'Bạn đã nhận',
  IN_PROGRESS: 'Đang làm',
  DONE: 'Xong',
  CANCELLED: 'Đã huỷ',
}

/** SalesTaskStatuses trên hàng việc của quản lý: kinh doanh tự nhận, quản lý giao khi cần nên "chờ nhận" là việc chờ xử lý */
export const SALES_TASK_QUEUE_STATUSES: Record<string, { label: string; tone: Tone }> = {
  OPEN: { label: 'Chưa ai nhận', tone: 'danger' },
  CLAIMED: { label: 'Đã có người nhận', tone: 'info' },
  IN_PROGRESS: { label: 'Đang làm', tone: 'info' },
  DONE: { label: 'Xong', tone: 'neutral' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

/**
 * ClaimStatuses: hỗ trợ của gói thiên tai cho một yêu cầu báo lỗi. Chờ xét là việc của quản lý nhưng báo đỏ ở khối Tình
 * hình, nên nhãn trong khối là info. NOT_ELIGIBLE: không gói nào bảo vệ lúc xảy ra sự cố
 */
export const DISASTER_CLAIM_STATUSES: Record<string, { label: string; tone: Tone }> = {
  NOT_ELIGIBLE: { label: 'Không đủ điều kiện', tone: 'neutral' },
  SUBMITTED: { label: 'Chờ quản lý xét', tone: 'info' },
  APPROVED: { label: 'Đã duyệt', tone: 'ok' },
  REJECTED: { label: 'Đã từ chối', tone: 'neutral' },
  RECONSIDERATION_REQUESTED: { label: 'Khách xin xét lại', tone: 'info' },
}

/**
 * FollowUpOutcomes: kết quả của việc nhắc khách. Bỏ trống là chưa có kết quả cuối (việc còn mở); WILL_BOOK_LATER cũng giữ việc
 * mở; các kết quả khác đóng việc. UNREACHABLE của việc nhắc bảo trì làm lượt bảo trì thành chưa thực hiện (không bị trừ)
 */
export const FOLLOW_UP_OUTCOMES: Record<string, { label: string; hint: string }> = {
  BOOKED: { label: 'Khách đã đặt lịch / đã trả lời', hint: 'Đóng việc.' },
  WILL_BOOK_LATER: { label: 'Khách hẹn làm sau', hint: 'Việc vẫn mở để gọi lại.' },
  DECLINED: { label: 'Khách từ chối', hint: 'Đóng việc.' },
  UNREACHABLE: { label: 'Không liên lạc được', hint: 'Đóng việc.' },
}

/** InstallationWarrantyStatuses: bảo hành lắp đặt của công trình */
export const INSTALLATION_WARRANTY_STATUSES: Record<string, { label: string; tone: Tone }> = {
  NOT_HANDED_OVER: { label: 'Chưa bàn giao', tone: 'neutral' },
  NOT_RECORDED: { label: 'Hợp đồng không ghi thời hạn bảo hành', tone: 'warn' },
  ACTIVE: { label: 'Còn bảo hành', tone: 'ok' },
  EXPIRED: { label: 'Hết bảo hành', tone: 'neutral' },
}

// Quản trị sau bán: thời hạn bảo hành, báo cáo

/** WarrantyOptionKinds. Thời hạn được chép vào hợp đồng / báo giá lúc lập nên đổi ở đây không áp cho bản đã lập */
export const WARRANTY_OPTION_KINDS = {
  installation: 'INSTALLATION',
  repair: 'REPAIR',
} as const

export const WARRANTY_OPTION_KIND_LABELS: Record<string, string> = {
  INSTALLATION: 'Bảo hành lắp đặt',
  REPAIR: 'Bảo hành sửa chữa',
}

/** Chỉ số của báo cáo sau bán theo `key` của backend. `money`: số tiền VND */
export const DASHBOARD_METRICS: Record<string, { label: string; money?: boolean }> = {
  collected_contracts: { label: 'Tiền hợp đồng lắp đặt', money: true },
  collected_packages: { label: 'Tiền gói dịch vụ', money: true },
  collected_services: { label: 'Tiền sửa chữa, bảo trì lẻ', money: true },
  collected_total: { label: 'Tổng thu', money: true },
  total_customers: { label: 'Khách hàng (cuối kỳ)' },
  new_customers: { label: 'Khách hàng mới' },
  installation_projects: { label: 'Dự án thi công mới' },
  completed_installations: { label: 'Công trình đã bàn giao' },
  active_installation_warranties: { label: 'Công trình còn bảo hành (cuối kỳ)' },
  fault_requests: { label: 'Yêu cầu báo lỗi' },
  completed_repairs: { label: 'Sửa chữa khách đã nghiệm thu' },
  completed_maintenance_visits: { label: 'Lượt bảo trì khách đã nghiệm thu' },
  active_maintenance_subscriptions: { label: 'Gói bảo trì còn hiệu lực (cuối kỳ)' },
  active_disaster_subscriptions: { label: 'Gói thiên tai còn hiệu lực (cuối kỳ)' },
  package_purchases: { label: 'Gói đã thanh toán' },
  active_technicians: { label: 'Kỹ thuật viên có lịch làm' },
  technician_service_visits: { label: 'Buổi sau bán đã báo cáo' },
}

// Phía khách: lượt bảo trì của gói, hỗ trợ thiên tai, thông báo trong ứng dụng

/** EntitlementStatuses: một lượt bảo trì của gói. AVAILABLE và NOT_COMPLETED đặt lịch được khi gói còn hiệu lực */
export const ENTITLEMENT_STATUSES: Record<string, { label: string; tone: Tone }> = {
  AVAILABLE: { label: 'Chưa đặt lịch', tone: 'info' },
  NOT_COMPLETED: { label: 'Chưa thực hiện, đặt lại được', tone: 'info' },
  BOOKED: { label: 'Đã đặt lịch', tone: 'ok' },
  CONSUMED: { label: 'Đã bảo trì', tone: 'neutral' },
  EXPIRED: { label: 'Hết hạn, chưa dùng', tone: 'neutral' },
  EXPIRED_UNFULFILLED: { label: 'Hết hạn, Smart Solar chưa làm kịp', tone: 'neutral' },
}

/** Lượt đặt lịch được (BookMaintenanceAsync) */
export const BOOKABLE_ENTITLEMENT_STATUSES: readonly string[] = ['AVAILABLE', 'NOT_COMPLETED']

/** ClaimStatuses theo lời của khách */
export const CUSTOMER_CLAIM_STATUSES: Record<string, { label: string; tone: Tone }> = {
  NOT_ELIGIBLE: { label: 'Không thuộc gói đang có hiệu lực', tone: 'neutral' },
  SUBMITTED: { label: 'Smart Solar đang xét', tone: 'info' },
  APPROVED: { label: 'Được hỗ trợ', tone: 'ok' },
  REJECTED: { label: 'Không được hỗ trợ', tone: 'neutral' },
  RECONSIDERATION_REQUESTED: { label: 'Đang xét lại theo yêu cầu của bạn', tone: 'info' },
}

/** Giới hạn khi xin xét lại hỗ trợ thiên tai (RequestReconsiderationAsync, VerifiedEvidenceAsync) */
export const RECONSIDERATION_LIMITS = { noteLength: 1000, photos: 10 } as const

/**
 * AfterSalesNotification.Type gửi cho khách. Câu của backend là tiếng Anh nên giao diện dùng nhãn này; loại lạ in nhãn chung.
 * Thông báo có requestId thì mở trang yêu cầu, có subscriptionId thì mở trang gói
 */
export const CUSTOMER_NOTIFICATION_TYPES: Record<string, string> = {
  VISIT_SCHEDULED: 'Đã có lịch hẹn kỹ thuật viên',
  VISIT_MISSED: 'Buổi bảo trì chưa làm được, bạn đặt lại được',
  COVERAGE_DECIDED: 'Đã xét xong lỗi nào được bảo hành',
  CLAIM_DECIDED: 'Đã có kết quả xét hỗ trợ thiên tai',
  QUOTATION_ISSUED: 'Có báo giá mới chờ bạn duyệt',
  QUOTATION_PAID: 'Đã nhận tiền báo giá',
  QUOTATION_EXPIRED: 'Báo giá đã hết hạn',
  NO_FAULT_FOUND: 'Kỹ thuật viên không thấy lỗi, mời bạn xác nhận',
  ACCEPTANCE_REQUESTED: 'Đã làm xong, mời bạn nghiệm thu',
  ACCEPTANCE_REMINDER: 'Nhắc nghiệm thu kết quả',
  DISPUTE_REVIEWED: 'Đã xem ý kiến của bạn về kết quả',
  REQUEST_DUPLICATE: 'Yêu cầu đã được gộp vào yêu cầu khác',
  CANCELLATION_APPROVED: 'Yêu cầu huỷ đã được duyệt',
  CANCELLATION_REJECTED: 'Yêu cầu huỷ không được duyệt',
  WORK_STOPPED: 'Việc sửa chữa đã dừng',
  SERVICE_NOT_FULFILLED: 'Smart Solar chưa xếp được lịch, yêu cầu đã huỷ',
  PACKAGE_PAID: 'Đã nhận tiền gói dịch vụ',
  PACKAGE_ACTIVE: 'Gói dịch vụ bắt đầu hiệu lực',
  PACKAGE_EXPIRING: 'Gói dịch vụ sắp hết hạn',
  MAINTENANCE_DUE: 'Tới tháng bảo trì, mời bạn đặt lịch',
  // Trước khi lắp đặt (CustomerNotificationTypes): không có requestId / subscriptionId, trang thông báo dẫn theo loại
  SURVEY_APPOINTMENT_BOOKED: 'Đã đặt lịch khảo sát',
  SURVEY_APPOINTMENT_CONFIRMED: 'Đã có kỹ thuật viên nhận lịch khảo sát',
  SURVEY_APPOINTMENT_RESCHEDULED: 'Lịch khảo sát đã được đổi giờ',
  SURVEY_TECHNICIAN_RELEASED: 'Kỹ thuật viên trả lại lịch khảo sát, đang tìm người khác',
  SURVEY_APPOINTMENT_CANCELLED: 'Lịch khảo sát đã bị huỷ',
  INSTALLATION_QUOTATION_ISSUED: 'Có báo giá lắp đặt chờ bạn trả lời',
  CONTRACT_AWAITING_SIGNATURE: 'Hợp đồng đã sẵn sàng, mời bạn ký',
  CONTRACT_SIGNED: 'Bản ký hợp đồng đã được duyệt, mời bạn thanh toán',
  CONTRACT_SIGNATURE_REJECTED: 'Bản ký hợp đồng chưa được duyệt, mời bạn ký lại',
  INSTALLATION_SCHEDULED: 'Công trình đã có lịch lắp đặt',
  INSTALLATION_STARTED: 'Kỹ thuật viên đã bắt đầu lắp đặt',
  INSTALLATION_ACCEPTANCE_REQUIRED: 'Lắp đặt xong, mời bạn nghiệm thu',
  INSTALLATION_REWORK_REQUIRED: 'Công trình được làm lại theo yêu cầu',
  INSTALLATION_CANCELLED: 'Công trình lắp đặt đã bị huỷ',
  EQUIPMENT_SUBSTITUTION_APPROVAL_REQUIRED: 'Có đề xuất đổi thiết bị chờ bạn đồng ý',
}

/** Thứ tự các chỉ số tiền trên báo cáo: các nguồn thu rồi tổng */
export const DASHBOARD_MONEY_KEYS: readonly string[] = [
  'collected_contracts',
  'collected_packages',
  'collected_services',
  'collected_total',
]

/** Nhóm không làm hoàn tiền: bỏ số đã hoàn và thực thu (luôn bằng tổng thu) */
export const DASHBOARD_HIDDEN_KEYS: readonly string[] = ['refunded', 'net_collected']
