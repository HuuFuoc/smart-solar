import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { DayNav, ScheduleDay } from '@/features/scheduling/components/ScheduleDay'
import { TechnicianProfileForm } from '@/features/scheduling/components/TechnicianProfileForm'
import { UnavailablePeriods } from '@/features/scheduling/components/UnavailablePeriods'
import { WorkingScheduleEditor } from '@/features/scheduling/components/WorkingScheduleEditor'
import { formatDay, technicianReadiness, todayVn } from '@/features/scheduling/components/schedulingDisplay'
import { useTechnicianScheduleQuery, useTechniciansQuery } from '@/features/scheduling/hooks/useTechnicianAdmin'
import { ROUTES, withId } from '@/routes/paths'

type Section = 'lich' | 'nhan-lich' | 'gio-lam' | 'nghi'
const SECTIONS: { value: Section; label: string }[] = [
  { value: 'lich', label: 'Lịch theo ngày' },
  { value: 'nhan-lich', label: 'Nhận lịch' },
  { value: 'gio-lam', label: 'Giờ làm' },
  { value: 'nghi', label: 'Lịch nghỉ' },
]
const isSection = (v: string | null): v is Section => SECTIONS.some((s) => s.value === v)
const isDate = (v: string | null): v is string => v != null && /^\d{4}-\d{2}-\d{2}$/.test(v)

function DaySchedule({ technicianUserId, date, onDateChange }: { technicianUserId: string; date: string; onDateChange: (d: string) => void }) {
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

/*
  Một kỹ thuật viên (quản trị và quản lý dùng chung): lịch theo ngày (đường đi, cảnh báo trùng giờ) và ba phần cấu hình
  quyết định giờ trống của khách – hồ sơ nhận lịch (nơi xuất phát…), giờ làm theo tuần, lịch nghỉ. Mục và ngày nằm trên địa
  chỉ (?muc=…&ngay=…). Backend không có API đọc một hồ sơ nên lấy từ danh sách kỹ thuật viên.
*/
function TechnicianPage({ accountPattern }: { accountPattern?: string }) {
  const { id } = useParams()
  const query = useTechniciansQuery()
  const [params, setParams] = useSearchParams()
  const technician = query.data?.find((t) => t.technicianUserId === id)
  usePageCrumb(technician?.fullName ?? null)

  const rawSection = params.get('muc')
  /*
    Mục mở sẵn khi địa chỉ chưa có ?muc: chưa nhận lịch được thì mở phần cấu hình, không thì lịch ngày. Chốt một lần lúc dữ
    liệu đầu tiên tới: lưu hồ sơ xong người này thành "sẵn sàng", tính lại sẽ đẩy quản trị khỏi form vừa lưu.
  */
  const [opened, setOpened] = useState<{ id: string; section: Section } | null>(null)
  if (technician && opened?.id !== technician.technicianUserId)
    setOpened({ id: technician.technicianUserId, section: technician.readyForScheduling ? 'lich' : 'nhan-lich' })
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
          return <EmptyState title="Không tìm thấy kỹ thuật viên" description="Tài khoản có thể đã bị xoá hoặc không còn vai trò kỹ thuật viên." />
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
                  <ButtonLink to={withId(accountPattern, technician.technicianUserId)} icon="manage_accounts">
                    Tài khoản
                  </ButtonLink>
                ) : undefined
              }
            />
            <FilterChips label="Phần của trang" className="mb-6" chips={SECTIONS} value={section} onChange={(muc) => update({ muc })} />
            {section === 'lich' && <DaySchedule technicianUserId={id} date={date} onDateChange={(ngay) => update({ ngay })} />}
            {/* key: lưu xong danh sách tải lại, form lấy lại giá trị mới nhất thay vì giữ bản đang sửa. */}
            {section === 'nhan-lich' && (
              <TechnicianProfileForm
                key={`${technician.isSchedulingActive}-${technician.baseLatitude}-${technician.baseLongitude}-${technician.maxAppointmentsPerDay}-${technician.earliestBaseDeparture}-${technician.baseLabel}`}
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
  return <TechnicianPage accountPattern={ROUTES.ADMIN.USER} />
}

export function ManageTechnicianPage() {
  return <TechnicianPage />
}
