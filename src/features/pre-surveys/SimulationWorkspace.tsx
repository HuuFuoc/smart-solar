import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { Field, Input, Select, WithUnit } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { Segmented } from '@/components/common/ui/segmented'
import { EmptyState, Skeleton } from '@/components/common/ui/states'
import { CompassPicker } from '@/features/pre-surveys/CompassPicker'
import { SimulationSelection } from '@/features/pre-surveys/SimulationSelection'
import { SimulationSkeleton, SimulationViewer } from '@/features/pre-surveys/SimulationViewer'
import { useRetryCountdown } from '@/hooks/useRetryCountdown'
import { useCreateSimulationMutation } from '@/hooks/useSimulations'
import { directionLabel, formatCoordinates, isInHcm } from '@/features/pre-surveys/preSurveyDisplay'
import { MOUNTING_TYPES, type MountingType } from '@/common/simulation'
import { formatKwh, formatOne, formatTwo } from '@/features/pre-surveys/simulationDisplay'
import {
  DEFAULT_SYSTEM_LOSS_PERCENT,
  SPACING_FIELDS,
  canSimulate,
  serverSimulationErrors,
  toSimulationRequest,
  validateSimulation,
  type SimulationErrors,
  type SimulationForm,
} from '@/features/pre-surveys/simulationForm'
import { SOLAR_PANEL_QUERY } from '@/features/products/productDisplay'
import { useProductsQuery } from '@/hooks/useProducts'
import { isApiError, type ApiError } from '@/services/api/errors'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import type { PreSurveySurfaceView } from '@/types/res/preSurveySurfaceRes'
import type { SimulationDetail } from '@/types/res/simulationsRes'
import { cx } from '@/utils/cx'

type Props = {
  preSurveyId: string
  /** Mặt lắp đã lưu trên server */
  surface: PreSurveySurfaceView
  /** Form cấu hình nằm ở trang cha, để giữ được khi khách qua lại giữa các bước */
  form: SimulationForm
  onFormChange: (next: SimulationForm) => void
  /** Lần chạy đang xem */
  viewId: string | null
  onView: (simulationId: string) => void
  onEditSurface: () => void
  onEditSite: () => void
  /** Bản nháp đã gửi ở nơi khác (PRE_SURVEY_NOT_EDITABLE) */
  onDraftClosed: () => void
  /** Cột phụ của trang, đặt cạnh khối cấu hình */
  aside?: ReactNode
}

type RunError = { message: string; showSurfaceLink?: boolean }

const FIX_FIELDS = 'Sửa các ô được đánh dấu rồi chạy lại.'
/** Các ô nằm trong mục gập "Khoảng cách lắp đặt và tổn hao" */
const SPACING_KEYS: (keyof SimulationForm)[] = [...SPACING_FIELDS.map((spacing) => spacing.field), 'systemLossPercent']
/** Server không gửi Retry-After thì chờ đủ 1 phút */
const DEFAULT_RETRY_SECONDS = 60

/** Câu đọc cho trình đọc màn hình sau khi chạy xong */
function runAnnouncement(detail: SimulationDetail) {
  const panels = `${detail.layout.panelCount} tấm, ${formatOne(detail.layout.installedCapacityKwp)} kWp`
  const energy = detail.energy.annualEnergyKwh
  if (energy == null) return `Đã chạy xong: ${panels}.`
  return `Đã chạy xong: ${panels}, ${formatKwh(energy)} kWh mỗi năm.`
}

function runButtonLabel(running: boolean, secondsLeft: number) {
  if (running) return 'Đang tính…'
  if (secondsLeft > 0) return `Chạy lại sau ${secondsLeft} giây`
  return 'Chạy mô phỏng'
}

