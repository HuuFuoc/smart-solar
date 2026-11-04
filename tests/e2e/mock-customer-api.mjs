// Backend giả cho E2E của cổng khách hàng: trả lời /api/** trong trình duyệt bằng page.route, giữ trạng thái trong bộ nhớ.
// Bám handler của backend `main` (7c79fa8): ContractHandlers (khách xem, gửi bản ký), PaymentService (tạo / xem / huỷ link,
// một link sống mỗi hợp đồng, 5 link / 10 phút), ServiceCustomerHandlers (đặt lượt bảo trì, đổi giờ, xin xét lại, báo lỗi từ
// bảo trì, thông báo), ZoneHandlers.SetSiteLocationAsync. Mã lỗi → HTTP status theo OperationResultControllerBase.StatusFor.
// Phần nhân viên duyệt bản ký và PayOS xác nhận tiền được giả bằng hàm đổi trạng thái. Chỉ dùng trong test
import { createHash } from 'node:crypto'

const DAY = 86_400_000
const HOUR = 3_600_000
const iso = (ms) => new Date(ms).toISOString()
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
export const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')

export function token(role, sub) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ sub, email: `${sub}@test.vn`, role, exp })}.sig`
}

const ok = (data, status = 200) => ({ status, body: { isSuccess: true, traceId: 't', data } })

function statusFor(code) {
  if (code.endsWith('NOT_FOUND')) return 404
  if (code.includes('VALIDATION') || ['FILE_WRONG_PURPOSE', 'AFTER_SALES_REASON_REQUIRED'].includes(code)) return 400
  if (code === 'FILE_NOT_OWNED') return 403
  if (code.startsWith('ADMINISTRATIVE_LOCATION_') || code === 'SITE_LOCATION_REQUIRED') return 422
  if (['PAYMENT_PROVIDER_NOT_CONFIGURED', 'FILE_STORAGE_UNAVAILABLE'].includes(code)) return 503
  if (code === 'PAYMENT_TOO_MANY_ATTEMPTS') return 429
  return 409
}
const fail = (code, message = code, details = null) => ({
  status: statusFor(code),
  body: { isSuccess: false, traceId: 't', data: null, error: { code, message, details } },
})

/** Bytes của PDF chính thức mà nhân viên kinh doanh gửi khách (test dùng cùng nội dung để kiểm SHA-256 trên máy) */
export const OFFICIAL_PDF = Buffer.from('%PDF-1.4\n% hop dong chinh thuc v1\n%%EOF\n')
export const OFFICIAL_PDF_V2 = Buffer.from('%PDF-1.4\n% hop dong chinh thuc v2 (phu luc)\n%%EOF\n')
export const SIGNED_PDF = Buffer.from('%PDF-1.4\n% ban da ky\n%%EOF\n')

export const CUSTOMER = 'cust-1'
export const SR = 'sr-1'
export const SITE = 'site-1'

export function contractView(extra = {}) {
  return {
    contractId: 'c-1',
    contractNumber: 'HD-20261103-ABC234',
    version: 1,
    previousContractId: null,
    quotationId: 'q-1',
    quotationVersion: 1,
    surveyRequestId: SR,
    status: 'AWAITING_SIGNATURE',
    currency: 'VND',
    totalAmount: 32_400_000,
    pricingSnapshot: {},
    customerSnapshot: {},
    terms: 'Điều 1. Bảo hành lắp đặt 12 tháng.',
    canonicalHash: 'ab12cd34ef56'.padEnd(64, '0'),
    officialDocument: { fileId: 'f-official', sha256: sha(OFFICIAL_PDF), confirmedAt: '2026-11-01T02:00:00Z' },
    signedDocument: null,
    rejectionReason: null,
    issuedAt: '2026-11-01T01:00:00Z',
    publishedAt: '2026-11-01T02:00:00Z',
    signedAt: null,
    paidAt: null,
    revision: 4,
    submissions: [],
    events: null,
    warrantyMonths: 12,
    customerUserId: CUSTOMER,
    ...extra,
  }
}

const VISIBLE = ['AWAITING_SIGNATURE', 'UNDER_REVIEW', 'SIGNATURE_REJECTED', 'SIGNED', 'PAID', 'SUPERSEDED']

export function entitlementView(extra = {}) {
  return {
    entitlementId: 'ent-1',
    planMonth: 6,
    periodStartsAt: iso(Date.now() - 30 * DAY),
    periodEndsAt: iso(Date.now()),
    status: 'AVAILABLE',
    currentRequestId: null,
    extendedUntil: null,
    consumedAt: null,
    ...extra,
  }
}

export function subscriptionView(extra = {}) {
  return {
    subscriptionId: 'sub-1',
    contractId: 'c-paid',
    projectId: 'p-1',
    kind: 'MAINTENANCE',
    status: 'ACTIVE',
    packageName: 'Bảo trì định kỳ 2 lần',
    price: 1_500_000,
    durationMonths: 12,
    visitMonths: [6, 12],
    coveredDisasterTypes: [],
    coveragePercent: null,
    perIncidentLimit: null,
    termLimit: null,
    startsAt: iso(Date.now() - 180 * DAY),
    endsAt: iso(Date.now() + 180 * DAY),
    coverageStartsAt: null,
    supportReserved: 0,
    supportConsumed: 0,
    supportAvailable: null,
    remainingVisits: 2,
    checkoutExpiresAt: null,
    currentPaymentAttemptId: null,
    paidAt: iso(Date.now() - 190 * DAY),
    cancellationRequestedAt: null,
    entitlements: [entitlementView(), entitlementView({ entitlementId: 'ent-2', planMonth: 12, status: 'CONSUMED' })],
    ...extra,
  }
}

export function serviceRequest(extra = {}) {
  return {
    requestId: 'req-1',
    requestNumber: 'SV-20261103-0001',
    kind: 'MAINTENANCE',
    status: 'SUBMITTED',
    projectId: 'p-1',
    description: 'Bảo trì lượt 6',
    suspectedAssetId: null,
    preferredStartsAt: iso(Date.now() + 10 * DAY),
    installationWarrantyEndsAt: null,
    withinInstallationWarranty: false,
    withinRepairWarranty: false,
    warrantySourceRequestId: null,
    originRequestId: null,
    duplicateOfRequestId: null,
    maintenanceEntitlementId: null,
    outcome: null,
    customerDecisionReason: null,
    acceptanceRequestedAt: null,
    completedAt: null,
    repairWarrantyMonths: null,
    repairWarrantyStartsAt: null,
    repairWarrantyEndsAt: null,
    cancellationRequestedAt: null,
    cancellationReason: null,
    cancelledAt: null,
    createdAt: iso(Date.now() - DAY),
    revision: 1,
    items: [],
    visits: [],
    quotations: [],
    claim: null,
    evidence: [],
    possibleDuplicates: [],
    history: null,
    customerUserId: CUSTOMER,
    ...extra,
  }
}

export function visitView(extra = {}) {
  return {
    visitId: 'v-1',
    purpose: 'MAINTENANCE',
    status: 'SCHEDULED',
    technicianUserId: 'tech-1',
    technicianName: 'Kỹ thuật viên A',
    startsAt: iso(Date.now() + 3 * DAY),
    endsAt: iso(Date.now() + 3 * DAY + 2 * HOUR),
    assignmentStatus: 'ACCEPTED',
    customerConfirmationRequired: false,
    customerConfirmedAt: null,
    startedAt: null,
    report: null,
    reportedAt: null,
    findingNote: null,
    companyRescheduleReason: null,
    ...extra,
  }
}

export function claimView(extra = {}) {
  return {
    claimId: 'cl-1',
    disasterType: 'STORM',
    incidentOccurredAt: iso(Date.now() - 10 * DAY),
    status: 'REJECTED',
    decisionReason: 'Ảnh chưa cho thấy hư hại do bão.',
    reconsiderationRequestedAt: null,
    canRequestReconsideration: true,
    subscriptionId: 'sub-d',
    coveragePercent: 70,
    perIncidentLimit: 20_000_000,
    supportReserved: 0,
    supportConsumed: 0,
    ...extra,
  }
}

function surveyRequest() {
  return {
    surveyRequestId: SR,
    preSurveyId: 'ps-1',
    propertySiteId: SITE,
    propertyName: 'Nhà phố Bến Thành',
    status: 'PENDING',
    submittedAt: '2026-10-25T02:00:00Z',
    scheduledAt: null,
    appointment: null,
  }
}

export function createCustomerState(extra = {}) {
  return {
    role: 'CUSTOMER',
    userId: CUSTOMER,
    requests: [],
    /** Hợp đồng không thuộc khách: backend trả 404 */
    notOwner: false,
    providerNotConfigured: false,
    paymentStatusRateLimited: false,
    contracts: [contractView()],
    attempts: [],
    files: {},
    subscriptions: [],
    serviceRequests: [],
    notifications: [],
    surveyRequests: [surveyRequest()],
    sites: { [SITE]: { communeCode: null } },
    communes: [
      { code: '26734', name: 'Phường Bến Thành', unitType: 'WARD', provinceCode: '79' },
      { code: '26740', name: 'Phường Sài Gòn', unitType: 'WARD', provinceCode: '79' },
    ],
    surfaces: {},
    packages: [],
    /** Cài đặt afterSales.maintenanceBookingLeadDays của backend (quản trị đổi được) */
    bookingLeadDays: 7,
    ...extra,
  }
}

// ---------- Việc của nhân viên / PayOS (gọi thẳng trong test) ----------

/** Kinh doanh hoặc quản lý duyệt / từ chối bản ký đang chờ */
export function reviewSignature(state, contractId, approve, reason = null) {
  const c = state.contracts.find((x) => x.contractId === contractId)
  const pending = c.submissions.find((s) => s.outcome === 'PENDING')
  pending.outcome = approve ? 'APPROVED' : 'REJECTED'
  pending.reviewedAt = iso(Date.now())
  pending.rejectionReason = approve ? null : reason
  c.status = approve ? 'SIGNED' : 'SIGNATURE_REJECTED'
  c.rejectionReason = approve ? null : reason
  if (approve) c.signedAt = iso(Date.now())
  c.revision++
}

/** Phụ lục được phát hành và gửi ký: bản cũ bị thay, bản mới có PDF chính thức khác */
export function publishAmendment(state, contractId) {
  const old = state.contracts.find((x) => x.contractId === contractId)
  old.status = 'SUPERSEDED'
  old.revision++
  const next = contractView({
    contractId: `${contractId}-v2`,
    contractNumber: old.contractNumber,
    version: old.version + 1,
    previousContractId: old.contractId,
    canonicalHash: 'ff99'.padEnd(64, '1'),
    officialDocument: { fileId: 'f-official-2', sha256: sha(OFFICIAL_PDF_V2), confirmedAt: iso(Date.now()) },
  })
  state.contracts.push(next)
  return next
}

/** PayOS xác nhận đã nhận tiền (webhook có chữ ký): link → PAID, hợp đồng SIGNED → PAID */
export function payosConfirms(state, contractId) {
  const attempt = state.attempts.find(
    (a) => a.contractId === contractId && ['PENDING', 'PROCESSING'].includes(a.status),
  )
  const c = state.contracts.find((x) => x.contractId === contractId)
  attempt.status = 'PAID'
  attempt.paidAt = iso(Date.now())
  attempt.providerReference = 'FT123456'
  c.status = 'PAID'
  c.paidAt = attempt.paidAt
  c.revision++
}

/** Link mua gói kèm hợp đồng (đã tạo ở trang Gói dịch vụ) */
export function packageCheckoutWithContract(state, contractId, packagePrice) {
  const c = state.contracts.find((x) => x.contractId === contractId)
  return addAttempt(state, c, c.totalAmount + packagePrice)
}

function addAttempt(state, c, amount, status = 'PENDING') {
  const orderCode = 1_000_000 + state.attempts.length + 1
  const attempt = {
    paymentAttemptId: `pa-${state.attempts.length + 1}`,
    contractId: c.contractId,
    orderCode,
    amount,
    currency: 'VND',
    status,
    checkoutUrl: status === 'PENDING' ? `https://pay.payos.mock/web/${orderCode}` : null,
    qrCode: status === 'PENDING' ? '000201010212...' : null,
    expiresAt: iso(Date.now() + 15 * 60_000),
    paidAt: null,
    providerReference: null,
    failureReason: status === 'FAILED' ? 'NotConfigured' : null,
    createdAt: iso(Date.now()),
  }
  state.attempts.push(attempt)
  return attempt
}

