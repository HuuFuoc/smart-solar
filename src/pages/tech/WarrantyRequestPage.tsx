import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useParams } from 'react-router'
import { z } from 'zod'
import { MeasurementCard } from '@/components/common/tech/MeasurementCard'
import { RadioCardGroup } from '@/components/common/tech/RadioCardGroup'
import { SignaturePad, type SignaturePadHandle } from '@/components/common/tech/SignaturePad'
import { Button, Card, Checkbox, Icon, Input, ProgressRing, StatusBadge, Toast } from '@/components/common/stitch-ui'
import { cn } from '@/utils/cn'
import { getWarrantyCase, type WarrantyCase } from '@/data/warranty'
import { notFound } from '@/routes/notFound'

const statToneClasses = {
  default: 'text-on-surface',
  primary: 'text-primary',
  error: 'text-error',
} as const

/** Sê-ri OEM theo mẫu in trên tem: EN-98214-X02. */
const SERIAL_PATTERN = /^[A-Z]{2}-\d{5}-[A-Z]\d{2}$/

/* Thông báo lỗi lấy từ mock để nội dung nằm cùng chỗ với dữ liệu màn. */
function buildWarrantySchema(messages: WarrantyCase['validation']) {
  const serial = z.string().regex(SERIAL_PATTERN, messages.serial)

  return z.object({
    rootCause: z.string().min(1, messages.rootCause),
    actions: z.array(z.string()).min(1, messages.actions),
    narrative: z.string().trim().min(20, messages.narrative),
    removedSerial: serial,
    replacementSerial: serial,
    signed: z.boolean().refine((value) => value, { message: messages.signature }),
    confirmations: z.array(z.string()).length(2, messages.confirmations),
  })
}

type WarrantyFormValues = z.input<ReturnType<typeof buildWarrantySchema>>

export function WarrantyRequestPage() {
  const { id } = useParams()
  const warranty = getWarrantyCase(id)
  if (!warranty) notFound(`Không tìm thấy hồ sơ bảo hành ${id ?? ''}`)

  return <WarrantyRequestView warranty={warranty} />
}

