import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { OnSiteSurveyFields, type DeclaredValues } from '@/features/onsite-survey/OnSiteSurveyFields'
import { OnSiteSurveyFiles, type AttachmentUrlFetcher } from '@/features/onsite-survey/OnSiteSurveyFiles'
import { OnSiteSurveySummary } from '@/features/onsite-survey/OnSiteSurveySummary'
import { OnSiteSurveyUpload } from '@/features/onsite-survey/OnSiteSurveyUpload'
import { onSiteSurveyStatusMeta, surveyStartOpensAt } from '@/features/onsite-survey/onSiteSurveyDisplay'
import {
  formDiffers,
  formFromView,
  serverOnSiteSurveyErrors,
  toRequest,
  validateOnSiteSurvey,
  type OnSiteSurveyErrors,
  type OnSiteSurveyForm,
} from '@/features/onsite-survey/onSiteSurveyForm'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  useCompleteOnSiteSurveyMutation,
  useMyOnSiteSurveyQuery,
  useRemoveOnSiteSurveyFileMutation,
  useSaveOnSiteSurveyMutation,
  useStartOnSiteSurveyMutation,
} from '@/hooks/useOnSiteSurvey'
import { getMyOnSiteSurveyAttachmentUrl } from '@/services/onSiteSurveyService'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { TechnicianJobView } from '@/types/res/technicianAppointmentsRes'
import type { OnSiteSurveyView } from '@/types/res/technicianOnSiteSurveyRes'

// Khảo sát tại công trình của kỹ thuật viên, theo luật của backend (OnSiteSurveyHandlers):
// 1. Bấm "Bắt đầu khảo sát" khi tới nơi (sớm nhất 2 giờ trước giờ hẹn), backend ghi giờ bắt đầu.
// 2. Nhập số đo, thêm ảnh; lưu bao nhiêu lần cũng được.
// 3. "Hoàn thành khảo sát": cần đủ ô bắt buộc và ít nhất một ảnh Mái. Xong thì lịch hẹn và yêu cầu chuyển sang
//    đã khảo sát, không sửa trên giao diện được nữa

/** Đồng hồ cập nhật mỗi 30 giây để nút Bắt đầu tự mở khi tới giờ */
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export function OnSiteSurveyPanel({ job }: { job: TechnicianJobView }) {
  const appointmentId = job.appointmentId
  const query = useMyOnSiteSurveyQuery(appointmentId)
  const getUrl = useCallback(
    (attachmentId: string) => getMyOnSiteSurveyAttachmentUrl(appointmentId, attachmentId),
    [appointmentId],
  )
  const survey = query.data ?? null
  const status = onSiteSurveyStatusMeta(survey?.status)

  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Khảo sát tại công trình
            {query.isSuccess && <Badge tone={status.tone}>{status.label}</Badge>}
          </span>
        }
      />
      <PanelBody>
        {query.isPending ? (
          <div aria-busy="true" aria-label="Đang tải biên bản khảo sát" className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-11 w-48" />
          </div>
        ) : query.isError ? (
          <ErrorState
            title="Không tải được biên bản khảo sát."
            message={errorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : survey?.status === 'COMPLETED' || job.status === 'COMPLETED' ? (
          survey ? (
            <div className="space-y-6">
              <OnSiteSurveySummary survey={survey} />
              <div>
                <h3 className="mb-3 text-body font-semibold text-fg">Ảnh và tài liệu</h3>
                <OnSiteSurveyFiles attachments={survey.attachments} getUrl={getUrl} emptyText="Không có tệp nào." />
              </div>
            </div>
          ) : (
            <p className="text-body text-fg-2">Lịch này đã xong nhưng không có biên bản khảo sát.</p>
          )
        ) : survey?.status === 'IN_PROGRESS' ? (
          // key: đổi biên bản (hiếm) thì dựng lại form từ đầu
          <SurveyEditor key={survey.reportId} job={job} survey={survey} getUrl={getUrl} />
        ) : (
          <StartSurvey job={job} />
        )}
      </PanelBody>
    </Panel>
  )
}

