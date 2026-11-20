import { useState } from 'react'
import { toast } from 'sonner'
import { IOT_LIMITS } from '@/common/iot'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Input, Textarea, fieldMessageId } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { useAuth } from '@/context/AuthProvider'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import { IotMonitoring } from '@/features/iot/IotMonitoring'
import { bindingStatusMeta, formatReadingTime, iotErrorMessage } from '@/features/iot/iotDisplay'
import { bindConflict, deviceIdError, isBindableProject, noteError, normalizeDeviceId } from '@/features/iot/iotRules'
import {
  useBindIotDeviceMutation,
  useIotBindingsQuery,
  useIotDevicesQuery,
  useReleaseIotBindingMutation,
} from '@/hooks/useIot'
import { isApiError } from '@/services/api/errors'
import type { IotBindingView } from '@/types/res/iotMonitoringRes'

// Thiết bị IoT của một dự án thi công (quản lý và quản trị): gắn theo mã firmware, thay thiết bị (chỉ sau khi người dùng xác nhận,
// không tự thay khi backend báo công trình đã có thiết bị), tháo (lý do bắt buộc), lịch sử gắn / tháo và số đo. Khách, kỹ thuật
// viên, kinh doanh không thấy khối này

function BindDialog({
  projectId,
  current,
  onClose,
}: {
  projectId: string
  current: IotBindingView | null
  onClose: () => void
}) {
  const isAdmin = useAuth().user?.role === 'admin'
  // Gợi ý thiết bị chưa gắn chỉ có với quản trị (sổ thiết bị là API của quản trị)
  const devices = useIotDevicesQuery(
    { status: 'ACTIVE', search: '', page: 1, pageSize: IOT_LIMITS.devicePageSizeMax },
    { enabled: isAdmin },
  )
  const free = isAdmin ? (devices.data?.items ?? []).filter((d) => d.connectionStatus === 'UNASSIGNED') : []
  const bind = useBindIotDeviceMutation(projectId)
  const [deviceId, setDeviceId] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<{ deviceId?: string; note?: string }>({})
  const [error, setError] = useState<string | null>(null)
  // Công trình đã có thiết bị khác: hỏi lại người dùng rồi mới gửi replaceCurrent
  const [confirmReplace, setConfirmReplace] = useState(Boolean(current))

  async function submit(replaceCurrent: boolean) {
    setError(null)
    const next = { deviceId: deviceIdError(deviceId) ?? undefined, note: noteError(note) ?? undefined }
    setErrors(next)
    if (next.deviceId || next.note) return
    if (current && normalizeDeviceId(current.deviceId) === normalizeDeviceId(deviceId)) {
      setError('Thiết bị này đang gắn với công trình rồi.')
      return
    }
    try {
      const binding = await bind.mutateAsync({ deviceId: deviceId.trim(), note: note.trim() || null, replaceCurrent })
      toast.success(
        replaceCurrent
          ? `Đã thay bằng thiết bị ${binding.deviceId}. Thiết bị cũ đã được tháo, lịch sử số đo vẫn giữ.`
          : `Đã gắn thiết bị ${binding.deviceId}.`,
      )
      onClose()
    } catch (e) {
      const conflict = isApiError(e) ? bindConflict(e.code) : null
      if (conflict === 'replace' && !replaceCurrent) {
        setConfirmReplace(true)
        setError('Công trình vừa có thiết bị khác được gắn. Xem lại rồi xác nhận thay nếu đúng.')
        return
      }
      setError(iotErrorMessage(e))
    }
  }

  const busy = bind.isPending
  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      dismissible={!busy}
      className="max-w-xl"
      aria-label={current ? 'Thay thiết bị đo' : 'Gắn thiết bị đo'}
    >
      <DialogTitle>{current ? 'Thay thiết bị đo' : 'Gắn thiết bị đo'}</DialogTitle>
      <div className="mt-4 space-y-4">
        {confirmReplace && current && (
          <Notice tone="warn" title={`Công trình đang gắn thiết bị ${current.deviceId}`}>
            Thay thì thiết bị {current.deviceId} ({current.deviceDisplayName}) bị tháo khỏi công trình này. Số đo cũ vẫn
            giữ trong lịch sử của công trình.
          </Notice>
        )}
        <Field
          label="Mã thiết bị"
          htmlFor="iot-bind-device"
          required
          error={errors.deviceId}
          hint="Đúng mã nạp trong firmware, ví dụ ESP32-001. Thiết bị đang gắn ở công trình khác phải được tháo ở đó trước."
        >
          <Input
            id="iot-bind-device"
            value={deviceId}
            maxLength={IOT_LIMITS.deviceIdMax}
            autoComplete="off"
            spellCheck={false}
            list={free.length > 0 ? 'iot-free-devices' : undefined}
            aria-invalid={Boolean(errors.deviceId) || undefined}
            aria-describedby={fieldMessageId('iot-bind-device')}
            onChange={(e) => setDeviceId(e.target.value)}
          />
          {free.length > 0 && (
            <datalist id="iot-free-devices">
              {free.map((d) => (
                <option key={d.id} value={d.deviceId}>
                  {d.displayName}
                </option>
              ))}
            </datalist>
          )}
        </Field>
        <Field label="Ghi chú" htmlFor="iot-bind-note" optional error={errors.note}>
          <Textarea
            id="iot-bind-note"
            rows={2}
            maxLength={IOT_LIMITS.noteMax}
            value={note}
            placeholder="Ví dụ: Kẹp dòng đầu ra AC của inverter."
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
          Đóng
        </Button>
        {confirmReplace ? (
          <Button icon="swap_horiz" variant="warn" disabled={busy} onClick={() => void submit(true)}>
            {busy ? 'Đang thay…' : 'Xác nhận thay thiết bị'}
          </Button>
        ) : (
          <Button icon="link" variant="primary" disabled={busy} onClick={() => void submit(false)}>
            {busy ? 'Đang gắn…' : 'Gắn thiết bị'}
          </Button>
        )}
      </DialogFooter>
    </ModalDialog>
  )
}

