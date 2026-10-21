import { useState } from 'react'
import { toast } from 'sonner'
import { ACCEPTANCE_DECIDERS, ACCEPTANCE_DECISIONS } from '@/common/installation'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorLine, ReasonField } from '@/features/installation-projects/formParts'
import { installationErrorMessage } from '@/features/installation-projects/projectDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useReturnToReworkMutation } from '@/hooks/useManagerInstallations'
import type { AcceptanceView, InstallationStaffView } from '@/types/res/managerInstallationsRes'

// Báo cáo hoàn thành của kỹ thuật viên và kết quả nghiệm thu từng lượt. Chỉ khách nghiệm thu được;
// quản lý chỉ trả báo cáo đang chờ về làm lại khi báo cáo sai hoặc thiếu (lý do bắt buộc, tối đa 500 ký tự)

function ReturnToReworkDialog({
  project,
  report,
  onClose,
}: {
  project: InstallationStaffView
  report: AcceptanceView
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const rework = useReturnToReworkMutation(project.projectId)

  async function submit() {
    const why = reason.trim()
    if (!why) {
      setError('Ghi lý do trả về làm lại.')
      return
    }
    setError(null)
    try {
      await rework.mutateAsync({ reason: why, expectedRevision: project.revision })
      toast.success('Đã trả báo cáo về làm lại. Kỹ thuật viên cần ảnh mới cho lượt sau.')
      onClose()
    } catch (e) {
      setError(installationErrorMessage(e))
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && onClose()}
      dismissible={!rework.isPending}
      className="max-w-xl"
      aria-label="Trả về làm lại"
    >
      <DialogTitle>Trả báo cáo lượt {report.round} về làm lại</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Dự án chuyển sang cần sửa lại, lượt nghiệm thu này đóng lại với lý do của bạn. Kỹ thuật viên phải thêm ảnh mới
        rồi gửi báo cáo lượt sau cho khách.
      </p>
      <div className="mt-4 space-y-4">
        <ReasonField
          id="rework-reason"
          required
          value={reason}
          onChange={(value) => {
            setReason(value)
            setError(null)
          }}
        />
      </div>
      <DialogFooter className="items-center">
        <ErrorLine message={error} />
        <Button icon="close" variant="secondary" disabled={rework.isPending} onClick={onClose}>
          Huỷ
        </Button>
        <Button icon="replay" variant="primary" disabled={rework.isPending} onClick={() => void submit()}>
          {rework.isPending ? 'Đang gửi…' : 'Trả về làm lại'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

export function CompletionPanel({ project }: { project: InstallationStaffView }) {
  // Giữ báo cáo lúc mở hộp thoại: dữ liệu tải lại sau lỗi không làm hộp thoại biến mất trước khi đọc được lỗi
  const [returning, setReturning] = useState<AcceptanceView | null>(null)
  const rounds = [...project.acceptances].sort((a, b) => b.round - a.round)
  const pending =
    project.status === 'PENDING_CUSTOMER_ACCEPTANCE' ? rounds.find((a) => a.decision === 'PENDING') : undefined

  return (
    <Panel>
      <PanelHeader
        title="Báo cáo hoàn thành và nghiệm thu"
        description={
          pending ? 'Khách không phản hồi thì gọi khách; hệ thống không tự nghiệm thu thay khách.' : undefined
        }
      />
      <PanelBody>
        {rounds.length === 0 ? (
          <p className="text-body text-fg-2">Kỹ thuật viên chưa gửi báo cáo hoàn thành.</p>
        ) : (
          <ol className="divide-y divide-line">
            {rounds.map((a) => {
              const decision = ACCEPTANCE_DECISIONS[a.decision] ?? { label: a.decision, tone: 'neutral' as const }
              return (
                <li key={a.round} className="py-4 first:pt-0 last:pb-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-fg">Lượt {a.round}</span>
                    <Badge tone={decision.tone}>{decision.label}</Badge>
                    <span className="tnum text-meta text-fg-2">gửi lúc {formatMoment(a.requestedAt)}</span>
                  </p>
                  <p className="mt-2 text-body whitespace-pre-line text-fg">{a.completionReport}</p>
                  {a.decidedAt && (
                    <p className="tnum mt-2 text-meta text-fg-2">
                      {a.decidedBy ? `${ACCEPTANCE_DECIDERS[a.decidedBy] ?? a.decidedBy} quyết định` : 'Quyết định'} lúc{' '}
                      {formatMoment(a.decidedAt)}
                    </p>
                  )}
                  {a.reason && <p className="mt-1 text-body text-fg-2">Lý do: {a.reason}</p>}
                  {a === pending && (
                    <Button icon="replay" size="sm" variant="danger" className="mt-3" onClick={() => setReturning(a)}>
                      Trả về làm lại
                    </Button>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </PanelBody>
      {returning && <ReturnToReworkDialog project={project} report={returning} onClose={() => setReturning(null)} />}
    </Panel>
  )
}
