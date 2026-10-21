import { useState } from 'react'
import { toast } from 'sonner'
import { CHECKLIST_STATUSES } from '@/common/installation'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox, Field, Radio, Textarea } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Progress } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import { ErrorLine } from '@/features/installation-projects/formParts'
import {
  checklistItemLabel,
  checklistStatusLabel,
  formatFileSize,
  installationErrorMessage,
  isFinal,
} from '@/features/installation-projects/projectDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useFileQuery, useFileUpload } from '@/hooks/useFiles'
import { useChecklistItemMutation } from '@/hooks/useManagerInstallations'
import type { ChecklistItemView, ChecklistStatus, InstallationStaffView } from '@/types/res/managerInstallationsRes'

// Checklist trước khi thi công (chỉ quản lý / quản trị). Mỗi lần lưu gửi đủ isRequired, status, note vì backend ghi đè cả mục;
// `revision` là revision của dự án. "Đã đạt" cần một tài liệu PROJECT_DOCUMENT đã xác minh: chọn tệp mới thì tải lên lúc Lưu,
// không chọn thì giữ tài liệu đang gắn

const NOTE_MAX = 1000
const DOCUMENT = 'PROJECT_DOCUMENT'

// Tên tài liệu đang gắn (GET /api/files/{id}); không đọc được thì chỉ ghi là có tài liệu
function CurrentDocument({ fileId }: { fileId: string }) {
  const file = useFileQuery(fileId)
  if (!file.data) return <>Đang gắn một tài liệu đã xác minh.</>
  const size = formatFileSize(file.data.sizeBytes)
  return (
    <>
      Đang gắn <span className="font-medium text-fg">{file.data.originalFileName}</span>
      {size ? <span className="tnum">, {size}</span> : null}.
    </>
  )
}

