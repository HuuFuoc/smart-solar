import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Field, Input, Select, Textarea, fieldMessageId } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { Segmented } from '@/components/common/ui/segmented'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import {
  EMPTY_SITE,
  check,
  serverFieldErrors,
  siteSchema,
  type FormErrors,
  type SiteForm,
} from '@/features/pre-surveys/assessmentForm'
import { SiteFields } from '@/features/pre-surveys/SiteFields'
import { SlotPicker } from '@/features/scheduling/SlotPicker'
import { directBookingErrors, directBookingBody, type DirectBookingForm } from '@/features/scheduling/directBooking'
import { formatAppointment, initialBookingDate } from '@/features/scheduling/schedulingDisplay'
import { useDirectBookingMutation } from '@/hooks/useBooking'
import { useCreatePropertySiteMutation, useMySitesQuery } from '@/hooks/usePreSurveys'
import { ROUTES, withId } from '@/routes/paths'
import { detailOf, errorMessage, isApiError } from '@/services/api/errors'
import type { SurveySlot } from '@/types/res/surveySlotsRes'

// Đặt kỹ thuật viên tới khảo sát tại công trình cho một địa điểm, không qua đánh giá sơ bộ (không cần số liệu mặt lắp hay mô
// phỏng). Cùng luật đặt giờ với yêu cầu từ đánh giá sơ bộ: giờ trống theo khu vực, kỹ thuật viên trong khu vực tự nhận lịch;
// đặt xong lịch là chờ kỹ thuật viên nhận, chưa phải đã xác nhận. Không tạo yêu cầu thứ hai: giờ vừa hết chỗ thì yêu cầu vẫn
// mở và khách chọn giờ khác trên trang yêu cầu đó

type SiteMode = 'saved' | 'new'

const SITE_MODES = [
  { value: 'saved' as const, label: 'Địa điểm đã lưu', icon: 'location_on' },
  { value: 'new' as const, label: 'Địa điểm mới', icon: 'add_location_alt' },
]

