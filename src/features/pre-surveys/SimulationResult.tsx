import { Component, lazy, Suspense, useState, type ReactNode } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { Segmented, type SegmentedOption } from '@/components/common/ui/segmented'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { Skeleton } from '@/components/common/ui/states'
import { EnergyChart } from '@/features/pre-surveys/EnergyChart'
import { Facts } from '@/features/pre-surveys/Facts'
import {
  directionLabel,
  formatCoordinates,
  formatRelative,
  isInHcm,
  mapsUrl,
} from '@/features/pre-surveys/preSurveyDisplay'
import type { SceneView } from '@/features/pre-surveys/SimulationScene'
import { ORIENTATIONS, SCENARIO_PLACES } from '@/common/simulation'
import {
  CLIMATE_DISCLAIMER,
  ENERGY_DISCLAIMER,
  MONTH_NAMES,
  assumptionText,
  energyMissingText,
  formatFixed1,
  formatKwh,
  formatM2,
  formatMm,
  formatOne,
  installationSourceLabel,
  limitationText,
  mountingLabel,
  noPanelsText,
  providerFailureText,
  simulationStatusMeta,
  warningText,
} from '@/features/pre-surveys/simulationDisplay'
import { SurfacePlan } from '@/features/pre-surveys/SurfacePlan'
import type { InstallationValue, SimulationDetail } from '@/types/res/simulationsRes'

// Kết quả một lần mô phỏng (khách hàng và sales dùng chung, chỉ đọc).
// Thứ tự theo điều người xem cần trước: lắp được bao nhiêu tấm, bao nhiêu kWp, ra bao nhiêu điện,
// rồi bố trí (mặt bằng / 3D), sản lượng theo tháng, cảnh báo kỹ thuật, cuối cùng là các mục chi tiết gập lại.
// Sản lượng null thì hiện "chưa có dữ liệu", không bao giờ hiện 0 kWh.

// three.js chỉ tải khi mở góc nhìn 3D
const SimulationScene = lazy(() =>
  import('@/features/pre-surveys/SimulationScene').then((m) => ({ default: m.SimulationScene })),
)

type View = 'plan' | '3d'
const VIEWS: SegmentedOption<View>[] = [
  { value: 'plan', label: 'Mặt bằng' },
  { value: '3d', label: '3D' },
]
const ANGLES: SegmentedOption<SceneView>[] = [
  { value: 'angle', label: 'Góc nghiêng' },
  { value: 'top', label: 'Từ trên' },
  // Nhãn ngắn để 3 lựa chọn vừa một hàng trên màn 360px
  { value: 'front', label: 'Chính diện' },
]

/** Trình duyệt vẽ được 3D không (three.js bản này chỉ dùng WebGL2) */
function supportsWebGL() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}

const NO_3D = 'Không vẽ được 3D trên trình duyệt này. Mặt bằng và số liệu vẫn đúng.'

// Lỗi khi dựng 3D (hoặc tải three.js) chỉ thay khung 3D bằng thông báo, không làm sập cả trang
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <Notice tone="warn">{NO_3D}</Notice> : this.props.children
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

// Mục gập lại cho chi tiết ít người cần (khoảng cách, khí hậu, giả định)
function More({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-t border-line pt-3">
      <summary className="tap w-fit cursor-pointer text-body font-medium text-accent-fg underline-offset-4 hover:underline">
        {title}
      </summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  )
}

function installationRow(label: string, v: InstallationValue) {
  const doc = v.documentRef ? `, ${v.documentRef}${v.documentSection ? `, mục ${v.documentSection}` : ''}` : ''
  return {
    k: label,
    v: (
      <>
        <span className="tnum">{formatMm(v.valueMm)}</span>
        <span className="block text-meta font-normal text-fg-3">
          {installationSourceLabel(v)}
          {v.documentedMinimumMm != null && `, tối thiểu ${formatMm(v.documentedMinimumMm)}`}
          {doc}
        </span>
      </>
    ),
  }
}

