import type { ContractView } from '@/types/res/customerContractsRes'
import type { AcceptanceView, InstallationCustomerView } from '@/types/res/customerInstallationsRes'
import type {
  CollectionCaseView,
  ContractPaymentPlanView,
  InstallmentPaymentView,
  InstallmentView,
  SignatureSetView,
} from '@/types/res/paymentPlanRes'

// Luật của gói thanh toán 30/70, bám backend 7d27054 (PaymentPlanCalculator, InstallmentPaymentHandlers.PayableProblem,
// PaperSignatureHandlers, InstallationCustomerAcceptance, CollectionHandlers, FinanceOverview). Chỉ để bật / tắt nút và báo trước
// khi gửi; backend vẫn kiểm lại. Số tiền 30% / 70% luôn lấy từ backend, không tính ở đây. Không import giá trị qua "@/" để chạy
// được bằng node --test

export const SIGNED_PAGES_MAX = 50
export const SIGNATURE_NOTE_MAX = 500
export const ACCEPTANCE_REASON_MAX = 2000
export const ACCEPTANCE_EVIDENCE_MAX = 10
export const COLLECTION_SUMMARY_MAX = 2000
export const COLLECTION_REASON_MAX = 1000
export const COLLECTION_EVIDENCE_MAX = 10
export const FINANCE_PERIOD_MAX_DAYS = 366

// ---------- Phân nhánh 30/70 và hợp đồng cũ ----------

/** Hợp đồng trả 30/70 (`paymentPlan` khác null); null là hợp đồng cũ trả 100%, giữ luồng cũ */
export const isPaymentPlanContract = (
  c: Pick<ContractView, 'paymentPlan'>,
): c is ContractView & {
  paymentPlan: ContractPaymentPlanView
} => c.paymentPlan != null

/**
 * Các lệnh của luồng cũ (sửa bản nháp, phát hành, gắn PDF chính thức, gửi ký, bản quét, duyệt bản ký, phụ lục, huỷ bản nháp, thu
 * 100% hợp đồng) chỉ cho hợp đồng cũ: với 30/70 backend trả 409 CONTRACT_PAYMENT_PLAN_NOT_APPLICABLE / PAYMENT_CONTRACT_HAS_INSTALLMENTS
 */
export const legacyActionsAllowed = (c: Pick<ContractView, 'paymentPlan'>) => !isPaymentPlanContract(c)

export const installmentOf = (plan: Pick<ContractPaymentPlanView, 'installments'>, sequence: number) =>
  plan.installments.find((i) => i.sequence === sequence) ?? null

/**
 * Mua gói sau bán trên một hợp đồng (ServicePackageHandlers của backend 7d27054). Sau bán vẫn trả 100% trước. Hợp đồng 30/70 chỉ
 * mua được khi đã trả đủ (PAID) và không bao giờ gộp khoản 70% vào link mua gói; hợp đồng cũ đã ký chưa trả thì gộp tiền hợp đồng
 * (`with-contract`), đã trả thì mua riêng gói. null: hợp đồng chưa mua gói được
 */
export function packagePurchaseMode(c: Pick<ContractView, 'status' | 'paymentPlan'>) {
  if (c.status === 'PAID') return 'packages-only' as const
  if (c.status === 'SIGNED' && !isPaymentPlanContract(c)) return 'with-contract' as const
  return null
}

// ---------- Quyền theo vai trò (CONTRACT_AND_RBAC §2) ----------

export type PlanViewerRole = 'customer' | 'sales' | 'technician' | 'manager' | 'admin'

/**
 * Việc mỗi vai trò làm được trên một hợp đồng 30/70. Mọi kỹ thuật viên đọc được mọi hợp đồng, nhưng chỉ người đã khảo sát công
 * trình (`assigned`) mới thu tiền, tải trang ký, hẹn ngày: backend trả 404 cho người khác trên đường của kỹ thuật viên, nên người
 * khác đọc bằng đường chỉ đọc của nhân viên. Kinh doanh chỉ đọc; chỉ quản lý / quản trị xác nhận tiền mặt; khách trả trong ứng
 * dụng, không tải trang ký
 */
