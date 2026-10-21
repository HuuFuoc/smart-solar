import type { ReactNode } from 'react'
import { KeyValueList, type KV } from '@/components/common/ui/lists'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatCoordinates, mapsUrl } from '@/features/pre-surveys/preSurveyDisplay'
import {
  CLIMATE_DISCLAIMER,
  MONTH_NAMES,
  assumptionText,
  formatFixed1,
  formatKwh,
  formatMm,
  formatOne,
  installationSourceLabel,
  limitationText,
  providerFailureText,
} from '@/features/pre-surveys/simulationDisplay'
import type { ClimateContext, InstallationValue, SimulationDetail } from '@/types/res/simulationsRes'

// Ba mục gập ở cuối kết quả mô phỏng, cho người cần xem chi tiết:
// khoảng cách lắp đặt đã dùng, khí hậu tại địa điểm, giả định và giới hạn của mô phỏng.

type Location = { latitude: number; longitude: number }

/** Mục gập lại, bấm tiêu đề để mở */
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

export function SimulationDetails({ detail, location }: { detail: SimulationDetail; location: Location | null }) {
  return (
    <div className="space-y-3">
      <InstallationDetails detail={detail} />
      <ClimateDetails detail={detail} location={location} />
      <AssumptionDetails detail={detail} />
    </div>
  )
}

/** Tài liệu ghi nguồn của một khoảng cách, ví dụ ", Datasheet X, mục 4.2" */
function documentText(value: InstallationValue) {
  if (!value.documentRef) return ''
  if (!value.documentSection) return `, ${value.documentRef}`
  return `, ${value.documentRef}, mục ${value.documentSection}`
}

/** Một dòng khoảng cách: giá trị (mm) và nguồn của giá trị đó */
function installationRow(label: string, value: InstallationValue): KV {
  return {
    k: label,
    v: (
      <>
        <span className="tnum">{formatMm(value.valueMm)}</span>
        <span className="block text-meta font-normal text-fg-3">
          {installationSourceLabel(value)}
          {value.documentedMinimumMm != null && `, tối thiểu ${formatMm(value.documentedMinimumMm)}`}
          {documentText(value)}
        </span>
      </>
    ),
  }
}

function InstallationDetails({ detail }: { detail: SimulationDetail }) {
  const { installation, mounting } = detail
  const rows = [
    installationRow('Khe giữa hai tấm', installation.panelGapMm),
    installationRow('Khoảng cách giữa hai hàng', installation.rowGapMm),
    installationRow('Lùi vào từ mép mái', installation.edgeSetbackMm),
    installationRow('Cách vật cản', installation.obstacleClearanceMm),
  ]
  if (mounting.type === 'RACK') {
    rows.push(installationRow('Mép thấp khung cách mái', installation.rackLowEdgeClearanceMm))
  }
  rows.push(installationRow('Độ dày tấm', installation.moduleThicknessMm))

  return (
    <More title="Khoảng cách lắp đặt đã dùng">
      <KeyValueList items={rows} />
      {installation.shadeEstimateRowGapMm != null && (
        <p className="text-meta text-fg-3">
          Khoảng cách hàng ước tính để không che nhau: {formatMm(installation.shadeEstimateRowGapMm)} (ngày hạ chí và
          đông chí, 9 giờ đến 15 giờ).
        </p>
      )}
    </More>
  )
}

/** Câu giải thích khi chưa có số liệu khí hậu */
function climateMissingText(detail: SimulationDetail) {
  const { climate, surface } = detail
  const noLocation = surface.latitude == null && surface.longitude == null
  if (climate.reason === 'LOCATION_MISSING' || noLocation) return 'Địa điểm chưa có toạ độ nên chưa có số liệu khí hậu.'
  const failure = providerFailureText(climate.failure)
  if (failure) return `Chưa lấy được số liệu khí hậu từ NASA POWER: ${failure}.`
  return 'Chưa lấy được số liệu khí hậu từ NASA POWER.'
}

