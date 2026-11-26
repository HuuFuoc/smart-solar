import type { Tone } from '@/components/common/ui/badge'
import { goToBlock } from '@/features/contracts/goToBlock'
import { readContractSnapshot } from '@/features/payment-plan/contractSnapshot'
import {
  formatVnd,
  installmentName,
  installmentStatusMeta,
  planTrackerSteps,
  stageMeta,
} from '@/features/payment-plan/paymentPlanDisplay'
import { formatDateVn, formatMoment } from '@/features/scheduling/schedulingDisplay'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { InstallationScheduleView } from '@/types/res/installationSchedulesRes'
import type { ContractPaymentPlanView, InstallmentView } from '@/types/res/paymentPlanRes'
import { ROUTES, withId } from '@/routes/paths'

// Câu và số của trang hợp đồng 30/70 phía kỹ thuật viên (thiết kế người dùng gửi ngày 26/11/2026). Chỉ đọc số backend trả, không
// tính lại tiền; trạng thái từng bước lấy từ planTrackerSteps để cùng nghĩa với các trang khác

/** Màu chữ theo nghĩa, cùng thang với Badge */
export const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-fg-2',
  ok: 'text-ok',
  info: 'text-info',
  accent: 'text-accent-fg',
  warn: 'text-warn',
  danger: 'text-danger',
}

export type QuickAction = { icon: string; label: string } & ({ to: string } | { onClick: () => void })

/** Việc làm nhanh của kỹ thuật viên đã khảo sát, theo chặng của hợp đồng: cuộn tới khối làm việc hoặc mở trang công trình */
export function quickActions({
  plan,
  live,
  schedulable,
  scheduleLocked,
  onPrint,
}: {
  plan: ContractPaymentPlanView
  live: Pick<InstallationScheduleView, 'projectId'> | null
  schedulable: boolean
  scheduleLocked: boolean
  onPrint: () => void
}): QuickAction[] {
  const actions: QuickAction[] = []
  if (plan.stage === 'DRAFT_CREATED')
    actions.push({ icon: 'payments', label: 'Thu khoản 30%', onClick: () => goToBlock('installments') })
  if (plan.stage === 'DEPOSIT_VERIFIED')
    actions.push({
      icon: 'photo_camera',
      label: 'Tải ảnh trang hợp đồng giấy',
      onClick: () => goToBlock('paper-signature'),
    })
  if (live?.projectId)
    actions.push({
      icon: 'construction',
      label: 'Mở công trình thi công',
      to: withId(ROUTES.tech.installation, live.projectId),
    })
  if (schedulable && !scheduleLocked)
    actions.push({
      icon: 'event_available',
      label: live ? 'Đổi ngày thi công' : 'Hẹn ngày thi công',
      onClick: () => goToBlock('installation-schedule'),
    })
  if (plan.stage === 'DRAFT_CREATED' || plan.stage === 'DEPOSIT_VERIFIED')
    actions.push({ icon: 'print', label: 'In hợp đồng cho khách ký', onClick: onPrint })
  return actions
}

export type TechStep = {
  label: string
  icon: string
  state: 'done' | 'current' | 'todo'
  /** Giờ, ngày hẹn hoặc số tiền của bước */
  detail: string | null
  note: string | null
}

const STEP_ICONS = ['payments', 'signature', 'engineering', 'account_balance_wallet']
const STEP_LABELS = ['Trả 30% cọc', 'Ký hợp đồng giấy', 'Thi công, nghiệm thu', 'Trả 70% còn lại']

const paidText = (i: InstallmentView) => `Đã thu ${formatVnd(i.paidAmount ?? i.amount)}`

/** Khách đã nghiệm thu: khoản 70% chỉ mở (DUE) khi khách nghiệm thu công trình */
const accepted = (balance: InstallmentView | undefined) =>
  balance !== undefined && (balance.status === 'DUE' || balance.status === 'PAID')

