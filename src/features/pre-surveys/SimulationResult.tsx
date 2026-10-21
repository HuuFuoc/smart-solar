import { Component, lazy, Suspense, useState, type ReactNode } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Notice } from '@/components/common/ui/lists'
import { Segmented, type SegmentedOption } from '@/components/common/ui/segmented'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { Skeleton } from '@/components/common/ui/states'
import { EnergyChart } from '@/features/pre-surveys/EnergyChart'
import { Facts, type Fact } from '@/features/pre-surveys/Facts'
import { SimulationDetails } from '@/features/pre-surveys/SimulationDetails'
import type { SceneView, ShadeSummary } from '@/features/pre-surveys/SimulationScene'
import { SunTimeSlider } from '@/features/pre-surveys/SunTimeSlider'
import { ORIENTATIONS, SCENARIO_PLACES } from '@/common/simulation'
import { SurfacePlan } from '@/features/pre-surveys/SurfacePlan'
import { sunPosition, vietnamTimeToday } from '@/features/pre-surveys/sunPosition'
import { directionLabel, formatCoordinates, formatRelative, isInHcm } from '@/features/pre-surveys/preSurveyDisplay'
import {
  ENERGY_DISCLAIMER,
  energyMissingText,
  formatKwh,
  formatM2,
  formatMm,
  formatOne,
  mountingLabel,
  noPanelsText,
  simulationStatusMeta,
  warningText,
} from '@/features/pre-surveys/simulationDisplay'
import type { SimulationDetail } from '@/types/res/simulationsRes'

// Kết quả một lần mô phỏng (khách hàng và sales dùng chung, chỉ đọc).
// Thứ tự theo điều người xem cần trước: lắp được bao nhiêu tấm, bao nhiêu kWp, ra bao nhiêu điện,
// rồi bố trí (mặt bằng / 3D), sản lượng theo tháng, cảnh báo kỹ thuật, cuối cùng là các mục chi tiết gập lại.
// Sản lượng null thì hiện "chưa có dữ liệu", không bao giờ hiện 0 kWh.

// three.js chỉ tải khi mở góc nhìn 3D
const SimulationScene = lazy(() =>
  import('@/features/pre-surveys/SimulationScene').then((module) => ({ default: module.SimulationScene })),
)

type LayoutView = 'plan' | '3d'
const LAYOUT_VIEWS: SegmentedOption<LayoutView>[] = [
  { value: 'plan', label: 'Mặt bằng' },
  { value: '3d', label: '3D' },
]
const SCENE_ANGLES: SegmentedOption<SceneView>[] = [
  { value: 'angle', label: 'Góc nghiêng' },
  { value: 'top', label: 'Từ trên' },
  // Nhãn ngắn để 3 lựa chọn vừa một hàng trên màn 360px
  { value: 'front', label: 'Chính diện' },
]

const NO_3D = 'Không vẽ được 3D trên trình duyệt này. Mặt bằng và số liệu vẫn đúng.'

/** Địa điểm chưa có toạ độ thì tính mặt trời ở giữa TP.HCM */
const HCM_CENTER = { latitude: 10.78, longitude: 106.7 }

/** Trình duyệt vẽ được 3D không (three.js bản này chỉ dùng WebGL2) */
function supportsWebGL() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}

// Lỗi khi dựng 3D (hoặc tải three.js) chỉ thay khung 3D bằng thông báo, không làm sập cả trang
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) return <Notice tone="warn">{NO_3D}</Notice>
    return this.props.children
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-body font-semibold text-fg">{title}</h3>
      {children}
    </section>
  )
}

/** Toạ độ của địa điểm, null khi chưa khai */
function surfaceLocation(detail: SimulationDetail) {
  const { latitude, longitude } = detail.surface
  if (latitude == null || longitude == null) return null
  return { latitude, longitude }
}

