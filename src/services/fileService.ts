import axios from 'axios'
import { FILE_REJECTION_REASONS, FILE_STATUSES, FILE_TYPE_EXTENSIONS, type FilePurpose } from '@/common/file'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { ApiError, messageForCode, messageForStatus } from '@/services/api/errors'
import type { PresignedUploadRequest, RegisterFileRequest } from '@/types/req/filesReq'
import type { FileView, UploadUrlView } from '@/types/res/filesRes'

// Backend không nhận nội dung tệp: trình duyệt xin link PUT ký sẵn, tự PUT lên S3, rồi đăng ký object. Lúc đăng ký backend
// đọc lại object trên kho (loại theo byte đầu, cỡ, SHA-256) và trả trạng thái; chỉ tệp VERIFIED mới gắn được vào nghiệp vụ.
// Mọi lệnh ghi tệp chung giới hạn 20 lần / phút / người, mỗi tệp tốn 2 lần (xin link + đăng ký)

const { files: api } = ENDPOINTS

/** Chỉ vai trò được phép của mục đích mới xin được (kỹ thuật viên tải ảnh thi công…) */
export function createUploadUrl(body: PresignedUploadRequest, signal?: AbortSignal) {
  return post<UploadUrlView>(api.presignedUpload, body, { signal })
}

/** `objectKey` phải đúng khoá link PUT đã cấp. Trả 201 kèm trạng thái xác minh */
export function registerFile(body: RegisterFileRequest, signal?: AbortSignal) {
  return post<FileView>(api.base, body, { signal })
}

/** Xác minh lại tệp còn PENDING_VERIFICATION (lần trước backend không đọc được kho). Tệp đã xong thì trả nguyên */
export function verifyFile(fileId: string, signal?: AbortSignal) {
  return post<FileView>(api.verify(fileId), undefined, { signal })
}

/** Thông tin tệp, không có link xem. Người tải lên hoặc nhân viên kinh doanh / quản lý / quản trị */
export function getFile(fileId: string) {
  return get<FileView>(api.byId(fileId))
}

// Loại tệp theo byte đầu, như backend xác minh: ảnh PNG đặt đuôi .jpg vẫn khai đúng là PNG
function sniffType(head: Uint8Array) {
  const startsWith = (bytes: number[], offset = 0) => bytes.every((b, i) => head[offset + i] === b)
  if (startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf'
  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
  return null
}

function extensionOf(name: string) {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot).toLowerCase()
}

// Trình duyệt hay để trống loại của .md, .txt: đoán theo đuôi
function typeFromName(name: string) {
  const extension = extensionOf(name)
  return Object.keys(FILE_TYPE_EXTENSIONS).find((type) => FILE_TYPE_EXTENSIONS[type]!.includes(extension)) ?? ''
}

// Backend đòi đuôi tên khớp loại khai báo: ảnh PNG tên "mai.jpg" gửi thành "mai.jpg.png"
function nameFor(file: File, contentType: string) {
  const extensions = FILE_TYPE_EXTENSIONS[contentType]
  if (!extensions || extensions.includes(extensionOf(file.name))) return file.name
  return `${file.name}${extensions[0]}`
}

// Khai SHA-256 để backend so với object trên kho. crypto.subtle chỉ có trên HTTPS / localhost; thiếu thì bỏ qua
async function sha256Hex(bytes: ArrayBuffer) {
  if (!globalThis.crypto?.subtle) return null
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

// PUT thẳng lên S3 bằng axios trần: không đi qua apiClient để không gửi kèm token của hệ thống.
// Lỗi gốc của axios chứa link ký sẵn nên không ném ra ngoài
async function putToStorage(
  target: UploadUrlView,
  file: Blob,
  { onProgress, signal }: { onProgress?: (fraction: number) => void; signal?: AbortSignal },
) {
  try {
    await axios.request({
      method: target.method,
      url: target.uploadUrl,
      data: file,
      headers: target.headers,
      signal,
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(event.loaded / event.total)
      },
    })
  } catch (error) {
    const status = axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0
    throw new ApiError({ status, message: storageFailureMessage(status) })
  }
}

// Status 0 khi đang có mạng thường là S3 trả lời không kèm CORS (vd. 301 vì backend ký sai vùng của bucket),
// không phải mất mạng
function storageFailureMessage(status: number) {
  if (status === 0)
    return typeof navigator !== 'undefined' && !navigator.onLine
      ? messageForStatus(0)
      : 'Không tải được tệp lên. Mạng vẫn ổn thì báo quản trị hệ thống.'
  if (status === 403) return 'Link tải lên đã hết hạn hoặc không hợp lệ. Thử lại.'
  return 'Chưa tải được tệp lên. Thử lại sau ít phút.'
}

function notVerified(view: FileView) {
  if (view.status === FILE_STATUSES.pending)
    return new ApiError({
      status: 503,
      code: 'FILE_STORAGE_UNAVAILABLE',
      message: messageForCode('FILE_STORAGE_UNAVAILABLE')!,
    })
  const reason = view.rejectionReason ?? ''
  const known = Object.entries(FILE_REJECTION_REASONS).find(([prefix]) => reason.startsWith(prefix))
  return new ApiError({
    status: 422,
    message: known?.[1] ?? 'Hệ thống không nhận tệp này. Chọn tệp khác hoặc thử lại.',
    serverMessage: reason || null,
  })
}

/** Chờ ngắn rồi xác minh lại một lần, khi backend chưa đọc được kho ngay lúc đăng ký */
const VERIFY_RETRY_MS = 3000

export type UploadOptions = {
  /** Phần đã gửi lên kho, 0 đến 1 */
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

/**
 * Tải một tệp lên kho và đăng ký, trả tệp đã VERIFIED để gắn vào nghiệp vụ. Tệp bị từ chối hoặc chưa xác minh được
 * thì ném ApiError có câu tiếng Việt; tải lại là tạo object mới (khoá mới), không dùng lại khoá cũ
 */
export async function uploadFile(file: File, purpose: FilePurpose, { onProgress, signal }: UploadOptions = {}) {
  const bytes = await file.arrayBuffer()
  const contentType =
    sniffType(new Uint8Array(bytes, 0, Math.min(12, bytes.byteLength))) ??
    (file.type.toLowerCase() || typeFromName(file.name))
  const fileName = nameFor(file, contentType)
  const checksumSha256 = await sha256Hex(bytes)

  const target = await createUploadUrl({ purpose, fileName, contentType, sizeBytes: file.size }, signal)
  await putToStorage(target, file, { onProgress, signal })
  let view = await registerFile(
    {
      purpose,
      bucket: target.bucket,
      objectKey: target.objectKey,
      fileName,
      contentType,
      sizeBytes: file.size,
      checksumSha256,
    },
    signal,
  )
  if (view.status === FILE_STATUSES.pending) {
    await new Promise((resolve) => setTimeout(resolve, VERIFY_RETRY_MS))
    view = await verifyFile(view.fileId, signal)
  }
  if (view.status !== FILE_STATUSES.verified) throw notVerified(view)
  return view
}
