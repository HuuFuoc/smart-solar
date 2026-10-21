import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { DateField, Field, Textarea, TimeSelect } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { addDays, todayVn, vnTimestamp } from '@/features/scheduling/schedulingDisplay'
import { useOneTimeMaintenanceMutation } from '@/hooks/useCustomerServiceRequests'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'

// Khách đặt một lần bảo trì lẻ (không theo gói). Kinh doanh báo giá, khách trả tiền rồi quản lý xếp lịch
// Backend mặc định bắt đặt trước 7 ngày; quản trị đổi số ngày thì backend báo lỗi, không cần sửa ở đây

const LEAD_DAYS = 7

export function MaintenanceDialog({
  open,
  projectId,
  onClose,
}: {
  open: boolean
  projectId: string
  onClose: () => void
}) {
  const request = useOneTimeMaintenanceMutation()
  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => !next && !request.isPending && onClose()}
      dismissible={!request.isPending}
      aria-label="Đặt bảo trì lẻ"
    >
      <MaintenanceForm projectId={projectId} request={request} onClose={onClose} />
    </ModalDialog>
  )
}

function MaintenanceForm({
  projectId,
  request,
  onClose,
}: {
  projectId: string
  request: ReturnType<typeof useOneTimeMaintenanceMutation>
  onClose: () => void
}) {
  const navigate = useNavigate()
  // Backend tính đủ 7 x 24 giờ từ lúc gửi, nên mở từ ngày thứ 8 để giờ nào trong ngày cũng hợp lệ
  const earliest = addDays(todayVn(), LEAD_DAYS + 1)
  const [date, setDate] = useState(earliest)
  const [time, setTime] = useState('08:00')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!date || date < earliest) {
      setError(`Chọn ngày từ ${earliest.split('-').reverse().join('/')} trở đi.`)
      return
    }
    setError(null)
    try {
      const created = await request.mutateAsync({
        projectId,
        preferredStartsAt: vnTimestamp(date, time),
        note: note.trim() || null,
      })
      toast.success('Đã gửi yêu cầu bảo trì. Smart Solar sẽ gửi báo giá để bạn duyệt.')
      onClose()
      void navigate(withId(ROUTES.customer.afterSalesRequest, created.requestId))
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <>
      <DialogTitle>Đặt bảo trì lẻ</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Vệ sinh tấm pin, kiểm tra đấu nối và inverter. Bạn chọn giờ muốn hẹn; Smart Solar gửi báo giá, bạn đồng ý và
        thanh toán thì kỹ thuật viên tới làm.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Ngày muốn hẹn" htmlFor="maintenance-date" hint={`Đặt trước ít nhất ${LEAD_DAYS} ngày.`} required>
          <DateField id="maintenance-date" value={date} min={earliest} onChange={setDate} />
        </Field>
        <Field label="Giờ" htmlFor="maintenance-time" required>
          <TimeSelect id="maintenance-time" value={time} from="08:00" to="16:00" onChange={setTime} />
        </Field>
      </div>
      <Field label="Ghi chú" htmlFor="maintenance-note" hint="Không bắt buộc." className="mt-4">
        <Textarea
          id="maintenance-note"
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button variant="ghost" disabled={request.isPending} onClick={onClose}>
          Đóng
        </Button>
        <Button variant="primary" disabled={request.isPending} onClick={() => void submit()}>
          {request.isPending ? 'Đang gửi…' : 'Gửi yêu cầu'}
        </Button>
      </DialogFooter>
    </>
  )
}
