import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/common/ui/page-header'
import { DayNav, ScheduleDay } from '@/features/scheduling/ScheduleDay'
import { formatDay, todayVn } from '@/features/scheduling/schedulingDisplay'
import { useMyScheduleQuery } from '@/hooks/useTechnicianJobs'
import { ROUTES, withId } from '@/routes/paths'

/** Ngày nằm trên địa chỉ (?ngay=YYYY-MM-DD) để link từ trang chi tiết mở đúng ngày và Back / Forward đi giữa các ngày. */
const DATE_PARAM = 'ngay'
const isDate = (v: string | null): v is string => v != null && /^\d{4}-\d{2}-\d{2}$/.test(v)

/* Lịch làm việc một ngày của kỹ thuật viên (GET /api/technicians/me/schedule): các lịch, đường đi giữa chúng, cảnh báo. */
export function TechSchedulePage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get(DATE_PARAM)
  const date = isDate(raw) ? raw : todayVn()
  const query = useMyScheduleQuery(date)

  return (
    <>
      <PageHeader
        title="Lịch làm việc"
        description={formatDay(date, { year: true })}
        actions={<DayNav date={date} onChange={(next) => setParams({ [DATE_PARAM]: next })} />}
      />
      <ScheduleDay date={date} query={query} viewer="technician" linkFor={(id) => withId(ROUTES.tech.job, id)} />
    </>
  )
}