export function CustomerDirectBookingPage() {
  usePageCrumb('Đặt khảo sát trực tiếp')
  const navigate = useNavigate()
  const sites = useMySitesQuery()
  const createSite = useCreatePropertySiteMutation()
  const book = useDirectBookingMutation()
  const saved = useMemo(() => sites.data?.items ?? [], [sites.data])
  const [mode, setMode] = useState<SiteMode | null>(null)
  const siteMode: SiteMode = mode ?? (saved.length > 0 ? 'saved' : 'new')
  const [siteId, setSiteId] = useState('')
  const [siteForm, setSiteForm] = useState<SiteForm>(EMPTY_SITE)
  const [siteErrors, setSiteErrors] = useState<FormErrors<SiteForm>>({})
  const [siteError, setSiteError] = useState<string | null>(null)
  const [date, setDate] = useState(initialBookingDate)
  const [slot, setSlot] = useState<SurveySlot | null>(null)
  const [form, setForm] = useState<DirectBookingForm>({ contactName: '', contactPhone: '', note: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof DirectBookingForm | 'slot' | 'site', string>>>({})
  const [failure, setFailure] = useState<{ message: string; surveyRequestId: string | null } | null>(null)
  const chosenSite = siteMode === 'saved' ? siteId || saved[0]?.siteId || '' : siteId

  async function saveSite() {
    setSiteError(null)
    const result = check(siteSchema, siteForm)
    if (result.errors) return setSiteErrors(result.errors)
    setSiteErrors({})
    try {
      const created = await createSite.mutateAsync(result.data)
      setSiteId(created.propertySiteId)
      setSlot(null)
      toast.success('Đã lưu địa điểm. Chọn giờ khảo sát bên dưới.')
    } catch (e) {
      if (isApiError(e)) setSiteErrors(serverFieldErrors(e, siteForm))
      setSiteError(
        isApiError(e) && e.code === 'CUSTOMER_PROFILE_NOT_FOUND'
          ? 'Tài khoản chưa có hồ sơ khách hàng. Khai hồ sơ ở bước đầu của Đánh giá sơ bộ rồi quay lại.'
          : errorMessage(e),
      )
    }
  }

  async function submit() {
    setFailure(null)
    const next = directBookingErrors(form)
    const all: typeof errors = { ...next }
    if (!chosenSite) all.site = 'Chọn hoặc lưu địa điểm trước.'
    if (!slot) all.slot = 'Chọn giờ khảo sát.'
    setErrors(all)
    if (Object.keys(all).length > 0 || !slot) return
    try {
      const view = await book.mutateAsync(directBookingBody(chosenSite, slot.startsAt, form))
      toast.success(
        `Đã đặt khảo sát ${formatAppointment(view.booking.startsAt, view.booking.endsAt)}. Chờ kỹ thuật viên trong khu vực nhận lịch.`,
      )
      void navigate(withId(ROUTES.customer.request, view.surveyRequestId))
    } catch (e) {
      const requestId = detailOf(e, 'surveyRequestId')
      const surveyRequestId = typeof requestId === 'string' ? requestId : null
      if (isApiError(e) && (e.fieldErrors.contactPhone || e.code === 'CONTACT_PHONE_REQUIRED'))
        setErrors((prev) => ({ ...prev, contactPhone: e.fieldErrors.contactPhone ?? errorMessage(e) }))
      // Yêu cầu đã mở nhưng giờ vừa hết chỗ: chọn giờ khác trên chính yêu cầu đó, không đặt lại ở đây
      setFailure({
        message:
          surveyRequestId && isApiError(e) && e.code !== 'SURVEY_REQUEST_ALREADY_OPEN'
            ? `${errorMessage(e)} Yêu cầu khảo sát đã được tạo; chọn giờ khác trên trang yêu cầu.`
            : errorMessage(e),
        surveyRequestId,
      })
      setSlot(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Đặt khảo sát trực tiếp" />

      <Panel>
        <PanelHeader title="Địa điểm" />
        <PanelBody className="space-y-4">
          {sites.isPending ? (
            <Skeleton className="h-16" />
          ) : sites.isError ? (
            <ErrorState
              title="Không tải được địa điểm đã lưu."
              message={errorMessage(sites.error)}
              onRetry={() => void sites.refetch()}
            />
          ) : (
            <>
              {saved.length > 0 && (
                <Segmented
                  label="Địa điểm"
                  options={SITE_MODES}
                  value={siteMode}
                  onChange={(next) => {
                    setMode(next)
                    setSiteId('')
                    setSlot(null)
                  }}
                />
              )}
              {siteMode === 'saved' ? (
                <Field label="Địa điểm đã lưu" htmlFor="direct-site" required error={errors.site}>
                  <Select
                    id="direct-site"
                    value={chosenSite}
                    aria-describedby={fieldMessageId('direct-site')}
                    onChange={(e) => {
                      setSiteId(e.target.value)
                      setSlot(null)
                    }}
                  >
                    {saved.map((s) => (
                      <option key={s.siteId} value={s.siteId}>
                        {[s.name, s.streetLine, s.communeName ?? s.ward].filter(Boolean).join(', ')}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : siteId ? (
                <Notice tone="ok" title="Đã lưu địa điểm mới">
                  {siteForm.name}. Chọn giờ khảo sát bên dưới.
                </Notice>
              ) : (
                <>
                  <SiteFields
                    value={siteForm}
                    errors={siteErrors}
                    onChange={(patch) => setSiteForm((f) => ({ ...f, ...patch }))}
                  />
                  {siteError && (
                    <div role="alert">
                      <Notice tone="danger">{siteError}</Notice>
                    </div>
                  )}
                  {errors.site && <p className="text-meta text-danger">{errors.site}</p>}
                  <Button icon="save" variant="soft" disabled={createSite.isPending} onClick={() => void saveSite()}>
                    {createSite.isPending ? 'Đang lưu…' : 'Lưu địa điểm'}
                  </Button>
                </>
              )}
            </>
          )}
        </PanelBody>
      </Panel>

      {chosenSite && (
        <Panel>
          <PanelHeader title="Giờ khảo sát" />
          <PanelBody className="space-y-2">
            <SlotPicker
              propertySiteId={chosenSite}
              date={date}
              onDateChange={(next) => {
                setDate(next)
                setSlot(null)
              }}
              value={slot?.startsAt ?? null}
              onChange={setSlot}
            />
            {errors.slot && <p className="text-meta text-danger">{errors.slot}</p>}
          </PanelBody>
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Người gặp kỹ thuật viên" />
        <PanelBody className="space-y-4">
          <p className="text-body text-fg-2">
            Bỏ trống thì kỹ thuật viên liên hệ theo tên và số điện thoại của tài khoản.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Họ tên" htmlFor="direct-contact-name" optional error={errors.contactName}>
              <Input
                id="direct-contact-name"
                maxLength={200}
                aria-describedby={fieldMessageId('direct-contact-name')}
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
              />
            </Field>
            <Field label="Số điện thoại" htmlFor="direct-contact-phone" optional error={errors.contactPhone}>
              <Input
                id="direct-contact-phone"
                type="tel"
                inputMode="tel"
                className="tnum"
                aria-invalid={Boolean(errors.contactPhone) || undefined}
                aria-describedby={fieldMessageId('direct-contact-phone')}
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Ghi chú cho kỹ thuật viên" htmlFor="direct-note" optional error={errors.note}>
            <Textarea
              id="direct-note"
              rows={3}
              maxLength={1000}
              aria-describedby={fieldMessageId('direct-note')}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </Field>
        </PanelBody>
      </Panel>

      {failure && (
        <div role="alert">
          <Notice tone="danger">
            {failure.message}
            {failure.surveyRequestId && (
              <span className="mt-3 flex">
                <ButtonLink
                  to={withId(ROUTES.customer.request, failure.surveyRequestId)}
                  size="sm"
                  variant="info"
                  icon="visibility"
                >
                  Mở yêu cầu khảo sát
                </ButtonLink>
              </span>
            )}
          </Notice>
        </div>
      )}
      <div data-sticky-bottom className="flex flex-wrap gap-3">
        <Button icon="send" variant="primary" disabled={book.isPending || !chosenSite} onClick={() => void submit()}>
          {book.isPending ? 'Đang đặt…' : 'Đặt khảo sát'}
        </Button>
        <ButtonLink to={ROUTES.customer.requests} variant="secondary" icon="close">
          Huỷ
        </ButtonLink>
      </div>
    </div>
  )
}
