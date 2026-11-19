// Tệp tải lên kho S3 (Modules.Files của backend). Mỗi mục đích nhận vài loại tệp, có cỡ tối đa và chỉ vài vai trò được
// tải (FilePolicies). Backend kiểm lại tất cả; bảng ở đây để báo lỗi trước khi tải

const MB = 1024 * 1024

export const FILE_PURPOSES = {
  /** Kỹ thuật viên, khảo sát tại công trình */
  ONSITE_SURVEY_EVIDENCE: { types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], maxBytes: 15 * MB },
  /** Kinh doanh (báo giá cũ; báo giá của kỹ thuật viên không có tệp) */
  QUOTATION_DOCUMENT: { types: ['application/pdf'], maxBytes: 20 * MB },
  /** Quản lý, quản trị: PDF hợp đồng chính thức */
  CONTRACT_DOCUMENT: { types: ['application/pdf'], maxBytes: 20 * MB },
  /** Quản lý, quản trị: ảnh / PDF phiếu thu khi khách trả tiền mặt */
  PAYMENT_EVIDENCE: { types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], maxBytes: 15 * MB },
  /** Hợp đồng đã ký: khách, hoặc kinh doanh phụ trách / quản lý / quản trị tải bản ký giấy */
  SIGNED_CONTRACT: { types: ['application/pdf'], maxBytes: 20 * MB },
  /** Kỹ thuật viên, ảnh thi công */
  INSTALLATION_EVIDENCE: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 15 * MB },
  /** Quản trị, kho tri thức */
  KNOWLEDGE_DOCUMENT: {
    types: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ],
    maxBytes: 50 * MB,
  },
  /** Quản lý, quản trị: giấy phép, văn bản chấp thuận của checklist thi công */
  PROJECT_DOCUMENT: { types: ['application/pdf', 'image/jpeg', 'image/png'], maxBytes: 20 * MB },
  /** Kỹ thuật viên, khách hàng: ảnh bảo hành, sự cố */
  SERVICE_EVIDENCE: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 15 * MB },
  /** Quản trị, quản lý: ảnh sản phẩm tải từ máy */
  PRODUCT_IMAGE: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 10 * MB },
  /** Quản trị: ảnh bìa gói dịch vụ tải từ máy */
  PACKAGE_IMAGE: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 10 * MB },
  /**
   * Kỹ thuật viên (quản lý / quản trị hỗ trợ): ảnh chụp từng trang hợp đồng giấy 30/70 đã ký. Backend nhận cả PDF khi bật
   * `PaymentPlan:AllowPdfSignedPages`; web không đọc được cài đặt đó nên chỉ nhận ảnh. Khác SIGNED_CONTRACT (bản quét cũ)
   */
  SIGNED_CONTRACT_PAGE: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 20 * MB },
  /** Khách hàng: ảnh / PDF kèm yêu cầu làm lại khi không nghiệm thu */
  ACCEPTANCE_EVIDENCE: { types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], maxBytes: 15 * MB },
  /** Kinh doanh, quản lý, quản trị: bằng chứng khi theo dõi khoản quá hạn */
  COLLECTION_EVIDENCE: { types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], maxBytes: 15 * MB },
} as const satisfies Record<string, { types: readonly string[]; maxBytes: number }>

export type FilePurpose = keyof typeof FILE_PURPOSES

/** Đuôi tên tệp hợp lệ của từng loại. Backend đòi đuôi khớp loại khai báo; đuôi đầu tiên là đuôi của khoá lưu trữ */
export const FILE_TYPE_EXTENSIONS: Record<string, readonly string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md', '.markdown'],
}

/** Tên loại tệp trong câu hướng dẫn */
export const FILE_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word (.docx)',
  'text/plain': 'TXT',
  'text/markdown': 'Markdown',
}

export const FILE_STATUSES = {
  /** Đã đăng ký, backend chưa đọc được kho để xác minh */
  pending: 'PENDING_VERIFICATION',
  verified: 'VERIFIED',
  /** Object thiếu hoặc không khớp loại / cỡ / SHA-256 đã khai. Không đổi được nữa */
  rejected: 'REJECTED',
} as const

/** Lý do backend từ chối tệp sau khi đọc kho (câu tiếng Anh, so theo đầu câu) */
export const FILE_REJECTION_REASONS: Record<string, string> = {
  'The object does not exist in storage': 'Tệp chưa tải lên xong. Thử tải lại.',
  'The object is larger than': 'Tệp lớn hơn cỡ cho phép.',
  'The stored object size does not match': 'Tệp tải lên chưa đủ, có thể bị ngắt giữa chừng. Thử tải lại.',
  'The stored content does not match an allowed file type':
    'Nội dung tệp không đúng loại cho phép (có thể chỉ đổi đuôi tên tệp). Chọn tệp khác.',
  'A checksum could not be computed': 'Hệ thống chưa đọc được tệp. Thử tải lại.',
  'The bucket must have versioning enabled': 'Hệ thống tạm thời chưa nhận tệp. Báo quản trị hệ thống.',
  'The stored object checksum does not match': 'Tệp tải lên khác tệp đã chọn, có thể hỏng giữa chừng. Thử tải lại.',
}