/** Câu tóm tắt kết quả, dùng làm mô tả của hình cho trình đọc màn hình */
function resultSummary(detail: SimulationDetail) {
  const { layout, energy } = detail
  const panels = `Lắp được ${layout.panelCount} tấm, tổng ${formatOne(layout.installedCapacityKwp)} kWp`
  if (energy.annualEnergyKwh == null) return `${panels}.`
  return `${panels}, ước tính ${formatKwh(energy.annualEnergyKwh)} kWh mỗi năm.`
}

export function SimulationResult({ detail, staleNote }: { detail: SimulationDetail; staleNote?: ReactNode }) {
  const location = surfaceLocation(detail)
  const summary = resultSummary(detail)
  return (
    <div className="space-y-6">
      <ResultHeader detail={detail} staleNote={staleNote} />
      <SimulationStats
        panelCount={detail.layout.panelCount}
        capacityKwp={detail.layout.installedCapacityKwp}
        annualEnergyKwh={detail.energy.annualEnergyKwh}
        specificYield={detail.energy.specificYieldKwhPerKwpYear}
      />
      <ResultNotices detail={detail} location={location} />
      <LayoutSection detail={detail} summary={summary} />
      <EnergySection detail={detail} />
      {detail.warnings.length > 0 && (
        <Notice tone="warn" title="Cần kỹ sư kiểm tra trước khi lắp">
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {detail.warnings.map((warning) => (
              <li key={warning.code}>{warningText(warning)}</li>
            ))}
          </ul>
        </Notice>
      )}
      <SimulationDetails detail={detail} location={location} />
    </div>
  )
}

function ResultHeader({ detail, staleNote }: { detail: SimulationDetail; staleNote?: ReactNode }) {
  const status = simulationStatusMeta(detail.status, detail.energy.status, detail.climate.status)
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={status.tone}>{status.label}</Badge>
        {detail.isSelected && <Badge tone="accent">Mô phỏng chính</Badge>}
        {detail.isStale && <Badge tone="warn">Theo mặt lắp cũ</Badge>}
        <span className="text-meta text-fg-3">Chạy {formatRelative(detail.createdAt)}</span>
      </div>
      {detail.isStale && staleNote && <Notice tone="warn">{staleNote}</Notice>}
    </>
  )
}

/** Hàng số liệu chính, dùng chung cho kết quả đầy đủ và bản tóm tắt của mô phỏng chính */
export function SimulationStats({
  panelCount,
  capacityKwp,
  annualEnergyKwh,
  specificYield,
}: {
  panelCount: number
  capacityKwp: number
  annualEnergyKwh: number | null
  specificYield: number | null
}) {
  const hasEnergy = annualEnergyKwh != null
  const hasYield = specificYield != null
  return (
    <StatRow>
      <Stat label="Số tấm" value={panelCount} unit="tấm" />
      <Stat label="Công suất lắp đặt" value={formatOne(capacityKwp)} unit="kWp" />
      <Stat
        label="Sản lượng năm"
        value={hasEnergy ? formatKwh(annualEnergyKwh) : '—'}
        unit={hasEnergy ? 'kWh' : undefined}
        note={hasEnergy ? 'Ước tính năm điển hình' : 'Chưa có dữ liệu'}
      />
      <Stat
        label="Sản lượng riêng"
        value={hasYield ? formatKwh(specificYield) : '—'}
        unit={hasYield ? 'kWh/kWp' : undefined}
        note={hasYield ? 'Mỗi năm' : undefined}
      />
    </StatRow>
  )
}