export function planPermissions(role: PlanViewerRole, { assigned = true }: { assigned?: boolean } = {}) {
  const staffWriter = role === 'manager' || role === 'admin'
  const fieldTechnician = role === 'technician' && assigned
  return {
    /** Đường đọc / mở thanh toán một khoản */
    installmentActor: role === 'customer' ? 'customer' : fieldTechnician ? 'technician' : 'staff',
    /** Mở / huỷ thanh toán một khoản */
    canOpenPayment: role === 'customer' || fieldTechnician,
    canConfirmCash: staffWriter,
    /** Tải / thay / chốt trang hợp đồng giấy */
    signatureWriter: fieldTechnician ? 'technician' : staffWriter ? 'support' : null,
    /** Ghi lịch thi công đã thống nhất với khách */
    canPlanSchedule: fieldTechnician,
    /** Ghi lịch thay, thử xác nhận lại, huỷ lịch */
    canManageSchedule: staffWriter,
    /** Nghiệm thu chỉ khách */
    canAccept: role === 'customer',
    /** Ghi theo dõi công nợ; xem xét pháp lý / đóng hồ sơ chỉ quản lý, quản trị */
    canRecordCollection: role === 'sales' || staffWriter,
    canDecideCollection: staffWriter,
  } as const
}

/**
 * Kỹ thuật viên có phải người đã khảo sát (phụ trách bán tại công trình) không, theo lần đọc khoản 30% trên đường của kỹ thuật viên:
 * đọc được là phải; 404 (CONTRACT_NOT_FOUND) là người khác, chỉ đọc; lỗi khác (mạng, 5xx) cũng chỉ đọc cho an toàn
 */
export function technicianAssignment(probe: { isPending: boolean; isSuccess: boolean; error: unknown }) {
  if (probe.isPending) return 'pending' as const
  if (probe.isSuccess) return 'assigned' as const
  return (probe.error as { status?: number } | null)?.status === 404 ? ('other' as const) : ('unknown' as const)
}

// ---------- Khách đổi ý sau khi đã đồng ý ----------

/**
 * Ghi "khách muốn sửa" / "khách không đồng ý" cho báo giá đã đồng ý được khi hợp đồng 30/70 còn là bản nháp và chưa mở thanh toán
 * khoản 30% (backend: QUOTATION_PAYMENT_STARTED khi đang mở QR / chờ xác nhận tiền mặt, 409 khi đã nhận tiền). Chưa đọc được thì để
 * backend quyết định
 */
export function agreementWithdrawal(
  contract: Pick<ContractView, 'status'> | null | undefined,
  deposit: Pick<InstallmentPaymentView, 'paymentState'> | null | undefined,
): 'allowed' | 'payment-open' | 'deposit-paid' | 'closed' {
  if (deposit?.paymentState === 'PAID') return 'deposit-paid'
  if (contract && contract.status !== 'DRAFT') return contract.status === 'DISCARDED' ? 'closed' : 'deposit-paid'
  if (deposit?.paymentState === 'ONLINE_IN_PROGRESS' || deposit?.paymentState === 'AWAITING_CASH_CONFIRMATION')
    return 'payment-open'
  return 'allowed'
}

// ---------- Hạn và quá hạn ----------

/** Quá hạn khi DUE và đã qua hạn, tính tới mili giây: đúng `dueAt` chưa quá hạn, `dueAt` + 1 giây là quá hạn */
export function isOverdueAt(i: Pick<InstallmentView, 'status' | 'dueAt'>, now: number) {
  if (i.status !== 'DUE' || !i.dueAt) return false
  const due = Date.parse(i.dueAt)
  return Number.isFinite(due) && now > due
}