// Bước "Mô phỏng": khách chọn tấm pin và kiểu lắp, rồi backend xếp tấm trên mặt lắp đã lưu và ước tính sản lượng.
// Mỗi lần chạy chỉ được giữ 24 giờ; khách chọn một lần làm mô phỏng chính thì mới được lưu lại.
// Chạy lại đúng cấu hình cũ trong 24 giờ thì backend trả lại kết quả cũ (200) thay vì tính lại.
export function SimulationWorkspace({
  preSurveyId,
  surface,
  form,
  onFormChange,
  viewId,
  onView,
  onEditSurface,
  onEditSite,
  onDraftClosed,
  aside,
}: Props) {
  const catalog = useProductsQuery(SOLAR_PANEL_QUERY)
  const panels = useMemo(() => (catalog.data?.items ?? []).filter(canSimulate), [catalog.data])
  const createSimulation = useCreateSimulationMutation()
  const running = createSimulation.isPending
  const [errors, setErrors] = useState<SimulationErrors>({})
  const [runError, setRunError] = useState<RunError | null>(null)
  // Mục "Khoảng cách lắp đặt" mở / đóng theo khách, tự mở khi có ô bên trong bị lỗi
  const [spacingOpen, setSpacingOpen] = useState(false)
  // Câu đọc kết quả cho trình đọc màn hình (focus vẫn ở nút chạy nên phải đọc ra)
  const [announcement, setAnnouncement] = useState('')
  const resultRef = useRef<HTMLDivElement>(null)
  // Hết giờ chờ sau lỗi 429 thì tắt câu báo lỗi
  const countdown = useRetryCountdown(() => setRunError(null))

  // Chưa chọn tấm, hoặc tấm đang nhớ đã ngừng bán, thì chọn sẵn tấm đầu danh sách
  // (nếu giữ id cũ thì ô chọn trống và backend trả 404)
  const firstPanelId = panels[0]?.id
  const selectedPanelKnown = panels.some((panel) => panel.id === form.productId)
  useEffect(() => {
    if (firstPanelId && (!form.productId || !selectedPanelKnown)) {
      onFormChange({ ...form, productId: firstPanelId })
    }
  }, [firstPanelId, form, selectedPanelKnown, onFormChange])

  const isRack = form.mountingType === 'RACK'

  /** Sửa form, xoá lỗi của các ô vừa sửa. Hết lỗi thì tắt câu nhắc chung */
  function changeForm(patch: Partial<SimulationForm>) {
    onFormChange({ ...form, ...patch })
    const remaining = { ...errors }
    for (const field of Object.keys(patch)) delete remaining[field as keyof SimulationForm]
    setErrors(remaining)
    if (Object.keys(remaining).length === 0 && runError?.message === FIX_FIELDS) setRunError(null)
  }

  function changeMounting(mountingType: MountingType) {
    // Khung nghiêng: gợi ý hướng tấm trùng hướng mái, để khách chỉ cần nhập góc nghiêng
    let panelAzimuthDegree = form.panelAzimuthDegree
    if (mountingType === 'RACK' && !panelAzimuthDegree && surface.surfaceAzimuthDegree != null) {
      panelAzimuthDegree = String(surface.surfaceAzimuthDegree)
    }
    changeForm({ mountingType, panelAzimuthDegree })
  }

  function showErrors(found: SimulationErrors) {
    if (SPACING_KEYS.some((key) => found[key])) setSpacingOpen(true)
    setErrors(found)
  }

  async function runSimulation() {
    if (running || countdown.secondsLeft > 0) return
    const found = validateSimulation(form)
    if (Object.keys(found).length > 0) {
      showErrors(found)
      setRunError({ message: FIX_FIELDS })
      return
    }
    setErrors({})
    setRunError(null)
    setAnnouncement('')
    try {
      const body = toSimulationRequest(form, surface.geometryVersion)
      const detail = await createSimulation.mutateAsync({ preSurveyId, body })
      onView(detail.simulationId)
      setAnnouncement(runAnnouncement(detail))
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      resultRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    } catch (error) {
      if (isApiError(error)) handleRunError(error)
      else setRunError({ message: 'Không chạy được mô phỏng. Thử lại.' })
    }
  }

  function handleRunError(error: ApiError) {
    if (error.status === 429) {
      countdown.start(error.retryAfter ?? DEFAULT_RETRY_SECONDS)
      setRunError({ message: 'Bạn đã chạy mô phỏng 10 lần trong một phút.' })
      return
    }
    if (error.code === 'PRE_SURVEY_NOT_EDITABLE') {
      onDraftClosed()
      return
    }
    // Tấm pin vừa bị ngừng bán: tải lại danh mục để chọn tấm khác
    if (error.code === 'PRODUCT_NOT_FOUND') void catalog.refetch()
    showErrors(serverSimulationErrors(error))
    setRunError({ message: error.message, showSurfaceLink: error.code === 'SURFACE_NOT_DEFINED' })
  }

  const selectedPanel = panels.find((panel) => panel.id === form.productId)
  const mountingHint = MOUNTING_TYPES.find((mounting) => mounting.value === form.mountingType)?.hint

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Không đóng khung riêng: khung của bước (AssessmentStepCard) đã bao quanh */}
      <Panel
        className="min-w-0 lg:col-span-2"
        // Ô cấu hình nằm trong <form> của wizard: Enter mặc định sẽ sang bước sau. Ở đây Enter là chạy mô phỏng
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
            event.preventDefault()
            void runSimulation()
          }
        }}
      >
        <PanelHeader
          title="Cấu hình mô phỏng"
          description="Hệ thống xếp tấm trên mặt lắp đã lưu và ước tính sản lượng điện theo số liệu bức xạ của PVGIS tại địa điểm."
        />
        <PanelBody className="space-y-5">
          <SurfaceSummary surface={surface} onEditSurface={onEditSurface} />
          <LocationNotices surface={surface} onEditSite={onEditSite} />

          <div className="grid gap-4 md:grid-cols-2">
            <PanelSelect
              panels={panels}
              loading={catalog.isPending}
              failed={catalog.isError}
              value={form.productId}
              error={errors.productId}
              onChange={(productId) => changeForm({ productId })}
            />
            <div className="flex flex-col gap-2">
              <span aria-hidden className="text-body font-medium text-fg">
                Kiểu lắp
              </span>
              <Segmented
                label="Kiểu lắp"
                options={MOUNTING_TYPES.map((mounting) => ({ value: mounting.value, label: mounting.label }))}
                value={form.mountingType}
                onChange={changeMounting}
                className="w-full sm:w-fit"
              />
              {mountingHint && <p className="text-meta text-fg-3">{mountingHint}</p>}
            </div>
          </div>
          {selectedPanel && (
            <p className="text-meta text-fg-3">
              Kích thước tấm {formatKwh(selectedPanel.heightMm)} × {formatKwh(selectedPanel.widthMm)} mm,{' '}
              {formatKwh(selectedPanel.ratedPowerW)} W.
            </p>
          )}

          {isRack && <RackFields form={form} errors={errors} onChange={changeForm} />}

          <SpacingFields
            form={form}
            errors={errors}
            open={spacingOpen}
            onOpenChange={setSpacingOpen}
            onChange={changeForm}
          />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line pt-4">
            <Button
              variant="soft"
              onClick={runSimulation}
              disabled={running || countdown.secondsLeft > 0 || panels.length === 0}
            >
              {runButtonLabel(running, countdown.secondsLeft)}
            </Button>
            {runError && (
              <span className="flex items-center gap-1.5 text-body font-medium text-danger" role="alert">
                <Icon name="error" className="shrink-0 text-[20px]" />
                {runError.message}
                {runError.showSurfaceLink && (
                  <button type="button" className="tap ui-link ml-1" onClick={onEditSurface}>
                    Về bước mặt lắp
                  </button>
                )}
              </span>
            )}
          </div>
        </PanelBody>
      </Panel>

      <div ref={resultRef} className="min-w-0 scroll-mt-20 lg:col-span-3 lg:row-start-2">
        <ResultPanel
          preSurveyId={preSurveyId}
          geometryVersion={surface.geometryVersion}
          viewId={viewId}
          running={running}
          announcement={announcement}
          onDraftClosed={onDraftClosed}
        />
      </div>

      {/* Thứ tự DOM là thứ tự trên điện thoại (cột phụ ở cuối), từ lg cột phụ mới lên hàng đầu */}
      {aside && <div className="min-w-0 space-y-4 self-start lg:col-start-3 lg:row-start-1">{aside}</div>}
    </div>
  )
}