function ResultNotices({
  detail,
  location,
}: {
  detail: SimulationDetail
  location: { latitude: number; longitude: number } | null
}) {
  const { layout, energy } = detail
  // Toạ độ ngoài TP.HCM thì khí hậu, sản lượng đang tính ở nơi khác (khách hàng lẫn sales đều cần biết)
  const outsideHcm = location !== null && !isInHcm(location.latitude, location.longitude)
  return (
    <>
      {layout.panelCount === 0 && (
        <Notice tone="warn" title="Không xếp được tấm nào">
          {noPanelsText(layout.details.noPanelsReason)} Thử tấm pin nhỏ hơn, giảm khoảng lùi mép hoặc khoảng cách quanh
          vật cản.
        </Notice>
      )}
      {outsideHcm && location && (
        <Notice tone="warn" title="Toạ độ địa điểm nằm ngoài TP.HCM">
          Khí hậu và sản lượng dưới đây tính tại{' '}
          <span className="tnum">{formatCoordinates(location.latitude, location.longitude)}</span>, không phải công
          trình. Chọn lại phường, xã của địa điểm rồi chạy lại mô phỏng.
        </Notice>
      )}
      {layout.panelCount > 0 && energy.annualEnergyKwh == null && (
        <Notice tone="warn">{energyMissingText(energy)}</Notice>
      )}
    </>
  )
}

/** Các dòng thông tin dưới hình bố trí: tấm pin, kiểu lắp, diện tích */
function layoutFacts(detail: SimulationDetail): Fact[] {
  const { layout, mounting, surface, product } = detail
  const panelText = `${product.name} (${formatKwh(product.ratedPowerW)} W, ${formatKwh(product.heightMm)} × ${formatKwh(product.widthMm)} mm)`

  let mountingText = `${mountingLabel(mounting.type)} theo mái ${formatOne(surface.tiltDegree)}°, hướng ${directionLabel(surface.azimuthDegree)}`
  if (mounting.type === 'RACK') {
    mountingText = `${mountingLabel(mounting.type)} ${formatOne(mounting.panelTiltDegree)}°, quay hướng ${directionLabel(mounting.panelAzimuthDegree)}`
  }

  const facts: Fact[] = [
    { k: 'Tấm pin', v: panelText },
    { k: 'Kiểu lắp', v: mountingText },
  ]
  const orientation = layout.details.orientation
  if (orientation) facts.push({ k: 'Cách đặt tấm', v: ORIENTATIONS[orientation] ?? orientation })
  facts.push(
    { k: 'Mặt lắp', v: formatM2(layout.computedAreas.grossSurfaceAreaM2) },
    { k: 'Vật cản chiếm', v: formatM2(layout.computedAreas.obstacleOccupiedAreaM2) },
    { k: 'Vùng lắp được', v: formatM2(layout.computedAreas.installableAreaM2) },
    { k: 'Tấm pin phủ', v: formatM2(layout.computedAreas.panelCoveredAreaM2) },
  )
  return facts
}

function LayoutSection({ detail, summary }: { detail: SimulationDetail; summary: string }) {
  const [view, setView] = useState<LayoutView>('plan')
  const [angle, setAngle] = useState<SceneView>('angle')
  const [webglSupported] = useState(supportsWebGL)

  return (
    <Section title="Bố trí tấm pin">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Segmented label="Cách xem bố trí" options={LAYOUT_VIEWS} value={view} onChange={setView} />
        {view === '3d' && webglSupported && (
          <Segmented label="Góc nhìn 3D" options={SCENE_ANGLES} value={angle} onChange={setAngle} />
        )}
      </div>
      {view === 'plan' && <LayoutPlan detail={detail} summary={summary} />}
      {view === '3d' && webglSupported && <LayoutScene detail={detail} summary={summary} angle={angle} />}
      {view === '3d' && !webglSupported && <Notice tone="warn">{NO_3D}</Notice>}
      <Facts items={layoutFacts(detail)} />
    </Section>
  )
}

