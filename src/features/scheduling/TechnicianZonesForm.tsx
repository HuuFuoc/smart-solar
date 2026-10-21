import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { Checkbox } from '@/components/common/ui/field'
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

  function toggle(zoneId: string, checked: boolean) {
    const next = new Set(selected)
    if (checked) next.add(zoneId)
    else next.delete(zoneId)
    setSelected(next)
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
  return (
    <form noValidate onSubmit={submit} className="space-y-6">
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
        {zones.data.map((zone) => (
          <Checkbox
            key={zone.zoneId}
            label={zone.name}
            description={`${zone.communeCount} phường, xã${zone.isServiceable ? '' : ', đang tạm ngừng'}`}
            checked={selected.has(zone.zoneId)}
            disabled={!zone.isActive}
            onChange={(e) => toggle(zone.zoneId, e.target.checked)}
          />
        ))}
      </div>
      <ConflictList conflicts={conflicts} />
      <div className="flex flex-wrap items-center gap-3">
        <Button icon="save" type="submit" variant="primary" disabled={save.isPending}>
          {save.isPending ? 'Đang lưu…' : `Lưu khu vực (${selected.size})`}
        </Button>
        {failure !== null && conflicts.length === 0 && (
          <span className="flex items-center gap-1.5 text-body font-medium text-danger" role="alert">
            <Icon name="error" className="shrink-0 text-[20px]" />
            {errorMessage(failure)}
          </span>
        )}
      </div>
    </form>
  )
}
