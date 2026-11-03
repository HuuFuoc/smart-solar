// Viết tay vì swagger của tag Files chỉ khai "200 OK". Theo record C# của Modules.Files (UploadUrlView, FileView),
// đối chiếu với DLL của image smartsolar-api đang chạy (code này chưa có trên nhánh nào của repo backend)

export type FileStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | (string & {})

/** Link PUT ký sẵn để trình duyệt tải thẳng lên kho. Ai giữ link cũng tải được nên không lưu, không ghi log */
export type UploadUrlView = {
  uploadUrl: string
  /** Luôn "PUT" */
  method: string
  bucket: string
  /** `{tiền tố của mục đích}{userId}/{guid}{đuôi}`, gửi lại nguyên văn khi đăng ký */
  objectKey: string
  /** Header phải gửi kèm PUT: Content-Type đã được ký vào link */
  headers: Record<string, string>
  /** Format: date-time */
  expiresAt: string
}

/** Tệp đã đăng ký. Chỉ tệp VERIFIED mới gắn được vào ảnh thi công, tài liệu checklist… */
export type FileView = {
  fileId: string
  purpose: string
  bucket: string
  objectKey: string
  originalFileName: string
  status: FileStatus
  /** Câu tiếng Anh của backend khi REJECTED */
  rejectionReason: string | null
  /** Loại, cỡ, SHA-256 do backend đọc từ kho; null khi chưa xác minh */
  contentType: string | null
  sizeBytes: number | null
  checksumSha256: string | null
  objectVersionId: string | null
  /** Format: date-time */
  verifiedAt: string | null
  /** Format: date-time */
  createdAt: string
}
