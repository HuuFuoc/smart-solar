import { ROLE_CODES, USER_STATUSES } from '@/common/user'
import type { Tone } from '@/components/common/ui/badge'
import type { ActivationState, AdminUserListItem } from '@/types/res/adminUsersRes'

export function roleLabel(code: string) {
  return ROLE_CODES.find((r) => r.value === code)?.label ?? code
}

export function rolesText(codes: readonly string[]) {
  return codes.length ? codes.map(roleLabel).join(', ') : '—'
}

export function userStatusMeta(u: Pick<AdminUserListItem, 'status' | 'deletedAt'>): { label: string; tone: Tone } {
  if (u.deletedAt) return { label: 'Đã xoá', tone: 'neutral' }
  const found = USER_STATUSES.find((s) => s.value === u.status)
  return found ? { label: found.label, tone: found.tone } : { label: u.status, tone: 'neutral' }
}

/** `ok` là link đã thật sự được đưa vào hàng đợi gửi */
export function activationMessage(a: ActivationState): { ok: boolean; text: string } {
  const what =
    a.status === 'PENDING_ACCOUNT_SETUP'
      ? 'link đặt mật khẩu lần đầu'
      : a.status === 'PENDING_EMAIL_VERIFICATION'
        ? 'link xác minh email'
        : 'link đặt lại mật khẩu'
  if (a.emailDelivery === 'QUEUED') return { ok: true, text: `Đã gửi ${what} tới email của tài khoản.` }
  if (a.emailDelivery === 'EMAIL_DELIVERY_DISABLED')
    return {
      ok: false,
      text: `Môi trường này chưa bật gửi email nên ${what} CHƯA được gửi. Bật gửi email rồi bấm "Gửi link" để gửi lại.`,
    }
  return { ok: false, text: `Không gửi được ${what} (hàng đợi email lỗi). Bấm "Gửi link" để thử lại.` }
}
