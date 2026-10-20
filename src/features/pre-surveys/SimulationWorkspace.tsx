import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { Field, Input, Select } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { Segmented } from '@/components/common/ui/segmented'
import { EmptyState, Skeleton } from '@/components/common/ui/states'
import { CompassPicker, WithUnit } from '@/features/pre-surveys/AssessmentFields'
import {
  HCM_COORDINATE_HINT,
  directionLabel,
  formatCoordinates,
  isInHcm,
  mapsUrl,
} from '@/features/pre-surveys/preSurveyDisplay'
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
import { SimulationSkeleton, SimulationViewer } from '@/features/pre-surveys/SimulationViewer'
import { useCreateSimulationMutation } from '@/hooks/useSimulations'
import { SOLAR_PANEL_QUERY } from '@/features/products/productDisplay'
import { useProductsQuery } from '@/hooks/useProducts'
import { isApiError } from '@/services/api/errors'
import type { PreSurveySurfaceView } from '@/types/res/preSurveySurfaceRes'
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

const FIX_FIELDS = 'Sửa các ô được đánh dấu rồi chạy lại.'
/** Các ô nằm trong mục gập "Khoảng cách lắp đặt và tổn hao" */
const SPACING_KEYS = [...SPACING_FIELDS.map((f) => f.field), 'systemLossPercent'] as const
/** Server không gửi Retry-After thì chờ đủ 1 phút */
const DEFAULT_RETRY_SECONDS = 60