/** Toạ độ của địa điểm nếu có (null khi chưa khai) */
function surfaceLocation(surface: PreSurveySurfaceView) {
  if (surface.latitude == null || surface.longitude == null) return null
  return { latitude: surface.latitude, longitude: surface.longitude }
}

/** Một dòng tóm tắt mặt lắp đã lưu */
function SurfaceSummary({ surface, onEditSurface }: { surface: PreSurveySurfaceView; onEditSurface: () => void }) {
  return (
    <p className="text-body text-fg-2">
      Mặt lắp {formatTwo(surface.surfaceWidthM)} × {formatTwo(surface.surfaceLengthM)} m, dốc{' '}
      {formatTwo(surface.surfaceTiltDegree)}°, quay hướng {directionLabel(surface.surfaceAzimuthDegree)},{' '}
      {surface.obstacles.length} vật cản.{' '}
      <button type="button" className="tap ui-link font-medium" onClick={onEditSurface}>
        Sửa mặt lắp
      </button>
    </p>
  )
}

// Cảnh báo trước khi chạy, chỉ gặp ở địa điểm cũ (toạ độ do khách tự nhập trước đây): thiếu toạ độ hoặc nằm ngoài TP.HCM.
// Chọn lại phường, xã rồi lưu thì địa điểm mới lấy vị trí theo phường
function LocationNotices({ surface, onEditSite }: { surface: PreSurveySurfaceView; onEditSite: () => void }) {
  const location = surfaceLocation(surface)

  if (location === null) {
    return (
      <Notice tone="warn" title="Chưa ước tính được sản lượng cho địa điểm này">
        Địa điểm lưu trước đây chưa có vị trí nên kết quả chỉ có bố trí tấm.{' '}
        <button type="button" className="tap ui-link font-medium" onClick={onEditSite}>
          Chọn lại phường, xã ở bước Địa điểm
        </button>
      </Notice>
    )
  }

  // Toạ độ ngoài TP.HCM thì khí hậu, sản lượng sẽ tính ở nơi khác
  if (!isInHcm(location.latitude, location.longitude)) {
    return (
      <Notice tone="warn" title="Vị trí đã lưu của địa điểm nằm ngoài TP.HCM">
        Khí hậu và sản lượng sẽ tính tại{' '}
        <span className="tnum">{formatCoordinates(location.latitude, location.longitude)}</span>, không phải công trình
        của bạn.{' '}
        <button type="button" className="tap ui-link font-medium" onClick={onEditSite}>
          Chọn lại phường, xã ở bước Địa điểm
        </button>
      </Notice>
    )
  }
  return null
}

