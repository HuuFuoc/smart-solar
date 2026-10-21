import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { Checkbox, Field, Input } from '@/components/common/ui/field'
import { ConflictList } from '@/features/scheduling/ConflictList'
import { conflictsOf } from '@/features/scheduling/schedulingDisplay'
import { useUpsertTechnicianProfileMutation } from '@/hooks/useTechnicianAdmin'
import { errorMessage } from '@/services/api/errors'
import type { TechnicianProfileView } from '@/types/res/adminTechniciansRes'

const DEFAULT_MAX_PER_DAY = 3

/** Để trống là theo mặc định; có nhập thì phải là số nguyên 1 đến 20 (theo validator của backend) */
function maxPerDayError(text: string) {
  if (!text.trim()) return null
  const value = Number(text)
  return Number.isInteger(value) && value >= 1 && value <= 20 ? null : 'Số nguyên từ 1 đến 20.'
}

// Hồ sơ nhận lịch của kỹ thuật viên: bật / tắt nhận lịch và số lịch tối đa một ngày.
// Backend không còn dùng nơi xuất phát: lịch xếp theo khu vực phục vụ (form bên dưới)
export function TechnicianProfileForm({ technician }: { technician: TechnicianProfileView }) {
  const [isSchedulingActive, setIsSchedulingActive] = useState(technician.isSchedulingActive)
  const [maxPerDay, setMaxPerDay] = useState(
    technician.maxAppointmentsPerDay == null ? '' : String(technician.maxAppointmentsPerDay),
  )
  const [maxError, setMaxError] = useState<string | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  const upsert = useUpsertTechnicianProfileMutation()

  async function submit(event: FormEvent) {
    event.preventDefault()
    const error = maxPerDayError(maxPerDay)
    setMaxError(error)
    if (error) return
    setFailure(null)
    try {
      await upsert.mutateAsync({
        id: technician.technicianUserId,
        body: { isSchedulingActive, maxAppointmentsPerDay: maxPerDay.trim() ? Number(maxPerDay) : null },
      })
      toast.success(`Đã lưu hồ sơ nhận lịch của ${technician.fullName}.`)
    } catch (err) {
      setFailure(err)
    }
  }

  const conflicts = conflictsOf(failure)
  return (
    <form noValidate onSubmit={submit} className="max-w-2xl space-y-6">
      <Checkbox
        label="Nhận lịch khảo sát"
        description="Tắt thì hệ thống không xếp lịch mới cho người này. Còn lịch sắp tới thì phải chuyển cho người khác trước."
        checked={isSchedulingActive}
        onChange={(e) => {
          setIsSchedulingActive(e.target.checked)
          setFailure(null)
        }}
      />
      <Field
        label="Số lịch tối đa / ngày"
        htmlFor="max-per-day"
        hint={`Để trống là theo mặc định (${DEFAULT_MAX_PER_DAY}). Từ 1 đến 20.`}
        error={maxError ?? undefined}
        className="max-w-xs"
      >
        <Input
          id="max-per-day"
          type="number"
          min={1}
          max={20}
          step={1}
          value={maxPerDay}
          onChange={(e) => {
            setMaxPerDay(e.target.value)
            setMaxError(null)
          }}
          aria-invalid={Boolean(maxError)}
        />
      </Field>

      <ConflictList conflicts={conflicts} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={upsert.isPending}>
          {upsert.isPending ? 'Đang lưu…' : 'Lưu hồ sơ nhận lịch'}
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
