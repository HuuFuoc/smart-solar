import { formatFileSize } from '@/features/installations/installationDisplay'
import { useFileQuery } from '@/hooks/useFiles'

// Tên và cỡ của một tệp đã đăng ký (GET /api/files/{id}). Không có link xem / tải: backend chưa cấp link cho tệp hợp đồng,
// báo giá, nên chỉ hiện thông tin để đối chiếu
export function FileInfo({ fileId }: { fileId: string }) {
  const file = useFileQuery(fileId)
  if (file.isPending) return <span className="text-fg-2">Đang đọc thông tin tệp…</span>
  if (!file.data) return <span className="text-fg-2">Không đọc được thông tin tệp.</span>
  const size = formatFileSize(file.data.sizeBytes)
  return (
    <span>
      <span className="font-medium text-fg wrap-anywhere">{file.data.originalFileName}</span>
      {size ? <span className="tnum text-fg-2">, {size}</span> : null}
    </span>
  )
}