/** Ô chọn tấm pin, hoặc khung chờ / thông báo khi danh mục chưa có tấm dùng được */
function PanelSelect({
  panels,
  loading,
  failed,
  value,
  error,
  onChange,
}: {
  panels: ProductResponse[]
  loading: boolean
  failed: boolean
  value: string
  error: string | undefined
  onChange: (productId: string) => void
}) {
  if (panels.length > 0) {
    return (
      <Field label="Tấm pin" htmlFor="simPanel" error={error}>
        <Select id="simPanel" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)}>
          {panels.map((panel) => (
            <option key={panel.id} value={panel.id}>
              {panel.name} ({formatKwh(panel.ratedPowerW)} W)
            </option>
          ))}
        </Select>
      </Field>
    )
  }

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Đang tải danh mục tấm pin" className="flex flex-col gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-11 lg:h-10" />
      </div>
    )
  }

  const message = failed
    ? 'Không tải được danh mục tấm pin.'
    : 'Danh mục chưa có tấm pin đang bán đủ công suất và kích thước để mô phỏng.'
  return <Notice tone="warn">{message}</Notice>
}

type FormFieldsProps = {
  form: SimulationForm
  errors: SimulationErrors
  onChange: (patch: Partial<SimulationForm>) => void
}

/** Góc nghiêng và hướng riêng của tấm, chỉ có ở kiểu khung nghiêng */
function RackFields({ form, errors, onChange }: FormFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,14rem)_1fr]">
      <Field label="Góc nghiêng tấm" htmlFor="simTilt" hint="So với mặt phẳng ngang." error={errors.panelTiltDegree}>
        <WithUnit unit="độ">
          <Input
            id="simTilt"
            inputMode="decimal"
            value={form.panelTiltDegree}
            onChange={(e) => onChange({ panelTiltDegree: e.target.value })}
            aria-invalid={Boolean(errors.panelTiltDegree)}
          />
        </WithUnit>
      </Field>
      <CompassPicker
        name="panelAzimuth"
        legend="Tấm pin quay về hướng nào?"
        hint="Hướng mặt tấm nhìn ra, độc lập với hướng mái."
        className=""
        value={form.panelAzimuthDegree}
        error={errors.panelAzimuthDegree}
        onChange={(panelAzimuthDegree) => onChange({ panelAzimuthDegree })}
      />
    </div>
  )
}

