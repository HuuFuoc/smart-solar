import type { Ref } from 'react'
import { Button } from '@/components/common/ui/button'
import { Dialog, DialogFooter, DialogTitle } from '@/components/common/ui/dialog'
import { KeyValueList } from '@/components/common/ui/lists'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'

type Props = {
  ref: Ref<HTMLDialogElement>
  siteName: string | null | undefined
  /** Mã yêu cầu khảo sát vừa tạo. Chuỗi rỗng khi không biết mã (lần gửi trước mất phản hồi) */
  requestId: string | null
  onStartOver: () => void
  onChooseTime: () => void
}

// Hộp thoại sau khi gửi: mời khách chọn giờ khảo sát ngay, hoặc đánh giá thêm một địa điểm khác
export function SubmittedDialog({ ref, siteName, requestId, onStartOver, onChooseTime }: Props) {
  return (
    <Dialog ref={ref} className="max-w-lg">
      <DialogTitle>Đã gửi yêu cầu khảo sát</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Bước cuối: chọn ngày giờ để kỹ thuật viên tới khảo sát {siteName ?? 'địa điểm của bạn'}. Bạn cũng có thể chọn
        sau ở mục Yêu cầu khảo sát.
      </p>
      {requestId && (
        <KeyValueList
          className="mt-4 border-t border-line pt-4"
          items={[{ k: 'Mã yêu cầu', v: <span className="tnum">{shortCode(requestId)}</span> }]}
        />
      )}
      <DialogFooter>
        <Button variant="ghost" onClick={onStartOver}>
          Đánh giá địa điểm khác
        </Button>
        <Button variant="primary" onClick={onChooseTime}>
          Chọn giờ khảo sát
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
