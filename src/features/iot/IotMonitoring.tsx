import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DateField, Field } from '@/components/common/ui/field'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { CurrentChart } from '@/features/iot/CurrentChart'
import { connectionMeta, formatAgo, formatReadingTime, iotErrorMessage } from '@/features/iot/iotDisplay'
import {
  chartPoints,
  formatAmps,
  isStale,
  mergeHistory,
  quantityText,
  rangeError,
  vnDayEnd,
  vnDayStart,
} from '@/features/iot/iotRules'
import {
  useIotHistoryQuery,
  useLatestIotReadingQuery,
  useProjectIotDeviceQuery,
  useResetIotHistory,
} from '@/hooks/useIot'
import { isFeatureUnavailable } from '@/services/api/errors'
import type { IotViewer } from '@/services/iotService'
import type { IotMeasuredMonitoringView, IotProjectDeviceView } from '@/types/res/iotMonitoringRes'
import { cx } from '@/utils/cx'

// Số đo thực tế của thiết bị IoT gắn với một công trình, dùng chung cho khách và nhân viên (khác đường dẫn API qua `viewer`).
// Chỉ hiện số backend trả: dòng điện (A) giữ dấu; công suất, điện năng, mua / bán điện ghi "Chưa đo được", không tự tính từ dòng
// điện. Trạng thái kết nối theo backend; số đo mới nhất hỏi lại theo nhịp gửi của thiết bị khi khối đang hiện