/**
 * Ba con số khác nhau: còn lại (mọi khoản chưa trả, gồm khoản 70% chưa tới lúc trả), phải trả ngay (khoản DUE), quá hạn (khoản DUE
 * đã qua hạn). `outstanding` lấy của backend
 */
export function moneySplit(plan: Pick<ContractPaymentPlanView, 'installments' | 'outstanding'>, now: number) {
  const due = plan.installments.filter((i) => i.status === 'DUE')
  return {
    outstanding: plan.outstanding,
    dueNow: due.reduce((sum, i) => sum + i.amount, 0),
    overdue: due.filter((i) => isOverdueAt(i, now)).reduce((sum, i) => sum + i.amount, 0),
  }
}

// ---------- Thanh toán một khoản ----------

/** Việc khách phải làm trên hợp đồng 30/70 theo chặng của backend: trả 30% (bản nháp), trả 70% (đến hạn / quá hạn), không có gì */
export function customerPlanTodo(stage: string | null | undefined): 'pay-deposit' | 'pay-balance' | null {
  if (stage === 'DRAFT_CREATED') return 'pay-deposit'
  if (stage === 'BALANCE_DUE' || stage === 'BALANCE_OVERDUE') return 'pay-balance'
  return null
}

/** Mở được thanh toán: backend báo AWAITING_PAYMENT (DUE và hợp đồng ở đúng trạng thái) */
export const canOpenInstallment = (view: Pick<InstallmentPaymentView, 'paymentState'> | null | undefined) =>
  view?.paymentState === 'AWAITING_PAYMENT'

/** Huỷ được lần đang mở (đổi cách trả hoặc dừng) */
export const canCancelInstallment = (view: Pick<InstallmentPaymentView, 'paymentState'> | null | undefined) =>
  view?.paymentState === 'ONLINE_IN_PROGRESS' || view?.paymentState === 'AWAITING_CASH_CONFIRMATION'

/** Chỉ báo "đã trả" khi backend trả PAID cho cả khoản; trang PayOS chuyển về không phải bằng chứng */
export const isVerifiedInstallmentPaid = (
  view: Pick<InstallmentPaymentView, 'paymentState' | 'installmentStatus'> | null | undefined,
) => view?.paymentState === 'PAID' && view.installmentStatus === 'PAID'

/**
 * Vì sao chưa trả được một khoản (null là trả được hoặc đã trả), theo PayableProblem của backend: khoản 70% chỉ mở khi khách
 * nghiệm thu; khoản 30% chỉ trả khi hợp đồng còn là bản nháp
 */
export function installmentWaitReason(
  i: Pick<InstallmentView, 'kind' | 'status'>,
  contractStatus: string,
): 'balance-after-acceptance' | 'deposit-closed' | 'balance-needs-signature' | 'cancelled' | null {
  if (i.status === 'PAID') return null
  if (i.status === 'CANCELLED') return 'cancelled'
  if (i.status === 'PENDING') return 'balance-after-acceptance'
  if (i.kind === 'DEPOSIT' && contractStatus !== 'DRAFT') return 'deposit-closed'
  if (i.kind === 'BALANCE' && contractStatus !== 'SIGNED') return 'balance-needs-signature'
  return null
}

// ---------- Hợp đồng giấy đã ký ----------

/** Bắt đầu tải trang ký được: đã nhận 30% và hợp đồng đang chờ ký (backend: CONTRACT_DEPOSIT_REQUIRED trước đó) */
export function canStartSignature(c: Pick<ContractView, 'status' | 'paymentPlan'>) {
  if (!c.paymentPlan) return false
  return (
    c.paymentPlan.depositPaid && c.status === 'AWAITING_SIGNATURE' && c.paymentPlan.signature?.status !== 'FINALIZED'
  )
}