const payable = (a) => ['PENDING', 'PROCESSING'].includes(a.status)

function paymentView(state, c) {
  // Đối soát: link quá hạn thì hết hạn
  for (const a of state.attempts)
    if (a.contractId === c.contractId && payable(a) && Date.parse(a.expiresAt) <= Date.now()) a.status = 'EXPIRED'
  const attempts = state.attempts
    .filter((a) => a.contractId === c.contractId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const view = (a) => ({ ...a, checkoutUrl: payable(a) ? a.checkoutUrl : null, qrCode: payable(a) ? a.qrCode : null })
  const current = attempts.find((a) => a.status === 'PAID') ?? attempts.find(payable) ?? null
  return {
    contractId: c.contractId,
    contractStatus: c.status,
    amount: c.totalAmount,
    currency: 'VND',
    current: current && view(current),
    attempts: attempts.map(view),
    history: null,
  }
}

const strip = ({ customerUserId: _owner, ...rest }) => rest

// ---------- Trả lời request ----------

export function handleCustomer(state, method, url, bodyText) {
  const u = new URL(url)
  const path = u.pathname.replace(/^\/api/, '')
  const q = Object.fromEntries(u.searchParams)
  const body = bodyText ? JSON.parse(bodyText) : undefined
  state.requests.push({ method, path, query: q, body })
  const m = (re) => path.match(re)
  const now = Date.now()

  if (method === 'POST' && path === '/auth/refresh')
    return ok({
      accessToken: token(state.role, state.userId),
      accessTokenExpiresAt: iso(now + HOUR),
      refreshToken: 'refresh-2',
      refreshTokenExpiresAt: iso(now + DAY),
      tokenType: 'Bearer',
      userId: state.userId,
    })

  // Khung và các mục menu
  if (method === 'GET' && path === '/customers/me/quotations') return ok([])
  if (method === 'GET' && path === '/customers/me/installation-projects') return ok([])
  if (method === 'GET' && path === '/customers/me/survey-requests') return ok(state.surveyRequests)
  if (method === 'GET' && path === '/customers/me/after-sales/packages')
    return ok(state.packages.filter((p) => !q.kind || p.kind === q.kind))
  if (method === 'GET' && path === '/customers/me/after-sales/subscriptions') return ok(state.subscriptions)
  if (method === 'GET' && path === '/customers/me/after-sales/notifications') return ok(state.notifications)
  if (method === 'GET' && path === '/customers/me/after-sales/requests')
    return ok(
      state.serviceRequests.map((r) => ({
        requestId: r.requestId,
        requestNumber: r.requestNumber,
        kind: r.kind,
        status: r.status,
        projectId: r.projectId,
        description: r.description,
        preferredStartsAt: r.preferredStartsAt,
        createdAt: r.createdAt,
      })),
    )

  // Tệp
  if (method === 'POST' && path === '/files/presigned-upload')
    return ok({
      uploadUrl: 'https://s3.mock.test/upload',
      method: 'PUT',
      bucket: 'b',
      objectKey: `x/${body.fileName}`,
      headers: { 'Content-Type': body.contentType },
      expiresAt: iso(now + 300_000),
    })
  if (method === 'POST' && path === '/files') {
    const fileId = `file-${Object.keys(state.files).length + 1}`
    state.files[fileId] = {
      fileId,
      purpose: body.purpose,
      uploadedBy: state.userId,
      status: 'VERIFIED',
      checksumSha256: body.checksumSha256,
      originalFileName: body.fileName,
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
      rejectionReason: null,
    }
    return ok(state.files[fileId], 201)
  }

  // Hợp đồng của khách
  const visibleContract = (id) => {
    const c = state.contracts.find((x) => x.contractId === id)
    return !c || state.notOwner || c.customerUserId !== state.userId || !VISIBLE.includes(c.status) ? null : c
  }
  if (method === 'GET' && path === '/customers/me/contracts')
    return ok(state.notOwner ? [] : state.contracts.filter((c) => VISIBLE.includes(c.status)).map(strip))
  let hit = m(/^\/customers\/me\/contracts\/([^/]+)$/)
  if (hit && method === 'GET') {
    const c = visibleContract(hit[1])
    return c ? ok(strip(c)) : fail('CONTRACT_NOT_FOUND')
  }
  // Link ký sẵn của PDF chính thức / bản khách đã ký (ContractDocumentUrlHandlers): chỉ chủ hợp đồng, sống vài phút
  hit = m(/^\/customers\/me\/contracts\/([^/]+)\/(official-document|submissions\/([^/]+))\/url$/)
  if (hit && method === 'GET') {
    const c = visibleContract(hit[1])
    if (!c) return fail('CONTRACT_NOT_FOUND')
    if (!['inline', 'attachment'].includes(q.disposition))
      return fail('VALIDATION_FAILED', 'disposition must be inline or attachment.')
    const fileId = hit[3] ? c.submissions.find((x) => x.submissionId === hit[3])?.fileId : c.officialDocument?.fileId
    if (!fileId) return fail('CONTRACT_DOCUMENT_NOT_FOUND')
    return ok({
      id: fileId,
      url: `https://files.example.test/${fileId}.pdf?disposition=${q.disposition}&sig=mock`,
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      disposition: q.disposition,
      contentType: 'application/pdf',
      fileName: hit[3] ? 'ban-da-ky.pdf' : 'hop-dong.pdf',
    })
  }
  hit = m(/^\/customers\/me\/contracts\/([^/]+)\/signed-document$/)
  if (hit && method === 'POST') {
    const c = visibleContract(hit[1])
    if (!c) return fail('CONTRACT_NOT_FOUND')
    const file = state.files[body?.fileId]
    if (!file) return fail('FILE_NOT_FOUND')
    if (file.purpose !== 'SIGNED_CONTRACT') return fail('FILE_WRONG_PURPOSE')
    if (file.uploadedBy !== state.userId) return fail('FILE_NOT_OWNED')
    if (file.status !== 'VERIFIED') return fail('FILE_NOT_VERIFIED')
    if (!['AWAITING_SIGNATURE', 'SIGNATURE_REJECTED'].includes(c.status)) return fail('CONTRACT_INVALID_STATE')
    if (
      (c.officialDocument?.sha256 ?? '').toLowerCase() !==
      String(body.officialDocumentSha256 ?? '')
        .trim()
        .toLowerCase()
    )
      return fail('CONTRACT_WRONG_DOCUMENT_VERSION')
    if (c.submissions.some((s) => s.fileId === file.fileId)) return fail('FILE_ALREADY_LINKED')
    const at = iso(now)
    c.submissions.push({
      submissionId: `s-${c.submissions.length + 1}`,
      fileId: file.fileId,
      fileSha256: file.checksumSha256,
      officialDocumentSha256: c.officialDocument.sha256,
      submittedAt: at,
      outcome: 'PENDING',
      reviewedAt: null,
      rejectionReason: null,
    })
    c.signedDocument = { fileId: file.fileId, sha256: file.checksumSha256, confirmedAt: at }
    c.status = 'UNDER_REVIEW'
    c.revision++
    return ok(strip(c))
  }

  // Thanh toán hợp đồng
  const ownContract = (id) => {
    const c = state.contracts.find((x) => x.contractId === id)
    return !c || state.notOwner || c.customerUserId !== state.userId ? null : c
  }
  hit = m(/^\/customers\/me\/contracts\/([^/]+)\/payments$/)
  if (hit && method === 'GET') {
    if (state.paymentStatusRateLimited)
      return { ...fail('AUTH_TOO_MANY_REQUESTS'), status: 429, headers: { 'Retry-After': '20' } }
    const c = ownContract(hit[1])
    return c ? ok(paymentView(state, c)) : fail('PAYMENT_CONTRACT_NOT_FOUND')
  }
  if (hit && method === 'POST') {
    const c = ownContract(hit[1])
    if (!c) return fail('PAYMENT_CONTRACT_NOT_FOUND')
    if (c.status === 'PAID') return fail('PAYMENT_ALREADY_PAID')
    if (c.status !== 'SIGNED') return fail('PAYMENT_CONTRACT_NOT_SIGNED')
    paymentView(state, c)
    const live = state.attempts.find((a) => a.contractId === c.contractId && payable(a))
    if (live) return ok(live)
    if (
      state.attempts.filter((a) => a.contractId === c.contractId && Date.parse(a.createdAt) > now - 10 * 60_000)
        .length >= 5
    )
      return fail('PAYMENT_TOO_MANY_ATTEMPTS')
    if (state.providerNotConfigured) {
      addAttempt(state, c, c.totalAmount, 'FAILED')
      return fail('PAYMENT_PROVIDER_NOT_CONFIGURED')
    }
    return ok(addAttempt(state, c, c.totalAmount))
  }
  hit = m(/^\/customers\/me\/contracts\/([^/]+)\/payments\/cancel$/)
  if (hit && method === 'POST') {
    const c = ownContract(hit[1])
    if (!c) return fail('PAYMENT_CONTRACT_NOT_FOUND')
    const live = state.attempts.find((a) => a.contractId === c.contractId && payable(a))
    if (!live) return fail('PAYMENT_ATTEMPT_NOT_FOUND')
    live.status = 'CANCELLED'
    return ok({ ...live, checkoutUrl: null, qrCode: null })
  }

  // Mua gói: hợp đồng SIGNED thì gộp tiền hợp đồng vào cùng link; hợp đồng đang có link riêng thì không gộp được
  if (method === 'POST' && path === '/customers/me/after-sales/purchases') {
    const c = ownContract(body.contractId)
    if (!c) return fail('AFTER_SALES_PROJECT_NOT_FOUND')
    if (c.status === 'SIGNED' && !body.includeContract) return fail('AFTER_SALES_VALIDATION_FAILED')
    if (body.includeContract && state.attempts.some((a) => a.contractId === c.contractId && payable(a)))
      return fail('PAYMENT_CHECKOUT_IN_PROGRESS', 'A payment for these items is already in progress.')
    const pkg = state.packages.find((p) => p.packageId === (body.disasterPackageId ?? body.maintenancePackageId))
    const checkout = addAttempt(state, c, (body.includeContract ? c.totalAmount : 0) + pkg.price)
    if (!body.includeContract) checkout.contractId = null
    return ok({ checkout, subscriptionIds: ['sub-new'] }, 201)
  }

  // Sau bán
  const ownRequest = (id) => state.serviceRequests.find((r) => r.requestId === id && r.customerUserId === state.userId)
  hit = m(/^\/customers\/me\/after-sales\/requests\/([^/]+)$/)
  if (hit && method === 'GET') {
    const r = ownRequest(hit[1])
    return r ? ok(strip(r)) : fail('SERVICE_REQUEST_NOT_FOUND')
  }
  const leadOk = (start) => start >= now + state.bookingLeadDays * DAY
  hit = m(/^\/customers\/me\/after-sales\/maintenance\/([^/]+)\/book$/)
  if (hit && method === 'POST') {
    const term = state.subscriptions.find((s) => s.entitlements.some((e) => e.entitlementId === hit[1]))
    const e = term?.entitlements.find((x) => x.entitlementId === hit[1])
    if (!e) return fail('MAINTENANCE_ENTITLEMENT_NOT_FOUND')
    if (term.status !== 'ACTIVE' || !term.projectId) return fail('AFTER_SALES_INVALID_STATE')
    if (!['AVAILABLE', 'NOT_COMPLETED'].includes(e.status))
      return fail('AFTER_SALES_INVALID_STATE', `This visit is ${e.status}.`)
    const start = Date.parse(body.preferredStartsAt)
    if (!leadOk(start)) return fail('MAINTENANCE_BOOKING_TOO_SOON')
    if (start < Date.parse(e.periodStartsAt) || start >= Date.parse(e.extendedUntil ?? term.endsAt))
      return fail('MAINTENANCE_OUTSIDE_PERIOD')
    const r = serviceRequest({
      requestId: `req-${state.serviceRequests.length + 1}`,
      requestNumber: `SV-NEW-${state.serviceRequests.length + 1}`,
      description: body.note ?? `Maintenance visit (plan month ${e.planMonth})`,
      preferredStartsAt: body.preferredStartsAt,
      maintenanceEntitlementId: e.entitlementId,
      createdAt: iso(now),
    })
    state.serviceRequests.push(r)
    e.status = 'BOOKED'
    e.currentRequestId = r.requestId
    return ok(strip(r), 201)
  }
  hit = m(/^\/customers\/me\/after-sales\/requests\/([^/]+)\/reschedule$/)
  if (hit && method === 'POST') {
    const r = ownRequest(hit[1])
    if (!r || r.kind === 'FAULT') return fail('SERVICE_REQUEST_NOT_FOUND')
    if (!['SUBMITTED', 'SCHEDULED', 'READY_FOR_WORK'].includes(r.status)) return fail('AFTER_SALES_INVALID_STATE')
    const scheduled = r.visits.find((v) => v.status === 'SCHEDULED')
    if (scheduled && Date.parse(scheduled.startsAt) < now + 24 * HOUR) return fail('AFTER_SALES_CHANGE_TOO_LATE')
    if (!leadOk(Date.parse(body.preferredStartsAt))) return fail('MAINTENANCE_BOOKING_TOO_SOON')
    for (const v of r.visits) if (v.status === 'SCHEDULED') v.status = 'CANCELLED'
    r.preferredStartsAt = body.preferredStartsAt
    r.status = r.kind === 'MAINTENANCE' ? 'SUBMITTED' : r.status === 'SCHEDULED' ? 'READY_FOR_WORK' : r.status
    r.revision++
    return ok(strip(r))
  }
  hit = m(/^\/customers\/me\/after-sales\/requests\/([^/]+)\/reconsideration$/)
  if (hit && method === 'POST') {
    if (!body?.note?.trim()) return fail('AFTER_SALES_REASON_REQUIRED')
    const r = ownRequest(hit[1])
    if (!r) return fail('SERVICE_REQUEST_NOT_FOUND')
    for (const id of body.evidenceFileIds ?? []) {
      const f = state.files[id]
      if (!f || f.purpose !== 'SERVICE_EVIDENCE') return fail('FILE_NOT_FOUND')
    }
    if (!r.claim || r.claim.status !== 'REJECTED') return fail('AFTER_SALES_INVALID_STATE')
    if (r.claim.reconsiderationRequestedAt) return fail('DISASTER_RECONSIDERATION_USED')
    Object.assign(r.claim, {
      status: 'RECONSIDERATION_REQUESTED',
      reconsiderationRequestedAt: iso(now),
      canRequestReconsideration: false,
    })
    for (const fileId of body.evidenceFileIds ?? [])
      r.evidence.push({
        evidenceId: `ev-${fileId}`,
        visitId: null,
        fileId,
        caption: 'reconsideration',
        addedAt: iso(now),
      })
    return ok(strip(r))
  }
  hit = m(/^\/customers\/me\/after-sales\/requests\/([^/]+)\/report-fault$/)
  if (hit && method === 'POST') {
    const maintenance = ownRequest(hit[1])
    if (!maintenance || maintenance.kind === 'FAULT') return fail('SERVICE_REQUEST_NOT_FOUND')
    const finding = [...maintenance.visits].reverse().find((v) => v.findingNote)?.findingNote
    const description = body?.description?.trim() || (finding ? `Found during maintenance: ${finding}` : '')
    if (description.length < 5) return fail('AFTER_SALES_VALIDATION_FAILED')
    const r = serviceRequest({
      requestId: `req-${state.serviceRequests.length + 1}`,
      requestNumber: `SV-FAULT-${state.serviceRequests.length + 1}`,
      kind: 'FAULT',
      description,
      preferredStartsAt: null,
      originRequestId: maintenance.requestId,
      createdAt: iso(now),
    })
    state.serviceRequests.push(r)
    return ok(strip(r), 201)
  }

  // Yêu cầu khảo sát, giờ trống, địa điểm
  hit = m(/^\/customers\/me\/survey-requests\/([^/]+)$/)
  if (hit && method === 'GET') {
    const r = state.surveyRequests.find((x) => x.surveyRequestId === hit[1])
    return r ? ok({ request: r, history: [] }) : fail('SURVEY_REQUEST_NOT_FOUND')
  }
  if (m(/^\/customers\/me\/survey-requests\/[^/]+\/dispatch-request$/) && method === 'GET')
    return fail('DISPATCH_REQUEST_NOT_FOUND')
  if (method === 'GET' && path === '/survey-slots') {
    const site = state.sites[q.propertySiteId]
    const located = Boolean(site?.communeCode)
    const day = q.date
    return ok({
      date: day,
      timeZone: 'Asia/Ho_Chi_Minh',
      appointmentDurationMinutes: 120,
      zone: located ? { zoneId: 'z-1', code: 'Q1', name: 'Khu trung tâm' } : null,
      slots: located
        ? ['08:00', '14:00'].map((t) => ({
            startsAt: `${day}T${t}:00+07:00`,
            endsAt: `${day}T${t.replace(/^(\d\d)/, (h) => String(Number(h) + 2).padStart(2, '0'))}:00+07:00`,
            startsAtUtc: iso(Date.parse(`${day}T${t}:00+07:00`)),
            endsAtUtc: iso(Date.parse(`${day}T${t}:00+07:00`) + 2 * HOUR),
            canBook: true,
            capacityStatus: 'EXACT',
            knownAvailableTechnicians: 1,
            status: 'AVAILABLE',
          }))
        : [],
      note: null,
      coverageStatus: located ? 'COVERED' : 'SITE_LOCATION_REQUIRED',
      dispatchAvailable: false,
    })
  }
  if (method === 'GET' && path === '/administrative-units/communes') return ok(state.communes)
  hit = m(/^\/customers\/me\/sites\/([^/]+)\/administrative-location$/)
  if (hit && method === 'PUT') {
    const site = state.sites[hit[1]]
    if (!site) return fail('PROPERTY_SITE_NOT_FOUND')
    if (body?.provinceCode !== '79') return fail('ADMINISTRATIVE_LOCATION_OUT_OF_SERVICE_AREA')
    const commune = state.communes.find((c) => c.code === body?.communeCode)
    if (!commune)
      return fail('ADMINISTRATIVE_LOCATION_UNKNOWN', 'Unknown commune.', { communeCode: ['Unknown commune.'] })
    site.communeCode = commune.code
    return ok({
      propertySiteId: hit[1],
      provinceCode: '79',
      communeCode: commune.code,
      communeName: commune.name,
      coverageStatus: 'COVERED',
      zone: { zoneId: 'z-1', code: 'Q1', name: 'Khu trung tâm' },
    })
  }

  // Đánh giá sơ bộ: bản nháp của địa điểm cũ
  hit = m(/^\/pre-surveys\/([^/]+)\/surface$/)
  if (hit && method === 'GET') {
    const view = state.surfaces[hit[1]]
    return view ? ok(view) : fail('PRE_SURVEY_NOT_FOUND')
  }
  if (method === 'GET' && path === '/customers/me/sites')
    return ok({ items: [], page: 1, pageSize: 100, totalCount: 0 })
  if (method === 'GET' && path === '/customers/me/pre-surveys')
    return ok({ items: [], page: 1, pageSize: 20, totalCount: 0 })
  if (method === 'POST' && path === '/customers/me/sites') return ok({ propertySiteId: 'site-new' }, 201)

  return fail('RESOURCE_NOT_FOUND', `mock: ${method} ${path}`)
}

/** `target`: page hoặc browser context (context thì mọi tab đều dùng backend giả) */
export async function installCustomerMockApi(target, state) {
  // Chỉ chặn đường dẫn bắt đầu bằng /api/: module của Vite như /src/services/api/errors.ts không được đụng
  await target.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const request = route.request()
      const result = handleCustomer(state, request.method(), request.url(), request.postData())
      return route.fulfill({
        status: result.status,
        contentType: 'application/json',
        headers: result.headers,
        body: JSON.stringify(result.body),
      })
    },
  )
  await target.route('https://s3.mock.test/**', (route) => route.fulfill({ status: 200, body: '' }))
}