function ConnectionBadge({ status }: { status: string | null | undefined }) {
  const meta = connectionMeta(status)
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

/** Khung "chưa gắn thiết bị" / "dịch vụ chưa sẵn sàng": không bao giờ kèm số đo dựng sẵn */
function Unavailable({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (isFeatureUnavailable(error))
    return <Notice tone="warn">Chức năng giám sát chưa được bật trên hệ thống. Liên hệ quản trị.</Notice>
  return <ErrorState title="Không tải được thiết bị đo." message={iotErrorMessage(error)} onRetry={onRetry} />
}

function LatestReading({
  viewer,
  projectId,
  device,
}: {
  viewer: IotViewer
  projectId: string
  device: IotProjectDeviceView
}) {
  const latest = useLatestIotReadingQuery(viewer, projectId, {
    active: true,
    reportIntervalSeconds: device.expectedReportIntervalSeconds,
  })
  const status = latest.data?.connectionStatus ?? device.connectionStatus
  const reading = latest.data?.reading ?? null
  const meta = connectionMeta(status)
  const stale = reading ? isStale(reading.receivedAt, device.offlineAfterSeconds) : false

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-meta text-fg-2">
            {stale || status !== 'ONLINE' ? 'Dòng điện, lần đo gần nhất' : 'Dòng điện hiện tại'}
          </p>
          {status === 'DISABLED' ? (
            <p className="text-title font-semibold text-fg-2">Không hiện khi thiết bị bị khoá</p>
          ) : reading ? (
            <p className="tnum text-display font-semibold text-fg">{formatAmps(reading.currentAmps)}</p>
          ) : (
            <p className="text-title font-semibold text-fg-2">Chưa có số đo</p>
          )}
          {reading && status !== 'DISABLED' && (
            <p className="tnum text-meta text-fg-2">
              Đo lúc {formatReadingTime(reading.receivedAt)}
              {formatAgo(reading.receivedAt) && ` (${formatAgo(reading.receivedAt)})`}
            </p>
          )}
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <ConnectionBadge status={status} />
          <Button
            size="sm"
            variant="secondary"
            icon="refresh"
            disabled={latest.isFetching}
            onClick={() => void latest.refetch()}
          >
            {latest.isFetching ? 'Đang tải…' : 'Tải lại'}
          </Button>
        </div>
      </div>
      {meta.hint && status !== 'ONLINE' && <p className="text-meta text-fg-2">{meta.hint}</p>}
      {latest.isError && (
        <Notice tone="warn">
          {iotErrorMessage(latest.error)} Số đo không tự cập nhật nữa; bấm Tải lại khi muốn xem tiếp.
        </Notice>
      )}
    </div>
  )
}

function DeviceFacts({ device }: { device: IotProjectDeviceView }) {
  return (
    <KeyValueList
      columns={2}
      items={[
        { k: 'Thiết bị', v: `${device.displayName} (${device.deviceId})` },
        { k: 'Cảm biến', v: `${device.sensorModel ?? 'Không ghi'}, dải đo ${formatAmps(device.maxCurrentAmps)}` },
        { k: 'Gắn lúc', v: formatReadingTime(device.boundAt) },
        { k: 'Nhận số đo gần nhất', v: device.lastReadingAt ? formatReadingTime(device.lastReadingAt) : 'Chưa có' },
        { k: 'Chu kỳ gửi', v: `${device.expectedReportIntervalSeconds} giây / lần` },
        { k: 'Báo mất kết nối sau', v: `${device.offlineAfterSeconds} giây không có số đo` },
      ]}
    />
  )
}

/** Các đại lượng của khối `measured`: chỉ dòng điện đo được ở bản phần cứng hiện tại */
function MeasuredQuantities({ measured }: { measured: IotMeasuredMonitoringView }) {
  return (
    <KeyValueList
      columns={2}
      items={[
        { k: 'Dòng điện', v: quantityText(measured.currentAmps) },
        { k: 'Công suất', v: quantityText(measured.powerWatts) },
        { k: 'Điện năng tạo ra', v: quantityText(measured.energyProducedKwh) },
        { k: 'Điện mua từ lưới', v: quantityText(measured.energyImportedKwh) },
        { k: 'Điện bán lên lưới', v: quantityText(measured.energyExportedKwh) },
      ]}
    />
  )
}

function History({
  viewer,
  projectId,
  reportIntervalSeconds,
}: {
  viewer: IotViewer
  projectId: string
  reportIntervalSeconds?: number | null
}) {
  const [draft, setDraft] = useState({ from: '', to: '' })
  const [range, setRange] = useState({ from: '', to: '' })
  const [asTable, setAsTable] = useState(false)
  const query = useIotHistoryQuery(viewer, projectId, { from: vnDayStart(range.from), to: vnDayEnd(range.to) })
  const reset = useResetIotHistory(viewer, projectId)
  const readings = mergeHistory(query.data?.pages ?? [])
  const points = chartPoints(readings)
  const draftError = rangeError(draft.from, draft.to)

  return (
    <section aria-label="Lịch sử số đo" className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Từ ngày" htmlFor={`iot-from-${viewer}`} error={draftError ?? undefined}>
          <DateField
            id={`iot-from-${viewer}`}
            value={draft.from}
            onChange={(from) => setDraft((d) => ({ ...d, from }))}
          />
        </Field>
        <Field label="Đến ngày" htmlFor={`iot-to-${viewer}`}>
          <DateField id={`iot-to-${viewer}`} value={draft.to} onChange={(to) => setDraft((d) => ({ ...d, to }))} />
        </Field>
        <Button variant="info" icon="filter_alt" disabled={Boolean(draftError)} onClick={() => setRange(draft)}>
          Xem
        </Button>
        {(range.from || range.to) && (
          <Button
            variant="ghost"
            bleed={false}
            icon="filter_alt_off"
            onClick={() => {
              setDraft({ from: '', to: '' })
              setRange({ from: '', to: '' })
            }}
          >
            Bỏ lọc ngày
          </Button>
        )}
        <Button variant="secondary" icon="refresh" disabled={query.isFetching} onClick={() => void reset()}>
          Làm mới
        </Button>
      </div>

      {query.isPending ? (
        <Skeleton className="h-56" />
      ) : query.isError && readings.length === 0 ? (
        <ErrorState
          title="Không tải được lịch sử số đo."
          message={iotErrorMessage(query.error)}
          onRetry={() => void reset()}
        />
      ) : readings.length === 0 ? (
        <p className="text-body text-fg-2">
          {range.from || range.to ? 'Không có số đo nào trong khoảng ngày này.' : 'Công trình chưa có số đo nào.'}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="tnum text-meta text-fg-2">
              {readings.length.toLocaleString('vi-VN')} số đo, mới nhất {formatReadingTime(readings[0]!.receivedAt)}
            </p>
            <Button
              size="sm"
              variant="ghost"
              bleed={false}
              icon={asTable ? 'show_chart' : 'table'}
              onClick={() => setAsTable((v) => !v)}
            >
              {asTable ? 'Xem biểu đồ' : 'Xem bảng'}
            </Button>
          </div>
          {asTable ? (
            <div className="max-h-96 overflow-y-auto">
              <Table stack>
                <thead>
                  <tr>
                    <Th>Thời điểm nhận</Th>
                    <Th className="text-right">Dòng điện</Th>
                    <Th>Thiết bị</Th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r) => (
                    <Tr key={r.readingId}>
                      <Td label="Thời điểm nhận" className="tnum">
                        {formatReadingTime(r.receivedAt)}
                      </Td>
                      <Td label="Dòng điện" className="tnum lg:text-right">
                        {formatAmps(r.currentAmps)}
                      </Td>
                      <Td label="Thiết bị" className="tnum">
                        {r.deviceId}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <CurrentChart points={points} reportIntervalSeconds={reportIntervalSeconds} />
          )}
          {query.isError && <Notice tone="warn">{iotErrorMessage(query.error)}</Notice>}
          {query.hasNextPage && (
            <Button
              variant="secondary"
              icon="history"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage ? 'Đang tải…' : 'Tải số đo cũ hơn'}
            </Button>
          )}
        </>
      )}
    </section>
  )
}