/** Chốt được: đang tải và đủ mọi trang 1..N */
export const canFinalizeSignature = (
  set: Pick<SignatureSetView, 'status' | 'missingPages' | 'uploadedPageCount' | 'expectedPageCount'> | null | undefined,
) => set?.status === 'UPLOADING' && set.missingPages.length === 0 && set.uploadedPageCount === set.expectedPageCount

/** Trang thay được khi bộ trang chưa chốt */
export const canReplacePage = (set: Pick<SignatureSetView, 'status'> | null | undefined) => set?.status === 'UPLOADING'

/** Trang hiện hành của mỗi số trang (bỏ trang đã bị thay) */
export function currentPages<T extends { pageNumber: number; replacedAt: string | null }>(pages: T[]) {
  return pages.filter((p) => p.replacedAt === null).sort((a, b) => a.pageNumber - b.pageNumber)
}

export function pageCountError(value: string) {
  const text = value.trim()
  if (!text) return 'Ghi số trang của hợp đồng giấy.'
  const n = Number(text)
  if (!Number.isInteger(n) || n < 1 || n > SIGNED_PAGES_MAX) return `Số trang từ 1 tới ${SIGNED_PAGES_MAX}.`
  return null
}

/** Ngày ký ghi trên giấy: không bắt buộc, không sau hôm nay (giờ Việt Nam, YYYY-MM-DD) */
export function signedOnError(value: string, today: string) {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Ngày không hợp lệ.'
  return value > today ? 'Ngày ký không sau hôm nay.' : null
}

export const signatureNoteError = (note: string) =>
  note.trim().length > SIGNATURE_NOTE_MAX ? `Ghi chú tối đa ${SIGNATURE_NOTE_MAX} ký tự.` : null

/**
 * Xếp các tệp vừa chọn vào số trang: từ `startPage` (mặc định trang thiếu đầu tiên) đi lên, bỏ qua trang đã có tệp trừ khi là
 * trang được chọn để thay; thừa so với số trang thì bỏ lại (trả về trong `extra`)
 */
export function assignToPages<T>(
  items: T[],
  { expected, filled, startPage }: { expected: number; filled: number[]; startPage?: number },
) {
  const taken = new Set(filled)
  const assigned: { item: T; pageNumber: number }[] = []
  let page = startPage ?? 1
  const queue = [...items]
  // Trang được chọn rõ (thay một trang) nhận tệp đầu tiên dù đã có tệp
  if (startPage !== undefined && queue.length > 0 && page <= expected) {
    assigned.push({ item: queue.shift()!, pageNumber: page })
    taken.add(page)
    page++
  }
  while (queue.length > 0 && page <= expected) {
    if (!taken.has(page)) {
      assigned.push({ item: queue.shift()!, pageNumber: page })
      taken.add(page)
    }
    page++
  }
  return { assigned, extra: queue }
}

// ---------- Khách nghiệm thu ----------

export type AcceptanceDecision = 'ACCEPT' | 'REQUEST_REWORK' | 'REJECT'

/** Báo cáo hoàn thành đang chờ khách quyết định */
export function pendingAcceptance(p: Pick<InstallationCustomerView, 'status' | 'acceptances'>): AcceptanceView | null {
  if (p.status !== 'PENDING_CUSTOMER_ACCEPTANCE') return null
  return p.acceptances.find((a) => a.decision === 'PENDING') ?? null
}

export const canCustomerDecide = (p: Pick<InstallationCustomerView, 'status' | 'acceptances'>) =>
  pendingAcceptance(p) !== null

export function acceptanceErrors(decision: AcceptanceDecision, reason: string, evidenceCount: number) {
  const errors: { reason?: string; evidence?: string } = {}
  const text = reason.trim()
  if (decision !== 'ACCEPT' && !text) errors.reason = 'Ghi điều cần sửa để kỹ thuật viên làm lại.'
  else if (text.length > ACCEPTANCE_REASON_MAX) errors.reason = `Tối đa ${ACCEPTANCE_REASON_MAX} ký tự.`
  if (evidenceCount > ACCEPTANCE_EVIDENCE_MAX) errors.evidence = `Tối đa ${ACCEPTANCE_EVIDENCE_MAX} tệp.`
  if (decision === 'ACCEPT' && evidenceCount > 0) errors.evidence = 'Ảnh chỉ gửi kèm khi yêu cầu làm lại.'
  return errors
}

