// Nhóm trạng thái dự án thi công (Modules.Installations, backend 7d27054) cho biểu đồ: 8 trạng thái gộp còn 6 nhóm theo việc
// cần làm, dự án đã huỷ không tính. Một nhóm chỉ gộp hai trạng thái "chờ kỹ thuật viên" (chưa phân công / đã phân công chưa nhận)

export type ProjectGroupKey = 'WAITING' | 'SCHEDULED' | 'IN_PROGRESS' | 'ACCEPTANCE' | 'REWORK' | 'COMPLETED'

export const PROJECT_GROUPS: { key: ProjectGroupKey; label: string; statuses: string[] }[] = [
  { key: 'WAITING', label: 'Chờ kỹ thuật viên', statuses: ['PENDING_ASSIGNMENT', 'PENDING_TECHNICIAN_ACCEPTANCE'] },
  { key: 'SCHEDULED', label: 'Đã lên lịch', statuses: ['SCHEDULED'] },
  { key: 'IN_PROGRESS', label: 'Đang lắp đặt', statuses: ['IN_PROGRESS'] },
  { key: 'ACCEPTANCE', label: 'Chờ khách nghiệm thu', statuses: ['PENDING_CUSTOMER_ACCEPTANCE'] },
  { key: 'REWORK', label: 'Cần sửa lại', statuses: ['REWORK_REQUIRED'] },
  { key: 'COMPLETED', label: 'Đã bàn giao', statuses: ['COMPLETED'] },
]

const groupOfStatus = new Map(PROJECT_GROUPS.flatMap((g) => g.statuses.map((s) => [s, g.key] as const)))

export const projectGroupOf = (status: string) => groupOfStatus.get(status) ?? null

/** Đếm dự án theo nhóm, giữ thứ tự tiến độ; dự án huỷ / trạng thái lạ không vào nhóm nào */
export function countProjectGroups(projects: readonly { status: string }[]) {
  const counts = new Map<ProjectGroupKey, number>()
  for (const p of projects) {
    const g = projectGroupOf(p.status)
    if (g) counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  return PROJECT_GROUPS.map((g) => ({ ...g, value: counts.get(g.key) ?? 0 }))
}

/** Dự án còn việc (không phải đã bàn giao / đã huỷ) */
export const isOpenProject = (status: string) => status !== 'COMPLETED' && status !== 'CANCELLED'
