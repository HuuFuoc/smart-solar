import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Skeleton } from '@/components/common/ui/states'
import { ConflictList } from '@/features/scheduling/ConflictList'
import { conflictsOf } from '@/features/scheduling/schedulingDisplay'
import { ZoneCheckCard } from '@/features/scheduling/ZoneCheckCard'
import { useOperationalZonesQuery, useSetTechnicianZonesMutation } from '@/hooks/useTechnicianAdmin'
import { errorMessage } from '@/services/api/errors'
import type { TechnicianProfileView } from '@/types/res/adminTechniciansRes'

// Khu vực phục vụ của kỹ thuật viên
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

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.data.map((zone) => (
            <ZoneCheckCard
              key={zone.zoneId}
              zone={zone}
              checked={selected.has(zone.zoneId)}
              onToggle={() => toggle(zone.zoneId)}
            />
          ))}
        </div>

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
          <span className="text-meta text-fg-3">Khu vực có hiệu lực ngay khi kỹ thuật viên nhận lịch</span>
        </div>
      </div>

      <ConflictList conflicts={conflicts} />
    </form>
  )
}