function BindingHistory({ bindings }: { bindings: IotBindingView[] }) {
  if (bindings.length === 0) return <p className="text-body text-fg-2">Công trình chưa từng gắn thiết bị đo.</p>
  return (
    <Table stack>
      <thead>
        <tr>
          <Th>Thiết bị</Th>
          <Th>Trạng thái</Th>
          <Th>Gắn lúc</Th>
          <Th>Tháo lúc</Th>
        </tr>
      </thead>
      <tbody>
        {bindings.map((b) => {
          const status = bindingStatusMeta(b.status)
          return (
            <Tr key={b.bindingId}>
              <Td label="Thiết bị">
                <p className="tnum font-medium text-fg">{b.deviceId}</p>
                <p className="text-meta text-fg-2">{b.deviceDisplayName}</p>
                {b.note && <p className="text-meta text-fg-2">Ghi chú: {b.note}</p>}
              </Td>
              <Td label="Trạng thái">
                <Badge tone={status.tone}>{status.label}</Badge>
              </Td>
              <Td label="Gắn lúc" className="tnum">
                {formatReadingTime(b.boundAt)}
              </Td>
              <Td label="Tháo lúc">
                {b.releasedAt ? (
                  <>
                    <p className="tnum">{formatReadingTime(b.releasedAt)}</p>
                    {b.releaseReason && <p className="text-meta text-fg-2">Lý do: {b.releaseReason}</p>}
                  </>
                ) : (
                  <span className="text-fg-3">—</span>
                )}
              </Td>
            </Tr>
          )
        })}
      </tbody>
    </Table>
  )
}

export function StaffIotPanel({ projectId, projectStatus }: { projectId: string; projectStatus: string }) {
  const bindings = useIotBindingsQuery(projectId)
  const release = useReleaseIotBindingMutation(projectId)
  const [binding, setBinding] = useState(false)
  const [releasing, setReleasing] = useState<IotBindingView | null>(null)
  const list = bindings.data ?? []
  const active = list.find((b) => b.status === 'ACTIVE') ?? null
  const bindable = isBindableProject(projectStatus)

  return (
    <Panel id="iot-device" className="scroll-mt-6">
      <PanelHeader
        title="Thiết bị IoT"
        description={active ? `${active.deviceId}, ${active.deviceDisplayName}` : undefined}
        action={
          bindings.data &&
          bindable && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="soft" icon={active ? 'swap_horiz' : 'link'} onClick={() => setBinding(true)}>
                {active ? 'Thay thiết bị' : 'Gắn thiết bị'}
              </Button>
              {active && (
                <Button size="sm" variant="danger" icon="link_off" onClick={() => setReleasing(active)}>
                  Tháo thiết bị
                </Button>
              )}
            </div>
          )
        }
      />
      <PanelBody className="space-y-6">
        {!bindable && <p className="text-body text-fg-2">Dự án đã huỷ nên không gắn được thiết bị đo.</p>}
        {bindings.isPending ? (
          <Skeleton className="h-24" />
        ) : bindings.isError ? (
          <ErrorState
            title="Không tải được thiết bị của dự án."
            message={iotErrorMessage(bindings.error)}
            onRetry={() => void bindings.refetch()}
          />
        ) : (
          <IotMonitoring viewer="staff" projectId={projectId} />
        )}
        {bindings.data && (
          <details className="border-t border-line pt-4">
            <summary className="tap cursor-pointer text-body font-medium text-fg">
              Lịch sử gắn, tháo ({list.length})
            </summary>
            <div className="mt-3">
              <BindingHistory bindings={list} />
            </div>
          </details>
        )}
      </PanelBody>

      {binding && <BindDialog projectId={projectId} current={active} onClose={() => setBinding(false)} />}
      <ReasonDialog
        open={releasing !== null}
        title={`Tháo thiết bị ${releasing?.deviceId ?? ''}?`}
        description="Thiết bị ngừng gửi số đo cho công trình này và có thể gắn sang công trình khác. Số đo cũ vẫn giữ trong lịch sử của công trình."
        label="Lý do tháo"
        maxLength={IOT_LIMITS.reasonMax}
        submitLabel="Tháo thiết bị"
        variant="danger"
        icon="link_off"
        onSubmit={async (reason) => {
          try {
            await release.mutateAsync({ bindingId: releasing!.bindingId, reason })
          } catch (e) {
            throw new Error(iotErrorMessage(e))
          }
          toast.success('Đã tháo thiết bị. Lịch sử số đo của công trình vẫn giữ.')
        }}
        onClose={() => setReleasing(null)}
      />
    </Panel>
  )
}