export function SimulationResult({ detail, staleNote }: { detail: SimulationDetail; staleNote?: ReactNode }) {
  const [view, setView] = useState<View>('plan')
  const [angle, setAngle] = useState<SceneView>('angle')
  const [webgl] = useState(supportsWebGL)

  const { layout, energy, climate, installation, mounting, surface, product } = detail
  const status = simulationStatusMeta(detail.status, energy.status, climate.status)
  const rack = mounting.type === 'RACK'
  const panels = layout.details.placements.map((p) => p.footprint)
  const scenarios = energy.scenarios.filter((s) => s.annualEnergyKwh != null)
  const primary = scenarios.find((s) => s.mountingPlace === energy.primaryMountingPlace)
  const comparison = scenarios.find((s) => s !== primary)
  const climateContext = climate.status === 'SUCCEEDED' ? climate.context : null
  const located = surface.latitude != null && surface.longitude != null
  // Toạ độ ngoài TP.HCM thì khí hậu và sản lượng dưới đây tính ở nơi khác
  const outsideHcm = located && !isInHcm(surface.latitude!, surface.longitude!)
  const summary = `Lắp được ${layout.panelCount} tấm, tổng ${formatOne(layout.installedCapacityKwp)} kWp${
    energy.annualEnergyKwh != null ? `, ước tính ${formatKwh(energy.annualEnergyKwh)} kWh mỗi năm` : ''
  }.`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={status.tone}>{status.label}</Badge>
        {detail.isSelected && <Badge tone="accent">Mô phỏng chính</Badge>}
        {detail.isStale && <Badge tone="warn">Theo mặt lắp cũ</Badge>}
        <span className="text-meta text-fg-3">Chạy {formatRelative(detail.createdAt)}</span>
      </div>
      {detail.isStale && staleNote && <Notice tone="warn">{staleNote}</Notice>}

      <StatRow>
        <Stat label="Số tấm" value={layout.panelCount} unit="tấm" />
        <Stat label="Công suất lắp đặt" value={formatOne(layout.installedCapacityKwp)} unit="kWp" />
        <Stat
          label="Sản lượng năm"
          value={energy.annualEnergyKwh == null ? '—' : formatKwh(energy.annualEnergyKwh)}
          unit={energy.annualEnergyKwh == null ? undefined : 'kWh'}
          note={energy.annualEnergyKwh == null ? 'Chưa có dữ liệu' : 'Ước tính năm điển hình'}
        />
        <Stat
          label="Sản lượng riêng"
          value={energy.specificYieldKwhPerKwpYear == null ? '—' : formatKwh(energy.specificYieldKwhPerKwpYear)}
          unit={energy.specificYieldKwhPerKwpYear == null ? undefined : 'kWh/kWp'}
          note={energy.specificYieldKwhPerKwpYear == null ? undefined : 'Mỗi năm'}
        />
      </StatRow>

      {layout.panelCount === 0 && (
        <Notice tone="warn" title="Không xếp được tấm nào">
          {noPanelsText(layout.details.noPanelsReason)} Thử tấm pin nhỏ hơn, giảm khoảng lùi mép hoặc khoảng cách quanh
          vật cản.
        </Notice>
      )}
      {outsideHcm && (
        <Notice tone="warn" title="Toạ độ địa điểm nằm ngoài TP.HCM">
          Khí hậu và sản lượng dưới đây tính tại{' '}
          <span className="tnum">{formatCoordinates(surface.latitude!, surface.longitude!)}</span>, không phải công
          trình. Sửa toạ độ của địa điểm rồi chạy lại mô phỏng.
        </Notice>
      )}
      {layout.panelCount > 0 && energy.annualEnergyKwh == null && (
        <Notice tone="warn">{energyMissingText(energy)}</Notice>
      )}

      <Section title="Bố trí tấm pin">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Segmented label="Cách xem bố trí" options={VIEWS} value={view} onChange={setView} />
          {view === '3d' && webgl && (
            <Segmented label="Góc nhìn 3D" options={ANGLES} value={angle} onChange={setAngle} />
          )}
        </div>
        {view === 'plan' ? (
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
                Mép trên là mép cao của mái, mái quay về hướng {directionLabel(surface.azimuthDegree)}. Nét đứt: vùng
                lùi mép {formatMm(installation.edgeSetbackMm.valueMm)}
                {surface.obstacles.length > 0 &&
                  ` và khoảng cách quanh vật cản ${formatMm(installation.obstacleClearanceMm.valueMm)}`}
                .
              </p>
            }
          />
        ) : webgl ? (
          <>
            {/* Khung 4:3. Khung rộng từ 60rem thì cao vừa màn hình. Container query nên theo bề rộng khung, không theo màn hình */}
            <div className="@container">
              <div
                role="img"
                aria-label={`Mô phỏng 3D. ${summary}`}
                className="aspect-4/3 w-full overflow-hidden rounded-container border border-line bg-surface-2 @min-[60rem]:aspect-auto @min-[60rem]:h-[clamp(20rem,calc(100svh-10rem),45rem)]"
              >
                <SceneBoundary>
                  <Suspense fallback={<Skeleton className="size-full rounded-none" />}>
                    <SimulationScene detail={detail} view={angle} />
                  </Suspense>
                </SceneBoundary>
              </div>
            </div>
            <p className="text-meta text-fg-3">
              Kéo để xoay; phóng to bằng Ctrl + lăn chuột hoặc chụm hai ngón. Nhà và tường chỉ để minh hoạ.
            </p>
          </>
        ) : (
          <Notice tone="warn">{NO_3D}</Notice>
        )}
        <Facts
          items={[
            {
              k: 'Tấm pin',
              v: `${product.name} (${formatKwh(product.ratedPowerW)} W, ${formatKwh(product.heightMm)} × ${formatKwh(product.widthMm)} mm)`,
            },
            {
              k: 'Kiểu lắp',
              v: rack
                ? `${mountingLabel(mounting.type)} ${formatOne(mounting.panelTiltDegree)}°, quay hướng ${directionLabel(mounting.panelAzimuthDegree)}`
                : `${mountingLabel(mounting.type)} theo mái ${formatOne(surface.tiltDegree)}°, hướng ${directionLabel(surface.azimuthDegree)}`,
            },
            ...(layout.details.orientation
              ? [{ k: 'Cách đặt tấm', v: ORIENTATIONS[layout.details.orientation] ?? layout.details.orientation }]
              : []),
            { k: 'Mặt lắp', v: formatM2(layout.computedAreas.grossSurfaceAreaM2) },
            { k: 'Vật cản chiếm', v: formatM2(layout.computedAreas.obstacleOccupiedAreaM2) },
            { k: 'Vùng lắp được', v: formatM2(layout.computedAreas.installableAreaM2) },
            { k: 'Tấm pin phủ', v: formatM2(layout.computedAreas.panelCoveredAreaM2) },
          ]}
        />
      </Section>

      {energy.monthly.length > 0 && (
        <Section title="Sản lượng theo tháng (kWh)">
          <EnergyChart monthly={energy.monthly} />
          {comparison && primary && (
            <p className="text-body text-fg-2">
              Số trên là kịch bản "{SCENARIO_PLACES[primary.mountingPlace] ?? primary.mountingPlace}" (ước tính thận
              trọng). Nếu tấm {(SCENARIO_PLACES[comparison.mountingPlace] ?? comparison.mountingPlace).toLowerCase()}:{' '}
              <span className="tnum font-medium text-fg">{formatKwh(comparison.annualEnergyKwh)} kWh/năm</span>.
            </p>
          )}
          <p className="text-meta text-fg-3">{ENERGY_DISCLAIMER}</p>
        </Section>
      )}

      {detail.warnings.length > 0 && (
        <Notice tone="warn" title="Cần kỹ sư kiểm tra trước khi lắp">
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {detail.warnings.map((w) => (
              <li key={w.code}>{warningText(w)}</li>
            ))}
          </ul>
        </Notice>
      )}

      <div className="space-y-3">
        <More title="Khoảng cách lắp đặt đã dùng">
          <KeyValueList
            items={[
              installationRow('Khe giữa hai tấm', installation.panelGapMm),
              installationRow('Khoảng cách giữa hai hàng', installation.rowGapMm),
              installationRow('Lùi vào từ mép mái', installation.edgeSetbackMm),
              installationRow('Cách vật cản', installation.obstacleClearanceMm),
              ...(rack ? [installationRow('Mép thấp khung cách mái', installation.rackLowEdgeClearanceMm)] : []),
              installationRow('Độ dày tấm', installation.moduleThicknessMm),
            ]}
          />
          {installation.shadeEstimateRowGapMm != null && (
            <p className="text-meta text-fg-3">
              Khoảng cách hàng ước tính để không che nhau: {formatMm(installation.shadeEstimateRowGapMm)} (ngày hạ chí
              và đông chí, 9 giờ đến 15 giờ).
            </p>
          )}
        </More>

        <More title="Khí hậu tại địa điểm">
          {located && (
            <p className="text-body text-fg-2">
              Tại toạ độ{' '}
              <span className="tnum font-medium text-fg">
                {formatCoordinates(surface.latitude!, surface.longitude!)}
              </span>{' '}
              của địa điểm.{' '}
              <a
                className="tap ui-link font-medium"
                href={mapsUrl(surface.latitude!, surface.longitude!)}
                target="_blank"
                rel="noreferrer"
              >
                Xem trên bản đồ
                <span className="sr-only"> (mở tab mới)</span>
              </a>
            </p>
          )}
          {climateContext ? (
            <>
              <Facts
                items={[
                  { k: 'Bức xạ cả năm', v: `${formatKwh(climateContext.annualIrradiationKwhPerM2)} kWh/m²` },
                  { k: 'Nhiệt độ trung bình', v: `${formatOne(climateContext.annualMeanTemperatureC)} °C` },
                  { k: 'Lượng mưa cả năm', v: `${formatKwh(climateContext.annualPrecipitationMm)} mm` },
                ]}
              />
              <div className="scroll-x">
                <table className="w-full border-collapse text-body">
                  <thead>
                    <tr className="text-left text-meta text-fg-2">
                      <th scope="col" className="border-b border-line-2 pr-3 pb-2 font-semibold">
                        Tháng
                      </th>
                      <th scope="col" className="border-b border-line-2 px-3 pb-2 text-right font-semibold">
                        Bức xạ (kWh/m²)
                      </th>
                      <th scope="col" className="border-b border-line-2 px-3 pb-2 text-right font-semibold">
                        Nhiệt độ (°C)
                      </th>
                      <th scope="col" className="border-b border-line-2 pb-2 pl-3 text-right font-semibold">
                        Mưa (mm)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tnum">
                    {climateContext.monthly.map((m) => (
                      <tr key={m.month}>
                        <th scope="row" className="border-b border-line py-2 pr-3 text-left font-normal text-fg-2">
                          {MONTH_NAMES[m.month - 1]}
                        </th>
                        {/* Bức xạ, nhiệt độ luôn 1 chữ số lẻ để cột số thẳng hàng */}
                        <td className="border-b border-line px-3 py-2 text-right">
                          {formatFixed1(m.irradiationKwhPerM2)}
                        </td>
                        <td className="border-b border-line px-3 py-2 text-right">{formatFixed1(m.temperatureC)}</td>
                        <td className="border-b border-line py-2 pl-3 text-right">{formatKwh(m.precipitationMm)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-meta text-fg-3">
                NASA POWER, trung bình các năm {climateContext.metadata.startYear} đến {climateContext.metadata.endYear}{' '}
                tại toạ độ{' '}
                {formatCoordinates(
                  climateContext.metadata.requestedLatitude,
                  climateContext.metadata.requestedLongitude,
                )}{' '}
                (làm tròn 0.01°). {CLIMATE_DISCLAIMER}
              </p>
            </>
          ) : (
            <p className="text-body text-fg-2">
              {climate.reason === 'LOCATION_MISSING' || (surface.latitude == null && surface.longitude == null)
                ? 'Địa điểm chưa có toạ độ nên chưa có số liệu khí hậu.'
                : `Chưa lấy được số liệu khí hậu từ NASA POWER${providerFailureText(climate.failure) ? `: ${providerFailureText(climate.failure)}` : ''}.`}
            </p>
          )}
        </More>

        <More title="Giả định và giới hạn của mô phỏng">
          <ul className="list-disc space-y-1 pl-5 text-body text-fg-2">
            {energy.assumptions.map((a) => (
              <li key={a}>{assumptionText(a)}</li>
            ))}
            {detail.limitations.map((l) => (
              <li key={l}>{limitationText(l)}</li>
            ))}
          </ul>
          <p className="text-meta text-fg-3">
            Thuật toán {detail.algorithmVersion}. Tổn hao hệ thống{' '}
            {primary?.provider ? `${formatOne(primary.provider.systemLossPercent)}%` : 'mặc định'}; số liệu bức xạ PVGIS{' '}
            {primary?.provider?.yearMin && primary.provider.yearMax
              ? `các năm ${primary.provider.yearMin} đến ${primary.provider.yearMax}`
              : ''}
            .
          </p>
        </More>
      </div>
    </div>
  )
}
