import type { InstallationStaffView } from '@/types/res/managerInstallationsRes'

// Nghiệm thu nội bộ của quản lý / quản trị, bám InstallationHandlers.AcceptInternallyAsync của backend 462733c. Chỉ để bật / tắt
// nút và ghi lý do; backend vẫn kiểm lại. Không import giá trị qua "@/" để chạy được bằng node --test

/** Ghi chú căn cứ nghiệm thu: bắt buộc, tối đa 500 ký tự */
export const ACCEPTANCE_NOTE_MAX = 500

/** Báo cáo hoàn thành đang chờ nghiệm thu nội bộ (tên mã PENDING_CUSTOMER_ACCEPTANCE giữ từ trước) và còn một lượt chưa quyết */
export const awaitsInternalAcceptance = (p: Pick<InstallationStaffView, 'status' | 'acceptances'>) =>
  p.status === 'PENDING_CUSTOMER_ACCEPTANCE' && p.acceptances.some((a) => a.decision === 'PENDING')

/**
 * Vì sao chưa nghiệm thu được (rỗng là được): mục checklist bắt buộc chưa Đã đạt / Không áp dụng (INSTALLATION_CHECKLIST_INCOMPLETE),
 * hoặc thiết bị khác hợp đồng chưa được quản lý duyệt (INSTALLATION_SUBSTITUTION_APPROVAL_REQUIRED)
 */
export function internalAcceptanceBlockers(p: Pick<InstallationStaffView, 'checklist' | 'equipment'>): string[] {
  const reasons: string[] = []
  const open = p.checklist.filter((i) => i.isRequired && i.status !== 'SATISFIED' && i.status !== 'NOT_APPLICABLE')
  if (open.length > 0) reasons.push(`Còn ${open.length} hạng mục checklist bắt buộc chưa xong.`)
  if (p.equipment?.status === 'SUBSTITUTION_APPROVAL_REQUIRED')
    reasons.push('Thiết bị đã lắp khác hợp đồng chưa được quản lý duyệt.')
  return reasons
}

/** Ghi chú căn cứ nghiệm thu */
export function acceptanceNoteError(note: string): string | null {
  const text = note.trim()
  if (!text) return 'Ghi căn cứ nghiệm thu (đã bàn giao với khách, đã xem ảnh và thiết bị…).'
  if (text.length > ACCEPTANCE_NOTE_MAX) return `Tối đa ${ACCEPTANCE_NOTE_MAX} ký tự.`
  return null
}
