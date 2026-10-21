import { useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea } from '@/components/common/ui/field'
import { hasPanelAndInverter, roundEvidenceCount } from '@/features/installations/technicianInstallationDisplay'
import { useReportCompletionMutation } from '@/hooks/useTechnicianInstallations'
import { errorMessage } from '@/services/api/errors'
import type { InstallationTechnicianView } from '@/types/res/technicianInstallationsRes'

/** Giới hạn của backend sau khi bỏ khoảng trắng đầu cuối */
const REPORT_MAX = 8000

// Báo cáo hoàn thành gửi cho khách nghiệm thu. Backend bắt buộc ít nhất một ảnh của lượt hiện tại (khoá nút ở đây)
// và mặc định cần tấm pin + inverter (cấu hình được nên chỉ nhắc, để backend quyết định).
// Gửi xong công trình chờ khách; kỹ thuật viên không tự đánh dấu hoàn tất
export function CompletionReportForm({ view }: { view: InstallationTechnicianView }) {
  const report = useReportCompletionMutation()
  const [text, setText] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const photos = roundEvidenceCount(view)
  const equipped = hasPanelAndInverter(view)
  const length = text.trim().length

  function review() {
    if (!length) {
      setError('Ghi nội dung báo cáo: đã lắp những gì, đã vận hành thử chưa, còn lưu ý gì cho khách.')
      return
    }
    setError(null)
    setConfirming(true)
  }

  async function send() {
    if (report.isPending) return
    try {
      await report.mutateAsync({ id: view.projectId, report: text.trim(), revision: view.revision })
      setConfirming(false)
      toast.success('Đã gửi báo cáo. Công trình chờ khách nghiệm thu.')
    } catch (e) {
      setConfirming(false)
      setError(errorMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-1 text-body text-fg-2">
        <li>
          {photos > 0
            ? `Đã có ${photos} ảnh của lượt ${view.currentRound}.`
            : `Chưa có ảnh nào của lượt ${view.currentRound}. Cần ít nhất một ảnh mới gửi được báo cáo.`}
        </li>
        <li>{equipped ? 'Đã ghi tấm pin và inverter.' : 'Chưa ghi đủ tấm pin và inverter đã lắp.'}</li>
      </ul>
      <Field
        label="Nội dung báo cáo"
        htmlFor="completion-report"
        hint={`${length.toLocaleString('vi-VN')}/${REPORT_MAX.toLocaleString('vi-VN')} ký tự`}
        required
      >
        <Textarea
          id="completion-report"
          rows={5}
          maxLength={REPORT_MAX}
          aria-required
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
        />
      </Field>
      <span className="flex flex-wrap items-center gap-3">
        <Button variant="primary" disabled={photos === 0 || report.isPending} onClick={review}>
          Gửi báo cáo hoàn thành
        </Button>
        {error && (
          <span className="flex items-center gap-1.5 text-body font-medium text-danger" role="alert">
            <Icon name="error" className="shrink-0 text-[20px]" />
            {error}
          </span>
        )}
      </span>

      <ModalDialog open={confirming} onOpenChange={setConfirming} dismissible={!report.isPending}>
        <DialogTitle>Gửi báo cáo cho khách nghiệm thu?</DialogTitle>
        <p className="mt-2 text-body text-fg-2">
          Sau khi gửi, bạn không thêm ảnh hay thiết bị được nữa, trừ khi khách hoặc quản lý yêu cầu sửa lại.
        </p>
        <DialogFooter>
          <Button variant="ghost" bleed={false} disabled={report.isPending} onClick={() => setConfirming(false)}>
            Huỷ
          </Button>
          <Button variant="primary" disabled={report.isPending} onClick={() => void send()}>
            {report.isPending ? 'Đang gửi…' : 'Gửi báo cáo'}
          </Button>
        </DialogFooter>
      </ModalDialog>
    </div>
  )
}
