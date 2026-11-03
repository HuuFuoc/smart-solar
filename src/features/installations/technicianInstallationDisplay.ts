import { START_BLOCKED_REASONS, TECHNICIAN_ASSIGNMENT_STATUSES } from '@/common/installation'
import type { Tone } from '@/components/common/ui/badge'
import type { TrackerNext, TrackerStep } from '@/components/common/ui/progress-tracker'
import { formatInstallationWindow, installationStatusMeta } from '@/features/installations/installationDisplay'
import { formatDateTime } from '@/features/pre-surveys/preSurveyDisplay'
import { formatDay, vnDate } from '@/features/scheduling/schedulingDisplay'
import type { InstallationTechnicianView } from '@/types/res/technicianInstallationsRes'

// Công trình lắp đặt theo góc nhìn kỹ thuật viên phụ trách. Điều kiện thao tác bám đúng kiểm tra của backend:
// nhận / từ chối cần phân công PENDING; bắt đầu, ảnh, thiết bị, báo cáo cần phân công ACCEPTED

type View = InstallationTechnicianView

export type InstallationTab = 'pending' | 'active' | 'done'

/** Chờ mình trả lời. Công trình đang làm mà quản lý đổi sang mình thì trạng thái công trình vẫn là IN_PROGRESS */
export const awaitsMyAnswer = (v: Pick<View, 'myAssignmentStatus'>) => v.myAssignmentStatus === 'PENDING'

export function installationTab(v: Pick<View, 'myAssignmentStatus' | 'status'>): InstallationTab {
  if (awaitsMyAnswer(v)) return 'pending'
  if (v.myAssignmentStatus === 'COMPLETED' || v.status === 'COMPLETED') return 'done'
  return 'active'
}

/** Nhãn + màu, ưu tiên phân công của mình */
export function technicianStatusMeta(v: Pick<View, 'myAssignmentStatus' | 'status'>): { label: string; tone: Tone } {
  return installationStatusMeta(awaitsMyAnswer(v) ? 'PENDING_TECHNICIAN_ACCEPTANCE' : v.status, 'technician')
}

export function assignmentStatusLabel(status: string) {
  return TECHNICIAN_ASSIGNMENT_STATUSES[status] ?? status
}

/** Backend từ chối nhận việc khi khung giờ được giao đã qua */
export const assignmentEnded = (v: Pick<View, 'endsAt'>, now: number) => new Date(v.endsAt).getTime() <= now

export const canAnswer = (v: View) => awaitsMyAnswer(v)

/** Đã nhận và công trình đang chờ bắt đầu */
export const awaitsStart = (v: View) => v.myAssignmentStatus === 'ACCEPTED' && v.status === 'SCHEDULED'

/** Đang làm: thêm ảnh, ghi thiết bị, gửi báo cáo */
export const canWork = (v: View) =>
  v.myAssignmentStatus === 'ACCEPTED' && (v.status === 'IN_PROGRESS' || v.status === 'REWORK_REQUIRED')

/** Số ảnh của lượt hiện tại; báo cáo cần ít nhất một */
export const roundEvidenceCount = (v: View) => v.evidence.filter((e) => e.round === v.currentRound).length

/** Backend mặc định bắt buộc có tấm pin và inverter trước khi gửi báo cáo (cấu hình được) */
export const hasPanelAndInverter = (v: View) =>
  v.assets.some((a) => a.assetType === 'PANEL') && v.assets.some((a) => a.assetType === 'INVERTER')

export function startBlockedText(code: string | null | undefined) {
  if (!code) return null
  return START_BLOCKED_REASONS[code] ?? `Chưa bắt đầu lắp đặt được (${code}).`
}

/** Lần sửa lại gần nhất: lý do và ai yêu cầu */
export function latestRework(v: View) {
  return [...v.acceptances].reverse().find((a) => a.decision === 'REWORK_REQUESTED') ?? null
}

/** Hiện khối ảnh và thiết bị khi đã bắt đầu hoặc đã có dữ liệu */
export const showsWork = (v: View) => Boolean(v.startedAt) || v.evidence.length > 0 || v.assets.length > 0

export function windowText(v: Pick<View, 'startsAt' | 'endsAt'>) {
  return formatInstallationWindow(v.startsAt, v.endsAt) ?? '—'
}