function ClimateDetails({ detail, location }: { detail: SimulationDetail; location: Location | null }) {
  const climateContext = detail.climate.status === 'SUCCEEDED' ? detail.climate.context : null
  return (
    <More title="Khí hậu tại địa điểm">
      {location && (
        <p className="text-body text-fg-2">
          Tại toạ độ{' '}
          <span className="tnum font-medium text-fg">{formatCoordinates(location.latitude, location.longitude)}</span>{' '}
          của địa điểm.{' '}
          <a
            className="tap ui-link font-medium"
            href={mapsUrl(location.latitude, location.longitude)}
            target="_blank"
            rel="noreferrer"
          >
            Xem trên bản đồ
            <span className="sr-only"> (mở tab mới)</span>
          </a>
        </p>
      )}
      {climateContext ? (
        <ClimateNumbers context={climateContext} />
      ) : (
        <p className="text-body text-fg-2">{climateMissingText(detail)}</p>
      )}
    </More>
  )
}

function ClimateNumbers({ context }: { context: ClimateContext }) {
  const { metadata } = context
  return (
    <>
      <Facts
        items={[
          { k: 'Bức xạ cả năm', v: `${formatKwh(context.annualIrradiationKwhPerM2)} kWh/m²` },
          { k: 'Nhiệt độ trung bình', v: `${formatOne(context.annualMeanTemperatureC)} °C` },
          { k: 'Lượng mưa cả năm', v: `${formatKwh(context.annualPrecipitationMm)} mm` },
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
          {/* Cột số căn thẳng: bức xạ, nhiệt độ luôn 1 chữ số lẻ, lượng mưa làm tròn mm */}
          <tbody className="tnum">
            {context.monthly.map((month) => (
              <tr key={month.month}>
                <th scope="row" className="border-b border-line py-2 pr-3 text-left font-normal text-fg-2">
                  {MONTH_NAMES[month.month - 1]}
                </th>
                <td className="border-b border-line px-3 py-2 text-right">{formatFixed1(month.irradiationKwhPerM2)}</td>
                <td className="border-b border-line px-3 py-2 text-right">{formatFixed1(month.temperatureC)}</td>
                <td className="border-b border-line py-2 pl-3 text-right">{formatKwh(month.precipitationMm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-meta text-fg-3">
        NASA POWER, trung bình các năm {metadata.startYear} đến {metadata.endYear} tại toạ độ{' '}
        {formatCoordinates(metadata.requestedLatitude, metadata.requestedLongitude)} (làm tròn 0.01°).{' '}
        {CLIMATE_DISCLAIMER}
      </p>
    </>
  )
}

function AssumptionDetails({ detail }: { detail: SimulationDetail }) {
  const { energy } = detail
  // Kịch bản sản lượng chính (có số liệu) dùng để ghi tổn hao và năm số liệu
  const primary = energy.scenarios.find(
    (scenario) => scenario.annualEnergyKwh != null && scenario.mountingPlace === energy.primaryMountingPlace,
  )
  const provider = primary?.provider
  const systemLoss = provider ? `${formatOne(provider.systemLossPercent)}%` : 'mặc định'
  let source = 'số liệu bức xạ PVGIS'
  if (provider?.yearMin && provider.yearMax) source += ` các năm ${provider.yearMin} đến ${provider.yearMax}`

  return (
    <More title="Giả định và giới hạn của mô phỏng">
      <ul className="list-disc space-y-1 pl-5 text-body text-fg-2">
        {energy.assumptions.map((assumption) => (
          <li key={assumption}>{assumptionText(assumption)}</li>
        ))}
        {detail.limitations.map((limitation) => (
          <li key={limitation}>{limitationText(limitation)}</li>
        ))}
      </ul>
      <p className="text-meta text-fg-3">
        Thuật toán {detail.algorithmVersion}. Tổn hao hệ thống {systemLoss}; {source}.
      </p>
    </More>
  )
}
