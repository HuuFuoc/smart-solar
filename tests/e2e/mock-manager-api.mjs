// Backend giả cho E2E của cổng quản lý (dùng chung với quản trị) và các bước kinh doanh / quản trị nối vào: trả lời /api/**
// trong trình duyệt bằng page.route, giữ trạng thái trong bộ nhớ. Một state dùng chung cho nhiều phiên (quản lý, quản trị,
// kinh doanh) để chạy luồng xuyên cổng. Luật bám ServiceManagerHandlers, SalesTaskHandlers, RefundHandlers của backend `main`
// (7c79fa8, đã đối chiếu với DLL của image c43e1cada345); mã lỗi và HTTP status theo OperationResultControllerBase.StatusFor.
// Chỉ dùng trong test, không phải nguồn dữ liệu của ứng dụng

const now = () => new Date().toISOString()
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')

export function token(role, sub) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ sub, email: `${sub}@test.vn`, role, exp })}.sig`
}

const ok = (data, status = 200) => ({ status, body: { isSuccess: true, traceId: 't', data } })
const fail = (status, code, message = code, details = null) => ({
  status,
  body: { isSuccess: false, traceId: 't', data: null, error: { code, message, details } },
})
const page = (items) => ({ items, page: 1, pageSize: items.length || 20, totalItems: items.length, totalPages: 1 })
const trim = (text, max) => {
  if (typeof text !== 'string' || !text.trim()) return null
  return text.trim().slice(0, max)
}
const FINAL = ['COMPLETED', 'NOT_COMPLETED', 'CANCELLED', 'CLOSED_DUPLICATE']
const whole = (n) => typeof n === 'number' && Number.isInteger(n) && n >= 0

const USERS = [
  { id: 's1', email: 'sale1@test.vn', fullName: 'Kinh Doanh Một', roles: ['SALES'], status: 'ACTIVE' },
  { id: 's2', email: 'sale2@test.vn', fullName: 'Kinh Doanh Hai', roles: ['SALES'], status: 'ACTIVE' },
].map((u) => ({
  phone: null,
  emailVerifiedAt: null,
  lastLoginAt: null,
  createdAt: '2026-10-01T02:00:00Z',
  updatedAt: '2026-10-01T02:00:00Z',
  deletedAt: null,
  ...u,
}))

function request(over) {
  return {
    suspectedAssetId: null,
    preferredStartsAt: null,
    installationWarrantyEndsAt: '2028-10-01T00:00:00+07:00',
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
    revision: 1,
    items: [],
    visits: [],
    quotations: [],
    claim: null,
    evidence: [],
    possibleDuplicates: [],
    history: [],
    ...over,
  }
}

const visit = (over) => ({
  visitId: 'v-1',
  purpose: 'REPAIR',
  status: 'SCHEDULED',
  technicianUserId: 't1',
  technicianName: 'Kỹ Thuật Một',
  startsAt: '2026-11-03T08:00:00+07:00',
  endsAt: '2026-11-03T10:00:00+07:00',
  assignmentStatus: 'ACCEPTED',
  customerConfirmationRequired: false,
  customerConfirmedAt: null,
  startedAt: null,
  report: null,
  reportedAt: null,
  findingNote: null,
  companyRescheduleReason: null,
  ...over,
})

const paidQuotation = (id, amount) => ({
  quotationId: id,
  version: 1,
  isSupplementary: false,
  status: 'PAID',
  lines: [{ itemId: null, description: 'Thay cáp DC', partsAmount: amount - 200_000, laborAmount: 200_000 }],
  partsAmount: amount - 200_000,
  laborAmount: 200_000,
  totalAmount: amount,
  disasterSupportAmount: 0,
  customerAmount: amount,
  repairWarrantyMonths: 6,
  note: null,
  issuedAt: '2026-10-28T09:00:00+07:00',
  expiresAt: '2026-11-28T09:00:00+07:00',
  acceptedAt: '2026-10-28T10:00:00+07:00',
  paidAt: '2026-10-28T10:05:00+07:00',
  currentPaymentAttemptId: null,
})

export function createManagerState() {
  const requests = [
    request({
      requestId: 'r-fault',
      requestNumber: 'SR-1001',
      kind: 'FAULT',
      status: 'AWAITING_DECISION',
      projectId: 'p1',
      description: 'Bão làm bung khung, hai tấm pin nứt kính.',
      suspectedAssetId: 'a1',
      createdAt: '2026-10-30T08:00:00+07:00',
      items: [
        {
          itemId: 'it-1',
          assetId: 'a1',
          description: 'Tấm pin nứt kính',
          diagnosis: 'Vỡ do vật bay vào trong bão',
          requiredParts: 'Tấm pin 550W',
          coverage: 'PENDING',
          coverageReason: null,
          status: 'OPEN',
          isSupplementary: false,
          quotationId: null,
          workResult: null,
          partsUsed: null,
        },
      ],
      visits: [visit({ visitId: 'v-insp', purpose: 'INSPECTION', status: 'REPORTED', report: 'Hai tấm vỡ kính.' })],
      claim: {
        claimId: 'cl-1',
        disasterType: 'STORM',
        incidentOccurredAt: '2026-10-29T22:00:00+07:00',
        status: 'SUBMITTED',
        decisionReason: null,
        reconsiderationRequestedAt: null,
        canRequestReconsideration: false,
        subscriptionId: 'sub-d1',
        coveragePercent: 70,
        perIncidentLimit: 20_000_000,
        supportReserved: 0,
        supportConsumed: 0,
      },
      possibleDuplicates: [],
    }),
    request({
      requestId: 'r-dup',
      requestNumber: 'SR-1002',
      kind: 'FAULT',
      status: 'SUBMITTED',
      projectId: 'p1',
      description: 'Tấm pin bị vỡ sau bão (gửi lại).',
      createdAt: '2026-10-31T09:00:00+07:00',
    }),
    request({
      requestId: 'r-started',
      requestNumber: 'SR-1003',
      kind: 'FAULT',
      status: 'IN_PROGRESS',
      projectId: 'p1',
      description: 'Inverter báo lỗi cách điện.',
      createdAt: '2026-10-20T09:00:00+07:00',
      visits: [visit({ visitId: 'v-rep', status: 'IN_PROGRESS', startedAt: '2026-11-03T08:05:00+07:00' })],
      quotations: [paidQuotation('q-paid', 1_200_000)],
    }),
    request({
      requestId: 'r-otm',
      requestNumber: 'SR-1004',
      kind: 'ONE_TIME_MAINTENANCE',
      status: 'READY_FOR_WORK',
      projectId: 'p1',
      description: 'Vệ sinh tấm pin trước Tết.',
      preferredStartsAt: '2026-11-20T08:00:00+07:00',
      createdAt: '2026-10-25T09:00:00+07:00',
      quotations: [paidQuotation('q-otm', 500_000)],
    }),
    request({
      requestId: 'r-other',
      requestNumber: 'SR-2001',
      kind: 'FAULT',
      status: 'SUBMITTED',
      projectId: 'p2',
      description: 'Công trình khác.',
      createdAt: '2026-10-29T09:00:00+07:00',
    }),
  ]
  // Backend tính cảnh báo trùng cho yêu cầu báo lỗi còn mở cùng công trình
  for (const r of requests) refreshDuplicates(requests, r)
  return {
    requests: [],
    serviceRequests: requests,
    assets: [
      asset('a1', 'PANEL', 'Jinko', 'Tiger Neo 550', 'JK-0001', 'R1-01'),
      asset('a2', 'PANEL', 'Jinko', 'Tiger Neo 550', 'JK-0002', 'R1-02'),
      asset('a3', 'INVERTER', 'Huawei', 'SUN2000-5KTL', 'HW-5K-9', 'Tường bếp'),
    ],
    tasks: [
      task('task-open', 'REPAIR_QUOTATION', 'OPEN', null, { requestId: 'r-fault' }),
      task('task-held', 'MAINTENANCE_FOLLOW_UP', 'IN_PROGRESS', 's2', {
        entitlementId: 'ent-3',
        note: 'No booking yet for plan month 3; contact the customer.',
      }),
      task('task-follow', 'ACCEPTANCE_FOLLOW_UP', 'OPEN', null, {
        requestId: 'r-dup',
        note: 'The customer has not answered the completion yet.',
      }),
      task('task-done', 'REPAIR_QUOTATION', 'DONE', 's1', { requestId: 'r-started', completedAt: now() }),
    ],
    refunds: [
      refund('rf-pending', 'PENDING_APPROVAL', 990_000, {
        subscriptionId: 'sub-x',
        reason: 'Payment received but not applied: The payment was made after the checkout expired.',
      }),
      refund('rf-pending-2', 'PENDING_APPROVAL', 1_500_000, {
        subscriptionId: 'sub-y',
        reason: 'Installation cancelled before handover',
      }),
      refund('rf-refunded', 'REFUNDED', 300_000, {
        approvedAmount: 300_000,
        refundedAt: '2026-10-20T03:00:00Z',
        refundReference: 'CK-001',
        reason: 'Work stopped: Khách đi vắng dài ngày',
        requestId: 'r-old',
      }),
    ],
    /** Gói đã trả tiền khách xin huỷ (ManagerSubscriptionView) */
    subscriptions: [
      managerSubscription('sub-1', 'Bảo trì 12 tháng', 2_000_000, 'Chuyển nhà, không cần bảo trì nữa'),
      managerSubscription('sub-2', 'Bảo vệ bão 1 năm', 1_500_000, 'Đổi ý', { kind: 'DISASTER_PROTECTION', visitMonths: [] }),
    ],
    /** Lệnh danh sách việc trả 503 FEATURE_PENDING_MIGRATION */
    tasksUnavailable: false,
  }
}

function managerSubscription(subscriptionId, packageName, price, reason, over = {}) {
  return {
    subscription: {
      subscriptionId,
      contractId: 'c-1',
      projectId: null,
      kind: 'MAINTENANCE',
      status: 'CANCELLATION_REQUESTED',
      packageName,
      price,
      durationMonths: 12,
      visitMonths: [1, 7],
      coveredDisasterTypes: [],
      coveragePercent: null,
      perIncidentLimit: null,
      termLimit: null,
      startsAt: null,
      endsAt: null,
      coverageStartsAt: null,
      supportReserved: 0,
      supportConsumed: 0,
      supportAvailable: null,
      remainingVisits: null,
      checkoutExpiresAt: null,
      currentPaymentAttemptId: 'pa-1',
      paidAt: '2026-11-01T02:00:00Z',
      cancellationRequestedAt: '2026-11-02T03:00:00Z',
      entitlements: [],
      ...over,
    },
    customerUserId: 'cus-1',
    customerName: 'Nguyễn Văn Khách',
    cancellationReason: reason,
    cancelledAt: null,
  }
}

function asset(assetId, assetType, manufacturer, model, serialNumber, positionCode) {
  return {
    assetId,
    assetType,
    productId: null,
    manufacturer,
    model,
    serialNumber,
    positionCode,
    warrantyMonths: null,
    status: 'ACTIVE',
    replacesAssetId: null,
    serviceRequestId: null,
    specifications: null,
  }
}

function task(taskId, taskType, status, assignedSalesUserId, over = {}) {
  return {
    taskId,
    taskType,
    status,
    requestId: null,
    entitlementId: null,
    customerUserId: 'cus-1',
    assignedSalesUserId,
    claimedAt: assignedSalesUserId ? '2026-11-01T02:00:00Z' : null,
    startedAt: status === 'IN_PROGRESS' ? '2026-11-01T03:00:00Z' : null,
    completedAt: null,
    outcome: null,
    note: null,
    createdAt: '2026-10-31T02:00:00Z',
    revision: 1,
    ...over,
  }
}

function refund(refundId, status, originalAmount, over = {}) {
  return {
    refundId,
    customerUserId: 'cus-1',
    paymentAttemptId: null,
    subscriptionId: null,
    quotationId: null,
    requestId: null,
    originalAmount,
    approvedAmount: null,
    reason: 'x',
    status,
    approvedByUserId: null,
    approvedAt: null,
    decisionNote: null,
    recordedByUserId: null,
    refundedAt: null,
    refundReference: null,
    createdAt: '2026-11-01T02:00:00Z',
    revision: 1,
    ...over,
  }
}

function refreshDuplicates(all, r) {
  r.possibleDuplicates = FINAL.includes(r.status)
    ? []
    : all
        .filter((o) => o.requestId !== r.requestId && o.projectId === r.projectId && !FINAL.includes(o.status))
        .filter((o) => o.kind === 'FAULT' && r.kind === 'FAULT')
        .map((o) => ({
          requestId: o.requestId,
          requestNumber: o.requestNumber,
          kind: o.kind,
          status: o.status,
          description: o.description,
          createdAt: o.createdAt,
        }))
}

const summary = (r) => ({
  requestId: r.requestId,
  requestNumber: r.requestNumber,
  kind: r.kind,
  status: r.status,
  projectId: r.projectId,
  description: r.description,
  preferredStartsAt: r.preferredStartsAt,
  createdAt: r.createdAt,
})

const paidOf = (r) => r.quotations.filter((q) => q.status === 'PAID').reduce((s, q) => s + q.customerAmount, 0)

/** Huỷ buổi hẹn mở, báo giá còn mở, việc của kinh doanh (CloseEverythingAsync) */
function closeEverything(state, r) {
  for (const v of r.visits) if (v.status === 'SCHEDULED' || v.status === 'IN_PROGRESS') v.status = 'CANCELLED'
  for (const q of r.quotations) if (q.status === 'ISSUED' || q.status === 'ACCEPTED') q.status = 'CANCELLED'
  for (const t of state.tasks)
    if (t.requestId === r.requestId && ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(t.status)) t.status = 'CANCELLED'
}

function addApprovedRefund(state, r, original, approved, reason, managerId) {
  state.refunds.unshift(
    refund(`rf-${state.refunds.length + 1}`, 'APPROVED', original, {
      requestId: r.requestId,
      approvedAmount: approved,
      approvedByUserId: managerId,
      approvedAt: now(),
      reason,
      createdAt: now(),
    }),
  )
}

/** `who`: { role, userId } của phiên đang gọi */
export function handleManager(state, who, method, url, bodyText) {
  const u = new URL(url)
  const path = u.pathname.replace(/^\/api/, '')
  const q = Object.fromEntries(u.searchParams)
  const body = bodyText ? safeJson(bodyText) : undefined
  state.requests.push({ method, path, query: q, body, role: who.role })
  const m = (re) => path.match(re)
  const staff = who.role === 'MANAGER' || who.role === 'ADMIN'

  if (method === 'POST' && path === '/auth/refresh')
    return ok({
      accessToken: token(who.role, who.userId),
      accessTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      refreshToken: 'refresh-2',
      refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      tokenType: 'Bearer',
      userId: who.userId,
    })

  // Danh sách nền của layout
  if (method === 'GET' && path === '/products') return ok(page([]))
  if (method === 'GET' && (path === '/admin/dispatch-requests' || path === '/survey-requests/escalated'))
    return ok(path === '/admin/dispatch-requests' ? page([]) : [])
  if (method === 'GET' && ['/survey-requests/pending', '/survey-requests/my'].includes(path)) return ok([])
  if (
    method === 'GET' &&
    ['/installations/ready-contracts', '/installation-projects', '/admin/technicians'].includes(path)
  )
    return ok([])
  if (method === 'GET' && ['/admin/after-sales/packages', '/admin/after-sales/warranty-options'].includes(path))
    return ok([])

  // Tài khoản: chỉ quản trị
  if (method === 'GET' && path === '/admin/users') {
    if (who.role !== 'ADMIN') return fail(403, 'AUTH_FORBIDDEN')
    return ok(page(USERS.filter((x) => !q.role || x.roles.includes(q.role))))
  }

  // Chi tiết công trình (nguồn thiết bị của trang yêu cầu)
  let hit = m(/^\/installation-projects\/([^/]+)$/)
  if (hit && method === 'GET') {
    if (!staff) return fail(403, 'AUTH_FORBIDDEN')
    return ok({ projectId: hit[1], zone: null, assets: hit[1] === 'p1' ? state.assets.map((a) => ({ ...a })) : [] })
  }

  // ---- ManagerAfterSales (Manager, Admin)
  if (path.startsWith('/manager/after-sales') && !staff) return fail(403, 'AUTH_FORBIDDEN')

  if (method === 'GET' && path === '/manager/after-sales/requests')
    return ok(state.serviceRequests.map(summary).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  hit = m(/^\/manager\/after-sales\/requests\/([^/]+)$/)
  if (hit && method === 'GET') {
    const r = state.serviceRequests.find((x) => x.requestId === hit[1])
    return r ? ok(r) : fail(404, 'SERVICE_REQUEST_NOT_FOUND', 'Request was not found.')
  }

  hit = m(/^\/manager\/after-sales\/requests\/([^/]+)\/(claim-decision|duplicate|stop|not-fulfilled)$/)
  if (hit && method === 'POST') {
    const r = state.serviceRequests.find((x) => x.requestId === hit[1])
    const action = hit[2]
    if (action === 'claim-decision') {
      const why = trim(body.reason, 1000)
      if (!body.approve && !why) return fail(400, 'AFTER_SALES_REASON_REQUIRED', 'A rejection reason is required.')
      if (!r) return fail(404, 'SERVICE_REQUEST_NOT_FOUND', 'Request was not found.')
      const c = r.claim
      if (!c) return fail(404, 'SERVICE_REQUEST_NOT_FOUND', 'This request has no disaster-protection claim.')
      if (c.status !== 'SUBMITTED' && c.status !== 'RECONSIDERATION_REQUESTED')
        return fail(409, 'AFTER_SALES_INVALID_STATE', `A ${c.status} claim cannot be decided.`)
      Object.assign(c, { status: body.approve ? 'APPROVED' : 'REJECTED', decisionReason: why })
      c.canRequestReconsideration = c.status === 'REJECTED' && !c.reconsiderationRequestedAt
    } else if (action === 'duplicate') {
      const original = state.serviceRequests.find((x) => x.requestId === body.originalRequestId)
      if (!original || body.originalRequestId === hit[1])
        return fail(404, 'SERVICE_REQUEST_NOT_FOUND', 'The original request was not found.')
      if (!r) return fail(404, 'SERVICE_REQUEST_NOT_FOUND', 'Request was not found.')
      if (FINAL.includes(r.status)) return fail(409, 'AFTER_SALES_INVALID_STATE', 'The request is already closed.')
      if (r.projectId !== original.projectId)
        return fail(409, 'AFTER_SALES_INVALID_STATE', 'A duplicate must belong to the same installation.')
      if (r.quotations.some((x) => x.status === 'PAID'))
        return fail(
          409,
          'AFTER_SALES_INVALID_STATE',
          'A request with a paid quotation cannot be closed as a duplicate.',
        )
      closeEverything(state, r)
      Object.assign(r, { status: 'CLOSED_DUPLICATE', duplicateOfRequestId: original.requestId })
    } else if (action === 'stop') {
      const why = trim(body.reason, 1000)
      if (!why) return fail(400, 'AFTER_SALES_REASON_REQUIRED', 'A reason is required.')
      if (!whole(body.refundAmount))
        return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'The refund must be a whole VND amount ≥ 0.')
      if (!r) return fail(404, 'SERVICE_REQUEST_NOT_FOUND', 'Request was not found.')
      if (FINAL.includes(r.status)) return fail(409, 'AFTER_SALES_INVALID_STATE', 'The request is already closed.')
      const paid = paidOf(r)
      if (body.refundAmount > paid)
        return fail(409, 'AFTER_SALES_INVALID_STATE', 'The refund cannot exceed what the customer paid.')
      if (body.refundAmount > 0)
        addApprovedRefund(state, r, paid, body.refundAmount, `Work stopped: ${why}`, who.userId)
      closeEverything(state, r)
      Object.assign(r, { status: 'CANCELLED', cancelledAt: now(), cancellationReason: r.cancellationReason ?? why })
    } else {
      const why = trim(body.reason, 1000)
      if (!why) return fail(400, 'AFTER_SALES_REASON_REQUIRED', 'A reason is required.')
      if (!r) return fail(404, 'SERVICE_REQUEST_NOT_FOUND', 'Request was not found.')
      if (r.kind !== 'ONE_TIME_MAINTENANCE' || FINAL.includes(r.status))
        return fail(
          409,
          'AFTER_SALES_INVALID_STATE',
          'Only an open one-time maintenance request can be closed this way.',
        )
      if (r.visits.some((v) => v.status === 'IN_PROGRESS' || v.status === 'REPORTED'))
        return fail(409, 'AFTER_SALES_INVALID_STATE', 'The maintenance was already performed.')
      const paid = paidOf(r)
      if (paid > 0)
        addApprovedRefund(state, r, paid, paid, `SmartSolar could not provide the service: ${why}`, who.userId)
      closeEverything(state, r)
      Object.assign(r, { status: 'CANCELLED', cancelledAt: now(), cancellationReason: r.cancellationReason ?? why })
    }
    r.revision++
    for (const x of state.serviceRequests) refreshDuplicates(state.serviceRequests, x)
    return ok(r)
  }

  hit = m(/^\/manager\/after-sales\/assets\/([^/]+)$/)
  if (hit && method === 'PUT') {
    const reason = trim(body.reason, 500)
    if (!reason) return fail(400, 'AFTER_SALES_REASON_REQUIRED', 'A reason for the correction is required.')
    const a = state.assets.find((x) => x.assetId === hit[1])
    if (!a) return fail(404, 'AFTER_SALES_ASSET_NOT_FOUND', 'Asset was not found.')
    const manufacturer = trim(body.manufacturer, 100) ?? a.manufacturer
    const serial = trim(body.serialNumber, 100) ?? a.serialNumber
    if (
      state.assets.some((x) => x.assetId !== a.assetId && x.manufacturer === manufacturer && x.serialNumber === serial)
    )
      return fail(409, 'AFTER_SALES_DUPLICATE_SERIAL', 'Another asset already has this manufacturer and serial number.')
    a.manufacturer = manufacturer
    a.model = trim(body.model, 100) ?? a.model
    a.serialNumber = serial
    if (body.positionCode !== null && body.positionCode !== undefined) a.positionCode = trim(body.positionCode, 50)
    if (body.specifications !== null && body.specifications !== undefined)
      a.specifications = trim(body.specifications, 500)
    return ok({ ...a })
  }

  // Kinh doanh được giao việc (ListActiveUserIdsWithRoleAsync(Sales)): quản lý đọc được, không cần API tài khoản
  if (method === 'GET' && path === '/manager/after-sales/sales-assignees')
    return ok(
      USERS.filter((x) => x.roles.includes('SALES') && x.status === 'ACTIVE')
        .map((x) => ({ userId: x.id, fullName: x.fullName }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    )

  // Hàng chờ huỷ gói (ServicePackageHandlers.ListForManagerAsync / GetForManagerAsync / DecideCancellationAsync)
  if (method === 'GET' && path === '/manager/after-sales/subscriptions') {
    const wanted = q.status || 'CANCELLATION_REQUESTED'
    return ok(state.subscriptions.filter((x) => x.subscription.status === wanted))
  }
  hit = m(/^\/manager\/after-sales\/subscriptions\/([^/]+)$/)
  if (hit && method === 'GET') {
    const found = state.subscriptions.find((x) => x.subscription.subscriptionId === hit[1])
    return found ? ok(found) : fail(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription was not found.')
  }
  hit = m(/^\/manager\/after-sales\/subscriptions\/([^/]+)\/cancellation-decision$/)
  if (hit && method === 'POST') {
    const found = state.subscriptions.find((x) => x.subscription.subscriptionId === hit[1])
    if (!found) return fail(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription was not found.')
    const sub = found.subscription
    if (sub.status !== 'CANCELLATION_REQUESTED') return fail(409, 'AFTER_SALES_INVALID_STATE', 'No cancellation is waiting.')
    if (!body.approve) {
      sub.status = 'PAID'
      sub.cancellationRequestedAt = null
      return ok({ ...sub })
    }
    const amount = body.refundAmount ?? sub.price
    if (amount < 0 || amount > sub.price || Math.trunc(amount) !== amount)
      return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'The refund is a whole VND amount up to the price paid.')
    sub.status = 'CANCELLED'
    found.cancelledAt = now()
    state.refunds.unshift(
      refund(`rf-${state.refunds.length + 1}`, 'APPROVED', sub.price, {
        subscriptionId: sub.subscriptionId,
        approvedAmount: amount,
        approvedByUserId: who.userId,
        approvedAt: now(),
        reason: `Package cancelled before activation: ${found.cancellationReason}`,
        createdAt: now(),
      }),
    )
    return ok({ ...sub })
  }

  if (method === 'GET' && path === '/manager/after-sales/tasks') {
    if (state.tasksUnavailable)
      return fail(503, 'FEATURE_PENDING_MIGRATION', 'The feature is disabled.', {
        pendingMigrations: ['20261030201506_SalesTerminalStates'],
      })
    return ok(state.tasks.filter((t) => !q.status || t.status === q.status))
  }
  hit = m(/^\/manager\/after-sales\/tasks\/([^/]+)\/assign$/)
  if (hit && method === 'POST') {
    if (!USERS.some((x) => x.id === body.salesUserId && x.roles.includes('SALES') && x.status === 'ACTIVE'))
      return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'The assignee is not an active Sales user.')
    const why = trim(body.reason, 500)
    const t = state.tasks.find((x) => x.taskId === hit[1])
    if (!t) return fail(404, 'SALES_TASK_NOT_FOUND', 'Task was not found.')
    if (!['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(t.status))
      return fail(409, 'AFTER_SALES_INVALID_STATE', 'The task is closed.')
    if (t.assignedSalesUserId && !why) return fail(400, 'AFTER_SALES_REASON_REQUIRED', 'A reassignment needs a reason.')
    t.assignedSalesUserId = body.salesUserId
    if (t.status === 'OPEN') t.status = 'CLAIMED'
    t.claimedAt ??= now()
    t.revision++
    return ok({ ...t })
  }

  if (method === 'GET' && path === '/manager/after-sales/refunds')
    return ok(state.refunds.filter((r) => !q.status || r.status === q.status))
  hit = m(/^\/manager\/after-sales\/refunds\/([^/]+)\/decision$/)
  if (hit && method === 'POST') {
    const r = state.refunds.find((x) => x.refundId === hit[1])
    if (!r) return fail(404, 'REFUND_NOT_FOUND', 'Refund was not found.')
    if (r.status !== 'PENDING_APPROVAL')
      return fail(409, 'AFTER_SALES_INVALID_STATE', 'This refund is already decided.')
    const amount = body.approvedAmount ?? r.originalAmount
    if (body.approve && (!whole(amount) || amount > r.originalAmount))
      return fail(
        400,
        'AFTER_SALES_VALIDATION_FAILED',
        'The approved amount is a whole VND amount up to the original amount.',
      )
    Object.assign(r, {
      status: body.approve ? 'APPROVED' : 'REJECTED',
      approvedAmount: body.approve ? amount : null,
      approvedByUserId: who.userId,
      approvedAt: now(),
      decisionNote: trim(body.note, 1000),
    })
    r.revision++
    return ok({ ...r })
  }

  // ---- AdminAfterSales: ghi nhận hoàn tiền (chỉ ADMIN)
  hit = m(/^\/admin\/after-sales\/refunds\/([^/]+)\/record$/)
  if (hit && method === 'POST') {
    if (who.role !== 'ADMIN') return fail(403, 'AUTH_FORBIDDEN')
    const r = state.refunds.find((x) => x.refundId === hit[1])
    if (!r) return fail(404, 'REFUND_NOT_FOUND', 'Refund was not found.')
    if (r.status !== 'APPROVED')
      return fail(409, 'AFTER_SALES_INVALID_STATE', 'Only an approved refund can be recorded.')
    Object.assign(r, {
      status: 'REFUNDED',
      recordedByUserId: who.userId,
      refundedAt: new Date(body.refundedAt).toISOString(),
      refundReference: trim(body.reference, 100),
    })
    r.revision++
    return ok({ ...r })
  }

  // ---- SalesAfterSales (kinh doanh)
  if (method === 'GET' && path === '/sales/after-sales/tasks/open')
    return ok(state.tasks.filter((t) => t.status === 'OPEN'))
  if (method === 'GET' && path === '/sales/after-sales/tasks/mine')
    return ok(
      state.tasks.filter(
        (t) => t.assignedSalesUserId === who.userId && ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(t.status),
      ),
    )
  hit = m(/^\/sales\/after-sales\/tasks\/([^/]+)\/(claim|start|follow-up)$/)
  if (hit && method === 'POST') {
    if (who.role !== 'SALES') return fail(403, 'AUTH_FORBIDDEN')
    const t = state.tasks.find((x) => x.taskId === hit[1])
    if (!t) return fail(404, 'SALES_TASK_NOT_FOUND')
    if (hit[2] === 'claim') {
      if (t.status !== 'OPEN') return fail(409, 'SALES_TASK_ALREADY_CLAIMED')
      Object.assign(t, { status: 'CLAIMED', assignedSalesUserId: who.userId, claimedAt: now() })
    } else if (hit[2] === 'start') {
      if (t.assignedSalesUserId !== who.userId || t.status !== 'CLAIMED')
        return fail(409, 'AFTER_SALES_INVALID_STATE', 'Only your claimed task can be started.')
      Object.assign(t, { status: 'IN_PROGRESS', startedAt: now() })
    } else {
      if (!trim(body.result, 300)) return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'Record the contact result.')
      if (t.assignedSalesUserId !== who.userId || !['CLAIMED', 'IN_PROGRESS'].includes(t.status))
        return fail(409, 'AFTER_SALES_INVALID_STATE', 'Only your open task can be updated.')
      t.startedAt ??= now()
      if (t.status === 'CLAIMED') t.status = 'IN_PROGRESS'
      if (body.outcome && body.outcome !== 'WILL_BOOK_LATER')
        Object.assign(t, { status: 'DONE', outcome: body.outcome, completedAt: now() })
    }
    t.revision++
    return ok({ ...t })
  }

  return fail(404, 'RESOURCE_NOT_FOUND', `mock: no handler for ${method} ${path}`)
}

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** Gắn backend giả vào một page; `who` là vai trò và mã người dùng của phiên này */
export async function installManagerMockApi(page, state, who) {
  // Chỉ chặn đường dẫn bắt đầu bằng /api/: module của Vite như /src/services/api/errors.ts không được đụng
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const request = route.request()
      const result = handleManager(state, who, request.method(), request.url(), request.postData())
      return route.fulfill({
        status: result.status,
        contentType: 'application/json',
        body: JSON.stringify(result.body),
      })
    },
  )
}
