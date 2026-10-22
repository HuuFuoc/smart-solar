import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'

export type MilestoneProgress = {
  id: string
  label: string
  description: string
  count: number
  percentage: number
  color: string
}

export function aggregateWorkflowProgress(
  surveyRequests: CustomerSurveyRequestView[],
  serviceRequests: ServiceRequestSummary[],
): MilestoneProgress[] {
  const pendingCount =
    surveyRequests.filter((r) => r.status === 'PENDING').length +
    serviceRequests.filter((s) => s.status === 'SUBMITTED' || s.status === 'AWAITING_DECISION').length

  const scheduledCount =
    surveyRequests.filter((r) => r.status === 'SCHEDULED').length +
    serviceRequests.filter((s) => s.status === 'SCHEDULED').length

  const inProgressCount =
    serviceRequests.filter((s) => s.status === 'IN_PROGRESS' || s.status === 'READY_FOR_WORK').length

  const completedCount =
    surveyRequests.filter((r) => r.status === 'COMPLETED').length +
    serviceRequests.filter((s) => s.status === 'COMPLETED').length

  const total = pendingCount + scheduledCount + inProgressCount + completedCount || 1

  return [
    {
      id: 'pending',
      label: 'Chờ tiếp nhận / Xếp lịch',
      description: 'Yêu cầu đang chờ chuyên viên điều phối xử lý',
      count: pendingCount,
      percentage: Math.round((pendingCount / total) * 100),
      color: '#f59e0b',
    },
    {
      id: 'scheduled',
      label: 'Đã lên lịch hẹn',
      description: 'Đã xác nhận thời gian kỹ thuật viên đến công trình',
      count: scheduledCount,
      percentage: Math.round((scheduledCount / total) * 100),
      color: '#3b82f6',
    },
    {
      id: 'in-progress',
      label: 'Đang triển khai',
      description: 'Kỹ thuật viên đang thực hiện công việc tại thực địa',
      count: inProgressCount,
      percentage: Math.round((inProgressCount / total) * 100),
      color: '#06b6d4',
    },
    {
      id: 'completed',
      label: 'Đã hoàn thành',
      description: 'Công việc đã nghiệm thu và lưu hồ sơ hệ thống',
      count: completedCount,
      percentage: Math.round((completedCount / total) * 100),
      color: '#10b981',
    },
  ]
}