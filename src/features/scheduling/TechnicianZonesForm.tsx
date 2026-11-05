import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Skeleton } from '@/components/common/ui/states'
import { ConflictList } from '@/features/scheduling/ConflictList'
import { conflictsOf } from '@/features/scheduling/schedulingDisplay'
import { useOperationalZonesQuery, useSetTechnicianZonesMutation } from '@/hooks/useTechnicianAdmin'
import { errorMessage } from '@/services/api/errors'
import type { TechnicianProfileView } from '@/types/res/adminTechniciansRes'

// Khu vực phục vụ của kỹ thuật viên. Khách đặt giờ ở phường thuộc khu nào thì kỹ thuật viên của khu đó thấy và nhận lịch.
// Danh sách khu vực do admin lập; mỗi lần lưu là thay cả danh sách
export function TechnicianZonesForm({ technician }: { technician: TechnicianProfileView }) {
  const zones = useOperationalZonesQuery()
  const save = useSetTechnicianZonesMutation()
  const [selected, setSelected] = useState(() => new Set(technician.zones.map((zone) => zone.zoneId)))
  const [failure, setFailure] = useState<unknown>(null)

  function toggle(zoneId: string) {
    const next = new Set(selected)
    if (next.has(zoneId)) next.delete(zoneId)
    else next.add(zoneId)
    setSelected(next)
    setFailure(null)
  }

  function selectAll() {
    if (!zones.data) return
    const activeIds = zones.data.filter((z) => z.isActive).map((z) => z.zoneId)
    setSelected(new Set(activeIds))
    setFailure(null)
  }

  function clearAll() {
    setSelected(new Set())
    setFailure(null)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setFailure(null)
    try {
      await save.mutateAsync({ id: technician.technicianUserId, zoneIds: [...selected] })
      toast.success(`Đã lưu khu vực phục vụ của ${technician.fullName}.`)
    } catch (err) {
      setFailure(err)
    }
  }

  if (zones.isPending) return <Skeleton className="h-40" />
  if (zones.isError) return <Notice tone="danger">{errorMessage(zones.error)}</Notice>
  if (zones.data.length === 0) {
    return <Notice tone="warn">Chưa có khu vực phục vụ nào. Admin cần lập khu vực trước.</Notice>
  }

  const conflicts = conflictsOf(failure)
  const activeCount = zones.data.filter((z) => z.isActive).length

  return (
    <form noValidate onSubmit={submit} className="space-y-6">
      <div className="overflow-hidden rounded-container border border-line bg-surface-1 shadow-sm">
        {/* Header khung khu vực */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/40 px-4 py-3">
          <div>
            <h3 className="font-semibold text-fg">Phân công khu vực địa bàn</h3>
            <p className="text-meta text-fg-2">
              Kỹ thuật viên sẽ nhận được yêu cầu khảo sát, lắp đặt và sửa chữa tại các khu vực được chọn.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" type="button" onClick={selectAll}>
              Chọn tất cả
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={clearAll}>
              Bỏ chọn tất cả
            </Button>
            <span className="rounded-full border border-line bg-surface-1 px-3 py-1 text-meta font-semibold text-fg">
              Đã chọn: <strong className="text-accent">{selected.size}</strong> / {activeCount}
            </span>
          </div>
        </div>

        {/* Lưới các thẻ khu vực phục vụ */}
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.data.map((zone) => {
            const isChecked = selected.has(zone.zoneId)
            const isDisabled = !zone.isActive
            return (
              <div
                key={zone.zoneId}
                role="checkbox"
                tabIndex={isDisabled ? -1 : 0}
                aria-checked={isChecked}
                aria-disabled={isDisabled}
                onClick={() => !isDisabled && toggle(zone.zoneId)}
                onKeyDown={(e) => {
                  if (!isDisabled && (e.key === ' ' || e.key === 'Enter')) {
                    e.preventDefault()
                    toggle(zone.zoneId)
                  }
                }}
                className={`relative flex cursor-pointer select-none items-start gap-3 rounded-container border p-3.5 transition-all ${
                  isDisabled
                    ? 'cursor-not-allowed border-line bg-surface-2/30 opacity-50'
                    : isChecked
                      ? 'border-emerald-500/50 bg-emerald-500/10 shadow-2xs hover:border-emerald-500'
                      : 'border-line bg-surface-1 hover:border-fg-3 hover:bg-surface-2/50'
                }`}
              >
                {/* Custom Checkbox Box */}
                <div
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    isChecked
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-fg-3 bg-canvas'
                  }`}
                >
                  {isChecked && <Icon name="check" className="text-[16px] text-white" />}
                </div>

                {/* Thông tin khu vực */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-fg">{zone.name}</span>
                    {zone.code && (
                      <span className="font-mono text-micro text-fg-3">{zone.code}</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5 text-micro font-medium text-fg-2">
                      <Icon name="location_on" className="text-accent text-[13px]" />
                      {zone.communeCount} phường, xã
                    </span>
                    {!zone.isServiceable && (
                      <span className="inline-block rounded bg-amber-500/15 px-1.5 py-0.5 text-micro font-medium text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        Tạm ngưng
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer điều khiển */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button icon="save" type="submit" variant="primary" disabled={save.isPending}>
              {save.isPending ? 'Đang lưu…' : `Lưu khu vực phục vụ (${selected.size})`}
            </Button>
            {failure !== null && conflicts.length === 0 && (
              <span className="flex items-center gap-1.5 text-meta font-medium text-danger" role="alert">
                <Icon name="error" className="shrink-0 text-[18px]" />
                {errorMessage(failure)}
              </span>
            )}
          </div>
          <span className="text-meta text-fg-3">
            Khu vực có hiệu lực ngay khi kỹ thuật viên nhận lịch
          </span>
        </div>
      </div>

      <ConflictList conflicts={conflicts} />
    </form>
  )
}
