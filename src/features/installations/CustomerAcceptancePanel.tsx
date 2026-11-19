import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea, fieldMessageId } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import { formatVnd, paymentPlanErrorMessage } from '@/features/payment-plan/paymentPlanDisplay'
import {
  ACCEPTANCE_EVIDENCE_MAX,
  ACCEPTANCE_REASON_MAX,
  type AcceptanceDecision,
  acceptanceErrors,
} from '@/features/payment-plan/paymentPlanRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useMyContractQuery } from '@/hooks/useCustomerContracts'
import { useFileUpload } from '@/hooks/useFiles'
import { useCustomerAcceptanceMutation } from '@/hooks/usePaymentPlan'
import { isApiError } from '@/services/api/errors'
import type { AcceptanceView, InstallationCustomerView } from '@/types/res/customerInstallationsRes'

// Khách nghiệm thu báo cáo hoàn thành đang chờ (backend 7d27054): nghiệm thu, yêu cầu làm lại, hoặc không nghiệm thu (hai cách sau
// bắt buộc lý do, kèm tối đa 10 ảnh / PDF ACCEPTANCE_EVIDENCE). Nghiệm thu hợp đồng 30/70 mở khoản 70% với hạn do backend ghi
// (72 giờ sau lúc nghiệm thu); không báo thành công trước khi backend trả lời

const PURPOSE = 'ACCEPTANCE_EVIDENCE'

const TEXT: Record<AcceptanceDecision, { title: string; submit: string; icon: string; done: string }> = {
  ACCEPT: {
    title: 'Nghiệm thu công trình?',
    submit: 'Nghiệm thu',
    icon: 'verified',
    done: 'Đã nghiệm thu. Công trình được bàn giao.',
  },
  REQUEST_REWORK: {
    title: 'Yêu cầu làm lại?',
    submit: 'Gửi yêu cầu làm lại',
    icon: 'replay',
    done: 'Đã gửi yêu cầu làm lại. Kỹ thuật viên sửa xong sẽ gửi báo cáo mới để bạn nghiệm thu lại.',
  },
  REJECT: {
    title: 'Không nghiệm thu?',
    submit: 'Không nghiệm thu',
    icon: 'block',
    done: 'Đã ghi không nghiệm thu. Kỹ thuật viên khắc phục rồi gửi báo cáo mới.',
  },
}

/** Câu riêng cho khách: mã lỗi chung viết cho nhân viên */
function acceptanceError(e: unknown) {
  if (isApiError(e)) {
    if (e.code === 'INSTALLATION_CHECKLIST_INCOMPLETE')
      return 'Smart Solar còn hoàn tất hồ sơ bắt buộc (điện lực, phòng cháy, kết cấu) nên chưa nghiệm thu được. Thử lại sau.'
    if (e.code === 'INSTALLATION_SUBSTITUTION_APPROVAL_REQUIRED')
      return 'Thiết bị đã lắp khác hợp đồng và Smart Solar chưa duyệt xong. Thử lại sau khi được duyệt.'
    if (e.code === 'INSTALLATION_STALE_REVISION' || e.code === 'INSTALLATION_INVALID_STATE')
      return 'Công trình vừa thay đổi. Đã tải lại, xem báo cáo mới nhất rồi quyết định lại.'
  }
  return paymentPlanErrorMessage(e)
}