// ---------- Thu hồi công nợ ----------

export type CollectionRole = 'sales' | 'manager' | 'admin'
export type CollectionKind = 'CONTACT' | 'NEGOTIATION' | 'AGREEMENT' | 'NOTE'

export const isCollectionOpen = (c: Pick<CollectionCaseView, 'status'>) => c.status !== 'RESOLVED'

/** Chuyển quản lý: kinh doanh, quản lý, quản trị; không khi đã chuyển / đang xem xét pháp lý / đã đóng */
export const canEscalate = (c: Pick<CollectionCaseView, 'status'>) =>
  isCollectionOpen(c) && c.status !== 'ESCALATED_TO_MANAGER' && c.status !== 'LEGAL_REVIEW_REQUIRED'

/** Chuyển xem xét pháp lý: chỉ quản lý / quản trị */
export const canRequestLegalReview = (c: Pick<CollectionCaseView, 'status'>, role: CollectionRole) =>
  role !== 'sales' && isCollectionOpen(c) && c.status !== 'LEGAL_REVIEW_REQUIRED'

/** Đóng hồ sơ: chỉ quản lý / quản trị. Đóng không có nghĩa khách đã trả */
export const canResolve = (c: Pick<CollectionCaseView, 'status'>, role: CollectionRole) =>
  role !== 'sales' && isCollectionOpen(c)

export function collectionActivityErrors(
  form: { kind: CollectionKind; summary: string; promisedPaymentDate: string; evidenceCount: number },
  today: string,
) {
  const errors: { summary?: string; promisedPaymentDate?: string; evidence?: string } = {}
  const text = form.summary.trim()
  if (!text) errors.summary = 'Ghi lại đã trao đổi gì với khách.'
  else if (text.length > COLLECTION_SUMMARY_MAX) errors.summary = `Tối đa ${COLLECTION_SUMMARY_MAX} ký tự.`
  if (form.kind === 'AGREEMENT') {
    if (!form.promisedPaymentDate) errors.promisedPaymentDate = 'Ghi ngày khách hẹn trả.'
    else if (form.promisedPaymentDate < today) errors.promisedPaymentDate = 'Ngày hẹn không trước hôm nay.'
  }
  if (form.evidenceCount > COLLECTION_EVIDENCE_MAX) errors.evidence = `Tối đa ${COLLECTION_EVIDENCE_MAX} tệp.`
  return errors
}

export function collectionReasonError(reason: string) {
  const text = reason.trim()
  if (!text) return 'Ghi lý do.'
  return text.length > COLLECTION_REASON_MAX ? `Tối đa ${COLLECTION_REASON_MAX} ký tự.` : null
}

// ---------- Báo cáo tài chính ----------

const dayNumber = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000)

/** Khoảng ngày (YYYY-MM-DD, giờ Việt Nam): `to` không trước `from`, tối đa 366 ngày như backend */
export function financePeriodError(from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return 'Chọn ngày bắt đầu và ngày kết thúc.'
  if (to < from) return 'Ngày kết thúc không trước ngày bắt đầu.'
  if (dayNumber(to) - dayNumber(from) > FINANCE_PERIOD_MAX_DAYS) return `Tối đa ${FINANCE_PERIOD_MAX_DAYS} ngày.`
  return null
}

/** Tháng chứa `today` (YYYY-MM-DD): ngày 1 tới ngày cuối tháng, như mặc định của backend */
export function monthOf(today: string) {
  const [y, m] = today.split('-').map(Number) as [number, number]
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const mm = String(m).padStart(2, '0')
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, '0')}` }
}
