import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useParams } from 'react-router'
import { z } from 'zod'
import { ActionDock } from '@/components/common/tech/ActionDock'
import { FieldSection } from '@/features/surveys/FieldSection'
import { RadioCardGroup } from '@/components/common/tech/RadioCardGroup'
import { SectionCard } from '@/components/common/tech/SectionCard'
import { SurveyBaselineAside } from '@/features/surveys/SurveyBaselineAside'
import { TaskHeaderCard } from '@/features/surveys/TaskHeaderCard'
import {
  Breadcrumb,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
  Input,
  Select,
  StatusBadge,
  Toast,
  buttonVariants,
} from '@/components/common/stitch-ui'
import { ROUTES, surveyPhotosPath } from '@/routes/paths'
import { cn } from '@/utils/cn'
import { notFound } from '@/routes/notFound'
import {
  getSurveyById,
  getSurveyVerificationById,
  type SurveyRecord,
  type SurveyVerification,
} from '@/data/surveys'

/* Dựng từ site_survey_verification/code.html + screen.png. */

const FORM_ID = 'survey-verification-form'

/** Chuỗi số đo bằng feet: "40.5" */
const feetField = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,3}(\.\d{1,2})?$/, `${label} phải là số, ví dụ 40.5`)
    .refine((value) => Number(value) >= 1 && Number(value) <= 300, `${label} phải từ 1 đến 300 ft`)

const verificationSchema = z.object({
  usableLength: feetField('Chiều dài sử dụng được'),
  usableWidth: feetField('Chiều rộng sử dụng được'),
  measuredTilt: z
    .string()
    .trim()
    .regex(/^\d{1,2}(\.\d)?°?$/, 'Nhập số độ, ví dụ 28°')
    .refine((value) => Number(value.replace('°', '')) <= 60, 'Góc nghiêng không được vượt quá 60°'),
  measuredAzimuth: z
    .string()
    .trim()
    .regex(/^\d{1,3}°\s?[NSEW]{1,3}$/i, 'Nhập số độ kèm hướng la bàn, ví dụ 159° SSE')
    .refine((value) => Number(value.split('°')[0]) <= 360, 'Góc phương vị không được vượt quá 360°'),
  rafterCondition: z.enum(['excellent', 'good', 'reinforce'], { message: 'Chọn tình trạng xà gồ' }),
  shadingAnalysis: z.string().trim().min(15, 'Mô tả kết quả khảo sát bóng che, tối thiểu 15 ký tự'),
  panelRating: z.string().trim().min(5, 'Ghi định mức tủ điện'),
  conduitDistance: z.string().trim().min(3, 'Ghi chiều dài ống luồn dây dự kiến'),
  roofAccess: z.string().trim().min(10, 'Mô tả vị trí đặt thang và khu tập kết vật tư'),
  systemCapacity: z.string().trim().min(5, 'Ghi công suất hệ thống đề xuất'),
  inverterArchitecture: z.string().trim().min(3, 'Ghi cấu hình inverter đề xuất'),
  engineeringNotes: z.string().trim().min(15, 'Ghi chú kỹ thuật tối thiểu 15 ký tự'),
  riskLevel: z.enum(['low', 'moderate', 'high'], { message: 'Chọn mức rủi ro kỹ thuật' }),
})

type VerificationValues = z.infer<typeof verificationSchema>

const textarea =
  'w-full resize-none rounded-xl bg-surface-container-low p-space-sm text-body-md text-on-surface transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container aria-invalid:ring-2 aria-invalid:ring-error/40'

export function SurveyVerificationPage() {
  const { id } = useParams()
  const survey = getSurveyById(id)
  const verification = getSurveyVerificationById(id)
  if (!survey || !verification) notFound()
  return <SurveyVerificationView survey={survey} verification={verification} />
}

