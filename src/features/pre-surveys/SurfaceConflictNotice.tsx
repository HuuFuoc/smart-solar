import { Button } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'

type Props = {
  disabled: boolean
  /** Bỏ phần đang sửa, tải bản mới nhất trên server */
  onReload: () => void
  /** Ghi đè bản trên server bằng bản đang sửa */
  onOverwrite: () => void
}

// Báo khi lưu mặt lắp bị từ chối vì bản trên server vừa được sửa ở nơi khác (lỗi 409)
export function SurfaceConflictNotice({ disabled, onReload, onOverwrite }: Props) {
  return (
    <Notice tone="danger" title="Mặt lắp vừa được sửa ở nơi khác">
      Có thể bạn đang mở bản đánh giá này ở một tab khác. Tải bản mới nhất để xem trước khi lưu, hoặc lưu đè bằng bản
      đang sửa ở đây.
      <span className="mt-3 flex flex-wrap gap-3">
        <Button variant="secondary" size="sm" icon="refresh" onClick={onReload} disabled={disabled}>
          Tải bản mới nhất
        </Button>
        <Button icon="save" size="sm" variant="warn" onClick={onOverwrite} disabled={disabled}>
          Lưu đè bằng bản đang sửa
        </Button>
      </span>
    </Notice>
  )
}
