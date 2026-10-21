import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { Field, Textarea } from '@/components/common/ui/field'
import { assignmentEnded, windowText } from '@/features/installations/technicianInstallationDisplay'
import { useAcceptInstallationMutation, useDeclineInstallationMutation } from '@/hooks/useTechnicianInstallations'
import { ROUTES } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { InstallationTechnicianView } from '@/types/res/technicianInstallationsRes'

const REASON_MAX = 500

function ErrorLine({ message }: { message: string }) {
  return (
    <span className="flex items-center gap-1.5 text-body font-medium text-danger" role="alert">
      <Icon name="error" className="shrink-0 text-[20px]" />
      {message}
    </span>
  )
}

// Quản lý giao việc thì kỹ thuật viên nhận (công trình sang "đã lên lịch") hoặc từ chối kèm lý do
// (công trình quay về chờ phân công). Cả hai gửi revision đang xem; công trình đổi trong lúc đó thì 409, không tự gửi lại
export function AssignmentResponse({ view }: { view: InstallationTechnicianView }) {
  const accept = useAcceptInstallationMutation()
  const decline = useDeclineInstallationMutation()
  const navigate = useNavigate()
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [now] = useState(() => Date.now())
  const ended = assignmentEnded(view, now)
  const busy = accept.isPending || decline.isPending

  async function onAccept() {
    if (busy) return
    setError(null)
    try {
      await accept.mutateAsync({ id: view.projectId, revision: view.revision })
      toast.success('Đã nhận việc. Khách sẽ thấy tên bạn là người lắp đặt.')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  async function onDecline() {
    if (busy) return
    if (!reason.trim()) {
      setError('Ghi lý do từ chối để quản lý biết.')
      return
    }
    try {
      await decline.mutateAsync({ id: view.projectId, reason: reason.trim(), revision: view.revision })
      toast.success('Đã từ chối. Công trình quay về chờ quản lý giao người khác.')
      navigate(ROUTES.tech.installations)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-body text-fg-2">
        Quản lý giao cho bạn lắp đặt <span className="tnum text-fg">{windowText(view)}</span>.
        {ended && ' Khung giờ này đã qua nên không nhận được nữa.'}
      </p>
      {!declining ? (
        <span className="flex flex-wrap items-center gap-3">
          {!ended && (
            <Button variant="primary" icon="task_alt" disabled={busy} onClick={() => void onAccept()}>
              {accept.isPending ? 'Đang nhận…' : 'Nhận việc'}
            </Button>
          )}
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => {
              setDeclining(true)
              setError(null)
            }}
          >
            Từ chối
          </Button>
          {error && <ErrorLine message={error} />}
        </span>
      ) : (
        <span className="block space-y-3">
          <Field
            label="Lý do từ chối"
            htmlFor="decline-reason"
            hint="Quản lý đọc lý do này để giao người khác."
            required
          >
            <Textarea
              id="decline-reason"
              rows={2}
              maxLength={REASON_MAX}
              aria-required
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError(null)
              }}
            />
          </Field>
          <span className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="ghost" bleed={false} disabled={busy} onClick={() => setDeclining(false)}>
              Huỷ
            </Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => void onDecline()}>
              {decline.isPending ? 'Đang gửi…' : 'Xác nhận từ chối'}
            </Button>
            {error && <ErrorLine message={error} />}
          </span>
        </span>
      )}
    </div>
  )
}