function SurveyVerificationView({
  survey,
  verification,
}: {
  survey: SurveyRecord
  verification: SurveyVerification
}) {
  const { dimensions, accessibility, proposal } = verification

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VerificationValues>({
    resolver: zodResolver(verificationSchema),
    mode: 'onTouched',
    defaultValues: {
      usableLength: dimensions.length.value,
      usableWidth: dimensions.width.value,
      measuredTilt: dimensions.tilt.value,
      measuredAzimuth: dimensions.azimuth.value,
      rafterCondition: dimensions.rafter.value,
      shadingAnalysis: accessibility.shading.value,
      panelRating: accessibility.panel.value,
      conduitDistance: accessibility.conduit.value,
      roofAccess: accessibility.access.value,
      systemCapacity: proposal.capacity.value,
      inverterArchitecture: proposal.inverter.value,
      engineeringNotes: proposal.notes.value,
      riskLevel: proposal.risk.value,
    },
  })

  const [safetyChecks, setSafetyChecks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(verification.safety.items.map((item) => [item.id, item.checked])),
  )
  const [signOffOpen, setSignOffOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState(verification.reject.options[0] ?? '')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  /* Diện tích ròng tính lại theo hai ô đo, hiển thị như ô read-only trong thiết kế. */
  const length = useWatch({ control, name: 'usableLength' })
  const width = useWatch({ control, name: 'usableWidth' })
  const netArea = Number(length) * Number(width)
  const netAreaLabel = Number.isFinite(netArea) && netArea > 0 ? Math.round(netArea).toLocaleString('en-US') : '—'

  /* Submit chỉ giả lập: mở modal ký xác nhận, xác nhận thì log + toast. */
  const onSubmit = (values: VerificationValues) => {
    console.info('[survey:verify] validated payload', { surveyId: survey.id, ...values })
    setSignOffOpen(true)
  }

  const breadcrumb = [
    { label: verification.breadcrumbRoot.label, icon: verification.breadcrumbRoot.icon, href: ROUTES.tech.surveys },
    { label: survey.id },
  ]

  return (
    <div className="flex w-full flex-col pb-space-3xl">
      <div className="mb-space-lg flex flex-col gap-space-md">
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <Breadcrumb items={breadcrumb} />
          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="flex items-center gap-space-xs rounded-full bg-surface-container-high px-space-sm py-1 text-on-surface-variant">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary-container" />
              <span className="text-label-sm">{verification.syncLabel}</span>
            </div>
            <StatusBadge variant="primary" size="md" className="bg-surface-container-low text-primary-container">
              {verification.statusLabel}
            </StatusBadge>
          </div>
        </div>

        <TaskHeaderCard
          eyebrow={
            <>
              <span className="text-label-sm font-bold text-primary">
                {verification.cluster}
              </span>
              <span className="text-label-sm text-on-surface-variant">{verification.assignee}</span>
            </>
          }
          title={survey.title}
          actions={
            <>
              <Button
                variant="ghost"
                size="md"
                iconLeft="block"
                onClick={() => setRejectOpen(true)}
                className="bg-surface-container-high font-normal text-on-surface hover:bg-error-container hover:text-on-error-container"
              >
                {verification.headerActions.reject}
              </Button>
              <Button
                variant="ghost"
                size="md"
                iconLeft="save"
                className="bg-surface-container font-normal hover:bg-surface-container-high"
                onClick={() => showToast(verification.toasts.draftSaved)}
              >
                {verification.headerActions.saveDraft}
              </Button>
              <Button type="submit" form={FORM_ID} size="md" iconLeft="draw" className="px-space-lg shadow-md">
                {verification.headerActions.complete}
              </Button>
            </>
          }
        >
          <div className="mt-1 flex flex-wrap items-center gap-x-space-md gap-y-1 text-body-sm text-on-surface-variant">
            {verification.meta.map((item) => (
              <span key={item.text} className="flex items-center gap-1">
                <Icon
                  name={item.icon}
                  className={cn('text-[18px]', item.tone === 'primary' ? 'text-primary' : 'text-secondary')}
                />
                {item.text}
              </span>
            ))}
          </div>
        </TaskHeaderCard>
      </div>

      {/*
       * Thiết kế chia 5/7 từ lg trở lên, cột trái là aside dữ liệu chủ nhà.
       * Dưới lg xếp một cột và `order` đẩy aside xuống dưới form xác minh.
       */}
      <form id={FORM_ID} noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
          <aside className="order-2 flex flex-col gap-space-lg lg:order-1 lg:col-span-5">
            <SurveyBaselineAside
              data={verification.baseline}
              safety={verification.safety}
              photos={survey.homeowner.photos.items}
              checked={safetyChecks}
              onCheckedChange={(id, checked) => setSafetyChecks((prev) => ({ ...prev, [id]: checked }))}
            />
          </aside>

          <div className="order-1 flex flex-col gap-space-lg lg:order-2 lg:col-span-7">
            <SectionCard
              step={1}
              title={dimensions.title}
              subtitle={dimensions.subtitle}
              trailing={
                <StatusBadge
                  variant="primary"
                  size="sm"
                  className="shrink-0 bg-surface-container-low font-semibold text-primary-container"
                >
                  {dimensions.badge}
                </StatusBadge>
              }
            >
              <div className="grid grid-cols-1 gap-space-md sm:grid-cols-3">
                <FieldSection
                  label={dimensions.length.label}
                  htmlFor="usableLength"
                  labelTone="muted"
                  footnote={dimensions.length.footnote}
                  error={errors.usableLength?.message}
                >
                  <Input
                    id="usableLength"
                    size="lg"
                    inputMode="decimal"
                    invalid={!!errors.usableLength}
                    trailing={<span className="text-label-sm text-outline">FT</span>}
                    {...register('usableLength')}
                  />
                </FieldSection>

                <FieldSection
                  label={dimensions.width.label}
                  htmlFor="usableWidth"
                  labelTone="muted"
                  footnote={dimensions.width.footnote}
                  error={errors.usableWidth?.message}
                >
                  <Input
                    id="usableWidth"
                    size="lg"
                    inputMode="decimal"
                    invalid={!!errors.usableWidth}
                    trailing={<span className="text-label-sm text-outline">FT</span>}
                    {...register('usableWidth')}
                  />
                </FieldSection>

                <FieldSection
                  label={dimensions.area.label}
                  labelTone="muted"
                  footnote={
                    <span className="flex items-center gap-1 font-medium text-primary">
                      <Icon name="check_circle" className="text-[14px]" />
                      {dimensions.area.footnote}
                    </span>
                  }
                >
                  <div className="flex h-12 items-center justify-between rounded-xl bg-surface-container-high px-space-sm">
                    <span className="text-headline-md font-bold text-primary">{netAreaLabel}</span>
                    <span className="text-label-sm text-primary">{dimensions.area.unit}</span>
                  </div>
                </FieldSection>
              </div>

              <div className="grid grid-cols-1 gap-space-md pt-2 sm:grid-cols-2">
                <FieldSection
                  label={dimensions.tilt.label}
                  htmlFor="measuredTilt"
                  labelTone="muted"
                  hint={
                    <button
                      type="button"
                      onClick={() => {
                        setValue('measuredTilt', dimensions.tilt.value, { shouldValidate: true })
                        showToast(verification.toasts.tiltSynced)
                      }}
                      className="flex items-center gap-0.5 text-label-sm text-primary transition-colors hover:text-primary-container"
                    >
                      <Icon name="sensors" className="text-[16px]" />
                      {dimensions.tilt.syncLabel}
                    </button>
                  }
                  footnote={dimensions.tilt.footnote}
                  error={errors.measuredTilt?.message}
                >
                  <Input
                    id="measuredTilt"
                    size="lg"
                    invalid={!!errors.measuredTilt}
                    trailing={<Icon name="screen_rotation" className="text-[20px] text-outline" />}
                    {...register('measuredTilt')}
                  />
                </FieldSection>

                <FieldSection
                  label={dimensions.azimuth.label}
                  htmlFor="measuredAzimuth"
                  labelTone="muted"
                  footnote={dimensions.azimuth.footnote}
                  error={errors.measuredAzimuth?.message}
                >
                  <Input
                    id="measuredAzimuth"
                    size="lg"
                    invalid={!!errors.measuredAzimuth}
                    trailing={<Icon name="explore" className="text-[20px] text-outline" />}
                    {...register('measuredAzimuth')}
                  />
                </FieldSection>
              </div>

              <Controller
                control={control}
                name="rafterCondition"
                render={({ field }) => (
                  <FieldSection
                    label={dimensions.rafter.label}
                    labelTone="muted"
                    className="pt-2"
                    error={errors.rafterCondition?.message}
                  >
                    <RadioCardGroup
                      name={field.name}
                      label={dimensions.rafter.label}
                      options={dimensions.rafter.options}
                      value={field.value}
                      onChange={field.onChange}
                      invalid={!!errors.rafterCondition}
                    />
                  </FieldSection>
                )}
              />
            </SectionCard>

            <SectionCard
              step={2}
              title={accessibility.title}
              trailing={
                <span className="shrink-0 text-label-sm text-on-surface-variant">{accessibility.badge}</span>
              }
            >
              <FieldSection
                label={accessibility.shading.label}
                htmlFor="shadingAnalysis"
                labelTone="muted"
                hint={<span className="font-semibold">{accessibility.shading.hint}</span>}
                hintTone="primary"
                error={errors.shadingAnalysis?.message}
              >
                <textarea
                  id="shadingAnalysis"
                  rows={2}
                  aria-invalid={!!errors.shadingAnalysis || undefined}
                  className={textarea}
                  {...register('shadingAnalysis')}
                />
              </FieldSection>

              <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                <FieldSection
                  label={accessibility.panel.label}
                  htmlFor="panelRating"
                  labelTone="muted"
                  error={errors.panelRating?.message}
                >
                  <Input id="panelRating" size="lg" invalid={!!errors.panelRating} {...register('panelRating')} />
                </FieldSection>
                <FieldSection
                  label={accessibility.conduit.label}
                  htmlFor="conduitDistance"
                  labelTone="muted"
                  error={errors.conduitDistance?.message}
                >
                  <Input
                    id="conduitDistance"
                    size="lg"
                    invalid={!!errors.conduitDistance}
                    {...register('conduitDistance')}
                  />
                </FieldSection>
              </div>

              <FieldSection
                label={accessibility.access.label}
                htmlFor="roofAccess"
                labelTone="muted"
                error={errors.roofAccess?.message}
              >
                <div className="relative flex items-center">
                  <Icon
                    name={accessibility.access.icon}
                    className="pointer-events-none absolute left-3 text-[20px] text-on-surface-variant"
                  />
                  <Input
                    id="roofAccess"
                    size="lg"
                    invalid={!!errors.roofAccess}
                    className="pl-10"
                    {...register('roofAccess')}
                  />
                </div>
              </FieldSection>
            </SectionCard>

            <SectionCard
              step={3}
              title={proposal.title}
              trailing={
                <StatusBadge
                  variant="primary"
                  size="sm"
                  dot={false}
                  className="shrink-0 bg-surface-container-high font-bold"
                >
                  {proposal.badge}
                </StatusBadge>
              }
            >
              <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                <div className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-space-sm">
                  <label htmlFor="systemCapacity" className="text-label-sm text-on-surface-variant">
                    {proposal.capacity.label}
                  </label>
                  <input
                    id="systemCapacity"
                    aria-invalid={!!errors.systemCapacity || undefined}
                    className="border-b border-outline/20 bg-transparent text-label-lg font-bold text-primary outline-none focus:border-primary aria-invalid:border-error"
                    {...register('systemCapacity')}
                  />
                  {errors.systemCapacity ? (
                    <span role="alert" className="text-body-sm font-semibold text-error">
                      {errors.systemCapacity.message}
                    </span>
                  ) : (
                    <span className="text-body-sm text-on-surface-variant">{proposal.capacity.caption}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-space-sm">
                  <label htmlFor="inverterArchitecture" className="text-label-sm text-on-surface-variant">
                    {proposal.inverter.label}
                  </label>
                  <input
                    id="inverterArchitecture"
                    aria-invalid={!!errors.inverterArchitecture || undefined}
                    className="border-b border-outline/20 bg-transparent text-label-lg font-bold text-on-surface outline-none focus:border-primary aria-invalid:border-error"
                    {...register('inverterArchitecture')}
                  />
                  {errors.inverterArchitecture ? (
                    <span role="alert" className="text-body-sm font-semibold text-error">
                      {errors.inverterArchitecture.message}
                    </span>
                  ) : (
                    <span className="text-body-sm text-on-surface-variant">{proposal.inverter.caption}</span>
                  )}
                </div>
              </div>

              <FieldSection
                label={proposal.notes.label}
                htmlFor="engineeringNotes"
                labelTone="muted"
                error={errors.engineeringNotes?.message}
              >
                <textarea
                  id="engineeringNotes"
                  rows={2}
                  aria-invalid={!!errors.engineeringNotes || undefined}
                  className={textarea}
                  {...register('engineeringNotes')}
                />
              </FieldSection>

              <Controller
                control={control}
                name="riskLevel"
                render={({ field }) => (
                  <FieldSection label={proposal.risk.label} labelTone="muted" error={errors.riskLevel?.message}>
                    <RadioCardGroup
                      name={field.name}
                      label={proposal.risk.label}
                      layout="inline"
                      options={proposal.risk.options}
                      value={field.value}
                      onChange={field.onChange}
                      invalid={!!errors.riskLevel}
                    />
                  </FieldSection>
                )}
              />
            </SectionCard>
          </div>
        </div>

        <ActionDock
          className="mt-space-xl"
          leading={
            <>
              <Link
                to={surveyPhotosPath(survey.id)}
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'md',
                  className: 'font-normal text-on-surface hover:bg-surface-container',
                })}
              >
                <Icon name="add_a_photo" className="text-[20px] text-primary" />
                {`${verification.dock.uploadLabel} (đã thêm ${verification.dock.uploadCount})`}
              </Link>
              <span className="hidden text-body-sm text-on-surface-variant sm:inline-block">
                {verification.dock.photoHint}
              </span>
            </>
          }
        >
          <Button
            variant="ghost"
            size="md"
            className="flex-1 bg-surface-container px-space-lg font-normal text-on-surface hover:bg-surface-container-high sm:flex-initial"
            onClick={() => showToast(verification.toasts.draftSaved)}
          >
            {verification.dock.saveDraft}
          </Button>
          <Button type="submit" size="md" iconLeft="verified" className="flex-1 px-space-xl shadow-lg sm:flex-initial">
            {verification.dock.complete}
          </Button>
        </ActionDock>
      </form>

      {/* Modal ký xác nhận – chỉ mở khi zod validate xong toàn bộ form */}
      <Dialog open={signOffOpen} onOpenChange={setSignOffOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <div className="flex items-center gap-space-xs">
              <Icon name="draw" className="text-[28px] text-primary-container" />
              <div>
                <DialogTitle className="text-headline-md text-on-surface">{verification.signOff.title}</DialogTitle>
                <DialogDescription>{verification.signOff.subtitle}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-space-sm text-body-sm text-on-surface">
            <div className="flex justify-between gap-space-sm">
              <span className="text-on-surface-variant">{verification.signOff.technicianLabel}</span>
              <span className="font-semibold">{verification.signOff.technician}</span>
            </div>
            <div className="flex justify-between gap-space-sm">
              <span className="text-on-surface-variant">{verification.signOff.areaLabel}</span>
              <span className="font-semibold">{`${netAreaLabel} ft²`}</span>
            </div>
            <div className="flex justify-between gap-space-sm">
              <span className="text-on-surface-variant">{verification.signOff.capacityLabel}</span>
              <span className="font-semibold">{verification.signOff.capacity}</span>
            </div>
            <div className="flex justify-between gap-space-sm">
              <span className="text-on-surface-variant">{verification.signOff.panelLabel}</span>
              <span className="font-semibold text-primary">{verification.signOff.panel}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-label-md text-on-surface-variant">{verification.signOff.signatureLabel}</span>
            <div className="relative flex h-32 w-full cursor-crosshair items-center justify-center overflow-hidden rounded-xl bg-surface-container-low">
              <svg
                viewBox="0 0 300 100"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full fill-none stroke-primary"
              >
                <path d="M 30,60 Q 60,20 100,65 T 180,45 T 260,55" strokeLinecap="round" strokeWidth={2.5} />
              </svg>
              <span className="absolute bottom-2 right-3 select-none text-label-sm text-outline">
                {verification.signOff.signatureHint}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="md"
              className="w-1/2 bg-surface-container font-normal text-on-surface"
              onClick={() => setSignOffOpen(false)}
            >
              {verification.signOff.cancel}
            </Button>
            <Button
              size="md"
              className="w-1/2 shadow-md"
              onClick={() => {
                setSignOffOpen(false)
                showToast(verification.toasts.transmitted)
              }}
            >
              {verification.signOff.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal báo bế tắc */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <div className="flex items-center gap-space-xs text-error">
              <Icon name="warning" className="text-[28px]" />
              <DialogTitle className="text-headline-md text-error">{verification.reject.title}</DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-body-md">{verification.reject.description}</DialogDescription>
          <Select
            aria-label={verification.reject.label}
            size="lg"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            options={verification.reject.options.map((option) => ({ value: option, label: option }))}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              size="md"
              className="w-1/2 bg-surface-container font-normal text-on-surface"
              onClick={() => setRejectOpen(false)}
            >
              {verification.reject.cancel}
            </Button>
            <Button
              size="md"
              className="w-1/2 bg-error text-on-error hover:bg-error"
              onClick={() => {
                console.info('[survey:verify] impasse flagged', { surveyId: survey.id, reason: rejectReason })
                setRejectOpen(false)
                showToast(verification.toasts.rejected)
              }}
            >
              {verification.reject.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toast open={toast !== null} message={toast ?? ''} />
    </div>
  )
}