/** Bốn bước của hợp đồng 30/70, mỗi bước kèm giờ / số tiền và một câu ngắn */
export function techSteps(
  plan: ContractPaymentPlanView,
  live: Pick<InstallationScheduleView, 'startsAt'> | null,
): TechStep[] {
  const states = planTrackerSteps(plan).map((s) => s.state)
  const deposit = plan.installments.find((i) => i.kind === 'DEPOSIT')
  const balance = plan.installments.find((i) => i.kind === 'BALANCE')
  const sig = plan.signature

  const depositStep = {
    detail: deposit?.paidAt ? formatMoment(deposit.paidAt) : deposit ? formatVnd(deposit.amount) : null,
    note: !deposit
      ? null
      : deposit.status === 'PAID'
        ? paidText(deposit)
        : deposit.status === 'CANCELLED'
          ? 'Đã huỷ'
          : 'Chờ khách trả',
  }
  const paperStep = {
    detail: sig?.finalizedAt ? formatMoment(sig.finalizedAt) : null,
    note:
      sig?.status === 'FINALIZED'
        ? `${sig.expectedPageCount} trang đã chốt`
        : sig?.status === 'UPLOADING'
          ? `Đã tải ${sig.uploadedPageCount}/${sig.expectedPageCount} trang`
          : plan.depositPaid
            ? 'Chờ khách ký bản in'
            : 'Mở sau khi trả 30%',
  }
  const done = accepted(balance)
  const installStep = {
    detail:
      done && balance?.openedAt ? formatMoment(balance.openedAt) : live ? `Hẹn: ${formatDateVn(live.startsAt)}` : null,
    note: done
      ? 'Khách đã nghiệm thu'
      : plan.readyForInstallation
        ? 'Sẵn sàng thi công'
        : live
          ? 'Lịch dự kiến'
          : 'Chưa hẹn ngày',
  }
  const balanceStep = !balance
    ? { detail: null, note: null }
    : balance.status === 'PAID'
      ? { detail: formatMoment(balance.paidAt), note: paidText(balance) }
      : balance.status === 'DUE'
        ? {
            detail: balance.dueAt ? `Hạn ${formatMoment(balance.dueAt)}` : formatVnd(balance.amount),
            note: balance.overdue ? 'Đã quá hạn' : `Chờ khách trả ${formatVnd(balance.amount)}`,
          }
        : balance.status === 'CANCELLED'
          ? { detail: formatVnd(balance.amount), note: 'Đã huỷ' }
          : { detail: formatVnd(balance.amount), note: 'Mở sau nghiệm thu' }

  return [depositStep, paperStep, installStep, balanceStep].map((s, i) => ({
    ...s,
    label: STEP_LABELS[i]!,
    icon: STEP_ICONS[i]!,
    state: states[i] ?? 'todo',
  }))
}

/** "Chờ thanh toán 70%" ở đầu trang; hợp đồng đã huỷ không ghi */
export function paymentProgressLabel(plan: ContractPaymentPlanView) {
  if (plan.stage === 'DISCARDED') return null
  if (plan.fullyPaid) return 'Đã trả đủ 100%'
  return plan.depositPaid ? 'Chờ thanh toán 70%' : 'Chờ thanh toán 30%'
}

/** "26/11 16:29" (giờ Việt Nam) cho ô nhỏ */
export const shortMoment = (iso: string | null | undefined) => formatMoment(iso).replace(/^(\d{2}\/\d{2})\/\d{4}/, '$1')

const PURPOSES: Record<string, string> = {
  DEPOSIT: 'Trả trước khi ký hợp đồng giấy',
  BALANCE: 'Quyết toán sau nghiệm thu',
}

/** Dòng phụ dưới tên khoản */
export const installmentPurpose = (i: Pick<InstallmentView, 'kind'>) => PURPOSES[i.kind] ?? null

/** Phần trăm đã trả, làm tròn */
export const paidPercent = (plan: Pick<ContractPaymentPlanView, 'paid' | 'total'>) =>
  plan.total > 0 ? Math.round((plan.paid / plan.total) * 100) : 0

const csvCell = (value: string | number | null | undefined) => {
  const text = value == null ? '' : String(value)
  // Ô bắt đầu bằng = + - @ bị Excel hiểu là công thức
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** Tệp CSV (có BOM để Excel đọc đúng tiếng Việt) của một hợp đồng: số chung, hai khoản, các dòng báo giá, gói đi kèm */
export function contractCsv(c: ContractView, plan: ContractPaymentPlanView) {
  const s = readContractSnapshot(c.pricingSnapshot, c.customerSnapshot)
  const rows: (string | number | null)[][] = [
    ['Số hợp đồng', c.contractNumber],
    ['Phiên bản', c.version],
    ['Khách hàng', s.customer.name],
    ['Số điện thoại', s.customer.phone],
    ['Công trình', s.customer.propertyName],
    ['Địa chỉ', s.customer.address],
    ['Tình hình', stageMeta(plan.stage).label],
    ['Tổng giá trị (VND)', plan.total],
    ['Đã trả (VND)', plan.paid],
    ['Còn lại (VND)', plan.outstanding],
    [],
    ['Khoản', 'Tỷ lệ (%)', 'Số tiền (VND)', 'Trạng thái', 'Hạn', 'Ngày trả'],
    ...plan.installments.map((i) => [
      installmentName(i),
      i.percent,
      i.amount,
      installmentStatusMeta(i.status).label,
      i.dueAt ? formatMoment(i.dueAt) : '',
      i.paidAt ? formatMoment(i.paidAt) : '',
    ]),
    [],
    ['Sản phẩm', 'Mã', 'Số lượng', 'Đơn vị', 'Đơn giá (VND)', 'Thành tiền (VND)'],
    ...s.lines.map((l) => [l.name, l.sku, l.quantity, l.unit, l.unitPrice, l.lineTotal]),
  ]
  const packages = c.servicePackages ?? []
  if (packages.length > 0)
    rows.push(
      [],
      ['Gói đi kèm', 'Số tấm pin', 'Thành tiền (VND)', 'Trong đợt 1 (VND)', 'Trong đợt 2 (VND)'],
      ...packages.map((p) => [p.packageName, p.quantity, p.totalAmount, p.depositAllocation, p.balanceAllocation]),
    )
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
}

export function downloadCsv(csv: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