function LayoutPlan({ detail, summary }: { detail: SimulationDetail; summary: string }) {
  const { surface, installation, layout } = detail
  const panels = layout.details.placements.map((placement) => placement.footprint)
  const setback = formatMm(installation.edgeSetbackMm.valueMm)
  const clearance = formatMm(installation.obstacleClearanceMm.valueMm)
  return (
    <SurfacePlan
      widthM={surface.widthM}
      lengthM={surface.lengthM}
      obstacles={surface.obstacles}
      panels={panels}
      setbackM={installation.edgeSetbackMm.valueMm / 1000}
      clearanceM={installation.obstacleClearanceMm.valueMm / 1000}
      label={`Mặt bằng bố trí. ${summary}`}
      caption={
        <p className="text-meta text-fg-3">
          Mép trên là mép cao của mái, mái quay về hướng {directionLabel(surface.azimuthDegree)}. Nét đứt: vùng lùi mép{' '}
          {setback}
          {surface.obstacles.length > 0 && ` và khoảng cách quanh vật cản ${clearance}`}.
        </p>
      }
    />
  )
}

function LayoutScene({ detail, summary, angle }: { detail: SimulationDetail; summary: string; angle: SceneView }) {
  // Mở 3D lúc 9 giờ sáng để bóng nắng đã rõ
  const [sunHour, setSunHour] = useState(9)
  // Phần diện tích tấm pin mất nắng, do cảnh 3D tính (null khi cảnh chưa tải xong)
  const [shade, setShade] = useState<ShadeSummary | null>(null)
  const latitude = detail.surface.latitude ?? HCM_CENTER.latitude
  const longitude = detail.surface.longitude ?? HCM_CENTER.longitude
  const sun = sunPosition(vietnamTimeToday(sunHour), latitude, longitude)
  return (
    <>
      {/* Khung 4:3. Khung rộng từ 60rem thì cao vừa màn hình. Container query nên theo bề rộng khung, không theo màn hình */}
      <div className="relative @container">
        <div
          role="img"
          aria-label={`Mô phỏng 3D. ${summary}`}
          className="aspect-4/3 w-full overflow-hidden rounded-container border border-line bg-surface-2 @min-[60rem]:aspect-auto @min-[60rem]:h-[clamp(20rem,calc(100svh-10rem),45rem)]"
        >
          <SceneBoundary>
            <Suspense fallback={<Skeleton className="size-full rounded-none" />}>
              <SimulationScene detail={detail} view={angle} sun={sun} onShadeChange={setShade} />
            </Suspense>
          </SceneBoundary>
        </div>
        {/* Nằm ngoài khung role="img" để trình đọc màn hình vẫn dùng được thanh kéo */}
        <SunTimeSlider value={sunHour} onChange={setSunHour} sunUp={sun.elevation > 0} shade={shade} />
      </div>
      <p className="text-meta text-fg-3">
        Kéo để xoay; phóng to bằng Ctrl + lăn chuột hoặc chụm hai ngón; kéo thanh giờ để xem bóng nắng trong ngày (theo
        vị trí mặt trời thật hôm nay tại công trình). Nhà và tường chỉ để minh hoạ.
      </p>
    </>
  )
}

function EnergySection({ detail }: { detail: SimulationDetail }) {
  const { energy } = detail
  if (energy.monthly.length === 0) return null

  // Kịch bản chính (ước tính thận trọng) và kịch bản còn lại để so sánh
  const scenarios = energy.scenarios.filter((scenario) => scenario.annualEnergyKwh != null)
  const primary = scenarios.find((scenario) => scenario.mountingPlace === energy.primaryMountingPlace)
  const comparison = scenarios.find((scenario) => scenario !== primary)
  const placeName = (place: string) => SCENARIO_PLACES[place] ?? place

  return (
    <Section title="Sản lượng theo tháng (kWh)">
      <EnergyChart monthly={energy.monthly} />
      {comparison && primary && (
        <p className="text-body text-fg-2">
          Số trên là kịch bản "{placeName(primary.mountingPlace)}" (ước tính thận trọng). Nếu tấm{' '}
          {placeName(comparison.mountingPlace).toLowerCase()}:{' '}
          <span className="tnum font-medium text-fg">{formatKwh(comparison.annualEnergyKwh)} kWh/năm</span>.
        </p>
      )}
      <p className="text-meta text-fg-3">{ENERGY_DISCLAIMER}</p>
    </Section>
  )
}