function WarrantyRequestView({ warranty }: { warranty: WarrantyCase }) {
  const { diagnostics, signOff } = warranty
  const padRef = useRef<SignaturePadHandle>(null)
  const [toast, setToast] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    register,
    setValue,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<WarrantyFormValues>({
    resolver: zodResolver(buildWarrantySchema(warranty.validation)),
    defaultValues: {
      rootCause: diagnostics.rootCause.defaultValue,
      actions: diagnostics.corrective.actions.filter((a) => a.defaultChecked).map((a) => a.value),
      narrative: diagnostics.corrective.narrative,
      removedSerial: diagnostics.hardwareSwap.removedSerial,
      replacementSerial: diagnostics.hardwareSwap.replacementSerial,
      signed: false,
      confirmations: signOff.confirmations.filter((c) => c.defaultChecked).map((c) => c.id),
    },
  })

  /* Submit chỉ giả lập: đợi một nhịp rồi hiện toast, chưa gọi API. */
  const onSubmit = handleSubmit(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 600))
    setToast(signOff.successMessage)
    window.setTimeout(() => setToast(null), 3000)
  })

  return (
    <form onSubmit={onSubmit} className="grid w-full grid-cols-12 gap-space-lg">
      {/* Cột trái: hồ sơ ca lỗi, chẩn đoán, ảnh kiểm chứng */}
      <div className="col-span-12 flex flex-col gap-space-xl xl:col-span-8">
        <Card padding="lg" className="flex flex-col gap-space-md">
          <div className="flex flex-wrap items-center justify-between gap-space-sm">
            <div className="flex flex-wrap items-center gap-space-sm">
              <StatusBadge variant={warranty.priority.variant} pulse className="font-semibold">
                {warranty.priority.label}
              </StatusBadge>
              <span className="text-body-sm font-medium tracking-wide text-on-surface-variant">
                {warranty.caseLabel}
              </span>
              <span className="rounded-full bg-primary-fixed px-2.5 py-0.5 text-label-sm text-on-primary-fixed">
                {warranty.guarantee}
              </span>
            </div>
            <span className="flex items-center gap-space-xs rounded-lg bg-surface-container px-3 py-1.5 text-label-sm text-on-surface-variant">
              <Icon name="timer" className="text-[16px] text-primary" />
              {warranty.dispatchWindow}
            </span>
          </div>

          <div className="flex flex-col justify-between gap-space-sm md:flex-row md:items-baseline">
            <div>
              <h1 className="text-headline-xl tracking-tight text-on-surface">{warranty.title}</h1>
              <p className="mt-0.5 text-body-md text-on-surface-variant">{warranty.subtitle}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-lg bg-error px-3 py-1 text-label-sm text-on-error">
              <Icon name="trending_down" className="text-[15px]" />
              {warranty.productionDrop}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-space-sm pt-space-xs sm:grid-cols-4">
            {warranty.stats.map((stat) => (
              <div key={stat.label} className="flex flex-col rounded-xl bg-surface-container-low p-space-sm">
                <span className="text-label-sm text-on-surface-variant">{stat.label}</span>
                <span className={cn('text-headline-md font-bold', statToneClasses[stat.tone ?? 'default'])}>
                  {stat.value}
                </span>
                <span className="mt-0.5 text-body-sm text-on-surface-variant">{stat.caption}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Bằng chứng khách hàng gửi */}
        <Card padding="lg" className="flex flex-col gap-space-md">
          <div className="flex flex-wrap items-center justify-between gap-space-xs">
            <h2 className="flex items-center gap-space-xs text-headline-md text-on-surface">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-secondary-container" />
              {warranty.reported.title}
            </h2>
            <span className="text-label-sm text-on-surface-variant">{warranty.reported.loggedLabel}</span>
          </div>

          <div className="flex items-start gap-space-sm rounded-xl bg-surface-container-low p-space-md">
            <Icon name="format_quote" className="mt-0.5 shrink-0 text-[22px] text-secondary" />
            <p className="text-body-md italic text-on-surface">{warranty.reported.quote}</p>
          </div>

          <div className="grid grid-cols-1 gap-space-md pt-space-2xs sm:grid-cols-2">
            {warranty.reported.media.map((item) => (
              <div key={item.fileName} className="flex flex-col gap-space-xs">
                <span className="text-label-sm font-semibold text-on-surface-variant">{item.label}</span>
                <div className="relative aspect-video overflow-hidden rounded-xl bg-surface-container shadow-sm">
                  <img src={item.src} alt={item.alt} className="h-full w-full object-cover" />
                  <span className="absolute bottom-2 left-2 rounded bg-on-surface/75 px-2 py-1 text-label-sm text-inverse-on-surface backdrop-blur-sm">
                    {item.fileName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Chẩn đoán hiện trường + phần nhập của kỹ thuật viên */}
        <Card padding="lg" className="flex flex-col gap-space-lg">
          <div className="flex flex-wrap items-center justify-between gap-space-xs">
            <h2 className="flex items-center gap-space-xs text-headline-md text-on-surface">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-primary" />
              {diagnostics.title}
            </h2>
            <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-label-sm font-semibold text-primary">
              {diagnostics.toolsLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
            {diagnostics.readings.map((reading) => (
              <MeasurementCard key={reading.label} {...reading} />
            ))}
          </div>

          {/* Nguyên nhân gốc */}
          <fieldset className="flex flex-col gap-space-xs">
            <legend className="text-label-md font-semibold text-on-surface">{diagnostics.rootCause.label}</legend>
            <Controller
              control={control}
              name="rootCause"
              render={({ field }) => (
                <RadioCardGroup
                  name="rootCause"
                  layout="card"
                  label={diagnostics.rootCause.label}
                  options={diagnostics.rootCause.options}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={Boolean(errors.rootCause)}
                />
              )}
            />
            {errors.rootCause && (
              <span role="alert" className="text-body-sm font-semibold text-error">
                {errors.rootCause.message}
              </span>
            )}
          </fieldset>

          {/* Hạng mục đã khắc phục + mô tả */}
          <div className="flex flex-col gap-space-xs">
            <span className="text-label-md font-semibold text-on-surface">{diagnostics.corrective.label}</span>
            <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-low p-space-md">
              <Controller
                control={control}
                name="actions"
                render={({ field }) => (
                  <div className="flex flex-wrap items-center gap-2">
                    {diagnostics.corrective.actions.map((action) => {
                      const selected = field.value.includes(action.value)
                      return (
                        <button
                          key={action.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            field.onChange(
                              selected
                                ? field.value.filter((value: string) => value !== action.value)
                                : [...field.value, action.value],
                            )
                          }
                          className={cn(
                            'flex items-center gap-1 rounded-lg px-2.5 py-1 text-label-sm font-semibold transition-colors',
                            selected
                              ? 'bg-surface-container-lowest text-primary shadow-sm'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                          )}
                        >
                          <Icon name={selected ? 'done' : 'add'} className="text-[14px]" />
                          {action.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              />
              {errors.actions && (
                <span role="alert" className="text-body-sm font-semibold text-error">
                  {errors.actions.message}
                </span>
              )}

              <textarea
                rows={3}
                aria-label={diagnostics.corrective.narrativeLabel}
                placeholder={diagnostics.corrective.narrativePlaceholder}
                {...register('narrative')}
                className="w-full resize-none rounded-lg bg-surface-container-lowest p-space-sm text-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.narrative && (
                <span role="alert" className="text-body-sm font-semibold text-error">
                  {errors.narrative.message}
                </span>
              )}
            </div>
          </div>

          {/* Đổi phần cứng theo bảo hành */}
          <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container p-space-md">
            <div className="flex flex-wrap items-center justify-between gap-space-xs">
              <span className="flex items-center gap-space-xs text-label-md font-bold text-on-surface">
                <Icon name="swap_horizontal_circle" className="text-[20px] text-primary" />
                {diagnostics.hardwareSwap.title}
              </span>
              <span className="text-label-sm font-semibold text-on-surface-variant">
                {diagnostics.hardwareSwap.badge}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-space-md pt-space-2xs sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-lg bg-surface-container-lowest p-space-sm">
                <label htmlFor="removed-serial" className="text-label-sm font-semibold text-error">
                  {diagnostics.hardwareSwap.removedLabel}
                </label>
                <Input
                  id="removed-serial"
                  size="sm"
                  invalid={Boolean(errors.removedSerial)}
                  trailing={<Icon name="remove_done" className="text-[20px] text-error" />}
                  className="bg-transparent font-bold tracking-wider"
                  {...register('removedSerial')}
                />
                {errors.removedSerial && (
                  <span role="alert" className="text-body-sm font-semibold text-error">
                    {errors.removedSerial.message}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 rounded-lg bg-surface-container-lowest p-space-sm">
                <label htmlFor="replacement-serial" className="text-label-sm font-semibold text-primary">
                  {diagnostics.hardwareSwap.replacementLabel}
                </label>
                <Input
                  id="replacement-serial"
                  size="sm"
                  invalid={Boolean(errors.replacementSerial)}
                  trailing={<Icon name="verified" className="text-[20px] text-primary" />}
                  className="bg-transparent font-bold tracking-wider"
                  {...register('replacementSerial')}
                />
                {errors.replacementSerial && (
                  <span role="alert" className="text-body-sm font-semibold text-error">
                    {errors.replacementSerial.message}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Ảnh trước / sau */}
        <Card padding="lg" className="flex flex-col gap-space-md">
          <div className="flex flex-wrap items-start justify-between gap-space-sm">
            <h2 className="text-headline-md text-on-surface">{warranty.audit.title}</h2>
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg bg-surface-container px-3 py-1.5 text-label-sm font-semibold text-primary transition-colors hover:bg-surface-container-high"
            >
              <Icon name="add_a_photo" className="text-[16px]" />
              {warranty.audit.addLabel}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
            {warranty.audit.photos.map((photo) => (
              <div key={photo.caption} className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between gap-space-xs">
                  <span
                    className={cn(
                      'text-label-sm font-bold',
                      photo.phaseTone === 'error' ? 'text-error' : 'text-primary',
                    )}
                  >
                    {photo.phase}
                  </span>
                  <span className="text-body-sm text-on-surface-variant">{photo.time}</span>
                </div>
                <div className="group relative aspect-video overflow-hidden rounded-xl bg-surface-container shadow-sm">
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-on-surface/60 via-transparent to-transparent" />
                  <span className="absolute bottom-2 left-2 rounded-md bg-surface-container-lowest/90 px-2.5 py-1 text-label-sm font-semibold text-on-surface backdrop-blur">
                    {photo.caption}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex cursor-pointer flex-col items-center justify-between gap-space-sm rounded-xl border-2 border-dashed border-outline-variant/60 p-space-md transition-colors hover:bg-surface-container-low/50 sm:flex-row">
            <div className="flex items-center gap-space-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container text-primary">
                <Icon name="cloud_upload" className="text-[24px]" />
              </div>
              <div className="flex flex-col">
                <span className="text-label-md font-bold text-on-surface">{warranty.audit.attachment.title}</span>
                <span className="text-body-sm text-on-surface-variant">{warranty.audit.attachment.description}</span>
              </div>
            </div>
            <span className="rounded-lg bg-primary-container px-3 py-1.5 text-label-sm font-semibold text-on-primary">
              {warranty.audit.attachment.actionLabel}
            </span>
          </div>
        </Card>
      </div>

      <div className="col-span-12 flex flex-col gap-space-xl xl:col-span-4">
        <Card padding="lg" className="flex flex-col gap-space-md">
          <div className="flex items-center justify-between gap-space-xs">
            <h3 className="flex items-center gap-space-xs text-headline-md text-on-surface">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-primary" />
              {warranty.site.title}
            </h3>
            <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm font-semibold text-on-surface-variant">
              {warranty.site.region}
            </span>
          </div>

          <div className="flex items-center gap-space-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-headline-md font-bold text-on-primary">
              {warranty.site.initials}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-headline-md text-on-surface">{warranty.site.name}</span>
              <span className="text-body-sm text-on-surface-variant">{warranty.site.premiseId}</span>
            </div>
          </div>

          <div className="flex flex-col gap-space-xs pt-space-xs text-body-md text-on-surface-variant">
            <div className="flex items-start gap-space-xs">
              <Icon name="location_on" className="mt-0.5 text-[18px] text-primary" />
              <span>{warranty.site.address}</span>
            </div>
            <div className="flex items-center gap-space-xs">
              <Icon name="call" className="text-[18px] text-primary" />
              <a href={warranty.site.phone.href} className="font-semibold transition-colors hover:text-primary">
                {warranty.site.phone.label}
              </a>
            </div>
            <div className="flex items-center gap-space-xs">
              <Icon name="mail" className="text-[18px] text-primary" />
              <span>{warranty.site.email}</span>
            </div>
          </div>

          <div className="relative h-36 w-full overflow-hidden rounded-xl shadow-inner">
            <img
              src={warranty.site.mapSrc}
              alt={`Bản đồ ${warranty.site.address}`}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-primary/10" />
            <span className="absolute bottom-2 right-2 rounded bg-surface-container-lowest/90 px-2.5 py-1 text-label-sm font-bold text-on-surface shadow-sm">
              {warranty.site.mapCaption}
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-space-sm">
            <span className="text-label-sm font-semibold text-on-surface-variant">{warranty.site.accessLabel}</span>
            <span className="text-body-sm text-on-surface">{warranty.site.accessNote}</span>
          </div>
        </Card>

        <Card padding="lg" className="flex flex-col gap-space-md">
          <div className="flex items-center justify-between gap-space-xs">
            <h3 className="flex items-center gap-space-xs text-headline-md text-on-surface">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-tertiary-fixed-dim" />
              {warranty.burnIn.title}
            </h3>
            <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm font-semibold text-on-primary-fixed">
              {warranty.burnIn.badge}
            </span>
          </div>

          <div className="flex flex-col items-center py-space-sm">
            <ProgressRing
              value={warranty.burnIn.percent}
              size={176}
              strokeWidth={3}
              label={`${warranty.burnIn.value} ${warranty.burnIn.unit}`}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <span className="text-label-sm text-on-surface-variant">{warranty.burnIn.ringLabel}</span>
                <span className="text-data-metric text-on-surface">{warranty.burnIn.value}</span>
                <span className="text-label-sm font-bold text-primary">{warranty.burnIn.unit}</span>
              </div>
            </ProgressRing>

            <div className="mt-space-sm grid w-full grid-cols-2 gap-space-xs pt-space-xs">
              {warranty.burnIn.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="flex flex-col items-center rounded-lg bg-surface-container-low p-space-sm text-center"
                >
                  <span className="text-label-sm text-on-surface-variant">{metric.label}</span>
                  <span
                    className={cn(
                      'text-headline-md font-bold',
                      metric.tone === 'primary' ? 'text-primary' : 'text-on-surface',
                    )}
                  >
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-space-xs rounded-lg bg-primary-fixed/20 p-2.5 text-label-sm text-primary">
            <Icon name="verified_user" className="text-[18px]" />
            <span>{warranty.burnIn.note}</span>
          </div>
        </Card>

        {/* Ký nhận và gửi hồ sơ */}
        <Card padding="lg" className="flex flex-col gap-space-md">
          <div className="flex items-center justify-between gap-space-xs">
            <h3 className="flex items-center gap-space-xs text-headline-md text-on-surface">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-primary" />
              {signOff.title}
            </h3>
            <span className="text-label-sm text-on-surface-variant">{signOff.sectionLabel}</span>
          </div>

          <Controller
            control={control}
            name="signed"
            render={({ field }) => (
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between gap-space-xs">
                  <span className="text-label-sm font-semibold text-on-surface">{signOff.signatureLabel}</span>
                  <button
                    type="button"
                    onClick={() => {
                      padRef.current?.clear()
                      field.onChange(false)
                    }}
                    className="text-label-sm text-on-surface-variant transition-colors hover:text-error"
                  >
                    {signOff.clearLabel}
                  </button>
                </div>
                <SignaturePad
                  ref={padRef}
                  height="sm"
                  label={signOff.signatureLabel}
                  hint={signOff.signatureHint}
                  caption={signOff.signatureCaption}
                  onSignedChange={(signed) => setValue('signed', signed, { shouldValidate: true })}
                />
                {errors.signed && (
                  <span role="alert" className="text-body-sm font-semibold text-error">
                    {errors.signed.message}
                  </span>
                )}
              </div>
            )}
          />

          <Controller
            control={control}
            name="confirmations"
            render={({ field }) => (
              <div className="flex flex-col gap-space-xs pt-space-2xs text-body-sm text-on-surface">
                {signOff.confirmations.map((confirmation) => {
                  const selected = field.value.includes(confirmation.id)
                  return (
                    <label
                      key={confirmation.id}
                      htmlFor={confirmation.id}
                      className="flex cursor-pointer items-start gap-space-xs"
                    >
                      <Checkbox
                        id={confirmation.id}
                        size="sm"
                        checked={selected}
                        className="mt-0.5"
                        onCheckedChange={(value) =>
                          field.onChange(
                            value === true
                              ? [...field.value, confirmation.id]
                              : field.value.filter((item: string) => item !== confirmation.id),
                          )
                        }
                      />
                      <span>{confirmation.label}</span>
                    </label>
                  )
                })}
                {errors.confirmations && (
                  <span role="alert" className="text-body-sm font-semibold text-error">
                    {errors.confirmations.message}
                  </span>
                )}
              </div>
            )}
          />

          <div className="flex flex-col gap-space-xs pt-space-sm">
            <Button
              type="submit"
              fullWidth
              disabled={isSubmitting}
              iconLeft={isSubmitSuccessful ? 'task_alt' : undefined}
            >
              {isSubmitting ? 'Đang gửi...' : signOff.submitLabel}
            </Button>
            <Button type="button" variant="ghost" fullWidth iconLeft="print">
              {signOff.receiptLabel}
            </Button>
          </div>
        </Card>
      </div>

      <Toast open={toast !== null} message={toast ?? ''} />
    </form>
  )
}