// Bước "Mô phỏng": khách chọn tấm pin và kiểu lắp, rồi backend xếp tấm trên mặt lắp đã lưu và ước tính sản lượng.
// Mỗi lần chạy được lưu lại. Chạy lại đúng cấu hình cũ thì backend trả lại kết quả cũ (200) thay vì tính lại.
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
  const create = useCreateSimulationMutation()
  const [errors, setErrors] = useState<SimulationErrors>({})
  const [formError, setFormError] = useState<{ message: string; surfaceLink?: boolean } | null>(null)
  const [retryAt, setRetryAt] = useState<number | null>(null)
  // Mục "Khoảng cách lắp đặt" mở / đóng theo khách, tự mở khi có ô bên trong bị lỗi
  const [spacingOpen, setSpacingOpen] = useState(false)
  // Câu đọc kết quả cho trình đọc màn hình (focus vẫn ở nút chạy nên phải đọc ra)
  const [announcement, setAnnouncement] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const resultRef = useRef<HTMLDivElement>(null)

  // Chưa chọn tấm hoặc tấm đã nhớ không còn bán thì chọn sẵn tấm đầu danh sách
  const firstPanel = panels[0]?.id
  const known = panels.some((p) => p.id === form.productId)
  useEffect(() => {
    if (firstPanel && (!form.productId || !known)) onFormChange({ ...form, productId: firstPanel })
  }, [firstPanel, form, known, onFormChange])

  useEffect(() => {
    if (retryAt === null) return
    const timer = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= retryAt) {
        setRetryAt(null)
        setFormError(null)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [retryAt])
  const waitSeconds = retryAt === null ? 0 : Math.max(0, Math.ceil((retryAt - now) / 1000))

  const rack = form.mountingType === 'RACK'
  const hasLocation = surface.latitude != null && surface.longitude != null
  // Toạ độ ngoài TP.HCM thì khí hậu, sản lượng sẽ tính ở nơi khác nên báo trước khi chạy
  const outsideHcm =
    surface.latitude != null && surface.longitude != null && !isInHcm(surface.latitude, surface.longitude)

  function patch(next: Partial<SimulationForm>) {
    onFormChange({ ...form, ...next })
    const copy = { ...errors }
    for (const key of Object.keys(next)) delete copy[key as keyof SimulationForm]
    setErrors(copy)
    // Sửa hết các ô bị đánh dấu thì tắt câu nhắc chung, câu lỗi của server giữ đến lần chạy sau
    if (Object.keys(copy).length === 0 && formError?.message === FIX_FIELDS) setFormError(null)
  }

  function setMounting(mountingType: MountingType) {
    // Khung nghiêng: điền sẵn hướng mái để khách chỉ cần nhập góc nghiêng
    const azimuth =
      mountingType === 'RACK' && !form.panelAzimuthDegree && surface.surfaceAzimuthDegree != null
        ? String(surface.surfaceAzimuthDegree)
        : form.panelAzimuthDegree
    patch({ mountingType, panelAzimuthDegree: azimuth })
  }

  async function run() {
    if (create.isPending || waitSeconds > 0) return
    const found = validateSimulation(form)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      if (SPACING_KEYS.some((k) => found[k])) setSpacingOpen(true)
      setFormError({ message: FIX_FIELDS })
      return
    }
    setFormError(null)
    setAnnouncement('')
    try {
      const detail = await create.mutateAsync({ preSurveyId, body: toSimulationRequest(form, surface.geometryVersion) })
      onView(detail.simulationId)
      setAnnouncement(
        `Đã chạy xong: ${detail.layout.panelCount} tấm, ${formatOne(detail.layout.installedCapacityKwp)} kWp${
          detail.energy.annualEnergyKwh != null ? `, ${formatKwh(detail.energy.annualEnergyKwh)} kWh mỗi năm` : ''
        }.`,
      )
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      resultRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    } catch (error) {
      if (!isApiError(error)) return setFormError({ message: 'Không chạy được mô phỏng. Thử lại.' })
      if (error.status === 429) {
        const seconds = error.retryAfter ?? DEFAULT_RETRY_SECONDS
        setRetryAt(Date.now() + seconds * 1000)
        setNow(Date.now())
        return setFormError({ message: 'Bạn đã chạy mô phỏng 10 lần trong một phút.' })
      }
      if (error.code === 'PRE_SURVEY_NOT_EDITABLE') return onDraftClosed()
      if (error.code === 'PRODUCT_NOT_FOUND') void catalog.refetch()
      const mapped = serverSimulationErrors(error)
      if (SPACING_KEYS.some((k) => mapped[k])) setSpacingOpen(true)
      setErrors(mapped)
      setFormError({ message: error.message, surfaceLink: error.code === 'SURFACE_NOT_DEFINED' })
    }
  }

  const selectedPanel = panels.find((p) => p.id === form.productId)
  const mountingHint = MOUNTING_TYPES.find((m) => m.value === form.mountingType)?.hint

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Panel
        raised
        className="min-w-0 lg:col-span-2"
        // Ô nằm trong <form> của wizard, Enter ở đây là chạy mô phỏng chứ không gửi form
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
            e.preventDefault()
            void run()
          }
        }}
      >
        <PanelHeader
          title="Cấu hình mô phỏng"
          description="Hệ thống xếp tấm trên mặt lắp đã lưu và ước tính sản lượng điện theo số liệu bức xạ của PVGIS tại địa điểm."
        />
        <PanelBody className="space-y-5">
          <p className="text-body text-fg-2">
            Mặt lắp {formatTwo(surface.surfaceWidthM)} × {formatTwo(surface.surfaceLengthM)} m, dốc{' '}
            {formatTwo(surface.surfaceTiltDegree)}°, quay hướng {directionLabel(surface.surfaceAzimuthDegree)},{' '}
            {surface.obstacles.length} vật cản.{' '}
            <button type="button" className="tap ui-link font-medium" onClick={onEditSurface}>
              Sửa mặt lắp
            </button>
            {surface.latitude != null && surface.longitude != null && !outsideHcm && (
              <span className="block">
                Toạ độ <span className="tnum">{formatCoordinates(surface.latitude, surface.longitude)}</span>.{' '}
                <a
                  className="tap ui-link font-medium"
                  href={mapsUrl(surface.latitude, surface.longitude)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Xem trên bản đồ
                  <span className="sr-only"> (mở tab mới)</span>
                </a>
              </span>
            )}
          </p>

          {outsideHcm && surface.latitude != null && surface.longitude != null && (
            <Notice tone="warn" title="Toạ độ địa điểm nằm ngoài TP.HCM">
              Khí hậu và sản lượng sẽ tính tại{' '}
              <span className="tnum">{formatCoordinates(surface.latitude, surface.longitude)}</span>, không phải công
              trình của bạn. Toạ độ ở TP.HCM có {HCM_COORDINATE_HINT}.
              <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <button type="button" className="tap ui-link font-medium" onClick={onEditSite}>
                  Sửa toạ độ ở bước Địa điểm
                </button>
                <a
                  className="tap ui-link font-medium"
                  href={mapsUrl(surface.latitude, surface.longitude)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Xem trên bản đồ
                  <span className="sr-only"> (mở tab mới)</span>
                </a>
              </span>
            </Notice>
          )}

          {!hasLocation && (
            <Notice tone="warn" title="Địa điểm chưa có toạ độ">
              Kết quả sẽ chỉ có bố trí tấm, chưa có sản lượng điện.{' '}
              <button type="button" className="tap ui-link font-medium" onClick={onEditSite}>
                Thêm toạ độ ở bước Địa điểm
              </button>
            </Notice>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {panels.length > 0 ? (
              <Field label="Tấm pin" htmlFor="simPanel" error={errors.productId}>
                <Select
                  id="simPanel"
                  value={form.productId}
                  onChange={(e) => patch({ productId: e.target.value })}
                  aria-invalid={Boolean(errors.productId)}
                >
                  {panels.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatKwh(p.ratedPowerW)} W)
                    </option>
                  ))}
                </Select>
              </Field>
            ) : catalog.isPending ? (
              <div aria-busy="true" aria-label="Đang tải danh mục tấm pin" className="flex flex-col gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-11 lg:h-10" />
              </div>
            ) : (
              <Notice tone="warn">
                {catalog.isError
                  ? 'Không tải được danh mục tấm pin.'
                  : 'Danh mục chưa có tấm pin đang bán đủ công suất và kích thước để mô phỏng.'}
              </Notice>
            )}
            <div className="flex flex-col gap-2">
              <span aria-hidden className="text-body font-medium text-fg">
                Kiểu lắp
              </span>
              <Segmented
                label="Kiểu lắp"
                options={MOUNTING_TYPES.map((m) => ({ value: m.value, label: m.label }))}
                value={form.mountingType}
                onChange={setMounting}
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

          {rack && (
            <div className="grid gap-4 md:grid-cols-[minmax(0,14rem)_1fr]">
              <Field
                label="Góc nghiêng tấm"
                htmlFor="simTilt"
                hint="So với mặt phẳng ngang."
                error={errors.panelTiltDegree}
              >
                <WithUnit unit="độ">
                  <Input
                    id="simTilt"
                    inputMode="decimal"
                    value={form.panelTiltDegree}
                    onChange={(e) => patch({ panelTiltDegree: e.target.value })}
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
                onChange={(panelAzimuthDegree) => patch({ panelAzimuthDegree })}
              />
            </div>
          )}

          <details
            className="border-t border-line pt-3"
            open={spacingOpen}
            onToggle={(e) => setSpacingOpen(e.currentTarget.open)}
          >
            <summary className="tap w-fit cursor-pointer text-body font-medium text-accent-fg underline-offset-4 hover:underline">
              Khoảng cách lắp đặt và tổn hao (không bắt buộc)
            </summary>
            <p className="mt-2 text-meta text-fg-3">
              Không chắc thì để trống: hệ thống dùng số mặc định đang hiện mờ trong ô, kết quả ghi rõ giá trị đã dùng.
              Đơn vị mm (20 mm = 2 cm).
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {SPACING_FIELDS.filter((s) => rack || !s.rackOnly).map((s) => (
                <Field
                  key={s.field}
                  label={s.label}
                  htmlFor={`sim-${s.field}`}
                  hint={s.hint(form.mountingType)}
                  error={errors[s.field]}
                >
                  <WithUnit unit="mm">
                    <Input
                      id={`sim-${s.field}`}
                      inputMode="decimal"
                      placeholder={s.placeholder(form.mountingType)}
                      value={form[s.field]}
                      onChange={(e) => patch({ [s.field]: e.target.value })}
                      aria-invalid={Boolean(errors[s.field])}
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
                    onChange={(e) => patch({ systemLossPercent: e.target.value })}
                    aria-invalid={Boolean(errors.systemLossPercent)}
                  />
                </WithUnit>
              </Field>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line pt-4">
            <Button variant="soft" onClick={run} disabled={create.isPending || waitSeconds > 0 || panels.length === 0}>
              {create.isPending ? 'Đang tính…' : waitSeconds > 0 ? `Chạy lại sau ${waitSeconds} giây` : 'Chạy mô phỏng'}
            </Button>
            {formError && (
              <span className="flex items-center gap-1.5 text-body font-medium text-danger" role="alert">
                <Icon name="error" className="shrink-0 text-[20px]" />
                {formError.message}
                {formError.surfaceLink && (
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
        <Panel>
          <PanelHeader title="Kết quả mô phỏng" />
          <PanelBody className="space-y-4">
            <div aria-live="polite">
              {create.isPending && (
                <Notice tone="info">
                  Đang xếp tấm và lấy số liệu bức xạ từ PVGIS, NASA POWER. Có thể mất tới 30 giây.
                </Notice>
              )}
              {!create.isPending && announcement && <p className="sr-only">{announcement}</p>}
            </div>
            {viewId ? (
              // Đang chạy lần mới thì giữ kết quả cũ (mờ đi) thay vì nháy khung chờ
              <div className={cx(create.isPending && 'opacity-50 transition-opacity')}>
                <SimulationViewer
                  preSurveyId={preSurveyId}
                  simulationId={viewId}
                  staleNote="Mặt lắp đã sửa sau lần chạy này. Chạy lại để có kết quả theo mặt lắp mới."
                />
              </div>
            ) : create.isPending ? (
              <SimulationSkeleton />
            ) : (
              <EmptyState title="Chưa chạy mô phỏng" description="Chọn tấm pin và kiểu lắp rồi bấm Chạy mô phỏng." />
            )}
          </PanelBody>
        </Panel>
      </div>

      {aside && <div className="min-w-0 space-y-4 self-start lg:col-start-3 lg:row-start-1">{aside}</div>}
    </div>
  )
}
