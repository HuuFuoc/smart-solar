import { useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, IconButton } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, fieldMessageId, Textarea } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Notice } from '@/components/common/ui/lists'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import { OnSiteSurveyFields, type DeclaredValues } from '@/features/onsite-survey/OnSiteSurveyFields'
import {
  AMENDMENT_REASON_MAX,
  amendmentBody,
  amendmentDiff,
  amendmentErrors,
} from '@/features/onsite-survey/onSiteSurveyAmendment'
import { FIELD_ERROR_CODES, unitsOf } from '@/features/onsite-survey/billOfMaterials'
import { amendmentFieldLabel } from '@/features/onsite-survey/onSiteSurveyDisplay'
import {
  clearTouchedErrors,
  formFromView,
  serverOnSiteSurveyErrors,
  toRequest,
  validateOnSiteSurvey,
  type OnSiteSurveyErrors,
  type OnSiteSurveyForm,
} from '@/features/onsite-survey/onSiteSurveyForm'
import { useFileUpload } from '@/hooks/useFiles'
import { useAmendOnSiteSurveyMutation } from '@/hooks/useOnSiteSurvey'
import { useCatalogPickerQuery } from '@/hooks/useProducts'
import { isApiError, rateLimitedMessage } from '@/services/api/errors'
import type { OnSiteSurveyView } from '@/types/res/technicianOnSiteSurveyRes'

// Bổ sung biên bản đã hoàn thành: lý do, các ô cần sửa (điền sẵn bản đang có) và tệp thêm. Chỉ gửi ô đã đổi; biên bản gốc
// và các lần bổ sung trước giữ trong lịch sử của backend. Form so với bản lúc mở (`base`) và gửi đúng revision của bản đó,
// nên biên bản đổi ở nơi khác thì backend báo xung đột thay vì ghi đè

const PURPOSE = 'ONSITE_SURVEY_EVIDENCE'

type PendingFile = { key: number; file: File; fileId: string | null; error: string | null }
let lastKey = 0

function focusFirstError() {
  window.requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('#onsite-amendment-form [aria-invalid="true"]')?.focus()
  })
}

