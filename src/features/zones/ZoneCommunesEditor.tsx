import { useId, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, IconButton } from '@/components/common/ui/button'
import { Combobox, normalizeSearch } from '@/components/common/ui/combobox'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import {
  blockingWorkText,
  communeCodeProblemsOf,
  communesInUseOf,
  mappedCommunesOf,
  unitTypeLabel,
} from '@/features/zones/zoneDisplay'
import { ZONE_LIMITS, communeDiff, communeSetError } from '@/features/zones/zoneRules'
import { useHcmCommunesQuery } from '@/hooks/useCommunes'
import { useSetZoneCommunesMutation } from '@/hooks/useOperationalZones'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { Commune } from '@/types/res/administrativeUnitsRes'
import type { CoverageCommuneView, ZoneDetailView } from '@/types/res/operationalZonesRes'

// Phường, xã của một khu. Backend thay cả danh sách nên luôn gửi đủ các mục đang chọn; trước khi lưu hiện phần thêm / gỡ.
// Phường, xã đang thuộc khu khác đang hoạt động thì backend từ chối: không tự chuyển, người dùng gỡ ở khu kia trước

function nameOf(code: string, catalog: Map<string, { name: string }>) {
  return catalog.get(code)?.name ?? `Mã ${code}`
}

export function ZoneCommunesEditor({
  detail,
  canEdit,
  unmapped,
}: {
  detail: ZoneDetailView
  canEdit: boolean
  /** Phường, xã chưa thuộc khu nào đang hoạt động (từ báo cáo độ phủ); null khi chưa tải được */
  unmapped: CoverageCommuneView[] | null
}) {
  const inputId = useId()
  const communes = useHcmCommunesQuery()
  const save = useSetZoneCommunesMutation()
  const saved = useMemo(() => detail.communes.map((c) => c.code), [detail.communes])
  const [draft, setDraft] = useState<string[]>(saved)
  const [search, setSearch] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<unknown>(null)
  // Bản đã lưu đổi (lưu xong, hoặc tải lại sau xung đột) thì đặt lại danh sách đang sửa theo bản mới
  const [base, setBase] = useState(detail.zone.revision)
  if (base !== detail.zone.revision) {
    setBase(detail.zone.revision)
    setDraft(saved)
  }

  const catalog = useMemo(() => {
    const map = new Map<string, { name: string; unitType: string }>()
    for (const c of communes.data ?? []) map.set(c.code, c)
    for (const c of detail.communes) map.set(c.code, c)
    return map
  }, [communes.data, detail.communes])
  const free = useMemo(() => new Set((unmapped ?? []).map((c) => c.code)), [unmapped])

  // Nhãn trong ô chọn: phường, xã đang thuộc khu khác được ghi rõ để biết trước là sẽ bị từ chối
  const choices = useMemo(() => {
    const taken = new Set(draft)
    return (communes.data ?? [])
      .filter((c: Commune) => !taken.has(c.code))
      .map((c) => ({
        code: c.code,
        label: unmapped && !free.has(c.code) && !saved.includes(c.code) ? `${c.name} (đang thuộc khu khác)` : c.name,
      }))
  }, [communes.data, draft, unmapped, free, saved])

  const { added, removed } = communeDiff(saved, draft)
  const dirty = added.length > 0 || removed.length > 0
  const listError = communeSetError(draft)
  const mapped = mappedCommunesOf(error)
  const inUse = communesInUseOf(error)
  const badCodes = communeCodeProblemsOf(error)

  function pick(label: string) {
    setSearch(label)
    const match = choices.find((c) => normalizeSearch(c.label) === normalizeSearch(label))
    if (!match) return
    setDraft((d) => [...d, match.code])
    setSearch('')
    setError(null)
  }

  async function submit() {
    if (save.isPending) return
    setError(null)
    try {
      const view = await save.mutateAsync({
        zoneId: detail.zone.zoneId,
        body: { communeCodes: draft, reason: reason.trim() || null, revision: detail.zone.revision },
      })
      toast.success(`Đã lưu ${view.communes.length} phường, xã của khu ${view.zone.code}`)
      setConfirming(false)
      setReason('')
    } catch (e) {
      // Khu đã đổi ở nơi khác: dữ liệu tải lại, danh sách đang sửa đặt lại theo bản mới, người dùng tự làm lại
      if (isApiError(e) && e.code === 'ZONE_STALE_REVISION') {
        toast.error(errorMessage(e))
        setConfirming(false)
        return
      }
      setError(e)
      setConfirming(false)
    }
  }

  const sorted = [...draft].sort((a, b) => nameOf(a, catalog).localeCompare(nameOf(b, catalog), 'vi'))

  return (
    <Panel>
      <PanelHeader title={`Phường, xã (${draft.length})`} />
      <PanelBody className="space-y-4">
        {canEdit && (
          <Field
            label="Thêm phường, xã"
            htmlFor={inputId}
            hint={communes.isError ? errorMessage(communes.error) : 'Gõ tên để tìm, không cần dấu.'}
          >
            <div className="sm:w-96">
              <Combobox
                id={inputId}
                value={search}
                onChange={pick}
                options={choices.map((c) => c.label)}
                listLabel="Phường, xã"
                placeholder={communes.isPending ? 'Đang tải danh mục…' : 'Ví dụ: Bến Thành'}
                disabled={communes.isPending || save.isPending}
              />
            </div>
          </Field>
        )}

        {sorted.length === 0 ? (
          <p className="text-body text-fg-2">Khu chưa có phường, xã nào.</p>
        ) : (
          <ul className="grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((code) => (
              <li key={code} className="flex items-center justify-between gap-3 border-b border-line py-2">
                <span className="min-w-0">
                  <span className="text-body text-fg">{nameOf(code, catalog)}</span>
                  <span className="tnum ml-2 text-meta text-fg-3">
                    {catalog.get(code) ? unitTypeLabel(catalog.get(code)!.unitType) : ''} {code}
                  </span>
                  {added.includes(code) && (
                    <Badge tone="accent" className="ml-2">
                      Mới
                    </Badge>
                  )}
                </span>
                {canEdit && (
                  <IconButton
                    size="sm"
                    variant="danger-quiet"
                    icon="close"
                    label={`Gỡ ${nameOf(code, catalog)}`}
                    disabled={save.isPending}
                    onClick={() => {
                      setDraft((d) => d.filter((c) => c !== code))
                      setError(null)
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}

        {removed.length > 0 && (
          <div>
            <p className="text-body font-medium text-fg">Sẽ gỡ khỏi khu ({removed.length})</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {removed.map((code) => (
                <li key={code}>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="undo"
                    onClick={() => setDraft((d) => [...d, code])}
                    aria-label={`Giữ lại ${nameOf(code, catalog)}`}
                  >
                    {nameOf(code, catalog)}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error != null && (
          <div role="alert">
            <Notice tone="danger" title={errorMessage(error)}>
              {mapped.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {mapped.map((m) => (
                    <li key={m.communeCode}>
                      {nameOf(m.communeCode, catalog)} đang thuộc khu {m.zoneName} ({m.zoneCode})
                    </li>
                  ))}
                </ul>
              )}
              {inUse.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {inUse.map((u) => (
                    <li key={u.communeCode}>
                      {nameOf(u.communeCode, catalog)}:{' '}
                      {blockingWorkText(u.blockingAppointments, u.blockingInstallationProjects)}
                    </li>
                  ))}
                </ul>
              )}
              {badCodes.length > 0 && <p className="mt-1">Mã không dùng được: {badCodes.join(', ')}.</p>}
            </Notice>
          </div>
        )}
      </PanelBody>
      {canEdit && dirty && (
        <PanelFooter className="justify-end">
          <p className="mr-auto text-body text-fg-2">
            Chưa lưu: thêm {added.length}, gỡ {removed.length}.
          </p>
          <Button icon="undo" variant="secondary" disabled={save.isPending} onClick={() => setDraft(saved)}>
            Bỏ thay đổi
          </Button>
          <Button
            icon="save"
            variant="primary"
            disabled={save.isPending || Boolean(listError)}
            onClick={() => setConfirming(true)}
          >
            Lưu danh sách
          </Button>
          {listError && (
            <p className="basis-full text-meta text-danger" role="alert">
              {listError}
            </p>
          )}
        </PanelFooter>
      )}

      <ModalDialog
        open={confirming}
        onOpenChange={setConfirming}
        dismissible={!save.isPending}
        aria-label="Lưu phường, xã của khu"
        className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto"
      >
        <DialogTitle>Lưu phường, xã của khu {detail.zone.code}?</DialogTitle>
        <div className="mt-3 space-y-3 text-body text-fg-2">
          {added.length > 0 && (
            <div>
              <p className="font-medium text-fg">Thêm {added.length}</p>
              <p>{added.map((c) => nameOf(c, catalog)).join(', ')}</p>
            </div>
          )}
          {removed.length > 0 && (
            <div>
              <p className="font-medium text-fg">Gỡ {removed.length}</p>
              <p>{removed.map((c) => nameOf(c, catalog)).join(', ')}</p>
              <p className="mt-1 text-meta">
                Phường, xã còn lịch khảo sát hoặc công trình chưa xong thì không gỡ được. Lịch đã xác nhận không bị
                chuyển ngầm.
              </p>
            </div>
          )}
        </div>
        <Field
          label="Lý do"
          htmlFor="zone-communes-reason"
          hint={`Không bắt buộc, lưu vào lịch sử gán / gỡ. Tối đa ${ZONE_LIMITS.reasonMax} ký tự.`}
          className="mt-4"
        >
          <Textarea
            id="zone-communes-reason"
            rows={2}
            maxLength={ZONE_LIMITS.reasonMax}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button icon="close" variant="secondary" disabled={save.isPending} onClick={() => setConfirming(false)}>
            Quay lại
          </Button>
          <Button icon="save" variant="primary" disabled={save.isPending} onClick={() => void submit()}>
            {save.isPending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </DialogFooter>
      </ModalDialog>
    </Panel>
  )
}
