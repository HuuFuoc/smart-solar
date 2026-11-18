import { useState } from 'react'
import { toast } from 'sonner'
import { ACCEPTANCE_DECIDERS, ACCEPTANCE_DECISIONS } from '@/common/installation'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea, fieldMessageId } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorLine, ReasonField } from '@/features/installation-projects/formParts'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import {
  ACCEPTANCE_NOTE_MAX,
  acceptanceNoteError,
  internalAcceptanceBlockers,
} from '@/features/installation-projects/acceptanceRules'
import { installationErrorMessage } from '@/features/installation-projects/projectDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useFileUpload } from '@/hooks/useFiles'
import { useAcceptInternallyMutation, useReturnToReworkMutation } from '@/hooks/useManagerInstallations'
import type { AcceptanceView, InstallationStaffView } from '@/types/res/managerInstallationsRes'

// Báo cáo hoàn thành của kỹ thuật viên và kết quả nghiệm thu từng lượt. Quản lý / quản trị nghiệm thu nội bộ (ghi căn cứ, kèm
// biên bản bàn giao nếu có) hoặc trả báo cáo về làm lại (lý do bắt buộc, tối đa 500 ký tự). Khách không nghiệm thu trong ứng dụng

const DOCUMENT = 'PROJECT_DOCUMENT'

function AcceptDialog({
  project,
  report,
  onClose,
}: {
  project: InstallationStaffView
  report: AcceptanceView
  onClose: () => void
}) {
  const accept = useAcceptInternallyMutation(project.projectId)
  const upload = useFileUpload(DOCUMENT)
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  // Lưu lỗi sau khi đã tải tệp thì lần sau dùng lại tệp đã tải, không tải lại
  const [uploadedId, setUploadedId] = useState<string | null>(null)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const busy = accept.isPending || upload.uploading

  function pick(files: File[]) {
    const chosen = files[0] ?? null
    setFile(chosen)
    setUploadedId(null)
    setFileError(chosen ? fileProblem(chosen, DOCUMENT) : null)
  }

  async function submit() {
    setError(null)
    const basis = note.trim()
    const problem = acceptanceNoteError(note)
    setNoteError(problem)
    if (problem || fileError) return
    try {
      let evidenceFileId: string | null = uploadedId
      if (file && !evidenceFileId) {
        evidenceFileId = (await upload.upload(file)).fileId
        setUploadedId(evidenceFileId)
      }
      await accept.mutateAsync({ expectedRevision: project.revision, note: basis, evidenceFileId })
      toast.success('Đã nghiệm thu. Công trình đã bàn giao, khách nhận thông báo.')
      onClose()
    } catch (e) {
      setError(installationErrorMessage(e))
    }
  }

  const percent = upload.progress === null ? null : Math.round(upload.progress * 100)
  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      dismissible={!busy}
      className="max-w-xl"
      aria-label="Nghiệm thu nội bộ"
    >
      <DialogTitle>Nghiệm thu lượt {report.round}</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Dự án chuyển sang đã bàn giao, kỹ thuật viên kết thúc việc, khách nhận thông báo. Không hoàn tác được.
      </p>
      <div className="mt-4 space-y-4">
        <Field label="Căn cứ nghiệm thu" htmlFor="accept-note" required error={noteError ?? undefined}>
          <Textarea
            id="accept-note"
            rows={3}
            maxLength={ACCEPTANCE_NOTE_MAX}
            value={note}
            disabled={busy}
            aria-invalid={Boolean(noteError) || undefined}
            aria-describedby={fieldMessageId('accept-note')}
            placeholder="Ví dụ: Đã bàn giao trực tiếp với khách, biên bản ký tại công trình; đã xem ảnh và thiết bị."
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <Field
          label="Biên bản bàn giao"
          htmlFor="accept-file"
          optional
          error={fileError ?? undefined}
          hint={`${fileTypesText(DOCUMENT)}, tối đa ${maxSizeText(DOCUMENT)}.`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <FileButton size="sm" icon="upload_file" accept={acceptFor(DOCUMENT)} disabled={busy} onFiles={pick}>
              {file ? 'Chọn tệp khác' : 'Chọn tệp'}
            </FileButton>
            {file && <span className="text-body break-all text-fg">{file.name}</span>}
          </div>
        </Field>
      </div>
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter className="items-center">
        <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
          Đóng
        </Button>
        <Button icon="verified" variant="primary" disabled={busy} onClick={() => void submit()}>
          {upload.uploading ? `Đang tải tệp ${percent ?? 0}%` : accept.isPending ? 'Đang ghi…' : 'Nghiệm thu'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

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
        rồi gửi báo cáo lượt sau.
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
        <Button icon="replay" variant="warn" disabled={rework.isPending} onClick={() => void submit()}>
          {rework.isPending ? 'Đang gửi…' : 'Trả về làm lại'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

export function CompletionPanel({ project }: { project: InstallationStaffView }) {
  // Giữ báo cáo lúc mở hộp thoại: dữ liệu tải lại sau lỗi không làm hộp thoại biến mất trước khi đọc được lỗi
  const [returning, setReturning] = useState<AcceptanceView | null>(null)
  const [accepting, setAccepting] = useState<AcceptanceView | null>(null)
  const blockers = internalAcceptanceBlockers(project)
  const rounds = [...project.acceptances].sort((a, b) => b.round - a.round)
  const pending =
    project.status === 'PENDING_CUSTOMER_ACCEPTANCE' ? rounds.find((a) => a.decision === 'PENDING') : undefined

  return (
    <Panel>
      <PanelHeader title="Báo cáo hoàn thành và nghiệm thu nội bộ" />
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
                    <div className="mt-3 space-y-3">
                      {blockers.length > 0 && (
                        <ul className="space-y-1 text-body text-fg-2">
                          {blockers.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <Button
                          icon="verified"
                          size="sm"
                          variant="primary"
                          disabled={blockers.length > 0}
                          onClick={() => setAccepting(a)}
                        >
                          Nghiệm thu
                        </Button>
                        <Button icon="replay" size="sm" variant="warn" onClick={() => setReturning(a)}>
                          Trả về làm lại
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </PanelBody>
      {returning && <ReturnToReworkDialog project={project} report={returning} onClose={() => setReturning(null)} />}
      {accepting && <AcceptDialog project={project} report={accepting} onClose={() => setAccepting(null)} />}
    </Panel>
  )
}