export function OnSiteSurveyAmendmentEditor({
  appointmentId,
  survey,
  declared,
  onClose,
}: {
  appointmentId: string
  /** Bản mới nhất trong cache */
  survey: OnSiteSurveyView
  declared: DeclaredValues | null
  onClose: () => void
}) {
  const amend = useAmendOnSiteSurveyMutation(appointmentId)
  const catalog = useCatalogPickerQuery()
  const { upload, uploading } = useFileUpload(PURPOSE)
  const [base, setBase] = useState(survey)
  const [form, setForm] = useState<OnSiteSurveyForm>(() => formFromView(survey))
  const [reason, setReason] = useState('')
  const [files, setFiles] = useState<PendingFile[]>([])
  const [errors, setErrors] = useState<OnSiteSurveyErrors>({})
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const busy = amend.isPending || uploading
  // Có lần bổ sung khác (hoặc tải lại sau xung đột): phải xem lại trên bản mới trước khi gửi
  const outdated = stale || survey.revision !== base.revision
  const diff = amendmentDiff(toRequest(form, null), toRequest(formFromView(base), null))

  function change(patch: Partial<OnSiteSurveyForm>) {
    setForm((current) => ({ ...current, ...patch }))
    setErrors((current) => clearTouchedErrors(current, Object.keys(patch)))
    setActionError(null)
  }

  function addFiles(picked: File[]) {
    setActionError(null)
    const bad = picked.find((f) => fileProblem(f, PURPOSE))
    if (bad) return setActionError(`${bad.name}: ${fileProblem(bad, PURPOSE)}`)
    setFiles((list) => [...list, ...picked.map((file) => ({ key: ++lastKey, file, fileId: null, error: null }))])
  }

  function review() {
    setActionError(null)
    const found = validateOnSiteSurvey(form, { forCompletion: true, units: unitsOf(catalog.data?.items) })
    const problems = amendmentErrors({ reason, diff, fileCount: files.length })
    setErrors(found)
    setReasonError(problems.reason ?? null)
    if (Object.keys(found).length > 0) {
      setActionError('Biên bản sau khi bổ sung vẫn phải đủ ô bắt buộc. Sửa các ô được đánh dấu.')
      focusFirstError()
      return
    }
    if (problems.reason) {
      window.requestAnimationFrame(() => document.getElementById('amendment-reason')?.focus())
      return
    }
    if (problems.form) return setActionError(problems.form)
    setConfirming(true)
  }

  /** Tải lần lượt các tệp chưa có fileId; tệp đã tải giữ lại fileId để lần gửi sau không tải lại */
  async function uploadPending(): Promise<string[] | null> {
    const ids: string[] = []
    for (const item of files) {
      if (item.fileId) {
        ids.push(item.fileId)
        continue
      }
      try {
        const view = await upload(item.file)
        setFiles((list) => list.map((f) => (f.key === item.key ? { ...f, fileId: view.fileId, error: null } : f)))
        ids.push(view.fileId)
      } catch (e) {
        setFiles((list) => list.map((f) => (f.key === item.key ? { ...f, error: rateLimitedMessage(e) } : f)))
        setActionError(`${item.file.name}: ${rateLimitedMessage(e)}`)
        return null
      }
    }
    return ids
  }

  async function submit() {
    setActionError(null)
    const fileIds = await uploadPending()
    if (!fileIds) {
      setConfirming(false)
      return
    }
    try {
      await amend.mutateAsync(amendmentBody({ revision: base.revision, reason, diff, fileIds }))
      setConfirming(false)
      toast.success('Đã gửi bổ sung biên bản. Kinh doanh thấy bản mới và lý do bổ sung.')
      onClose()
    } catch (e) {
      setConfirming(false)
      if (isApiError(e) && e.code === 'ONSITE_SURVEY_STALE_REVISION') setStale(true)
      if (isApiError(e) && FIELD_ERROR_CODES.includes(e.code ?? '') && e.hasFieldErrors) {
        setErrors(serverOnSiteSurveyErrors(e.fieldErrors, form))
        focusFirstError()
      }
      setActionError(rateLimitedMessage(e))
    }
  }

  function reloadLatest() {
    setBase(survey)
    setForm(formFromView(survey))
    setErrors({})
    setActionError(null)
    setStale(false)
  }

  return (
    <div className="space-y-6">
      <p className="max-w-prose text-body text-fg-2">
        Sửa các ô cần đổi, ghi lý do rồi gửi. Chỉ ô đã đổi được ghi lại; giá trị cũ vẫn nằm trong lịch sử của biên bản.
      </p>

      {outdated && (
        <Notice tone="warn" title="Biên bản vừa thay đổi trên hệ thống">
          Có lần bổ sung khác vừa được ghi. Tải bản mới nhất để xem lại; lý do và tệp bạn đã chọn vẫn giữ, các ô sẽ lấy
          theo bản mới.
          <span className="mt-3 flex">
            <Button icon="refresh" variant="secondary" size="sm" disabled={busy} onClick={reloadLatest}>
              Tải bản mới nhất
            </Button>
          </span>
        </Notice>
      )}

      <Field
        label="Lý do bổ sung"
        htmlFor="amendment-reason"
        required
        error={reasonError ?? undefined}
        hint={`Vd: Đo lại chiều rộng mái theo bản vẽ. Tối đa ${AMENDMENT_REASON_MAX} ký tự.`}
      >
        <Textarea
          id="amendment-reason"
          rows={2}
          maxLength={AMENDMENT_REASON_MAX}
          aria-invalid={reasonError ? true : undefined}
          aria-describedby={fieldMessageId('amendment-reason')}
          value={reason}
          disabled={busy}
          onChange={(e) => {
            setReason(e.target.value)
            setReasonError(null)
          }}
        />
      </Field>

      <form
        id="onsite-amendment-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          review()
        }}
      >
        <OnSiteSurveyFields
          value={form}
          errors={errors}
          onChange={change}
          declared={declared}
          disabled={busy}
          amending
        />
      </form>

      <section aria-labelledby="amendment-files" className="space-y-3 border-t border-line pt-5">
        <h3 id="amendment-files" className="text-body font-semibold text-fg">
          Tệp bổ sung
        </h3>
        <FileButton
          variant="soft"
          icon="attach_file"
          accept={acceptFor(PURPOSE)}
          multiple
          disabled={busy}
          onFiles={addFiles}
        >
          Thêm ảnh, tài liệu
        </FileButton>
        <p className="text-meta text-fg-2">
          {fileTypesText(PURPOSE)}, tối đa {maxSizeText(PURPOSE)} mỗi tệp. Tệp bổ sung được xếp vào mục Giấy tờ của biên
          bản.
        </p>
        {files.length > 0 && (
          <ul className="divide-y divide-line border-y border-line">
            {files.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3 py-2 text-body">
                <span className="min-w-0">
                  <span className="block truncate text-fg">{item.file.name}</span>
                  <span className={item.error ? 'text-meta text-danger' : 'text-meta text-fg-2'}>
                    {item.error ?? (item.fileId ? 'Đã tải lên, chờ gửi bổ sung' : 'Tải lên khi gửi')}
                  </span>
                </span>
                <IconButton
                  icon="close"
                  label={`Bỏ ${item.file.name}`}
                  disabled={busy}
                  onClick={() => setFiles((list) => list.filter((f) => f.key !== item.key))}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div
        data-sticky-bottom
        className="sticky bottom-0 z-10 space-y-3 border-t border-line bg-canvas/95 py-3 backdrop-blur"
      >
        <p className="text-meta text-fg-2">
          {diff.changed.length > 0
            ? `Đã sửa ${diff.changed.length} ô: ${diff.changed.map(amendmentFieldLabel).join(', ')}`
            : 'Chưa sửa ô nào'}
          {files.length > 0 ? `; thêm ${files.length} tệp` : ''}
        </p>
        {actionError && (
          <p className="flex items-center gap-1.5 text-body font-medium text-danger" role="alert">
            <Icon name="error" className="shrink-0 text-[20px]" />
            {actionError}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
            Huỷ
          </Button>
          <Button
            type="submit"
            form="onsite-amendment-form"
            icon="send"
            variant="primary"
            className="flex-1 sm:ml-auto sm:flex-none"
            disabled={busy || outdated}
          >
            Gửi bổ sung
          </Button>
        </div>
      </div>

      <ModalDialog
        open={confirming}
        onOpenChange={(open) => !open && !busy && setConfirming(false)}
        dismissible={!busy}
        aria-label="Gửi bổ sung biên bản?"
      >
        <DialogTitle>Gửi bổ sung biên bản?</DialogTitle>
        <div className="mt-2 space-y-2 text-body text-fg-2">
          <p>
            Phiên bản {base.version + 1} sẽ thay phiên bản {base.version} trên biên bản. Giá trị cũ và lý do được giữ
            trong lịch sử, không xoá được.
          </p>
          {diff.changed.length > 0 && <p>Ô đã sửa: {diff.changed.map(amendmentFieldLabel).join(', ')}.</p>}
          {files.length > 0 && <p>Thêm {files.length} tệp.</p>}
          <p>Lý do: {reason.trim()}</p>
        </div>
        <DialogFooter>
          <Button icon="close" variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>
            Xem lại
          </Button>
          <Button icon="send" variant="primary" disabled={busy} onClick={() => void submit()}>
            {uploading ? 'Đang tải tệp…' : amend.isPending ? 'Đang gửi…' : 'Gửi bổ sung'}
          </Button>
        </DialogFooter>
      </ModalDialog>
    </div>
  )
}
