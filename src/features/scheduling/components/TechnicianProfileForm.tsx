import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { Checkbox, Field, Input } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { toNumber } from '@/features/pre-surveys/components/assessmentForm'
import { isInHcm, mapsUrl } from '@/features/pre-surveys/components/preSurveyDisplay'
import { ConflictList } from '@/features/scheduling/components/ConflictList'
import { conflictsOf } from '@/features/scheduling/components/schedulingDisplay'
import { useUpsertTechnicianProfileMutation } from '@/hooks/useTechnicianAdmin'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { TechnicianProfileView } from '@/types/res/adminTechniciansRes'

type Form = {
  isSchedulingActive: boolean
  baseLabel: string
  baseLatitude: string
  baseLongitude: string
  maxAppointmentsPerDay: string
  earliestBaseDeparture: string
}
type Errors = Partial<Record<keyof Form, string>>

const DEFAULT_MAX_PER_DAY = 3

function toForm(t: TechnicianProfileView): Form {
  return {
    isSchedulingActive: t.isSchedulingActive,
    baseLabel: t.baseLabel ?? '',
    baseLatitude: t.baseLatitude == null ? '' : String(t.baseLatitude),
    baseLongitude: t.baseLongitude == null ? '' : String(t.baseLongitude),
    maxAppointmentsPerDay: t.maxAppointmentsPerDay == null ? '' : String(t.maxAppointmentsPerDay),
    earliestBaseDeparture: t.earliestBaseDepartureIsDefault ? '' : t.earliestBaseDeparture,
  }
}

/* Luật bám UpsertTechnicianProfileCommandValidator (backend main 4d12e4d). */
function validate(f: Form): Errors {
  const errors: Errors = {}
  const lat = toNumber(f.baseLatitude)
  const lon = toNumber(f.baseLongitude)
  if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) errors.baseLatitude = 'Vĩ độ từ -90 đến 90.'
  if (lon !== null && (!Number.isFinite(lon) || lon < -180 || lon > 180)) errors.baseLongitude = 'Kinh độ từ -180 đến 180.'
  if ((lat === null) !== (lon === null)) errors[lat === null ? 'baseLatitude' : 'baseLongitude'] = 'Nhập đủ cả vĩ độ và kinh độ.'
  if (f.isSchedulingActive && (lat === null || lon === null || (lat === 0 && lon === 0)))
    errors.baseLatitude ??= 'Đang nhận lịch thì phải có toạ độ nơi xuất phát thật.'
  if (f.baseLabel.trim().length > 200) errors.baseLabel = 'Tối đa 200 ký tự.'
  if (f.maxAppointmentsPerDay.trim()) {
    const max = Number(f.maxAppointmentsPerDay)
    if (!Number.isInteger(max) || max < 1 || max > 20) errors.maxAppointmentsPerDay = 'Số nguyên từ 1 đến 20.'
  }
  const t = f.earliestBaseDeparture
  if (t && (t < '04:00' || t > '12:00')) errors.earliestBaseDeparture = 'Trong khoảng 04:00 đến 12:00.'
  return errors
}

const FIELDS: (keyof Form)[] = ['isSchedulingActive', 'baseLabel', 'baseLatitude', 'baseLongitude', 'maxAppointmentsPerDay', 'earliestBaseDeparture']

/* Lỗi theo field của backend: tên PascalCase (BaseLatitude) hoặc camelCase (earliestBaseDeparture). */
function serverErrors(error: unknown): Errors {
  if (!isApiError(error)) return {}
  const out: Errors = {}
  for (const [key, message] of Object.entries(error.fieldErrors)) {
    const field = FIELDS.find((f) => f.toLowerCase() === key.toLowerCase())
    if (field) out[field] = message
  }
  return out
}