// Các bước và việc tiếp theo. Đỏ khi kỹ thuật viên phải làm, xanh dương khi chờ người khác
export function installationTracker(v: View, now: number): { steps: TrackerStep[]; next: TrackerNext } {
  const pending = awaitsMyAnswer(v)
  const started = Boolean(v.startedAt)
  const reported = v.status === 'PENDING_CUSTOMER_ACCEPTANCE' || v.status === 'COMPLETED'
  const completed = v.status === 'COMPLETED'
  const working = !pending && (v.status === 'IN_PROGRESS' || v.status === 'REWORK_REQUIRED')
  const steps: TrackerStep[] = [
    { label: 'Nhận việc', detail: pending ? 'Chờ bạn trả lời' : undefined, state: pending ? 'current' : 'done' },
    {
      label: 'Bắt đầu lắp đặt',
      detail: started ? formatDateTime(v.startedAt) : `Từ ${formatDay(vnDate(v.startsAt))}`,
      state: started ? 'done' : !pending && v.status === 'SCHEDULED' ? 'current' : 'todo',
    },
    {
      label: 'Ảnh và thiết bị',
      detail: started ? `${v.evidence.length} ảnh, ${v.assets.length} thiết bị` : undefined,
      state: reported ? 'done' : working ? 'current' : 'todo',
    },
    {
      label: 'Gửi báo cáo hoàn thành',
      detail: reported ? formatDateTime(v.acceptanceRequestedAt) : undefined,
      state: reported ? 'done' : 'todo',
    },
    {
      label: 'Khách nghiệm thu',
      detail: completed ? formatDateTime(v.completedAt) : undefined,
      state: completed ? 'done' : v.status === 'PENDING_CUSTOMER_ACCEPTANCE' ? 'current' : 'todo',
    },
  ]

  if (pending) {
    if (assignmentEnded(v, now))
      return {
        steps,
        next: {
          tone: 'warn',
          title: 'Đã qua khung giờ được giao',
          body: 'Không nhận việc này được nữa. Báo quản lý xếp lại lịch, hoặc từ chối để quản lý giao người khác.',
        },
      }
    return {
      steps,
      next: {
        tone: 'danger',
        title: 'Nhận hoặc từ chối việc',
        body: `Quản lý giao cho bạn lắp đặt ${windowText(v)}. Xem địa chỉ và khách hàng rồi trả lời.`,
        action: { label: 'Trả lời', icon: 'assignment_turned_in', target: 'installation-answer' },
      },
    }
  }
  if (v.status === 'SCHEDULED') {
    if (v.canStart)
      return {
        steps,
        next: {
          tone: 'danger',
          title: 'Bắt đầu lắp đặt',
          body: 'Tới công trình thì bấm "Bắt đầu lắp đặt".',
          action: { label: 'Bắt đầu', icon: 'play_arrow', target: 'installation-start' },
        },
      }
    const reason = startBlockedText(v.startBlockedReason)
    if (v.startBlockedReason === 'INSTALLATION_SCHEDULE_EXPIRED')
      return { steps, next: { tone: 'warn', title: 'Đã hết khung giờ lắp đặt', body: reason } }
    if (v.startBlockedReason === 'INSTALLATION_TOO_EARLY_TO_START')
      return {
        steps,
        next: {
          tone: 'info',
          title: `Lắp đặt từ ${formatDay(vnDate(v.startsAt), { year: true })}`,
          body: windowText(v),
        },
      }
    return { steps, next: { tone: 'info', title: 'Chưa bắt đầu được', body: reason } }
  }
  if (v.status === 'IN_PROGRESS')
    return {
      steps,
      next: {
        tone: 'danger',
        title: 'Thêm ảnh, ghi thiết bị rồi gửi báo cáo hoàn thành',
        body: 'Báo cáo cần ít nhất một ảnh lắp đặt, tấm pin và inverter đã lắp.',
        action: { label: 'Thêm ảnh', icon: 'add_a_photo', target: 'installation-photos' },
      },
    }
  if (v.status === 'REWORK_REQUIRED') {
    const rework = latestRework(v)
    return {
      steps,
      next: {
        tone: 'danger',
        title: rework?.decidedBy === 'STAFF' ? 'Quản lý trả báo cáo về để sửa' : 'Khách yêu cầu sửa lại',
        body: `${rework?.reason ? `Lý do: ${rework.reason} ` : ''}Sửa xong thì thêm ảnh mới của lượt ${v.currentRound} và gửi lại báo cáo.`,
        action: { label: 'Thêm ảnh', icon: 'add_a_photo', target: 'installation-photos' },
      },
    }
  }
  if (v.status === 'PENDING_CUSTOMER_ACCEPTANCE')
    return {
      steps,
      next: {
        tone: 'info',
        title: 'Chờ khách nghiệm thu',
        body: `Bạn đã gửi báo cáo lúc ${formatDateTime(v.acceptanceRequestedAt)}. Khách nghiệm thu thì công trình hoàn tất.`,
      },
    }
  if (completed)
    return { steps, next: { tone: 'neutral', title: 'Khách đã nghiệm thu', body: formatDateTime(v.completedAt) } }
  return { steps, next: { tone: 'neutral', title: technicianStatusMeta(v).label } }
}