function StartSurvey({ job }: { job: TechnicianJobView }) {
  const start = useStartOnSiteSurveyMutation(job.appointmentId)
  const now = useNow()
  const [error, setError] = useState<string | null>(null)
  const opensAt = surveyStartOpensAt(job.startsAt)
  const tooEarly = now < opensAt.getTime()

  async function run() {
    setError(null)
    try {
      await start.mutateAsync()
      toast.success('Đã bắt đầu khảo sát. Nhập số đo và thêm ảnh bên dưới.')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      <p className="max-w-prose text-body text-fg-2">
        Tới công trình thì bấm Bắt đầu khảo sát để ghi giờ bắt đầu. Sau đó nhập số đo, chụp ít nhất một ảnh mái rồi bấm
        Hoàn thành khảo sát.
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button icon="play_arrow" variant="primary" disabled={tooEarly || start.isPending} onClick={() => void run()}>
          {start.isPending ? 'Đang bắt đầu…' : 'Bắt đầu khảo sát'}
        </Button>
        {tooEarly && (
          <span className="text-body text-fg-2">
            Bắt đầu được từ {formatMoment(opensAt.toISOString())}, tức 2 giờ trước giờ hẹn.
          </span>
        )}
      </div>
      {error && (
        <div role="alert">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
    </div>
  )
}

/** Lỗi đầu tiên trên form nhận focus để kỹ thuật viên thấy ngay ô cần sửa */
function focusFirstError() {
  window.requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>('#onsite-survey-form [aria-invalid="true"]')
    el?.focus()
  })
}

function SurveyEditor({
  job,
  survey,
  getUrl,
}: {
  job: TechnicianJobView
  survey: OnSiteSurveyView
  getUrl: AttachmentUrlFetcher
}) {
  const appointmentId = job.appointmentId
  const save = useSaveOnSiteSurveyMutation(appointmentId)
  const complete = useCompleteOnSiteSurveyMutation(appointmentId)
  const remove = useRemoveOnSiteSurveyFileMutation(appointmentId)
  const [form, setForm] = useState<OnSiteSurveyForm>(() => formFromView(survey))
  const [errors, setErrors] = useState<OnSiteSurveyErrors>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const dirty = formDiffers(form, survey)
  const busy = save.isPending || complete.isPending
  const roofPhotos = survey.attachments.filter((a) => a.category === 'ROOF').length
  const requiredLeft = Object.keys(validateOnSiteSurvey(form, { forCompletion: true })).length

  const s = job.preSurvey
  const declared: DeclaredValues = {
    widthM: s.surfaceWidthM,
    lengthM: s.surfaceLengthM,
    usableAreaM2: s.usableAreaM2,
    tiltDegree: s.surfaceTiltDegree,
    azimuthDegree: s.surfaceAzimuthDegree,
  }

  function change(patch: Partial<OnSiteSurveyForm>) {
    setForm((current) => ({ ...current, ...patch }))
    const touched = Object.keys(patch)
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(next)) {
        if (touched.includes(key) || (touched.includes('obstacles') && key.startsWith('obstacle-'))) delete next[key]
      }
      return next
    })
    setActionError(null)
  }

  function handleError(e: unknown) {
    if (
      isApiError(e) &&
      (e.code === 'VALIDATION_FAILED' || e.code === 'ONSITE_SURVEY_INCOMPLETE') &&
      e.hasFieldErrors
    ) {
      setErrors(serverOnSiteSurveyErrors(e.fieldErrors, form))
      focusFirstError()
    }
    if (isApiError(e) && e.code === 'ONSITE_SURVEY_STALE_REVISION') setStale(true)
    setActionError(errorMessage(e))
  }

  /** Lưu lên hệ thống, trả về biên bản mới (hoặc null khi lỗi) */
  async function persist(): Promise<OnSiteSurveyView | null> {
    const found = validateOnSiteSurvey(form, { forCompletion: false })
    if (Object.keys(found).length > 0) {
      setErrors(found)
      setActionError('Sửa các ô được đánh dấu rồi lưu lại.')
      focusFirstError()
      return null
    }
    try {
      const view = await save.mutateAsync(toRequest(form, survey.revision))
      setSavedAt(view.updatedAt)
      return view
    } catch (e) {
      handleError(e)
      return null
    }
  }

  async function saveOnly() {
    setActionError(null)
    if (await persist()) toast.success('Đã lưu số đo.')
  }

  function askComplete() {
    setActionError(null)
    const found = validateOnSiteSurvey(form, { forCompletion: true })
    if (Object.keys(found).length > 0) {
      setErrors(found)
      setActionError('Còn ô chưa điền hoặc chưa đúng. Sửa các ô được đánh dấu rồi hoàn thành lại.')
      focusFirstError()
      return
    }
    if (roofPhotos === 0) {
      setActionError('Cần ít nhất một ảnh loại Mái trước khi hoàn thành.')
      return
    }
    setConfirming(true)
  }

  async function confirmComplete() {
    setActionError(null)
    const latest = dirty ? await persist() : survey
    if (!latest) {
      setConfirming(false)
      return
    }
    try {
      await complete.mutateAsync(latest.revision)
      setConfirming(false)
      toast.success('Đã hoàn thành khảo sát. Kinh doanh dùng kết quả này để báo giá cho khách.')
    } catch (e) {
      setConfirming(false)
      handleError(e)
    }
  }

  return (
    <div className="space-y-6">
      <p className="tnum text-body text-fg-2">
        Bắt đầu lúc {formatMoment(survey.startedAt)}. Lưu bao nhiêu lần cũng được; hoàn thành rồi thì không sửa được
        nữa.
      </p>

      {stale && (
        <Notice tone="warn" title="Biên bản vừa được cập nhật ở nơi khác">
          Phần bạn đang nhập vẫn còn trên form. Tải bản mới nhất sẽ thay phần đang nhập bằng bản trên hệ thống.
          <span className="mt-3 flex">
            <Button
              icon="refresh"
              variant="secondary"
              size="sm"
              onClick={() => {
                setForm(formFromView(survey))
                setErrors({})
                setActionError(null)
                setStale(false)
              }}
            >
              Tải bản mới nhất
            </Button>
          </span>
        </Notice>
      )}

      <form
        id="onsite-survey-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void saveOnly()
        }}
      >
        <OnSiteSurveyFields value={form} errors={errors} onChange={change} declared={declared} disabled={busy} />
      </form>

      <section aria-labelledby="onsite-files" className="space-y-4 border-t border-line pt-5">
        <h3 id="onsite-files" className="text-body font-semibold text-fg">
          Ảnh và tài liệu
        </h3>
        <OnSiteSurveyUpload appointmentId={appointmentId} disabled={busy} />
        <OnSiteSurveyFiles
          attachments={survey.attachments}
          getUrl={getUrl}
          emptyText="Chưa có tệp nào. Cần ít nhất một ảnh Mái."
          removingId={remove.isPending ? remove.variables : null}
          onRemove={(attachmentId) =>
            remove.mutate(attachmentId, {
              onSuccess: () => toast.success('Đã xoá tệp.'),
              onError: (e) => toast.error(errorMessage(e)),
            })
          }
        />
      </section>

      {/* Hàng thao tác dính đáy: form dài, kỹ thuật viên lưu / hoàn thành được ở bất kỳ đâu */}
      <div
        data-sticky-bottom
        className="sticky bottom-0 z-10 space-y-3 border-t border-line bg-canvas/95 py-3 backdrop-blur"
      >
        {/* Điện thoại: điều kiện + trạng thái lưu một dòng, hai nút chung một hàng */}
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-meta">
          <Requirement done={requiredLeft === 0}>
            {requiredLeft === 0 ? 'Đủ ô bắt buộc' : `Còn ${requiredLeft} ô bắt buộc chưa xong`}
          </Requirement>
          <Requirement done={roofPhotos > 0}>
            {roofPhotos > 0 ? `${roofPhotos} ảnh mái` : 'Chưa có ảnh mái'}
          </Requirement>
          <li className="text-fg-2">
            {dirty ? 'Có thay đổi chưa lưu' : savedAt ? `Đã lưu lúc ${formatMoment(savedAt)}` : 'Đã lưu'}
          </li>
        </ul>
        {actionError && (
          <p className="flex items-center gap-1.5 text-body font-medium text-danger" role="alert">
            <Icon name="error" className="shrink-0 text-[20px]" />
            {actionError}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" form="onsite-survey-form" icon="save" variant="soft" disabled={busy || !dirty}>
            {save.isPending && !confirming ? (
              'Đang lưu…'
            ) : (
              // Điện thoại chỉ ghi "Lưu" để nút Hoàn thành vừa cùng hàng
              <>
                Lưu<span className="hidden sm:inline"> số đo</span>
              </>
            )}
          </Button>
          <Button
            icon="task_alt"
            variant="primary"
            className="flex-1 sm:ml-auto sm:flex-none"
            disabled={busy}
            onClick={askComplete}
          >
            Hoàn thành khảo sát
          </Button>
        </div>
      </div>

      <ModalDialog
        open={confirming}
        onOpenChange={(open) => !open && !busy && setConfirming(false)}
        dismissible={!busy}
        aria-label="Hoàn thành khảo sát?"
      >
        <DialogTitle>Hoàn thành khảo sát?</DialogTitle>
        <p className="mt-2 text-body text-fg-2">
          {dirty ? 'Phần chưa lưu sẽ được lưu trước. ' : ''}Kết quả gửi cho bộ phận kinh doanh để báo giá; lịch hẹn và
          yêu cầu chuyển sang đã khảo sát. Hoàn thành rồi thì không sửa trên giao diện được nữa.
        </p>
        <DialogFooter>
          <Button icon="close" variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>
            Xem lại
          </Button>
          <Button icon="task_alt" variant="primary" disabled={busy} onClick={() => void confirmComplete()}>
            {busy ? 'Đang gửi…' : 'Hoàn thành'}
          </Button>
        </DialogFooter>
      </ModalDialog>
    </div>
  )
}

function Requirement({ done, children }: { done: boolean; children: string }) {
  return (
    <li className={done ? 'flex items-center gap-1.5 text-fg-2' : 'flex items-center gap-1.5 text-fg'}>
      <Icon
        name={done ? 'check_circle' : 'radio_button_unchecked'}
        className={done ? 'icon-fill text-[16px] text-ok' : 'text-[16px] text-fg-3'}
      />
      {children}
    </li>
  )
}