/**
 * Khối số đo của một công trình. `measured`: khối `measured` của energy-monitoring nếu nơi gọi đã tải (để hiện các đại lượng chưa
 * đo được); không có thì bỏ phần đó
 */
export function IotMonitoring({
  viewer,
  projectId,
  measured,
  className,
}: {
  viewer: IotViewer
  projectId: string
  measured?: IotMeasuredMonitoringView | null
  className?: string
}) {
  const device = useProjectIotDeviceQuery(viewer, projectId)

  return (
    <div className={cx('space-y-6', className)}>
      {device.isPending ? (
        <Skeleton className="h-28" />
      ) : device.isError ? (
        <Unavailable error={device.error} onRetry={() => void device.refetch()} />
      ) : device.data === null ? (
        <p className="text-body text-fg-2">
          {viewer === 'customer'
            ? 'Công trình chưa gắn thiết bị đo. Khi Smart Solar lắp thiết bị, dòng điện đo được sẽ hiện ở đây.'
            : 'Công trình chưa gắn thiết bị đo.'}
        </p>
      ) : (
        <>
          <LatestReading viewer={viewer} projectId={projectId} device={device.data} />
          <DeviceFacts device={device.data} />
          {measured && (
            <div className="space-y-2">
              <MeasuredQuantities measured={measured} />
              <p className="text-meta text-fg-2">
                Thiết bị hiện chỉ đo dòng điện (A). Công suất, điện năng và điện mua / bán với lưới chưa đo được nên
                không hiện số.
              </p>
            </div>
          )}
        </>
      )}
      {/* Lịch sử vẫn xem được khi đã tháo thiết bị: số đo cũ của công trình không mất */}
      {!device.isPending && !(device.isError && isFeatureUnavailable(device.error)) && (
        <History
          viewer={viewer}
          projectId={projectId}
          reportIntervalSeconds={device.data?.expectedReportIntervalSeconds}
        />
      )}
    </div>
  )
}
