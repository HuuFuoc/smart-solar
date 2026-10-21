import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { DayNav, ScheduleDay } from '@/features/scheduling/ScheduleDay'
import { TechnicianProfileForm } from '@/features/scheduling/TechnicianProfileForm'
import { TechnicianZonesForm } from '@/features/scheduling/TechnicianZonesForm'
import { UnavailablePeriods } from '@/features/scheduling/UnavailablePeriods'
import { WorkingScheduleEditor } from '@/features/scheduling/WorkingScheduleEditor'
import { formatDay, technicianReadiness, todayVn } from '@/features/scheduling/schedulingDisplay'
import { useTechnicianScheduleQuery, useTechniciansQuery } from '@/hooks/useTechnicianAdmin'
import { ROUTES, withId } from '@/routes/paths'

type Section = 'lich' | 'nhan-lich' | 'khu-vuc' | 'gio-lam' | 'nghi'
const SECTIONS: { value: Section; label: string }[] = [
  { value: 'lich', label: 'Lịch theo ngày' },
  { value: 'nhan-lich', label: 'Nhận lịch' },
  { value: 'khu-vuc', label: 'Khu vực phục vụ' },
  { value: 'gio-lam', label: 'Giờ làm' },
  { value: 'nghi', label: 'Lịch nghỉ' },
]
const isSection = (v: string | null): v is Section => SECTIONS.some((s) => s.value === v)
const isDate = (v: string | null): v is string => v != null && /^\d{4}-\d{2}-\d{2}$/.test(v)

function DaySchedule({
  technicianUserId,
  date,
  onDateChange,
}: {
  technicianUserId: string
  date: string
  onDateChange: (d: string) => void
}) {
  const query = useTechnicianScheduleQuery(technicianUserId, date)
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title font-semibold">{formatDay(date, { year: true })}</h2>
        <DayNav date={date} onChange={onDateChange} />
      </div>
      <ScheduleDay date={date} query={query} viewer="staff" />
    </div>
  )
}

// Chi tiết kỹ thuật viên (quản trị và quản lý dùng chung): lịch theo ngày, hồ sơ nhận lịch, khu vực phục vụ, giờ làm, lịch nghỉ
// Backend không có API đọc một hồ sơ nên lấy từ danh sách
function TechnicianPage({ accountPattern }: { accountPattern?: string }) {
  const { id } = useParams()
  const query = useTechniciansQuery()
  const [params, setParams] = useSearchParams()
  const technician = query.data?.find((t) => t.technicianUserId === id)
  usePageCrumb(technician?.fullName ?? null)

  const rawSection = params.get('muc')
  // Chưa nhận lịch được thì mở sẵn phần cấu hình. Chỉ tính một lần lúc có dữ liệu đầu tiên
  const [opened, setOpened] = useState<{ id: string; section: Section } | null>(null)
  if (technician && opened?.id !== technician.technicianUserId)
    setOpened({ id: technician.technicianUserId, section: technician.readyForScheduling ? 'lich' : 'khu-vuc' })
  const defaultSection = opened?.id === technician?.technicianUserId ? opened?.section : null
  const rawDate = params.get('ngay')
  const date = isDate(rawDate) ? rawDate : todayVn()
  const update = (patch: Record<string, string>) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) next.set(k, v)
      return next
    })

  return (
    <QueryBoundary query={query}>
      {() => {
        if (!technician || !id)
          return (
            <EmptyState
              title="Không tìm thấy kỹ thuật viên"
              description="Tài khoản có thể đã bị xoá hoặc không còn vai trò kỹ thuật viên."
            />
          )
        const ready = technicianReadiness(technician)
        const section: Section = isSection(rawSection) ? rawSection : (defaultSection ?? 'lich')
        return (
          <>
            <PageHeader
              meta={
                <>
                  <Badge tone={ready.tone}>{ready.label}</Badge>
                  {technician.phone && <span className="tnum">{technician.phone}</span>}
                </>
              }
              title={technician.fullName}
              actions={
                accountPattern ? (
                  <ButtonLink
                    variant="info"
                    to={withId(accountPattern, technician.technicianUserId)}
                    icon="manage_accounts"
                  >
                    Tài khoản
                  </ButtonLink>
                ) : undefined
              }
            />
            <FilterChips
              label="Phần của trang"
              className="mb-6"
              chips={SECTIONS}
              value={section}
              onChange={(muc) => update({ muc })}
            />
            {section === 'lich' && (
              <DaySchedule technicianUserId={id} date={date} onDateChange={(ngay) => update({ ngay })} />
            )}
            {/* key: lưu xong danh sách tải lại, form lấy lại giá trị mới nhất thay vì giữ bản đang sửa. */}
            {section === 'nhan-lich' && (
              <TechnicianProfileForm
                key={`${technician.isSchedulingActive}-${technician.maxAppointmentsPerDay}`}
                technician={technician}
              />
            )}
            {section === 'khu-vuc' && (
              <TechnicianZonesForm
                key={technician.zones.map((zone) => zone.zoneId).join(',')}
                technician={technician}
              />
            )}
            {section === 'gio-lam' && <WorkingScheduleEditor technicianUserId={id} />}
            {section === 'nghi' && <UnavailablePeriods technicianUserId={id} />}
          </>
        )
      }}
    </QueryBoundary>
  )
}

export function AdminTechnicianPage() {
  return <TechnicianPage accountPattern={ROUTES.admin.user} />
}

export function ManageTechnicianPage() {
  return <TechnicianPage />
}
