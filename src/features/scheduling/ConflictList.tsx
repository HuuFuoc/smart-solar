import { Notice } from '@/components/common/ui/lists'
import { appointmentStatusMeta, feasibilityLabel, formatAppointment } from '@/features/scheduling/components/schedulingDisplay'
import type { ConflictingAppointmentView } from '@/types/res/adminTechniciansRes'

const PROBLEMS: Record<string, string> = {
  SCHEDULING_DISABLED: 'phải chuyển cho người khác trước khi tắt nhận lịch',
}

/*
  Thay đổi cấu hình bị từ chối vì làm hỏng lịch đã có. Backend không tự huỷ lịch nào; quản trị nhờ kinh doanh phụ trách đổi
  giờ hoặc chuyển lịch cho người khác rồi lưu lại. Mỗi lịch một dòng: giờ, trạng thái, lý do.
*/
export function ConflictList({ conflicts }: { conflicts: ConflictingAppointmentView[] }) {
  if (conflicts.length === 0) return null
  return (
    <Notice tone="danger" title={`Thay đổi này làm hỏng ${conflicts.length} lịch đã có`}>
      <ul className="mt-2 space-y-1">
        {conflicts.map((c) => (
          <li key={c.appointmentId}>
            <span className="font-medium text-fg">{formatAppointment(c.startsAt, c.endsAt)}</span>
            {`: ${appointmentStatusMeta(c.status, 'staff').label.toLowerCase()}, ${PROBLEMS[c.problem] ?? feasibilityLabel(c.problem)}`}
          </li>
        ))}
      </ul>
      <p className="mt-2">Nhờ kinh doanh phụ trách đổi giờ hoặc chuyển các lịch này cho kỹ thuật viên khác, rồi lưu lại. Không lịch nào bị huỷ tự động.</p>
    </Notice>
  )
}