function ChecklistDialog({
  project,
  item,
  onClose,
}: {
  project: InstallationStaffView
  item: ChecklistItemView
  onClose: () => void
}) {
  const [isRequired, setIsRequired] = useState(item.isRequired)
  const [status, setStatus] = useState<ChecklistStatus>(item.status)
  const [note, setNote] = useState(item.note ?? '')
  const [chosen, setChosen] = useState<File | null>(null)
  const [documentError, setDocumentError] = useState<string | null>(null)
  // Tài liệu mới đã tải và xác minh: lưu lỗi (vd. 409) thì lần lưu sau không tải lại
  const [uploadedId, setUploadedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const save = useChecklistItemMutation(project.projectId)
  const upload = useFileUpload(DOCUMENT)
  const busy = upload.uploading || save.isPending
  const hasDocument = item.evidenceFileId !== null
  const satisfied = status === CHECKLIST_STATUSES.satisfied
  const unchanged =
    isRequired === item.isRequired &&
    status === item.status &&
    note.trim() === (item.note ?? '') &&
    (!satisfied || chosen === null)

  function pick(files: File[]) {
    const file = files[0]!
    setChosen(file)
    setUploadedId(null)
    setDocumentError(fileProblem(file, DOCUMENT))
    setError(null)
  }

  async function submit() {
    setError(null)
    if (satisfied && !chosen && !hasDocument) {
      setDocumentError('Chọn giấy phép hoặc văn bản chấp thuận của hạng mục này.')
      return
    }
    if (satisfied && documentError) return
    try {
      let evidenceFileId = satisfied ? item.evidenceFileId : null
      if (satisfied && chosen) {
        evidenceFileId = uploadedId ?? (await upload.upload(chosen)).fileId
        setUploadedId(evidenceFileId)
      }
      await save.mutateAsync({
        itemId: item.itemId,
        body: {
          revision: project.revision,
          isRequired,
          status,
          evidenceFileId,
          note: note.trim() || null,
        },
      })
      toast.success(`Đã lưu hạng mục ${checklistItemLabel(item)}.`)
      onClose()
    } catch (e) {
      setError(installationErrorMessage(e))
    }
  }

  const options: { value: ChecklistStatus; label: string; description: string }[] = [
    { value: 'PENDING', label: checklistStatusLabel('PENDING'), description: 'Chưa có kết luận.' },
    {
      value: 'NOT_APPLICABLE',
      label: checklistStatusLabel('NOT_APPLICABLE'),
      description: 'Công trình này không cần hạng mục này.',
    },
    {
      value: 'SATISFIED',
      label: checklistStatusLabel('SATISFIED'),
      description: 'Kèm giấy phép hoặc văn bản chấp thuận.',
    },
  ]
  const uploadPercent = upload.progress === null ? null : Math.round(upload.progress * 100)

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && onClose()}
      dismissible={!busy}
      className="max-w-lg"
      aria-label={`Sửa hạng mục ${checklistItemLabel(item)}`}
    >
      <DialogTitle>{checklistItemLabel(item)}</DialogTitle>
      <div className="mt-4 space-y-5">
        <Checkbox
          checked={isRequired}
          onChange={(e) => setIsRequired(e.target.checked)}
          label="Bắt buộc trước khi thi công"
          description="Mục bắt buộc còn Chưa xong thì kỹ thuật viên không bắt đầu thi công được."
        />
        <fieldset className="space-y-3">
          <legend className="mb-2 text-body font-medium text-fg">Tình trạng</legend>
          {options.map((option) => (
            <Radio
              key={option.value}
              name="checklist-status"
              value={option.value}
              checked={status === option.value}
              disabled={busy}
              onChange={() => setStatus(option.value)}
              label={option.label}
              description={option.description}
            />
          ))}
        </fieldset>
        {satisfied && (
          <section aria-labelledby="checklist-document" className="space-y-2">
            <h3 id="checklist-document" className="text-body font-medium text-fg">
              Tài liệu
              {!hasDocument && (
                <span aria-hidden className="text-danger">
                  {' *'}
                </span>
              )}
            </h3>
            <p className="text-body text-fg-2">
              {chosen ? (
                <>
                  Tải lên khi lưu: <span className="font-medium text-fg">{chosen.name}</span>
                  <span className="tnum">, {formatFileSize(chosen.size)}</span>.
                </>
              ) : item.evidenceFileId ? (
                <CurrentDocument fileId={item.evidenceFileId} />
              ) : (
                'Chưa có tài liệu.'
              )}
            </p>
            <FileButton size="sm" icon="upload_file" accept={acceptFor(DOCUMENT)} disabled={busy} onFiles={pick}>
              {chosen || hasDocument ? 'Chọn tệp khác' : 'Chọn tệp'}
            </FileButton>
            {uploadPercent !== null && <Progress value={uploadPercent} label="Đang tải tài liệu lên" />}
            {documentError ? (
              <p className="text-meta text-danger" role="alert">
                {documentError}
              </p>
            ) : (
              <p className="text-meta text-fg-3">
                {fileTypesText(DOCUMENT)}, tối đa {maxSizeText(DOCUMENT)}.
              </p>
            )}
          </section>
        )}
        <Field label="Ghi chú" htmlFor="checklist-note" hint="Không bắt buộc, tối đa 1.000 ký tự.">
          <Textarea
            id="checklist-note"
            rows={2}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
      <DialogFooter className="items-center">
        <ErrorLine message={error} />
        <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
          Huỷ
        </Button>
        <Button icon="save" variant="primary" disabled={unchanged || busy} onClick={() => void submit()}>
          {uploadPercent !== null ? `Đang tải tài liệu ${uploadPercent}%` : save.isPending ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

export function ChecklistPanel({ project }: { project: InstallationStaffView }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = project.checklist.find((item) => item.itemId === editingId) ?? null
  const locked = isFinal(project.status)
  return (
    <Panel>
      <PanelHeader
        title="Checklist trước khi thi công"
        description="Mục bắt buộc còn Chưa xong thì kỹ thuật viên chưa bắt đầu thi công được. Kỹ thuật viên và khách không thấy checklist."
      />
      <PanelBody>
        {project.checklist.length === 0 ? (
          <p className="text-body text-fg-2">Dự án không có hạng mục nào.</p>
        ) : (
          <ul className="divide-y divide-line">
            {project.checklist.map((item) => (
              <li
                key={item.itemId}
                className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 py-3 first:pt-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-fg">{checklistItemLabel(item)}</span>
                    <Badge tone={item.status === 'SATISFIED' ? 'ok' : 'neutral'}>
                      {checklistStatusLabel(item.status)}
                    </Badge>
                  </p>
                  <p className="mt-1 text-meta text-fg-2">
                    {item.isRequired ? 'Bắt buộc trước khi thi công' : 'Không bắt buộc'}
                    {item.evidenceFileId ? '. Có tài liệu đã xác minh' : ''}
                    {item.verifiedAt ? `. Xác nhận lúc ${formatMoment(item.verifiedAt)}` : ''}
                  </p>
                  {item.note && <p className="mt-1 text-body text-fg-2">{item.note}</p>}
                </div>
                {!locked && (
                  <Button variant="soft" size="sm" icon="edit" onClick={() => setEditingId(item.itemId)}>
                    Sửa
                    <span className="sr-only"> {checklistItemLabel(item)}</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </PanelBody>
      {editing && !locked && (
        <ChecklistDialog key={editing.itemId} project={project} item={editing} onClose={() => setEditingId(null)} />
      )}
    </Panel>
  )
}
