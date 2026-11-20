import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { IOT_DEVICE_STATUS_FILTERS, IOT_LIMITS } from '@/common/iot'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { SearchInput, Select } from '@/components/common/ui/field'
import { FilterBar } from '@/components/common/ui/filter-bar'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Pagination } from '@/components/common/ui/pagination'
import { EmptyState, ErrorState, Skeleton, UnavailableState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import { DeviceKeyDialog, type DeviceKey } from '@/features/iot/DeviceKeyDialog'
import { RegisterDeviceDialog } from '@/features/iot/RegisterDeviceDialog'
import {
  connectionMeta,
  deviceStatusMeta,
  formatAgo,
  formatReadingTime,
  iotErrorMessage,
} from '@/features/iot/iotDisplay'
import { formatAmps } from '@/features/iot/iotRules'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  useDisableIotDeviceMutation,
  useEnableIotDeviceMutation,
  useIotDeviceQuery,
  useIotDevicesQuery,
  useRotateIotKeyMutation,
} from '@/hooks/useIot'
import { ROUTES, withId } from '@/routes/paths'
import { isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import type { IotDeviceCredentialView, IotDeviceView } from '@/types/res/iotMonitoringRes'
import { cx } from '@/utils/cx'

// Sổ thiết bị IoT (chỉ quản trị): tìm, lọc, phân trang phía server; đăng ký (khoá hiện một lần), xem chi tiết, khoá / mở khoá,
// đổi khoá. Không có cách nào xem lại khoá cũ: mất khoá thì đổi khoá. Mỗi lệnh ghi gửi revision đang xem; 409 thì tải lại

const PAGE_SIZE = 20

const toKey = (c: IotDeviceCredentialView, rotated: boolean): DeviceKey => ({
  deviceId: c.device.deviceId,
  secret: c.secret,
  secretVersion: c.secretVersion,
  rotated,
})

function DeviceDetailDialog({
  id,
  onClose,
  onKey,
}: {
  id: string
  onClose: () => void
  onKey: (key: DeviceKey) => void
}) {
  const query = useIotDeviceQuery(id)
  const disable = useDisableIotDeviceMutation()
  const enable = useEnableIotDeviceMutation()
  const rotate = useRotateIotKeyMutation()
  const [disabling, setDisabling] = useState(false)
  const [confirm, setConfirm] = useState<'enable' | 'rotate' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const d = query.data
  const busy = enable.isPending || rotate.isPending

  async function runConfirm(device: IotDeviceView) {
    setError(null)
    try {
      if (confirm === 'enable') {
        await enable.mutateAsync({ id: device.id, revision: device.revision })
        toast.success(`Đã mở khoá thiết bị ${device.deviceId}.`)
      } else {
        const credential = await rotate.mutateAsync({ id: device.id, revision: device.revision })
        rotate.reset()
        onKey(toKey(credential, true))
      }
      setConfirm(null)
    } catch (e) {
      setError(iotErrorMessage(e))
      void query.refetch()
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      className="max-w-2xl"
      aria-label="Thiết bị IoT"
    >
      <DialogTitle>{d ? `${d.deviceId}, ${d.displayName}` : 'Thiết bị IoT'}</DialogTitle>
      <div className="mt-4 space-y-4">
        {query.isPending ? (
          <Skeleton className="h-48" />
        ) : !d ? (
          <ErrorState
            title="Không tải được thiết bị."
            message={iotErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            <KeyValueList
              columns={2}
              items={[
                {
                  k: 'Trạng thái',
                  v: <Badge tone={deviceStatusMeta(d.status).tone}>{deviceStatusMeta(d.status).label}</Badge>,
                },
                {
                  k: 'Kết nối',
                  v: (
                    <Badge tone={connectionMeta(d.connectionStatus).tone}>
                      {connectionMeta(d.connectionStatus).label}
                    </Badge>
                  ),
                },
                { k: 'Cảm biến', v: d.sensorModel ?? 'Không ghi' },
                { k: 'Dải đo', v: formatAmps(d.maxCurrentAmps) },
                { k: 'Nhận số đo gần nhất', v: d.lastSeenAt ? formatReadingTime(d.lastSeenAt) : 'Chưa có' },
                { k: 'Phiên bản khoá', v: `${d.secretVersion}, đổi lúc ${formatReadingTime(d.secretRotatedAt)}` },
                {
                  k: 'Công trình đang gắn',
                  v: d.currentBinding ? (
                    <Link className="ui-link tnum" to={withId(ROUTES.admin.installation, d.currentBinding.projectId)}>
                      Dự án {shortCode(d.currentBinding.projectId)}
                    </Link>
                  ) : (
                    'Chưa gắn'
                  ),
                },
                { k: 'Đăng ký lúc', v: formatReadingTime(d.createdAt) },
              ]}
            />
            {d.status === 'DISABLED' && (
              <Notice tone="warn" title={`Khoá lúc ${formatReadingTime(d.disabledAt)}`}>
                {d.disabledReason ?? 'Không ghi lý do.'}
              </Notice>
            )}
            {confirm && (
              <Notice tone="warn" title={confirm === 'rotate' ? 'Đổi khoá thiết bị?' : 'Mở khoá thiết bị?'}>
                {confirm === 'rotate'
                  ? 'Khoá cũ mất hiệu lực ngay: thiết bị đang chạy sẽ bị từ chối cho tới khi nạp khoá mới vào firmware. Khoá mới chỉ hiện một lần.'
                  : 'Thiết bị gửi được số đo trở lại và khách thấy lại số đo hiện tại.'}
                <span className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" icon="close" disabled={busy} onClick={() => setConfirm(null)}>
                    Thôi
                  </Button>
                  <Button
                    size="sm"
                    variant={confirm === 'rotate' ? 'warn' : 'soft'}
                    icon={confirm === 'rotate' ? 'key' : 'lock_open'}
                    disabled={busy}
                    onClick={() => void runConfirm(d)}
                  >
                    {busy ? 'Đang gửi…' : confirm === 'rotate' ? 'Đổi khoá' : 'Mở khoá'}
                  </Button>
                </span>
              </Notice>
            )}
            {error && (
              <div role="alert">
                <Notice tone="danger">{error}</Notice>
              </div>
            )}
          </>
        )}
      </div>
      <DialogFooter className="flex-wrap">
        <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
          Đóng
        </Button>
        {d && !confirm && (
          <>
            <Button icon="key" variant="warn" disabled={busy} onClick={() => setConfirm('rotate')}>
              Đổi khoá
            </Button>
            {d.status === 'DISABLED' ? (
              <Button icon="lock_open" variant="soft" disabled={busy} onClick={() => setConfirm('enable')}>
                Mở khoá
              </Button>
            ) : (
              <Button icon="block" variant="danger" disabled={busy} onClick={() => setDisabling(true)}>
                Khoá thiết bị
              </Button>
            )}
          </>
        )}
      </DialogFooter>
      {d && (
        <ReasonDialog
          open={disabling}
          title={`Khoá thiết bị ${d.deviceId}?`}
          description="Thiết bị bị từ chối khi gửi số đo, khách không thấy số đo hiện tại. Lịch sử số đo vẫn giữ. Mở khoá lại được."
          label="Lý do khoá"
          maxLength={IOT_LIMITS.reasonMax}
          submitLabel="Khoá thiết bị"
          variant="danger"
          icon="block"
          onSubmit={async (reason) => {
            try {
              await disable.mutateAsync({ id: d.id, body: { reason, expectedRevision: d.revision } })
            } catch (e) {
              void query.refetch()
              throw new Error(iotErrorMessage(e))
            }
            toast.success(`Đã khoá thiết bị ${d.deviceId}.`)
          }}
          onClose={() => setDisabling(false)}
        />
      )}
    </ModalDialog>
  )
}

export function AdminIotDevicesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [registering, setRegistering] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  // Khoá vừa cấp: chỉ nằm ở đây tới khi hộp thoại khoá đóng
  const [key, setKey] = useState<DeviceKey | null>(null)
  const debounced = useDebouncedValue(search.trim())
  const query = useIotDevicesQuery({ status, search: debounced, page, pageSize: PAGE_SIZE })
  const devices = query.data?.items ?? []
  const total = query.data?.totalItems ?? 0
  const pages = query.data?.totalPages ?? 0
  const filtering = search.trim() !== '' || status !== ''
  const from = (page - 1) * PAGE_SIZE + 1

  if (query.data === undefined && isFeatureUnavailable(query.error))
    return (
      <UnavailableState
        title="Chức năng thiết bị IoT chưa sẵn sàng."
        message="Hệ thống chưa bật giám sát IoT. Thử lại sau."
        pendingMigrations={pendingMigrationsOf(query.error)}
      />
    )

  return (
    <>
      <PageHeader
        title="Thiết bị IoT"
        actions={
          <Button variant="primary" icon="add" onClick={() => setRegistering(true)}>
            Đăng ký thiết bị
          </Button>
        }
      />

      <FilterBar>
        <label className="min-w-0 flex-1 basis-64">
          <span className="sr-only">Tìm thiết bị</span>
          <SearchInput
            placeholder="Tìm mã hoặc tên thiết bị"
            maxLength={100}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </label>
        <label className="w-full sm:w-44">
          <span className="sr-only">Trạng thái</span>
          <Select
            active={status !== ''}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            {IOT_DEVICE_STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
        <Button variant="secondary" icon="refresh" disabled={query.isFetching} onClick={() => void query.refetch()}>
          {query.isFetching ? 'Đang tải…' : 'Tải lại'}
        </Button>
      </FilterBar>

      <section aria-label="Danh sách thiết bị" aria-live="polite" aria-busy={query.isFetching}>
        {query.isError && !query.data ? (
          <ErrorState message={iotErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : query.isPending ? (
          <div aria-label="Đang tải" className="space-y-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : devices.length === 0 ? (
          <EmptyState
            title={filtering ? 'Không có thiết bị nào khớp bộ lọc' : 'Chưa có thiết bị nào'}
            description={filtering ? undefined : 'Đăng ký thiết bị bằng đúng mã nạp trong firmware ESP32.'}
          />
        ) : (
          <div className={cx(query.isPlaceholderData && 'opacity-70')}>
            <Table stack="xl">
              <thead>
                <tr>
                  <Th>Thiết bị</Th>
                  <Th>Cảm biến</Th>
                  <Th>Trạng thái</Th>
                  <Th>Kết nối</Th>
                  <Th>Công trình</Th>
                  <Th>Số đo gần nhất</Th>
                  <Th className="text-right">Khoá</Th>
                  <Th>
                    <span className="sr-only">Thao tác</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => {
                  const st = deviceStatusMeta(d.status)
                  const conn = connectionMeta(d.connectionStatus)
                  return (
                    <Tr key={d.id}>
                      <Td label="Thiết bị">
                        <p className="tnum font-medium text-fg">{d.deviceId}</p>
                        <p className="text-meta text-fg-2">{d.displayName}</p>
                      </Td>
                      <Td label="Cảm biến">
                        <p>{d.sensorModel ?? 'Không ghi'}</p>
                        <p className="tnum text-meta text-fg-2">Dải đo {formatAmps(d.maxCurrentAmps)}</p>
                      </Td>
                      <Td label="Trạng thái">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </Td>
                      <Td label="Kết nối">
                        <Badge tone={conn.tone}>{conn.label}</Badge>
                      </Td>
                      <Td label="Công trình" className="tnum">
                        {d.currentBinding ? `Dự án ${shortCode(d.currentBinding.projectId)}` : 'Chưa gắn'}
                      </Td>
                      <Td label="Số đo gần nhất" className="tnum whitespace-nowrap">
                        {d.lastSeenAt ? (
                          <time title={formatReadingTime(d.lastSeenAt)}>{formatAgo(d.lastSeenAt)}</time>
                        ) : (
                          <span className="text-fg-3">Chưa có</span>
                        )}
                      </Td>
                      <Td label="Khoá" className="tnum xl:text-right">
                        Phiên bản {d.secretVersion}
                      </Td>
                      <Td>
                        <div className="flex xl:justify-end">
                          <Button size="sm" variant="info" icon="visibility" onClick={() => setOpenId(d.id)}>
                            Chi tiết
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
          </div>
        )}
      </section>

      {devices.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="tnum text-meta text-fg-2">
            Hiển thị {from}–{from + devices.length - 1} trên {total} thiết bị
          </p>
          {pages > 1 && <Pagination page={page} pages={pages} onChange={setPage} />}
        </div>
      )}

      {registering && (
        <RegisterDeviceDialog
          onClose={() => setRegistering(false)}
          onRegistered={(credential) => {
            setRegistering(false)
            setKey(toKey(credential, false))
          }}
        />
      )}
      {openId && !key && <DeviceDetailDialog id={openId} onClose={() => setOpenId(null)} onKey={setKey} />}
      {key && <DeviceKeyDialog value={key} onClose={() => setKey(null)} />}
    </>
  )
}
