import type { FilePurpose } from '@/common/file'
import { fileProblem } from '@/features/files/fileDisplay'
import { imageUrlError } from '@/features/products/productImageRules'

// Nguồn của một ảnh danh mục (ảnh sản phẩm, ảnh bìa gói): link https hoặc tệp chọn từ máy, backend chỉ nhận một trong hai

export type ImageSource = { url: string; file: File | null }

export const EMPTY_IMAGE_SOURCE: ImageSource = { url: '', file: null }

/** Lỗi của nguồn ảnh, undefined khi gửi được. `required`: bắt buộc có ảnh */
export function imageSourceError(source: ImageSource, purpose: FilePurpose, required: boolean) {
  if (source.file) return fileProblem(source.file, purpose) ?? undefined
  if (!source.url.trim()) return required ? 'Dán link ảnh hoặc chọn ảnh từ máy.' : undefined
  return imageUrlError(source.url)
}
