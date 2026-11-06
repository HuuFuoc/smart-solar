// Backend giả cho E2E của cổng kinh doanh: trả lời /api/** trong trình duyệt bằng page.route, giữ trạng thái trong bộ nhớ.
// Máy trạng thái hợp đồng bám ContractHandlers của backend `main` (7c79fa8): kiểm revision trước, rồi trạng thái; mã lỗi và
// HTTP status theo OperationResultControllerBase.StatusFor. Việc nhắc khách bám SalesTaskHandlers.
// Chỉ dùng trong test, không phải nguồn dữ liệu của ứng dụng
import { createHash } from 'node:crypto'

const now = () => new Date().toISOString()
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
const sha = (text) => createHash('sha256').update(text).digest('hex')

export function token(role, sub) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ sub, email: `${sub}@test.vn`, role, exp })}.sig`
}

const ok = (data, status = 200) => ({ status, body: { isSuccess: true, traceId: 't', data } })
const fail = (status, code, message = code, details = null) => ({
  status,
  body: { isSuccess: false, traceId: 't', data: null, error: { code, message, details } },
})

export const SR = 'sr-1'
export const QUOTE = 'q-1'

export function createOpsState({ role = 'SALES', userId = 'sales-1' } = {}) {
  return {
    role,
    userId,
    requests: [],
    /** Kinh doanh khác: backend trả 404 CONTRACT_NOT_FOUND cho mọi lệnh của hợp đồng */
    notOwner: false,
    failPresign: false,
    forceHashMismatch: false,
    fileChanged: false,
    paymentsUnavailable: false,
    rateLimitWrites: false,
    queues: surveyQueues(),
    survey: {
      surveyRequestId: SR,
      preSurveyId: 'ps-1',
      assignedSaleId: 'sales-1',
      customerName: 'Nguyễn Văn Khách',
      customerPhone: '0900000000',
      customerEmail: 'khach@test.vn',
      propertyName: 'Nhà phố Bến Thành',
      province: 'Thành phố Hồ Chí Minh',
      district: null,
      ward: 'Phường Bến Thành',
      streetLine: '1 Lê Lợi',
      latitude: null,
      longitude: null,
      installationSurfaceType: 'CONCRETE_ROOF',
      surfaceMaterial: null,
      totalAreaM2: 40,
      usableAreaM2: 30,
      tiltDegree: 10,
      azimuthDegree: 180,
      hasObstruction: false,
      status: 'COMPLETED',
      submittedAt: '2026-10-25T02:00:00Z',
      assignedAt: '2026-10-25T03:00:00Z',
      scheduledAt: null,
      salesNote: null,
      selectedSimulation: null,
      appointment: null,
    },
    quotations: [quotationView({ status: 'ACCEPTED', acceptedAt: '2026-11-01T02:00:00Z' })],
    warranty: [
      { optionId: 'w12', kind: 'INSTALLATION', months: 12, isDefault: true, isActive: true },
      { optionId: 'w24', kind: 'INSTALLATION', months: 24, isDefault: false, isActive: true },
      { optionId: 'w60', kind: 'INSTALLATION', months: 60, isDefault: false, isActive: false },
      { optionId: 'r6', kind: 'REPAIR', months: 6, isDefault: true, isActive: true },
    ],
    contracts: [],
    payments: {},
    files: {},
    tasks: [
      task('task-open', 'ACCEPTANCE_FOLLOW_UP', 'OPEN', { requestId: 'req-9' }),
      task('task-claimed', 'MAINTENANCE_FOLLOW_UP', 'CLAIMED', {
        entitlementId: 'ent-1',
        assignedSalesUserId: 'sales-1',
        note: 'No booking yet for plan month 3; contact the customer.',
      }),
    ],
  }
}

function task(taskId, taskType, status, extra = {}) {
  return {
    taskId,
    taskType,
    status,
    requestId: null,
    entitlementId: null,
    customerUserId: 'cust-1',
    assignedSalesUserId: null,
    claimedAt: null,
    startedAt: null,
    completedAt: null,
    outcome: null,
    note: null,
    createdAt: '2026-11-02T02:00:00Z',
    revision: 0,
    ...extra,
  }
}

// Hàng chờ của kinh doanh, giờ tính từ lúc tạo state: đủ các trạng thái mà danh sách xếp và tô màu
// (chờ hơn 1 ngày, chưa đặt giờ, chờ kỹ thuật viên nhận, đã hẹn, quá giờ, cần phân công, đã xong, thiếu tên)
function surveyQueues(now = Date.now()) {
  const at = (hours) => new Date(now + hours * 3600_000).toISOString()
  const place = (communeName) => ({ province: 'Thành phố Hồ Chí Minh', district: null, ward: communeName, communeName })
  const appt = (id, status, startHours, extra = {}) => ({
    appointmentId: id,
    status,
    startsAt: at(startHours),
    endsAt: at(startHours + 1.5),
    acceptanceDeadlineAt: status === 'PENDING_ACCEPTANCE' ? at(startHours - 24) : null,
    technicianUserId: null,
    technicianName: null,
    isOverdue: false,
    ...extra,
  })
  const pending = [
    {
      surveyRequestId: 'sr-p1',
      preSurveyId: 'ps-p1',
      customerName: 'Trần Thị Hoa',
      propertyName: 'Nhà phố Phạm Ngũ Lão',
      ...place('Phường Bến Thành'),
      installationSurfaceType: 'ROOFTOP',
      totalAreaM2: 45,
      usableAreaM2: 38,
      submittedAt: at(-50),
      appointment: appt('a-p1', 'PENDING_ACCEPTANCE', 22),
    },
    {
      surveyRequestId: 'sr-p2',
      preSurveyId: 'ps-p2',
      customerName: 'Lê Minh Tuấn',
      propertyName: 'Nhà vườn Thủ Đức',
      ...place('Phường Thủ Đức'),
      installationSurfaceType: 'ROOFTOP',
      totalAreaM2: 60,
      usableAreaM2: 52.5,
      submittedAt: at(-3),
      appointment: null,
    },
    {
      surveyRequestId: 'sr-p3',
      preSurveyId: 'ps-p3',
      customerName: 'Phạm Quốc Bảo',
      propertyName: 'Nhà ống Gò Vấp',
      ...place('Phường Gò Vấp'),
      installationSurfaceType: 'ROOFTOP',
      totalAreaM2: 32,
      usableAreaM2: 25,
      submittedAt: at(-20),
      appointment: appt('a-p3', 'PENDING_ACCEPTANCE', 46),
    },
    {
      surveyRequestId: 'sr-p4',
      preSurveyId: 'ps-p4',
      customerName: null,
      propertyName: null,
      ...place('Xã Bình Chánh'),
      installationSurfaceType: 'GROUND',
      totalAreaM2: 80,
      usableAreaM2: 70,
      submittedAt: at(-30),
      appointment: null,
    },
  ]
  const mine = (id, customerName, propertyName, commune, status, assignedHours, appointment) => ({
    surveyRequestId: id,
    preSurveyId: `ps-${id}`,
    customerName,
    propertyName,
    ...place(commune),
    status,
    submittedAt: at(assignedHours - 4),
    assignedAt: at(assignedHours),
    scheduledAt: status === 'SCHEDULED' ? (appointment?.startsAt ?? null) : null,
    appointment,
  })
  const my = [
    mine('sr-m1', 'Đỗ Thanh Hương', 'Nhà phố Tân Định', 'Phường Tân Định', 'SCHEDULED', -30, {
      ...appt('a-m1', 'ACCEPTED', 18),
      technicianUserId: 't1',
      technicianName: 'Nguyễn Kỹ Thuật',
    }),
    mine('sr-m2', 'Vũ Hải Nam', 'Biệt thự Thảo Điền', 'Phường An Khánh', 'PENDING', -40, appt('a-m2', 'ESCALATED', 30)),
    mine('sr-m3', 'Hoàng Lan', 'Nhà phố Bình Thạnh', 'Phường Bình Thạnh', 'PENDING', -8, null),
    mine('sr-m4', 'Ngô Đức Anh', 'Nhà phố Phú Nhuận', 'Phường Phú Nhuận', 'SCHEDULED', -60, {
      ...appt('a-m4', 'ACCEPTED', -5),
      technicianUserId: 't2',
      technicianName: 'Trần Kỹ Thuật',
      isOverdue: true,
    }),
    mine(
      'sr-m5',
      'Bùi Thị Mai',
      'Nhà phố Cầu Ông Lãnh',
      'Phường Cầu Ông Lãnh',
      'PENDING',
      -12,
      appt('a-m5', 'PENDING_ACCEPTANCE', 40),
    ),
    mine(SR, 'Nguyễn Văn Khách', 'Nhà phố Bến Thành', 'Phường Bến Thành', 'COMPLETED', -300, null),
  ]
  const escalated = [
    {
      appointmentId: 'a-m2',
      surveyRequestId: 'sr-m2',
      startsAt: at(30),
      endsAt: at(31.5),
      status: 'ESCALATED',
      acceptanceDeadlineAt: at(-2),
      escalatedAt: at(-2),
      revision: 2,
      zone: { zoneId: 'zone-1', code: 'KHU-Q2', name: 'Thủ Đức' },
      customerName: 'Vũ Hải Nam',
      propertyName: 'Biệt thự Thảo Điền',
      province: 'Thành phố Hồ Chí Minh',
      district: null,
      ward: 'Phường An Khánh',
      assignedSaleId: 'sales-1',
      ownedByMe: true,
      hasEligibleTechnician: true,
    },
  ]
  return { pending, my, escalated }
}

export function quotationView(extra = {}) {
  return {
    quotationId: QUOTE,
    quoteNumber: 'QT-20261101-ABC234',
    surveyRequestId: SR,
    version: 1,
    previousQuotationId: null,
    status: 'ACCEPTED',
    currency: 'VND',
    lines: [
      {
        lineId: 'l1',
        lineNumber: 1,
        productId: null,
        sku: null,
        name: 'Tấm pin 550W',
        brand: null,
        model: null,
        unit: 'tấm',
        quantity: 10,
        unitPrice: 3_000_000,
        catalogUnitPrice: null,
        lineTotal: 30_000_000,
        description: null,
      },
    ],
    equipmentSubtotal: 30_000_000,
    laborCost: 0,
    transportCost: 0,
    otherServiceCost: 0,
    subtotal: 30_000_000,
    discountAmount: 0,
    taxRatePercent: 8,
    taxAmount: 2_400_000,
    totalAmount: 32_400_000,
    validUntil: '2026-12-01T16:59:59Z',
    isExpired: false,
    canAccept: false,
    terms: 'Bảo hành theo hãng.',
    notes: null,
    documentFileId: null,
    onSiteSurveyReportId: 'rep-1',
    onSiteSurveyVersion: 1,
    issuedAt: '2026-10-30T02:00:00Z',
    acceptedAt: null,
    revisionReason: null,
    revision: 2,
    events: [],
    ...extra,
  }
}

function onsiteReport() {
  return {
    reportId: 'rep-1',
    surveyRequestId: SR,
    appointmentId: 'appt-1',
    technicianUserId: 'tech-1',
    status: 'COMPLETED',
    version: 1,
    revision: 3,
    startedAt: '2026-10-28T02:00:00Z',
    completedAt: '2026-10-28T04:00:00Z',
    data: {
      roofType: 'CONCRETE_FLAT',
      roofMaterial: 'Bê tông',
      roofLengthM: 8,
      roofWidthM: 5,
      usableAreaM2: 30,
      tiltDegree: 10,
      azimuthDegree: 180,
      roofCondition: 'GOOD',
      electricalCabinetNotes: 'Tủ điện tầng 1',
      electricalConnectionNotes: null,
      installationFeasibility: 'FEASIBLE',
      proposedInverterLocation: null,
      proposedPanelLayoutNotes: null,
      measuredLatitude: null,
      measuredLongitude: null,
      notes: null,
    },
    obstacles: [],
    attachments: [],
    amendments: [],
    updatedAt: '2026-10-28T04:00:00Z',
  }
}

function canonicalHash(c) {
  return sha(JSON.stringify([c.contractNumber, c.version, c.terms ?? '', c.warrantyMonths, c.issuedAt]))
}

function event(c, eventType, fromStatus, toStatus, detail = null) {
  c.events.push({ eventType, fromStatus, toStatus, actorUserId: 'sales-1', detail, createdAt: now() })
}

function move(c, to, detail = null) {
  event(c, 'STATUS_CHANGED', c.status, to, detail)
  c.status = to
}

function newContract(state, quotation, terms, warrantyMonths, previous = null) {
  const versions = state.contracts.filter((c) => c.quotationId === quotation.quotationId)
  const c = {
    contractId: `contract-${state.contracts.length + 1}`,
    contractNumber: previous?.contractNumber ?? 'HD-20261103-TEST01',
    version: versions.length ? Math.max(...versions.map((v) => v.version)) + 1 : 1,
    previousContractId: previous?.contractId ?? null,
    quotationId: quotation.quotationId,
    quotationVersion: quotation.version,
    surveyRequestId: SR,
    status: 'DRAFT',
    currency: 'VND',
    totalAmount: quotation.totalAmount,
    pricingSnapshot: {},
    customerSnapshot: {},
    terms,
    canonicalHash: null,
    officialDocument: null,
    signedDocument: null,
    rejectionReason: null,
    issuedAt: null,
    publishedAt: null,
    signedAt: null,
    paidAt: null,
    revision: 0,
    submissions: [],
    events: [],
    warrantyMonths,
  }
  event(c, previous ? 'AMENDMENT_CREATED' : 'CREATED', null, 'DRAFT')
  state.contracts.push(c)
  return c
}

/** Thời hạn gửi lên: null là giữ / mặc định; số phải là tuỳ chọn INSTALLATION đang bật (ContractHandlers.WarrantyMonthsAsync) */
function warrantyFor(state, requested, keep) {
  const active = state.warranty.filter((o) => o.kind === 'INSTALLATION' && o.isActive)
  if (requested == null) return { months: keep ?? active.find((o) => o.isDefault)?.months ?? null }
  if (!active.some((o) => o.months === requested))
    return { error: fail(400, 'CONTRACT_WARRANTY_VALIDATION_FAILED', 'Choose one of the active warranty durations.') }
  return { months: requested }
}

const viewOf = (c, staff = true) => ({ ...c, events: staff ? c.events : null })

/** Khách gửi bản ký (luồng của cổng khách, giả ở đây để test đi tiếp) */
export function customerSubmitsSignature(state, contractId) {
  const c = state.contracts.find((x) => x.contractId === contractId)
  c.submissions.push({
    submissionId: `sub-${c.submissions.length + 1}`,
    fileId: `signed-${c.submissions.length + 1}`,
    fileSha256: 'cd'.repeat(32),
    officialDocumentSha256: c.officialDocument.sha256,
    submittedAt: now(),
    outcome: 'PENDING',
    reviewedAt: null,
    rejectionReason: null,
  })
  c.signedDocument = { fileId: 'signed-1', sha256: 'cd'.repeat(32), confirmedAt: now() }
  move(c, 'UNDER_REVIEW')
  c.revision++
}

/** PayOS xác nhận nhận tiền (webhook của backend), giả ở đây */
export function paymentConfirmed(state, contractId) {
  const c = state.contracts.find((x) => x.contractId === contractId)
  const attempt = {
    paymentAttemptId: 'pay-1',
    contractId,
    orderCode: 900001,
    amount: c.totalAmount,
    currency: 'VND',
    status: 'PAID',
    checkoutUrl: null,
    qrCode: null,
    expiresAt: now(),
    paidAt: now(),
    providerReference: 'FT123',
    failureReason: null,
    createdAt: now(),
  }
  state.payments[contractId] = { attempts: [attempt], history: [] }
  c.paidAt = now()
  move(c, 'PAID')
  c.revision++
}

export function handleOps(state, method, url, bodyText) {
  const u = new URL(url)
  const path = u.pathname.replace(/^\/api/, '')
  const q = Object.fromEntries(u.searchParams)
  const body = bodyText ? JSON.parse(bodyText) : undefined
  state.requests.push({ method, path, query: q, body })
  const m = (re) => path.match(re)
  const sales = state.role === 'SALES'
  const manager = state.role === 'MANAGER' || state.role === 'ADMIN'

  if (method === 'POST' && path === '/auth/refresh')
    return ok({
      accessToken: token(state.role, state.userId),
      accessTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      refreshToken: 'refresh-2',
      refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      tokenType: 'Bearer',
      userId: state.userId,
    })

  // Hàng chờ yêu cầu khảo sát (tab Chờ nhận / Của tôi, số trên menu)
  if (method === 'GET' && path === '/survey-requests/pending') return ok(state.queues.pending)
  if (method === 'GET' && path === '/survey-requests/my') return ok(state.queues.my)
  if (method === 'GET' && path === '/survey-requests/escalated') return ok(state.queues.escalated)
  if (method === 'GET' && path === '/installations/ready-contracts')
    return ok(
      state.contracts
        .filter((c) => c.status === 'PAID')
        .map((c) => ({
          contractId: c.contractId,
          contractNumber: c.contractNumber,
          surveyRequestId: SR,
          totalAmount: c.totalAmount,
          paidAt: c.paidAt,
          latitude: null,
          longitude: null,
        })),
    )
  if (method === 'GET' && path === '/installation-projects') return ok([])

  // Yêu cầu khảo sát và báo giá
  if (method === 'GET' && path === `/survey-requests/${SR}`) return ok(state.survey)
  if (method === 'GET' && path === `/survey-requests/${SR}/onsite-survey`) return ok(onsiteReport())
  if (method === 'GET' && path === `/survey-requests/${SR}/quotations`) return ok(state.quotations)
  if (method === 'GET' && path === '/pre-surveys/ps-1/simulations')
    return ok({ items: [], selected: null, cacheAvailable: true })

  let hit = m(/^\/quotations\/([^/]+)\/document$/)
  if (hit && method === 'PUT') {
    const quotation = state.quotations.find((x) => x.quotationId === hit[1])
    const file = state.files[body?.fileId]
    if (!file || file.status !== 'VERIFIED') return fail(409, 'FILE_NOT_VERIFIED')
    if (file.purpose !== 'QUOTATION_DOCUMENT') return fail(400, 'FILE_WRONG_PURPOSE')
    if (!['DRAFT', 'ISSUED'].includes(quotation.status) || (quotation.status === 'ISSUED' && quotation.documentFileId))
      return fail(409, 'INVALID_STATE_TRANSITION', 'Documents can be attached to drafts or issued quotations only.')
    quotation.documentFileId = file.fileId
    quotation.revision++
    return ok(quotation)
  }

  // Tệp
  if (method === 'POST' && path === '/files/presigned-upload') {
    if (state.failPresign) return fail(503, 'FILE_STORAGE_UNAVAILABLE')
    return ok({
      uploadUrl: 'https://s3.mock.test/upload',
      method: 'PUT',
      bucket: 'b',
      objectKey: `x/${body.fileName}`,
      headers: { 'Content-Type': body.contentType },
      expiresAt: now(),
    })
  }
  if (method === 'POST' && path === '/files') {
    const fileId = `file-${Object.keys(state.files).length + 1}`
    state.files[fileId] = {
      fileId,
      purpose: body.purpose,
      bucket: 'b',
      objectKey: body.objectKey,
      originalFileName: body.fileName,
      status: 'VERIFIED',
      rejectionReason: null,
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
      checksumSha256: body.checksumSha256,
      objectVersionId: '1',
      verifiedAt: now(),
      createdAt: now(),
    }
    return ok(state.files[fileId], 201)
  }
  hit = m(/^\/files\/([^/]+)$/)
  if (hit && method === 'GET') return state.files[hit[1]] ? ok(state.files[hit[1]]) : fail(404, 'FILE_NOT_FOUND')

  // Thời hạn bảo hành cho kinh doanh: chỉ tuỳ chọn đang bật, chỉ vai trò SALES
  if (method === 'GET' && path === '/sales/after-sales/warranty-options') {
    if (!sales) return fail(403, 'AUTH_FORBIDDEN')
    return ok(state.warranty.filter((o) => o.isActive && (!q.kind || o.kind === q.kind)))
  }

  // Hợp đồng
  hit = m(/^\/quotations\/([^/]+)\/contracts$/)
  if (hit && method === 'POST') {
    if (!sales) return fail(403, 'AUTH_FORBIDDEN')
    if (state.rateLimitWrites) return { ...fail(429, 'AUTH_TOO_MANY_REQUESTS'), headers: { 'retry-after': '42' } }
    const quotation = state.quotations.find((x) => x.quotationId === hit[1])
    if (!quotation || state.notOwner) return fail(404, 'CONTRACT_NOT_FOUND')
    if (quotation.status !== 'ACCEPTED') return fail(409, 'CONTRACT_QUOTATION_NOT_ACCEPTED')
    if (state.contracts.some((c) => c.quotationId === quotation.quotationId && c.status !== 'SUPERSEDED'))
      return fail(409, 'CONTRACT_ALREADY_EXISTS')
    const warranty = warrantyFor(state, body.warrantyMonths, null)
    if (warranty.error) return warranty.error
    const terms = body.terms?.trim() ? body.terms.trim() : quotation.terms
    return ok(viewOf(newContract(state, quotation, terms, warranty.months)), 201)
  }
  if (method === 'GET' && path === `/survey-requests/${SR}/contracts`) {
    if (state.notOwner && !manager) return fail(404, 'CONTRACT_NOT_FOUND')
    return ok(state.contracts.map((c) => viewOf(c, false)))
  }
  hit = m(/^\/contracts\/([^/]+)(?:\/([a-z-]+))?$/)
  if (hit) {
    const c = state.contracts.find((x) => x.contractId === hit[1])
    const action = hit[2]
    if (!c || (state.notOwner && !manager)) return fail(404, 'CONTRACT_NOT_FOUND', 'Contract was not found.')

    if (method === 'GET' && !action) return ok(viewOf(c))
    if (method === 'GET' && action === 'payments') {
      if (state.paymentsUnavailable)
        return fail(503, 'FEATURE_PENDING_MIGRATION', 'pending', { pendingMigrations: ['20261031043834_X'] })
      const p = state.payments[c.contractId] ?? { attempts: [], history: [] }
      const current =
        p.attempts.find((a) => a.status === 'PAID') ?? p.attempts.find((a) => a.status === 'PENDING') ?? null
      return ok({
        contractId: c.contractId,
        contractStatus: c.status,
        amount: c.totalAmount,
        currency: 'VND',
        current,
        attempts: p.attempts,
        history: p.history,
      })
    }

    // Duyệt bản ký: kinh doanh phụ trách hoặc quản lý; quản trị bị 403 ở controller
    if (method === 'POST' && action === 'review') {
      if (state.role === 'ADMIN') return fail(403, 'AUTH_FORBIDDEN')
      if (!['APPROVE', 'REJECT'].includes(body.decision)) return fail(400, 'VALIDATION_FAILED')
      if (body.decision === 'REJECT' && !body.reason?.trim()) return fail(409, 'CONTRACT_REJECTION_REASON_REQUIRED')
      if (body.decision === 'APPROVE' && state.fileChanged) return fail(409, 'FILE_CONTENT_CHANGED')
      if (c.revision !== body.revision) return fail(409, 'CONTRACT_STALE_REVISION')
      if (c.status !== 'UNDER_REVIEW') return fail(409, 'CONTRACT_INVALID_STATE')
      const pending = c.submissions.find((s) => s.outcome === 'PENDING')
      pending.reviewedAt = now()
      if (body.decision === 'APPROVE') {
        pending.outcome = 'APPROVED'
        c.signedAt = now()
        c.rejectionReason = null
        move(c, 'SIGNED')
      } else {
        pending.outcome = 'REJECTED'
        pending.rejectionReason = body.reason.trim()
        c.rejectionReason = body.reason.trim()
        move(c, 'SIGNATURE_REJECTED', body.reason.trim())
      }
      c.revision++
      return ok(viewOf(c))
    }

    if (!sales) return fail(403, 'AUTH_FORBIDDEN')
    if (state.rateLimitWrites) return { ...fail(429, 'AUTH_TOO_MANY_REQUESTS'), headers: { 'retry-after': '42' } }

    if (method === 'POST' && action === 'amendments') {
      if (['DRAFT', 'PAID', 'SUPERSEDED'].includes(c.status)) return fail(409, 'CONTRACT_INVALID_STATE')
      if (state.contracts.some((v) => v.quotationId === c.quotationId && v.status === 'DRAFT'))
        return fail(409, 'CONTRACT_ALREADY_EXISTS')
      const warranty = warrantyFor(state, body.warrantyMonths, c.warrantyMonths)
      if (warranty.error) return warranty.error
      const quotation = state.quotations.find((x) => x.quotationId === c.quotationId)
      const terms = body.terms?.trim() ? body.terms.trim() : c.terms
      return ok(viewOf(newContract(state, quotation, terms, warranty.months, c)), 201)
    }

    // Mọi lệnh còn lại gửi revision: lệch thì 409 trước khi xét trạng thái
    if (body?.revision == null) return fail(400, 'VALIDATION_FAILED', "'revision' is required.")
    if (c.revision !== body.revision)
      return fail(409, 'CONTRACT_STALE_REVISION', 'stale', { currentRevision: c.revision })

    if (method === 'PUT' && !action) {
      if (c.status !== 'DRAFT') return fail(409, 'CONTRACT_INVALID_STATE')
      if (body.warrantyMonths != null) {
        const warranty = warrantyFor(state, body.warrantyMonths, c.warrantyMonths)
        if (warranty.error) return warranty.error
        c.warrantyMonths = warranty.months
      }
      c.terms = body.terms?.trim() || null
      event(c, 'UPDATED', null, null)
    } else if (method === 'POST' && action === 'issue') {
      if (c.status !== 'DRAFT') return fail(409, 'CONTRACT_INVALID_STATE')
      if (c.warrantyMonths == null) return fail(400, 'CONTRACT_WARRANTY_REQUIRED')
      if (c.previousContractId) {
        const previous = state.contracts.find((x) => x.contractId === c.previousContractId)
        if (previous.status === 'PAID') return fail(409, 'CONTRACT_INVALID_STATE')
        event(previous, 'SUPERSEDED', previous.status, 'SUPERSEDED')
        previous.status = 'SUPERSEDED'
        previous.revision++
      }
      c.issuedAt = now()
      c.canonicalHash = canonicalHash(c)
      move(c, 'ISSUED')
    } else if (method === 'PUT' && action === 'official-document') {
      const file = state.files[body.fileId]
      if (!file || file.status !== 'VERIFIED') return fail(409, 'FILE_NOT_VERIFIED')
      if (file.purpose !== 'CONTRACT_DOCUMENT') return fail(400, 'FILE_WRONG_PURPOSE')
      if (c.status !== 'ISSUED') return fail(409, 'CONTRACT_INVALID_STATE')
      if (state.forceHashMismatch || body.canonicalHash !== c.canonicalHash)
        return fail(409, 'CONTRACT_CANONICAL_HASH_MISMATCH')
      c.officialDocument = { fileId: file.fileId, sha256: file.checksumSha256, confirmedAt: now() }
      event(c, 'OFFICIAL_DOCUMENT_ATTACHED', null, null)
    } else if (method === 'POST' && action === 'publish') {
      if (c.status !== 'ISSUED') return fail(409, 'CONTRACT_INVALID_STATE')
      if (!c.officialDocument) return fail(409, 'CONTRACT_DOCUMENT_MISSING')
      c.publishedAt = now()
      move(c, 'AWAITING_SIGNATURE')
    } else return fail(404, 'RESOURCE_NOT_FOUND')
    c.revision++
    return ok(viewOf(c))
  }

  // Việc sau bán của kinh doanh
  if (method === 'GET' && path === '/sales/after-sales/tasks/open')
    return ok(state.tasks.filter((t) => t.status === 'OPEN'))
  if (method === 'GET' && path === '/sales/after-sales/tasks/mine')
    return ok(
      state.tasks.filter(
        (t) => t.assignedSalesUserId === state.userId && ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(t.status),
      ),
    )
  hit = m(/^\/sales\/after-sales\/tasks\/([^/]+)\/(claim|start|follow-up)$/)
  if (hit && method === 'POST') {
    const t = state.tasks.find((x) => x.taskId === hit[1])
    if (!t) return fail(404, 'SALES_TASK_NOT_FOUND')
    if (hit[2] === 'claim') {
      if (t.status !== 'OPEN') return fail(409, 'SALES_TASK_ALREADY_CLAIMED')
      Object.assign(t, { status: 'CLAIMED', assignedSalesUserId: state.userId, claimedAt: now() })
    } else if (hit[2] === 'start') {
      if (t.assignedSalesUserId !== state.userId || t.status !== 'CLAIMED')
        return fail(409, 'AFTER_SALES_INVALID_STATE')
      Object.assign(t, { status: 'IN_PROGRESS', startedAt: now() })
    } else {
      if (body.outcome && !['BOOKED', 'WILL_BOOK_LATER', 'DECLINED', 'UNREACHABLE'].includes(body.outcome))
        return fail(400, 'AFTER_SALES_VALIDATION_FAILED')
      if (!body.result?.trim()) return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'Record the contact result.')
      if (t.assignedSalesUserId !== state.userId || !['CLAIMED', 'IN_PROGRESS'].includes(t.status))
        return fail(409, 'AFTER_SALES_INVALID_STATE')
      t.note = body.note ?? t.note
      t.startedAt ??= now()
      if (t.status === 'CLAIMED') t.status = 'IN_PROGRESS'
      if (body.outcome && body.outcome !== 'WILL_BOOK_LATER')
        Object.assign(t, { status: 'DONE', outcome: body.outcome, completedAt: now() })
    }
    t.revision++
    return ok(t)
  }

  return fail(404, 'RESOURCE_NOT_FOUND', `mock: ${method} ${path}`)
}

export async function installOpsMockApi(page, state) {
  // Chỉ chặn đường dẫn bắt đầu bằng /api/: module của Vite như /src/services/api/errors.ts không được đụng
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const request = route.request()
      const result = handleOps(state, request.method(), request.url(), request.postData())
      return route.fulfill({
        status: result.status,
        contentType: 'application/json',
        headers: result.headers,
        body: JSON.stringify(result.body),
      })
    },
  )
  // PUT thẳng lên kho S3 (axios trần, không qua /api)
  await page.route('https://s3.mock.test/**', (route) => route.fulfill({ status: 200, body: '' }))
}