/** Mục gập "Khoảng cách lắp đặt và tổn hao". Ô để trống thì backend dùng số mặc định (hiện mờ trong ô) */
function SpacingFields({
  form,
  errors,
  open,
  onOpenChange,
  onChange,
}: FormFieldsProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const isRack = form.mountingType === 'RACK'
  const visibleFields = SPACING_FIELDS.filter((spacing) => isRack || !spacing.rackOnly)
  return (
    <details className="border-t border-line pt-3" open={open} onToggle={(e) => onOpenChange(e.currentTarget.open)}>
      <summary className="tap w-fit cursor-pointer text-body font-medium text-accent-fg underline-offset-4 hover:underline">
        Khoảng cách lắp đặt và tổn hao (không bắt buộc)
      </summary>
      <p className="mt-2 text-meta text-fg-3">
        Không chắc thì để trống: hệ thống dùng số mặc định đang hiện mờ trong ô, kết quả ghi rõ giá trị đã dùng. Đơn vị
        mm (20 mm = 2 cm).
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleFields.map((spacing) => (
          <Field
            key={spacing.field}
            label={spacing.label}
            htmlFor={`sim-${spacing.field}`}
            hint={spacing.hint(form.mountingType)}
            error={errors[spacing.field]}
          >
            <WithUnit unit="mm">
              <Input
                id={`sim-${spacing.field}`}
                inputMode="decimal"
                placeholder={spacing.placeholder(form.mountingType)}
                value={form[spacing.field]}
                onChange={(e) => onChange({ [spacing.field]: e.target.value })}
                aria-invalid={Boolean(errors[spacing.field])}
              />
            </WithUnit>
          </Field>
        ))}
        <Field
          label="Tổn hao hệ thống"
          htmlFor="simLoss"
          hint={`Mặc định ${DEFAULT_SYSTEM_LOSS_PERCENT}% (theo PVGIS).`}
          error={errors.systemLossPercent}
        >
          <WithUnit unit="%">
            <Input
              id="simLoss"
              inputMode="decimal"
              placeholder={DEFAULT_SYSTEM_LOSS_PERCENT}
              value={form.systemLossPercent}
              onChange={(e) => onChange({ systemLossPercent: e.target.value })}
              aria-invalid={Boolean(errors.systemLossPercent)}
            />
          </WithUnit>
        </Field>
      </div>
    </details>
  )
}

/** Khối kết quả: lần chạy đang xem, khung chờ khi đang chạy lần đầu, hoặc thông báo chưa chạy */
function ResultPanel({
  preSurveyId,
  geometryVersion,
  viewId,
  running,
  announcement,
  onDraftClosed,
}: {
  preSurveyId: string
  geometryVersion: number
  viewId: string | null
  running: boolean
  announcement: string
  onDraftClosed: () => void
}) {
  let content: ReactNode
  if (viewId) {
    // Đang chạy lần mới: giữ kết quả cũ trên màn (mờ đi) thay vì nháy khung chờ
    content = (
      <div className={cx(running && 'opacity-50 transition-opacity')}>
        <SimulationViewer
          preSurveyId={preSurveyId}
          simulationId={viewId}
          staleNote="Mặt lắp đã sửa sau lần chạy này. Chạy lại để có kết quả theo mặt lắp mới."
        />
      </div>
    )
  } else if (running) {
    content = <SimulationSkeleton />
  } else {
    content = <EmptyState title="Chưa chạy mô phỏng" description="Chọn tấm pin và kiểu lắp rồi bấm Chạy mô phỏng." />
  }

  return (
    <Panel>
      <PanelHeader title="Kết quả mô phỏng" />
      <PanelBody className="space-y-4">
        <div aria-live="polite">
          {running && (
            <Notice tone="info">
              Đang xếp tấm và lấy số liệu bức xạ từ PVGIS, NASA POWER. Có thể mất tới 30 giây.
            </Notice>
          )}
          {!running && announcement && <p className="sr-only">{announcement}</p>}
        </div>
        {viewId && !running && (
          <SimulationSelection
            preSurveyId={preSurveyId}
            geometryVersion={geometryVersion}
            viewId={viewId}
            onDraftClosed={onDraftClosed}
          />
        )}
        {content}
      </PanelBody>
    </Panel>
  )
}