/*
  Hồ sơ nhận lịch của kỹ thuật viên: nơi xuất phát (điểm bắt đầu mọi chặng đường đầu ngày – phải là nơi xuất phát thật,
  không lấy toạ độ của khách), bật / tắt nhận lịch, số lịch tối đa / ngày, giờ rời nơi xuất phát sớm nhất. Phương tiện V1 cố
  định là xe máy nên không có ô chọn. Tắt nhận lịch khi còn lịch sắp tới bị từ chối và liệt kê các lịch đó.
*/
export function TechnicianProfileForm({ technician }: { technician: TechnicianProfileView }) {
  const [form, setForm] = useState<Form>(() => toForm(technician))
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState<unknown>(null)
  const upsert = useUpsertTechnicianProfileMutation()
  const lat = toNumber(form.baseLatitude)
  const lon = toNumber(form.baseLongitude)
  const point = lat !== null && lon !== null && Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null

  const edit = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }))
    setErrors((e) => {
      const next = { ...e }
      for (const key of Object.keys(patch)) delete next[key as keyof Form]
      return next
    })
    setFailure(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const found = validate(form)
    if (Object.keys(found).length > 0) return setErrors(found)
    setFailure(null)
    try {
      await upsert.mutateAsync({
        id: technician.technicianUserId,
        body: {
          isSchedulingActive: form.isSchedulingActive,
          baseLabel: form.baseLabel.trim() || null,
          baseLatitude: lat,
          baseLongitude: lon,
          maxAppointmentsPerDay: form.maxAppointmentsPerDay.trim() ? Number(form.maxAppointmentsPerDay) : null,
          earliestBaseDeparture: form.earliestBaseDeparture || null,
        },
      })
      toast.success(`Đã lưu hồ sơ nhận lịch của ${technician.fullName}.`)
    } catch (error) {
      setErrors(serverErrors(error))
      setFailure(error)
    }
  }

  const conflicts = conflictsOf(failure)
  return (
    <form noValidate onSubmit={submit} className="max-w-2xl space-y-6">
      <Checkbox
        label="Nhận lịch khảo sát"
        description="Tắt thì hệ thống không xếp lịch mới cho người này. Còn lịch sắp tới thì phải chuyển cho người khác trước."
        checked={form.isSchedulingActive}
        onChange={(e) => edit({ isSchedulingActive: e.target.checked })}
      />

      <fieldset className="space-y-4">
        <legend className="text-body font-medium text-fg">Nơi xuất phát</legend>
        <p className="-mt-2 text-meta text-fg-2">
          Nơi kỹ thuật viên đi tới lịch đầu tiên trong ngày (văn phòng, kho, nhà). Trên Google Maps, nhấn giữ vào vị trí để lấy
          toạ độ.
        </p>
        <Field label="Tên gọi" htmlFor="base-label" hint="Không bắt buộc, ví dụ: Văn phòng Quận 7." error={errors.baseLabel}>
          <Input id="base-label" maxLength={200} value={form.baseLabel} onChange={(e) => edit({ baseLabel: e.target.value })} aria-invalid={Boolean(errors.baseLabel)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vĩ độ" htmlFor="base-lat" required={form.isSchedulingActive} hint="Ví dụ 10.7769." error={errors.baseLatitude}>
            <Input id="base-lat" inputMode="decimal" value={form.baseLatitude} onChange={(e) => edit({ baseLatitude: e.target.value })} aria-invalid={Boolean(errors.baseLatitude)} />
          </Field>
          <Field label="Kinh độ" htmlFor="base-lon" required={form.isSchedulingActive} hint="Ví dụ 106.7009." error={errors.baseLongitude}>
            <Input id="base-lon" inputMode="decimal" value={form.baseLongitude} onChange={(e) => edit({ baseLongitude: e.target.value })} aria-invalid={Boolean(errors.baseLongitude)} />
          </Field>
        </div>
        {point && (
          <p className="text-meta">
            <a className="ui-link" href={mapsUrl(point.lat, point.lon)} target="_blank" rel="noreferrer">
              Xem nơi xuất phát trên bản đồ
              <span className="sr-only"> (mở tab mới)</span>
            </a>
          </p>
        )}
        {point && !isInHcm(point.lat, point.lon) && (
          <Notice tone="warn">Toạ độ này nằm ngoài TP.HCM. Kiểm tra lại: đường đi sẽ tính từ điểm này.</Notice>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Số lịch tối đa / ngày"
          htmlFor="max-per-day"
          hint={`Để trống là theo mặc định (${DEFAULT_MAX_PER_DAY}). Từ 1 đến 20.`}
          error={errors.maxAppointmentsPerDay}
        >
          <Input
            id="max-per-day"
            type="number"
            min={1}
            max={20}
            step={1}
            value={form.maxAppointmentsPerDay}
            onChange={(e) => edit({ maxAppointmentsPerDay: e.target.value })}
            aria-invalid={Boolean(errors.maxAppointmentsPerDay)}
          />
        </Field>
        <Field
          label="Rời nơi xuất phát sớm nhất"
          htmlFor="earliest-departure"
          hint={technician.earliestBaseDepartureIsDefault ? `Để trống là theo mặc định (${technician.earliestBaseDeparture}).` : 'Để trống là theo mặc định của hệ thống.'}
          error={errors.earliestBaseDeparture}
        >
          <Input
            id="earliest-departure"
            type="time"
            min="04:00"
            max="12:00"
            value={form.earliestBaseDeparture}
            onChange={(e) => edit({ earliestBaseDeparture: e.target.value })}
            aria-invalid={Boolean(errors.earliestBaseDeparture)}
          />
        </Field>
      </div>
      <p className="text-meta text-fg-2">Phương tiện: xe máy (thời gian đi tính theo xe máy).</p>

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
