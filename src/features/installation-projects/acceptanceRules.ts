import type { InstallationStaffView } from '@/types/res/managerInstallationsRes'

// Nghiệm thu lắp đặt phía quản lý / quản trị (backend 7d27054): khách là người nghiệm thu, quản lý chỉ trả về làm lại. Các luật
// dưới cho biết điều quản lý phải xong để khách nghiệm thu được (InstallationCustomerAcceptance.DecideAcceptanceAsync). Không
// import giá trị qua "@/" để chạy được bằng node --test

/** Báo cáo hoàn thành đang chờ khách quyết định (tên mã PENDING_CUSTOMER_ACCEPTANCE) và còn một lượt chưa quyết */
export const awaitsCustomerAcceptance = (p: Pick<InstallationStaffView, 'status' | 'acceptances'>) =>
  p.status === 'PENDING_CUSTOMER_ACCEPTANCE' && p.acceptances.some((a) => a.decision === 'PENDING')

/**
 * Vì sao khách chưa nghiệm thu được (rỗng là được): mục checklist bắt buộc chưa Đã đạt / Không áp dụng
 * (INSTALLATION_CHECKLIST_INCOMPLETE), hoặc thiết bị khác hợp đồng chưa được quản lý duyệt
 * (INSTALLATION_SUBSTITUTION_APPROVAL_REQUIRED). Đây là việc của quản lý
 */
export function customerAcceptanceBlockers(p: Pick<InstallationStaffView, 'checklist' | 'equipment'>): string[] {
  const reasons: string[] = []
  const open = p.checklist.filter((i) => i.isRequired && i.status !== 'SATISFIED' && i.status !== 'NOT_APPLICABLE')
  if (open.length > 0)
    reasons.push(`Còn ${open.length} hạng mục checklist bắt buộc chưa xong nên khách chưa nghiệm thu được.`)
  if (p.equipment?.status === 'SUBSTITUTION_APPROVAL_REQUIRED')
    reasons.push('Thiết bị đã lắp khác hợp đồng chưa được duyệt nên khách chưa nghiệm thu được.')
  return reasons
}