function DecisionDialog({
  project: p,
  decision,
  onClose,
}: {
  project: InstallationCustomerView
  decision: AcceptanceDecision
  onClose: () => void
}) {
  const decide = useCustomerAcceptanceMutation()
  const upload = useFileUpload(PURPOSE)
  const contract = useMyContractQuery(decision === 'ACCEPT' ? p.contractId : undefined)
  const [reason, setReason] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [uploaded, setUploaded] = useState(() => new Map<File, string>())
  const [errors, setErrors] = useState<ReturnType<typeof acceptanceErrors>>({})
  const [error, setError] = useState<string | null>(null)
  const busy = decide.isPending || upload.uploading
  const text = TEXT[decision]
  const balance = contract.data?.paymentPlan?.installments.find((i) => i.kind === 'BALANCE')

  async function submit() {
    setError(null)
    const next = acceptanceErrors(decision, reason, files.length)
    setErrors(next)
    if (next.reason || next.evidence) return
    const bad = files.map((f) => fileProblem(f, PURPOSE)).find(Boolean)
    if (bad) return setError(bad)
    const ids: string[] = []
    for (const file of files) {
      const known = uploaded.get(file)
      if (known) {
        ids.push(known)
        continue
      }
      try {
        const view = await upload.upload(file)
        setUploaded((m) => new Map(m).set(file, view.fileId))
        ids.push(view.fileId)
      } catch (e) {
        return setError(`Chưa tải được ${file.name}: ${paymentPlanErrorMessage(e)}`)
      }
    }
    try {
      await decide.mutateAsync({
        projectId: p.projectId,
        body: {
          decision,
          reason: reason.trim() || null,
          evidenceFileIds: ids.length > 0 ? ids : null,
          expectedRevision: p.revision,
        },
      })
      toast.success(text.done)
      onClose()
    } catch (e) {
      setError(acceptanceError(e))
    }
  }

  return (
    <ModalDialog open onOpenChange={(o) => !o && !busy && onClose()} dismissible={!busy} aria-label={text.title}>
      <DialogTitle>{text.title}</DialogTitle>
      <div className="mt-2 space-y-3 text-body text-fg-2">
        {decision === 'ACCEPT' ? (
          <>
            <p>
              Bạn xác nhận công trình đã lắp xong, chạy được và đúng như báo cáo. Nghiệm thu xong không đổi lại được.
            </p>
            {balance && balance.status !== 'PAID' && (
              <p className="text-fg">
                Khoản 70% (<span className="tnum">{formatVnd(balance.amount)}</span>) đến hạn trong 72 giờ kể từ lúc bạn
                nghiệm thu; hạn chính xác hiện ở trang hợp đồng sau khi gửi.
              </p>
            )}
          </>
        ) : (
          <p>
            Ghi rõ điều cần sửa. Kỹ thuật viên khắc phục rồi gửi báo cáo mới; khoản 70% chưa đến hạn khi chưa nghiệm
            thu.
          </p>
        )}
      </div>
      {decision !== 'ACCEPT' && (
        <div className="mt-4 space-y-4">
          <Field label="Điều cần sửa" htmlFor="acceptance-reason" required error={errors.reason}>
            <Textarea
              id="acceptance-reason"
              rows={4}
              maxLength={ACCEPTANCE_REASON_MAX}
              value={reason}
              disabled={busy}
              aria-required
              aria-invalid={Boolean(errors.reason) || undefined}
              aria-describedby={fieldMessageId('acceptance-reason')}
              placeholder="Ví dụ: Tấm pin hàng thứ hai bị lệch, dây điện chưa đi trong ống."
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="space-y-2">
            <p className="text-body font-medium text-fg">
              Ảnh hoặc PDF <span className="font-normal text-fg-2">(không bắt buộc)</span>
            </p>
            {files.length > 0 && (
              <ul className="space-y-1">
                {files.map((f) => (
                  <li
                    key={`${f.name}-${f.size}-${f.lastModified}`}
                    className="flex items-center gap-2 text-body text-fg"
                  >
                    <span className="min-w-0 break-all">{f.name}</span>
                    <Button
                      size="sm"
                      variant="danger-quiet"
                      icon="close"
                      disabled={busy}
                      onClick={() => setFiles((list) => list.filter((x) => x !== f))}
                    >
                      Bỏ
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <FileButton
              size="sm"
              variant="soft"
              icon="add_a_photo"
              multiple
              accept={acceptFor(PURPOSE)}
              disabled={busy || files.length >= ACCEPTANCE_EVIDENCE_MAX}
              onFiles={(picked) => setFiles((list) => [...list, ...picked].slice(0, ACCEPTANCE_EVIDENCE_MAX))}
            >
              Thêm ảnh
            </FileButton>
            <p className={errors.evidence ? 'text-meta text-danger' : 'text-meta text-fg-3'}>
              {errors.evidence ??
                `${fileTypesText(PURPOSE)}, tối đa ${maxSizeText(PURPOSE)} mỗi tệp, ${ACCEPTANCE_EVIDENCE_MAX} tệp.`}
            </p>
          </div>
        </div>
      )}
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
          Đóng
        </Button>
        <Button
          icon={text.icon}
          variant={decision === 'ACCEPT' ? 'primary' : decision === 'REJECT' ? 'danger' : 'warn'}
          disabled={busy}
          onClick={() => void submit()}
        >
          {upload.uploading ? 'Đang tải ảnh…' : decide.isPending ? 'Đang gửi…' : text.submit}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

/** Báo cáo hoàn thành đang chờ khách quyết định, kèm các nút nghiệm thu */
export function CustomerAcceptancePanel({
  project: p,
  pending,
  children,
}: {
  project: InstallationCustomerView
  pending: AcceptanceView
  /** Khối báo thiết bị khác hợp đồng */
  children?: ReactNode
}) {
  const [deciding, setDeciding] = useState<AcceptanceDecision | null>(null)
  const substitutionPending = p.equipment?.status === 'SUBSTITUTION_APPROVAL_REQUIRED'
  return (
    <Panel>
      <PanelHeader
        title="Báo cáo hoàn thành, chờ bạn nghiệm thu"
        description={`Lần ${pending.round}, gửi ${formatMoment(pending.requestedAt)}`}
      />
      <PanelBody className="space-y-4">
        <p className="max-w-[72ch] text-body whitespace-pre-line text-fg">{pending.completionReport}</p>
        {children}
        <p className="text-body text-fg-2">
          Xem ảnh thi công và thiết bị đã lắp bên dưới, kiểm tra tại công trình rồi quyết định.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            icon="verified"
            variant="primary"
            disabled={substitutionPending}
            onClick={() => setDeciding('ACCEPT')}
          >
            Nghiệm thu
          </Button>
          <Button icon="replay" variant="warn" onClick={() => setDeciding('REQUEST_REWORK')}>
            Yêu cầu làm lại
          </Button>
          <Button icon="block" variant="danger" onClick={() => setDeciding('REJECT')}>
            Không nghiệm thu
          </Button>
        </div>
        {substitutionPending && (
          <p className="text-meta text-fg-2">Nghiệm thu được sau khi Smart Solar duyệt thiết bị lắp khác hợp đồng.</p>
        )}
      </PanelBody>
      {deciding && <DecisionDialog project={p} decision={deciding} onClose={() => setDeciding(null)} />}
    </Panel>
  )
}
