import { FILE_PURPOSES, FILE_TYPE_EXTENSIONS, FILE_TYPE_LABELS, type FilePurpose } from '@/common/file'

const MB = 1024 * 1024

const extensionsFor = (purpose: FilePurpose) =>
  FILE_PURPOSES[purpose].types.flatMap((type) => FILE_TYPE_EXTENSIONS[type] ?? [])

/** `accept` của ô chọn tệp: ghi cả loại để điện thoại đổi ảnh HEIC sang JPEG khi chọn */
export function acceptFor(purpose: FilePurpose) {
  return [...FILE_PURPOSES[purpose].types, ...extensionsFor(purpose)].join(',')
}

/** "JPEG, PNG hoặc WebP" */
export function fileTypesText(purpose: FilePurpose) {
  const labels = FILE_PURPOSES[purpose].types.map((type) => FILE_TYPE_LABELS[type] ?? type)
  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} hoặc ${labels.at(-1)}` : labels[0]!
}

export const maxSizeText = (purpose: FilePurpose) => `${FILE_PURPOSES[purpose].maxBytes / MB} MB`

/** Lỗi thấy được ngay trên máy (đuôi tên, cỡ); null là tải được. Loại thật do backend đọc từ nội dung tệp */
export function fileProblem(file: File, purpose: FilePurpose) {
  const dot = file.name.lastIndexOf('.')
  const extension = dot < 0 ? '' : file.name.slice(dot).toLowerCase()
  if (!extensionsFor(purpose).includes(extension)) return `Chỉ nhận tệp ${fileTypesText(purpose)}.`
  if (file.size === 0) return 'Tệp rỗng.'
  if (file.size > FILE_PURPOSES[purpose].maxBytes) return `Tệp lớn hơn ${maxSizeText(purpose)}.`
  return null
}
