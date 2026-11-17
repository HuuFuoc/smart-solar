import type { DirectSurveyBookingRequest } from '@/types/req/customerSurveyRequestsReq'

// Luật form đặt khảo sát trực tiếp, bám DirectSurveyBookingCommandValidator của backend: họ tên ≤ 200, ghi chú ≤ 1000, số điện
// thoại 8–15 chữ số (cho phép + ở đầu, dấu cách, chấm, gạch). Không import giá trị qua "@/" để chạy được bằng node --test

export type DirectBookingForm = { contactName: string; contactPhone: string; note: string }

export const CONTACT_NAME_MAX = 200
export const DIRECT_NOTE_MAX = 1000

/** Số điện thoại như backend IsPhone */
export function isPhone(value: string) {
  const trimmed = value.trim()
  if (!/^\+?[0-9][0-9 .-]{6,22}$/.test(trimmed)) return false
  const digits = trimmed.replace(/[^0-9]/g, '').length
  return digits >= 8 && digits <= 15
}

export function directBookingErrors(form: DirectBookingForm): Partial<Record<keyof DirectBookingForm, string>> {
  const errors: Partial<Record<keyof DirectBookingForm, string>> = {}
  if (form.contactName.trim().length > CONTACT_NAME_MAX) errors.contactName = `Tối đa ${CONTACT_NAME_MAX} ký tự.`
  if (form.contactPhone.trim() && !isPhone(form.contactPhone)) errors.contactPhone = 'Số điện thoại có 8 đến 15 chữ số.'
  if (form.note.trim().length > DIRECT_NOTE_MAX) errors.note = `Tối đa ${DIRECT_NOTE_MAX} ký tự.`
  return errors
}

/** `startsAt` đúng chuỗi giờ trống backend trả (đã kèm +07:00). Ô bỏ trống gửi null */
export function directBookingBody(
  propertySiteId: string,
  startsAt: string,
  form: DirectBookingForm,
): DirectSurveyBookingRequest {
  return {
    propertySiteId,
    startsAt,
    contactName: form.contactName.trim() || null,
    contactPhone: form.contactPhone.trim() || null,
    note: form.note.trim() || null,
  }
}
