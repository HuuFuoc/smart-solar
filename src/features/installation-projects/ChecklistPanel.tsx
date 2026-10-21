import { useState } from 'react'
import { toast } from 'sonner'
import { CHECKLIST_STATUSES } from '@/common/installation'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox, Field, Radio, Textarea } from '@/components/common/ui/field'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorLine } from '@/features/installation-projects/formParts'
import {
  checklistItemLabel,
  checklistStatusLabel,
  installationErrorMessage,
  isFinal,
} from '@/features/installation-projects/projectDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useChecklistItemMutation } from '@/hooks/useManagerInstallations'
import type { ChecklistItemView, ChecklistStatus, InstallationStaffView } from '@/types/res/managerInstallationsRes'

// Checklist trước khi thi công (chỉ quản lý / quản trị). Mỗi lần lưu gửi đủ isRequired, status, note vì backend ghi đè cả mục;
// `revision` là revision của dự án. "Đã đạt" cần tài liệu PROJECT_DOCUMENT đã xác minh, mà API chưa có cách tải tài liệu lên,
// nên chỉ giữ được "Đã đạt" cho mục đã có tài liệu

const NOTE_MAX = 1000

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
  const [error, setError] = useState<string | null>(null)
  const save = useChecklistItemMutation(project.projectId)
  const hasDocument = item.evidenceFileId !== null
  const unchanged = isRequired === item.isRequired && status === item.status && note.trim() === (item.note ?? '')

  async function submit() {
    setError(null)
    try {
      await save.mutateAsync({
        itemId: item.itemId,
        body: {
          revision: project.revision,
          isRequired,
          status,
          evidenceFileId: status === CHECKLIST_STATUSES.satisfied ? item.evidenceFileId : null,
          note: note.trim() || null,
        },
      })
      toast.success(`Đã lưu hạng mục ${checklistItemLabel(item)}.`)
      onClose()
    } catch (e) {
      setError(installationErrorMessage(e))
    }
  }

  const options: { value: ChecklistStatus; label: string; description: string; disabled?: boolean }[] = [
    { value: 'PENDING', label: checklistStatusLabel('PENDING'), description: 'Chưa có kết luận.' },
    {
      value: 'NOT_APPLICABLE',
      label: checklistStatusLabel('NOT_APPLICABLE'),
      description: 'Công trình này không cần hạng mục này.',
    },
    {
      value: 'SATISFIED',
      label: checklistStatusLabel('SATISFIED'),
      description: hasDocument
        ? 'Giữ tài liệu đã xác minh đang gắn với hạng mục.'
        : 'Cần tài liệu đã xác minh. Hệ thống chưa có chức năng tải tài liệu lên nên chưa chọn được.',
      disabled: !hasDocument,
    },
  ]

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && onClose()}
      dismissible={!save.isPending}
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
              disabled={option.disabled}
              onChange={() => setStatus(option.value)}
              label={option.label}
              description={option.description}
            />
          ))}
        </fieldset>
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
        <Button variant="ghost" disabled={save.isPending} onClick={onClose}>
          Huỷ
        </Button>
        <Button variant="primary" disabled={unchanged || save.isPending} onClick={() => void submit()}>
          {save.isPending ? 'Đang lưu…' : 'Lưu'}
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
                  <Button size="sm" icon="edit" onClick={() => setEditingId(item.itemId)}>
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
